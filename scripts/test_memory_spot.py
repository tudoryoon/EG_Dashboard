import argparse
import io
import json
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import date, datetime, timezone
from unittest.mock import Mock, patch

from update_memory_spot import (DIRECT_PRODUCTS, MODULE_KEY, MODULE_PRODUCT, TARGET_MAP,
                                build_payload, build_scoped_payload, merge_direct_dram, merge_direct_module,
                                main, parse_direct_dram, parse_direct_module)


def direct_html(stamp="Nov.5 2026 11:00 (GMT+8)"):
    rows = "".join(
        f"<tr><td>{product}</td><td>75</td><td>40</td><td>73</td><td>46.2</td>"
        "<td>60.667</td><td><img src='down.gif'> -1.09 %</td><td></td></tr>"
        for product in DIRECT_PRODUCTS.values()
    )
    return (f"<table><tr><td id='NationalDramSpotPrice_show_day'>Last Update: {stamp}</td></tr></table>"
            "<table><tr><th>Item</th><th>Daily High</th><th>Daily Low</th><th>Session High</th>"
            "<th>Session Low</th><th>Session Average</th><th>Session Change</th><th>History</th></tr>"
            + rows + "</table>")


def module_row(day):
    return dict(Date=day, Product=MODULE_PRODUCT, Canonical_Product="DDR5 RDIMM",
                Price_Average="2165", Price_High="2370", Price_Low="2100",
                Change_Pct="0", Price_Type="Weekly")


def module_html(stamp="Nov.2 2026 14:40 (GMT+8)"):
    return (f"<div class='left_tab'><table><tr><td><span class='tab_time'>Last Update:{stamp}</span></td></tr></table>"
            "<table><tbody id='tb_ModuleSpotPrice'><tr><th>Item</th><th>Weekly High</th><th>Weekly Low</th>"
            "<th>Session High</th><th>Session Low</th><th>Session Average</th><th>Average Change</th><th>History</th></tr>"
            f"<tr><td>{MODULE_PRODUCT}</td><td>9,999</td><td>1,000</td><td>2,120</td><td>1,930</td>"
            "<td>2,025.000</td><td><img src='down.gif'> -6.47 %</td><td></td></tr></tbody></table></div>")


class MemorySpotTest(unittest.TestCase):
    now = datetime(2026, 11, 5, 5, tzinfo=timezone.utc)

    def test_direct_parser_uses_session_average_and_source_date(self):
        quote = parse_direct_dram(direct_html(), self.now)
        self.assertEqual(quote["date"], "2026-11-05")
        self.assertEqual(quote["publishedAt"], "2026-11-05T11:00:00+08:00")
        self.assertEqual(set(quote["items"]), set(DIRECT_PRODUCTS))
        self.assertEqual(quote["items"]["ddr5_16gb"]["average"], 60.667)
        self.assertEqual(quote["items"]["ddr5_16gb"]["changePct"], -1.09)

    def test_direct_parser_rejects_future_missing_products_and_changed_columns(self):
        for html in [direct_html("Nov.6 2026 11:00 (GMT+8)"),
                     direct_html().replace("DDR4 8Gb (1Gx8) 3200", "DDR4 8Gb eTT"),
                     direct_html().replace("Session Average", "Other Price"),
                     direct_html().replace("<th>Session Low</th><th>Session Average</th>", "<th>Session Average</th><th>Session Low</th>"),
                     direct_html().replace("60.667", "NaN")]:
            with self.assertRaises(ValueError):
                parse_direct_dram(html, self.now)

    def test_direct_quotes_persist_only_today_and_past_dates_require_sheet(self):
        quote = parse_direct_dram(direct_html(), self.now)
        payload = build_payload([], date(2026, 11, 5))
        merge_direct_dram(payload, {}, quote, date(2026, 11, 5))
        self.assertEqual(payload["items"]["ddr5_16gb"]["latestDate"], "2026-11-05")
        self.assertEqual(payload["updatedAt"], "2026-11-05")
        older = parse_direct_dram(direct_html("Nov.5 2026 10:00 (GMT+8)").replace("60.667", "62"), self.now)
        same_day = build_scoped_payload([], date(2026, 11, 5), payload, "dram")
        merge_direct_dram(same_day, payload, older, date(2026, 11, 5))
        self.assertEqual(same_day["items"]["ddr5_16gb"]["latestValue"], 60.667)
        next_payload = build_payload([], date(2026, 11, 6))
        merge_direct_dram(next_payload, payload, older, date(2026, 11, 6))
        self.assertIsNone(next_payload["items"]["ddr5_16gb"]["latestValue"])
        self.assertIsNone(next_payload["directDramCurrent"])
        self.assertIsNone(next_payload["items"]["ddr5_16gb"]["history"][-2])
        self.assertIsNone(next_payload["items"]["ddr5_16gb"]["history"][-1])
        final_rows = [dict(Date="2026-11-05", Canonical_Product=TARGET_MAP["ddr5_16gb"],
                           Price_Average="59", Change_Pct="-2")]
        final = build_payload(final_rows, date(2026, 11, 6))
        merge_direct_dram(final, next_payload, None, date(2026, 11, 6))
        self.assertEqual(final["items"]["ddr5_16gb"]["latestValue"], 59)
        self.assertNotIn("latestSource", final["items"]["ddr5_16gb"])

    def test_dram_scope_leaves_other_memory_untouched_and_excludes_today_sheet(self):
        rows = [dict(Date="2026-11-04", Canonical_Product=canonical, Price_Average="50", Change_Pct="0")
                for key, canonical in TARGET_MAP.items() if key != MODULE_KEY]
        rows.append(module_row("2026-11-03"))
        previous = build_payload(rows, date(2026, 11, 5))
        rows += [dict(Date="2026-11-05", Canonical_Product=TARGET_MAP["ddr5_16gb"],
                      Price_Average="99", Change_Pct="10")]
        rows += [module_row("2026-11-04"), module_row("2026-11-05")]
        payload = build_scoped_payload(rows, date(2026, 11, 5), previous, "dram")
        self.assertIsNone(payload["items"]["ddr5_16gb"]["history"][-1])
        self.assertIsNone(payload["items"][MODULE_KEY]["history"][-1])
        self.assertEqual(payload["items"][MODULE_KEY]["history"][-2], 2165)
        self.assertEqual(payload["items"][MODULE_KEY]["latestDate"], "2026-11-04")
        for key in set(TARGET_MAP) - set(DIRECT_PRODUCTS) - {MODULE_KEY}:
            self.assertEqual(payload["items"][key], previous["items"][key])
        merge_direct_dram(payload, {}, parse_direct_dram(direct_html(), self.now), date(2026, 11, 5))
        merge_direct_module(payload, {}, parse_direct_module(module_html(), self.now), date(2026, 11, 5))
        self.assertEqual(payload["items"]["ddr5_16gb"]["history"][-1], 60.667)
        other = build_scoped_payload(rows, date(2026, 11, 5), payload, "other")
        for key in [*DIRECT_PRODUCTS, MODULE_KEY]:
            self.assertEqual(other["items"][key], payload["items"][key])

    def test_module_direct_quote_uses_its_own_weekly_timestamp_and_session_prices(self):
        quote = parse_direct_module(direct_html() + module_html(), self.now)
        self.assertEqual(quote["date"], "2026-11-02")
        self.assertEqual(quote["observedDate"], "2026-11-05")
        self.assertEqual(quote["publishedAt"], "2026-11-02T14:40:00+08:00")
        self.assertEqual(quote["items"][MODULE_KEY], {"high": 2120, "low": 1930, "average": 2025, "changePct": -6.47})

    def test_module_direct_parser_rejects_changed_benchmarks_columns_and_invalid_quotes(self):
        for html in [module_html("Nov.6 2026 14:40 (GMT+8)"),
                     module_html().replace(MODULE_PRODUCT, "DDR5 RDIMM 64GB 4800/5600"),
                     module_html().replace("Weekly High", "Daily High"),
                     module_html().replace("<th>Session High</th><th>Session Low</th>", "<th>Session Low</th><th>Session High</th>"),
                     module_html().replace("2,025.000", "NaN"),
                     module_html().replace("2,025.000", "3000"),
                     module_html().replace("-6.47 %", "unknown")]:
            with self.assertRaises(ValueError):
                parse_direct_module(html, self.now)

    def test_module_observation_day_uses_kst_not_the_runner_timezone(self):
        quote = parse_direct_module(module_html(), datetime(2026, 11, 5, 16, tzinfo=timezone.utc))
        self.assertEqual(quote["observedDate"], "2026-11-06")
        self.assertEqual(quote["date"], "2026-11-02")

    def test_chip_and_module_parser_failures_do_not_block_each_other(self):
        rows = [module_row("2026-11-04"),
                dict(Date="2026-11-04", Canonical_Product=TARGET_MAP["ddr5_16gb"], Price_Average="59")]
        for html, successful_key, failed_key in [(module_html(), MODULE_KEY, "ddr5_16gb"),
                                                  (direct_html(), "ddr5_16gb", MODULE_KEY)]:
            with self.subTest(successful_key=successful_key):
                output = Mock()
                output.exists.return_value = False
                with patch('update_memory_spot.OUTPUT_PATH', output), \
                     patch('update_memory_spot.argparse.ArgumentParser.parse_args', return_value=argparse.Namespace(scope='dram')), \
                     patch('update_memory_spot.datetime', wraps=datetime) as clock, \
                     patch('update_memory_spot.fetch_rows', return_value=rows), \
                     patch('update_memory_spot.fetch_text', return_value=html), \
                     redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    clock.now.return_value = self.now
                    main()
                output.write_text.assert_called_once()
                payload = json.loads(output.write_text.call_args.args[0].split('=', 1)[1].strip().removesuffix(';'))
                self.assertEqual(payload['items'][successful_key]['latestDate'], '2026-11-05')
                self.assertEqual(payload['items'][failed_key]['latestDate'], '2026-11-04')

    def test_module_direct_observations_do_not_rewrite_history_or_fake_daily_publications(self):
        today = date(2026, 11, 5)
        rows = [module_row("2026-11-04")]
        payload = build_scoped_payload(rows, today, {}, "dram")
        quote = parse_direct_module(module_html(), self.now)
        merge_direct_module(payload, {}, quote, today)
        item = payload["items"][MODULE_KEY]
        self.assertEqual(item["history"][-2:], [2165, 2025])
        self.assertEqual(item["highHistory"][-1], 2120)
        self.assertEqual(item["lowHistory"][-1], 1930)
        self.assertEqual(item["dateBasis"], "collection_date")
        self.assertEqual(item["latestDate"], "2026-11-05")
        self.assertEqual(item["latestSource"]["publishedAt"], "2026-11-02T14:40:00+08:00")
        self.assertEqual(payload["updatedAt"], "2026-11-05")
        retry = build_scoped_payload(rows, today, payload, "dram")
        merge_direct_module(retry, payload, None, today)
        self.assertEqual(retry["items"][MODULE_KEY], item)
        older = parse_direct_module(module_html("Nov.1 2026 14:40 (GMT+8)").replace("2,025.000", "2000"), self.now)
        merge_direct_module(retry, payload, older, today)
        self.assertEqual(retry["items"][MODULE_KEY]["latestValue"], 2025)
        next_day = build_scoped_payload(rows, date(2026, 11, 6), payload, "dram")
        merge_direct_module(next_day, payload, quote, date(2026, 11, 6))
        self.assertIsNone(next_day["directModuleCurrent"])
        self.assertIsNone(next_day["items"][MODULE_KEY]["history"][-2])
        self.assertNotIn("latestSource", next_day["items"][MODULE_KEY])

    def test_later_session_replaces_intraday_quote_but_not_other_series(self):
        previous = build_payload([], date(2026, 11, 5))
        merge_direct_dram(previous, {}, parse_direct_dram(direct_html("Nov.5 2026 10:00 (GMT+8)"), self.now), date(2026, 11, 5))
        quote = parse_direct_dram(direct_html().replace("60.667", "61"), self.now)
        payload = build_payload([module_row("2026-11-04")], date(2026, 11, 5))
        merge_direct_dram(payload, previous, quote, date(2026, 11, 5))
        self.assertEqual(payload["items"]["ddr5_16gb"]["latestValue"], 61)
        self.assertEqual(payload["items"][MODULE_KEY]["latestDate"], "2026-11-04")
        self.assertIsNone(payload["items"]["gddr6_8gb"]["latestDate"])

    def test_module_ranges_and_collection_dates(self):
        payload = build_payload([module_row("2026-11-02"), module_row("2026-11-04")], date(2026, 11, 5))
        item = payload["items"][MODULE_KEY]
        first, last = [payload["labels"].index(day) for day in ("2026-11-02", "2026-11-04")]
        self.assertEqual(item["latestValue"], 2165)
        self.assertEqual(item["latestHigh"], 2370)
        self.assertEqual(item["latestLow"], 2100)
        self.assertEqual(item["latestDate"], "2026-11-04")
        self.assertEqual(item["dateBasis"], "sheet_collection_date")
        self.assertEqual(item["history"][first], item["history"][last])
        self.assertIsNone(item["history"][first + 1])
        self.assertEqual(item["highHistory"][last], 2370)
        self.assertEqual(item["lowHistory"][last], 2100)
        self.assertEqual(payload["updatedAt"], "2026-11-04")

    def test_reject_other_modules_invalid_prices_and_future_dates(self):
        rows = [module_row("2026-11-01")]
        for field, value in [("Product", "DDR5 RDIMM 64GB 4800/5600"),
                             ("Product", "DDR5 RDIMM 32GB 6400"),
                             ("Price_Average", "NaN"), ("Price_Average", "bad"),
                             ("Price_Average", "0"), ("Price_High", "100"), ("Price_Low", "3000")]:
            row = module_row("2026-11-04")
            row[field] = value
            rows.append(row)
        rows.append(module_row("2026-11-06"))
        item = build_payload(rows, date(2026, 11, 5))["items"][MODULE_KEY]
        self.assertEqual(item["latestDate"], "2026-11-01")
        self.assertEqual(sum(value is not None for value in item["history"]), 1)

    def test_legacy_six_series_unchanged(self):
        rows = [dict(Date="2026-11-04", Canonical_Product=canonical,
                     Price_Average="12.3456", Change_Pct="-1.234")
                for key, canonical in TARGET_MAP.items() if key != MODULE_KEY]
        payload = build_payload(rows, date(2026, 11, 5))
        for key in TARGET_MAP:
            if key == MODULE_KEY:
                continue
            item = payload["items"][key]
            self.assertEqual(set(item), {"history", "latestValue", "latestChangePct", "latestDate"})
            self.assertEqual(item["latestValue"], 12.346)
            self.assertEqual(item["latestChangePct"], -1.23)
            self.assertIsNone(item["history"][-1])


if __name__ == "__main__":
    unittest.main()

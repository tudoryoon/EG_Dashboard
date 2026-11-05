import unittest
from datetime import date, datetime, timezone

from update_memory_spot import (DIRECT_PRODUCTS, MODULE_KEY, MODULE_PRODUCT, TARGET_MAP,
                                build_payload, merge_direct_dram, parse_direct_dram)


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

    def test_newest_direct_quote_persists_until_sheet_catches_up(self):
        quote = parse_direct_dram(direct_html(), self.now)
        payload = build_payload([], date(2026, 11, 5))
        merge_direct_dram(payload, {}, quote, date(2026, 11, 5))
        self.assertEqual(payload["items"]["ddr5_16gb"]["latestDate"], "2026-11-05")
        self.assertEqual(payload["updatedAt"], "2026-11-05")
        older = parse_direct_dram(direct_html("Nov.5 2026 10:00 (GMT+8)").replace("60.667", "62"), self.now)
        next_payload = build_payload([], date(2026, 11, 6))
        merge_direct_dram(next_payload, payload, older, date(2026, 11, 6))
        self.assertEqual(next_payload["items"]["ddr5_16gb"]["latestValue"], 60.667)
        self.assertIsNone(next_payload["items"]["ddr5_16gb"]["history"][-1])
        final_rows = [dict(Date="2026-11-05", Canonical_Product=TARGET_MAP["ddr5_16gb"],
                           Price_Average="59", Change_Pct="-2")]
        final = build_payload(final_rows, date(2026, 11, 6))
        merge_direct_dram(final, next_payload, None, date(2026, 11, 6))
        self.assertEqual(final["items"]["ddr5_16gb"]["latestValue"], 59)
        self.assertNotIn("latestSource", final["items"]["ddr5_16gb"])

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

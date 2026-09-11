import copy
from datetime import datetime
import unittest
from unittest.mock import patch

import msci_acwi_ntr as acwi
import update_market_trend_score as trend
from test_trend_history import fixture


class AcwiTests(unittest.TestCase):
    def trend_fixture(self):
        rs, prices = fixture(tickers=("AAA", acwi.TICKER))
        rs["rows"][-1].update(isIndex=True, marketCap=None, asOfDate=rs["updatedAt"], rsRatingAll=70)
        result = {"updatedAt": rs["updatedAt"], "historyDates": rs["historyDates"],
                  "rows": {"all": [{"ticker": "AAA", "rank": 17}], "sp500": []},
                  "histories": {"all": {"AAA": {"score": [7], "rank": [17]}}, "sp500": {}}}
        return rs, prices, result

    def test_trend_repair_preserves_stocks_and_does_not_rank_index(self):
        rs, prices, result = self.trend_fixture()
        before = copy.deepcopy((rs, prices, result))
        acwi.refresh_trend_index(result, rs, prices)
        row = result["rows"]["all"][-1]
        self.assertEqual(row["asOfDate"], rs["updatedAt"])
        self.assertEqual(row["score"], 10)
        self.assertTrue(row["isIndex"])
        self.assertIsNone(row["rank"])
        self.assertTrue(all(v is None for v in result["histories"]["all"][acwi.TICKER]["rank"]))
        self.assertEqual(result["rows"]["all"][0], before[2]["rows"]["all"][0])
        self.assertEqual(result["histories"]["all"]["AAA"], before[2]["histories"]["all"]["AAA"])
        self.assertEqual(result["rows"]["sp500"], [])
        self.assertEqual((rs, prices), before[:2])
        acwi.refresh_trend_index(result, rs, prices)
        self.assertEqual(len(result["rows"]["all"]), 2)

    def test_trend_staleness_checks_row_and_history_not_global_date(self):
        rs, prices, result = self.trend_fixture()
        self.assertTrue(acwi.trend_index_is_stale(rs, result))
        acwi.refresh_trend_index(result, rs, prices)
        self.assertFalse(acwi.trend_index_is_stale(rs, result))
        current = copy.deepcopy(result)
        result["histories"]["all"][acwi.TICKER]["score"][-1] = None
        self.assertTrue(acwi.trend_index_is_stale(rs, result))
        result = copy.deepcopy(current)
        result["rows"]["all"][-1]["asOfDate"] = rs["historyDates"][-2]
        self.assertTrue(acwi.trend_index_is_stale(rs, result))
        result = copy.deepcopy(current)
        result["rows"]["all"][-1]["price"] = 1
        self.assertTrue(acwi.trend_index_is_stale(rs, result))

    def test_guard_repairs_trend_when_rs_is_fresh_without_network(self):
        import json
        rs, prices, result = self.trend_fixture()
        self.assertFalse(acwi.rs_index_is_stale(rs))
        payloads = {"marketRsData": rs, "marketPriceData": prices, "marketTrendScoreData": result}
        with patch("sys.argv", ["msci_acwi_ntr.py", "--if-stale", "--rs-only"]), \
             patch("add_market_rs_tickers.load_js_payload", side_effect=lambda p, name: payloads[name]), \
             patch.object(acwi, "fetch_item") as fetch, \
             patch.object(acwi, "append_rs_index") as append, \
             patch("pathlib.Path.write_text", autospec=True) as write:
            acwi.main()
        fetch.assert_not_called()
        append.assert_not_called()
        self.assertEqual(write.call_count, 1)
        self.assertEqual(write.call_args.args[0].name, "market-trend-score-data.js")
        saved = json.loads(write.call_args.args[1].split("=", 1)[1].strip().rstrip(";"))
        self.assertFalse(acwi.trend_index_is_stale(rs, saved))

    def test_full_refresh_includes_index_but_excludes_it_from_rank(self):
        rs, prices, _ = self.trend_fixture()
        with patch.object(trend, "load_market_rs_payload", return_value=rs), \
             patch.object(trend, "load_market_price_payload", return_value=prices):
            result = trend.build_payload()
        self.assertFalse(acwi.trend_index_is_stale(rs, result))
        self.assertEqual(result["rows"]["all"][0]["rank"], 1)
        self.assertIsNone(result["rows"]["all"][-1]["rank"])

    def test_targeted_update_rejects_calendar_mismatch_without_mutating(self):
        rs, prices, result = self.trend_fixture()
        result["historyDates"] = result["historyDates"][:-1]
        before = copy.deepcopy(result)
        with self.assertRaisesRegex(ValueError, "history dates differ"):
            acwi.refresh_trend_index(result, rs, prices)
        self.assertEqual(result, before)

    def test_morning_cutoff_includes_completed_us_session(self):
        for stamp, expected in [
            ("2026-09-09T20:09:00+00:00", "2026-09-08"),
            ("2026-09-09T20:10:00+00:00", "2026-09-09"),
            ("2026-09-09T22:00:00+00:00", "2026-09-09"),
            ("2026-09-10T01:00:00+00:00", "2026-09-09"),
            ("2026-12-09T21:09:00+00:00", "2026-12-08"),
            ("2026-12-09T21:10:00+00:00", "2026-12-09"),
            ("2026-09-13T22:00:00+00:00", "2026-09-11"),
        ]:
            self.assertEqual(acwi.latest_completed_date(datetime.fromisoformat(stamp)), expected)

    def test_index_staleness_independent_of_overall_rs_date(self):
        p = {"updatedAt": "2026-09-09", "rows": [{"ticker": acwi.TICKER, "asOfDate": "2026-09-08"}],
             "histories": {acwi.TICKER: {"price": [639.13, None], "rsRatingAll": [55, None]}}}
        self.assertTrue(acwi.rs_index_is_stale(p))
        p["rows"][0]["asOfDate"] = "2026-09-09"
        self.assertTrue(acwi.rs_index_is_stale(p))
        p["histories"][acwi.TICKER] = {"price": [639.13, 635.84], "rsRatingAll": [55, 56]}
        self.assertFalse(acwi.rs_index_is_stale(p))

    def observation(self, day, close=101):
        return {"rowDateTimestamp": day + "T00:00:00Z", "last_openRaw": "100",
                "last_maxRaw": "102", "last_minRaw": "99", "last_closeRaw": str(close)}

    def test_exact_identity_and_no_synthetic_volume(self):
        result = acwi.parse_history({"data": [self.observation("2026-09-08")]}, "2026-09-08")
        self.assertEqual(result["symbol"], "MIWD00000NUS")
        self.assertEqual(result["returnType"], "Net Total Return")
        self.assertEqual(result["currency"], "USD")
        self.assertNotIn("volume", result)
        self.assertNotEqual(result["symbol"], "ACWI")

    def test_sorted_completed_weekdays_only(self):
        rows = [self.observation(d) for d in ["2026-09-09", "2026-09-08", "2026-09-06", "2026-09-07"]]
        self.assertEqual(acwi.parse_history({"data": rows}, "2026-09-08")["dates"], ["2026-09-07", "2026-09-08"])

    def test_reject_invalid_ohlc(self):
        for close in [float("nan"), 103, -1]:
            with self.assertRaises(ValueError):
                acwi.parse_history({"data": [self.observation("2026-09-08", close)]}, "2026-09-08")

    def test_outage_preserves_existing(self):
        old = {"dates": ["2026-09-08"], "values": [639.09]}
        with patch.object(acwi.requests, "get", side_effect=RuntimeError("offline")):
            self.assertIs(acwi.fetch_item(old), old)
            with self.assertRaises(RuntimeError):
                acwi.fetch_item()

    def test_append_does_not_rerank_stocks(self):
        import numpy as np
        import pandas as pd
        dates = pd.bdate_range("2025-01-01", periods=300).strftime("%Y-%m-%d").tolist()
        values = np.linspace(100, 150, len(dates)).tolist()
        item = {"dates": dates, **{key: values for key in ("opens", "highs", "lows", "closes")}}
        payload = {"updatedAt": dates[-1], "historyDates": dates,
                   "rows": [{"ticker": "ACWI", "rsRatingAll": 67}],
                   "histories": {"ACWI": {"price": values, "rsRatingAll": [67] * len(dates)}}}
        old = copy.deepcopy(payload)
        acwi.append_rs_index(payload, item)
        self.assertEqual(payload["rows"][0], old["rows"][0])
        self.assertEqual(payload["histories"]["ACWI"], old["histories"]["ACWI"])
        new = payload["rows"][-1]
        self.assertIsNone(new["marketCap"])
        self.assertIsNone(new["sharesOutstanding"])
        self.assertEqual(new["rsRatingAll"], 50)
        self.assertTrue(all(v is None for v in payload["histories"][acwi.TICKER]["volume"]))
        acwi.append_rs_index(payload, item)
        self.assertEqual(len(payload["rows"]), 2)


if __name__ == "__main__":
    unittest.main()

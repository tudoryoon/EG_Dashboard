from __future__ import annotations

import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import pandas as pd

import update_market_briefing as briefing


class BriefingSessionTests(unittest.TestCase):
    def test_stock_correlation_deduplicates_us_members_and_keeps_short_history(self):
        dates = pd.bdate_range("2026-09-01", periods=6)
        panels = [{"items": [{"ticker": ticker} for ticker in ["AAA", "IPO", "ETF", "MISSING", "005930.KS", "000660.KS"]]},
                  {"items": [{"ticker": "AAA"}]}]
        closes = pd.DataFrame({"QQQ": [100] * 6, "AAA": [50, 55, None, 66, 72.6, 72.6],
                               "IPO": [None, None, None, 100, 105, 110], "ETF": [100, 101, 102, 103, 104, 105]}, index=dates)
        history = {"test": [{"date": date.strftime("%Y-%m-%d")} for date in dates[1:]]}
        result = briefing.build_stock_correlation_history(closes, panels, history)
        self.assertEqual(set(result["returns"]), {"AAA", "IPO", "ETF", "MISSING"})
        self.assertEqual(result["returns"]["AAA"], [10, None, None, 10, 0])
        self.assertEqual(result["returns"]["IPO"], [None, None, None, 5, 4.761905])
        self.assertEqual(result["returns"]["MISSING"], [None] * 5)
        self.assertEqual(result["dates"], [row["date"] for row in history["test"]])
        json.dumps(result, allow_nan=False)

    def test_stock_correlation_missing_session_and_zero_are_not_forward_filled(self):
        dates = pd.bdate_range("2026-09-01", periods=5)
        closes = pd.DataFrame({"QQQ": [100] * 4, "AAA": [10, 20, 0, 25]}, index=dates[[0, 2, 3, 4]])
        history = {"test": [{"date": date.strftime("%Y-%m-%d")} for date in dates[1:]]}
        result = briefing.build_stock_correlation_history(closes, [{"items": [{"ticker": "AAA"}]}], history)
        self.assertEqual(result["returns"]["AAA"], [None] * 4)

    def test_correlation_only_preserves_existing_briefing_fields_and_cutoff(self):
        dates = pd.bdate_range("2026-09-01", periods=5)
        payload = {"updatedAt": "2026-09-04", "generatedAt": "unchanged", "indexCards": [1], "fedWatch": {"keep": True},
                   "sectorPanels": [{"items": [{"ticker": "AAA"}]}],
                   "rotationSignal": {"history": {"test": [{"date": date.strftime("%Y-%m-%d")} for date in dates[1:4]]}}}
        before = json.loads(json.dumps(payload))
        closes = pd.DataFrame({"QQQ": [100] * 5, "AAA": [100, 101, 102, 103, 104]}, index=dates)
        with patch.object(briefing, "fetch_price_frame", return_value=closes):
            briefing.refresh_stock_correlation_only(payload)
        self.assertEqual(payload["stockCorrelation"]["dates"][-1], "2026-09-04")
        self.assertEqual({key: value for key, value in payload.items() if key != "stockCorrelation"}, before)

    def test_krx_holiday_uses_last_completed_exchange_session(self):
        morning = datetime(2026, 10, 5, 22, 20, tzinfo=timezone.utc)
        afternoon = datetime(2026, 10, 6, 7, 0, tzinfo=timezone.utc)
        self.assertEqual(briefing.latest_completed_krx_session(morning).date().isoformat(), "2026-10-02")
        self.assertEqual(briefing.latest_completed_krx_session(afternoon).date().isoformat(), "2026-10-06")

    def test_korean_close_is_current_on_krx_holiday_even_after_us_close(self):
        dates = pd.to_datetime(["2026-10-01", "2026-10-02", "2026-10-05"])
        frame = pd.DataFrame({"QQQ": [100, 101, 102], "005930.KS": [200, 210, None]}, index=dates)
        sectors = [{"key": "test", "label": "test", "items": [
            {"ticker": "QQQ", "name": "QQQ"}, {"ticker": "005930.KS", "name": "Samsung"},
        ]}]
        with patch.object(briefing, "SECTOR_GROUPS", sectors), \
             patch.object(briefing, "fetch_price_frame", return_value=frame), \
             patch.object(briefing, "latest_completed_market_timestamp", return_value=dates[-1]), \
             patch.object(briefing, "latest_completed_krx_session", return_value=dates[1]), \
             patch.object(briefing, "build_rotation_benchmark", return_value={}), \
             patch.object(briefing, "load_previous_market_meta", return_value={}), \
             patch.object(briefing, "fetch_meta", return_value={}):
            _, by_ticker, _, _, _ = briefing.build_company_snapshots()
        korean = by_ticker["005930.KS"]
        self.assertEqual(korean["priceDate"], "2026-10-02")
        self.assertFalse(korean["isStalePrice"])
        self.assertEqual(korean["dayChangePct"], 5)
        self.assertEqual(by_ticker["QQQ"]["priceDate"], "2026-10-05")
        self.assertFalse(by_ticker["QQQ"]["isStalePrice"])

    def test_individual_gap_is_repaired_when_qqq_is_complete(self):
        dates = pd.to_datetime(["2026-09-21", "2026-09-22", "2026-09-23"])
        closes = {"QQQ": pd.Series([740, 747, 741], index=dates),
                  "VICR": pd.Series([223.9, 283.16], index=dates[[0, 2]])}
        official = dict(zip(dates, [223.9, 268.34, 283.16]))
        with patch.object(briefing, "load_previous_market_prices", return_value=(None, {}, {})), \
             patch.object(briefing, "fetch_nasdaq_daily_closes", return_value=official) as fetch:
            briefing.fill_missing_recent_session_gaps(closes)
        fetch.assert_called_once()
        self.assertEqual(fetch.call_args.args[0], "VICR")
        self.assertEqual(briefing.compute_recent_day_change(closes["VICR"]), (5.52, 283.16, 268.34))

    def test_missing_previous_session_is_not_a_two_day_return(self):
        dates = pd.bdate_range("2026-09-16", periods=6)
        frame = pd.DataFrame({"QQQ": [100] * 6, "VICR": [200, 210, 215, 223.9, None, 283.16]}, index=dates)
        series = briefing.session_aligned_close(frame, "VICR")
        self.assertIsNone(briefing.compute_recent_day_change(series)[0])
        self.assertEqual(briefing.compute_period_return(series, 5), 41.58)
        self.assertIsNone(briefing.compute_series_rotation_returns(frame, "VICR", dates[-1])["1d"])
        self.assertEqual(briefing.compute_series_rotation_returns(frame, "VICR", dates[-1])["1w"], 41.58)

    def test_weekend_and_market_holiday_are_not_missing_sessions(self):
        dates = pd.to_datetime(["2026-09-04", "2026-09-08"])
        closes = {"QQQ": pd.Series([100, 101], index=dates), "VICR": pd.Series([200, 220], index=dates)}
        with patch.object(briefing, "load_previous_market_prices", return_value=(None, {}, {})), \
             patch.object(briefing, "fetch_nasdaq_daily_closes", return_value=dict(zip(dates, [100, 101]))):
            briefing.fill_missing_recent_session_gaps(closes)
        self.assertEqual(len(closes["VICR"]), 2)
        self.assertEqual(briefing.compute_recent_day_change(closes["VICR"])[0], 10)

    def test_qqq_gap_does_not_remove_a_known_us_session(self):
        dates = pd.to_datetime(["2026-09-21", "2026-09-22", "2026-09-23"])
        frame = pd.DataFrame({"QQQ": [100, None, 110], "SPY": [100, 101, 102], "VICR": [200, None, 240]}, index=dates)
        self.assertIsNone(briefing.compute_recent_day_change(briefing.session_aligned_close(frame, "VICR"))[0])
        self.assertIsNone(briefing.build_rotation_benchmark(frame)["returns"]["1d"])

    def test_outlier_never_selects_an_older_base(self):
        self.assertEqual(briefing.compute_recent_day_change(pd.Series([100, 1, 100]))[0], None)

    def test_nasdaq_close_keeps_existing_adjustment_basis(self):
        dates = pd.to_datetime(["2026-09-21", "2026-09-22", "2026-09-23"])
        closes = {"QQQ": pd.Series([100, 101, 102], index=dates), "TEST": pd.Series([50, 60], index=dates[[0, 2]])}
        with patch.object(briefing, "load_previous_market_prices", return_value=(None, {}, {})), \
             patch.object(briefing, "fetch_nasdaq_daily_closes", return_value=dict(zip(dates, [100, 110, 120]))):
            briefing.fill_missing_recent_session_gaps(closes)
        self.assertEqual(closes["TEST"].loc[dates[1]], 55)

    def test_stale_snapshot_is_not_relabelled_as_newer_price(self):
        payload = {"updatedAt": "2026-09-22", "sectorPanels": [{"items": [
            {"ticker": "VICR", "price": 223.9, "priceDate": "2026-09-21", "isStalePrice": True},
            {"ticker": "GOOD", "price": 100, "priceDate": "2026-09-22"},
        ]}]}
        with patch.object(briefing, "OUTPUT_PATH") as path:
            path.exists.return_value = True
            path.read_text.return_value = "window.marketBriefingData = " + json.dumps(payload) + ";"
            _, prices, _ = briefing.load_previous_market_prices()
        self.assertEqual(prices, {"GOOD": 100})

    def test_missing_ex_dividend_close_uses_post_dividend_basis(self):
        dates = pd.to_datetime(["2026-09-21", "2026-09-22", "2026-09-23"])
        closes = {"QQQ": pd.Series([100, 101, 102], index=dates), "APH": pd.Series([80.595, 82.19], index=dates[[0, 2]])}
        with patch.object(briefing, "load_previous_market_prices", return_value=(None, {}, {})), \
             patch.object(briefing, "fetch_nasdaq_daily_closes", return_value=dict(zip(dates, [80.72, 82.84, 82.19]))), \
             patch.object(briefing, "fetch_recent_price_action_dates", return_value={dates[1]}):
            briefing.fill_missing_recent_session_gaps(closes)
        self.assertEqual(closes["APH"].loc[dates[1]], 82.84)
        self.assertEqual(briefing.compute_recent_day_change(closes["APH"])[0], -0.78)

    def test_missing_pre_dividend_close_keeps_pre_dividend_adjustment(self):
        dates = pd.to_datetime(["2026-09-18", "2026-09-21", "2026-09-22"])
        closes = {"QQQ": pd.Series([100, 101, 102], index=dates), "TEST": pd.Series([99, 120], index=dates[[0, 2]])}
        with patch.object(briefing, "load_previous_market_prices", return_value=(None, {}, {})), \
             patch.object(briefing, "fetch_nasdaq_daily_closes", return_value=dict(zip(dates, [100, 110, 120]))), \
             patch.object(briefing, "fetch_recent_price_action_dates", return_value={dates[2]}):
            briefing.fill_missing_recent_session_gaps(closes)
        self.assertEqual(closes["TEST"].loc[dates[1]], 108.9)


if __name__ == "__main__":
    unittest.main()

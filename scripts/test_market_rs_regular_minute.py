import unittest
from unittest.mock import Mock, patch

import pandas as pd

import update_market_rs as rs


class RegularMinuteRangeTests(unittest.TestCase):
    def chart_response(self, final_close=48.78):
        first = pd.Timestamp("2026-11-12 09:30", tz="America/New_York")
        count = 391
        stamps = [int((first + pd.Timedelta(minutes=i)).timestamp()) for i in range(count)]
        quote = {
            "open": [47.33] + [48.0] * (count - 1),
            "high": [47.33] + [52.75] + [49.0] * (count - 2),
            "low": [47.33] + [47.82] * (count - 1),
            "close": [48.0] * (count - 1) + [final_close],
        }
        response = Mock()
        response.json.return_value = {"chart": {"result": [{
            "meta": {"exchangeTimezoneName": "America/New_York"},
            "timestamp": stamps,
            "indicators": {"quote": [quote]},
        }]}}
        return response

    @patch.object(rs.requests, "get")
    def test_reconstructs_range_from_completed_regular_minutes(self, get):
        get.return_value = self.chart_response()
        result = rs.fetch_regular_minute_ohlc("AMBQ", pd.Timestamp("2026-11-12"), 48.78)
        self.assertEqual(result, ("AMBQ", {"open": 47.33, "high": 52.75, "low": 47.33}))
        self.assertEqual(get.call_args.kwargs["params"]["includePrePost"], "false")

    @patch.object(rs.requests, "get")
    def test_rejects_wrong_close_or_out_of_session_bar(self, get):
        get.return_value = self.chart_response(final_close=50.70)
        self.assertIsNone(rs.fetch_regular_minute_ohlc("AMBQ", pd.Timestamp("2026-11-12"), 48.78))
        get.return_value = self.chart_response()
        get.return_value.json.return_value["chart"]["result"][0]["timestamp"][-1] += 60
        self.assertIsNone(rs.fetch_regular_minute_ohlc("AMBQ", pd.Timestamp("2026-11-12"), 48.78))

    @patch.object(rs.requests, "get")
    def test_accepts_late_first_and_early_last_actual_trade(self, get):
        get.return_value = self.chart_response()
        result = get.return_value.json.return_value["chart"]["result"][0]
        quote = result["indicators"]["quote"][0]
        for key in quote:
            quote[key] = quote[key][49:]
        result["timestamp"] = result["timestamp"][49:]
        quote["open"][0] = quote["low"][0] = 47.33
        quote["high"][0] = 47.33
        quote["close"][0] = 47.33
        quote["high"][50] = 52.75
        for index in range(313, len(result["timestamp"])):
            for key in quote:
                quote[key][index] = None
        quote["close"][312] = 48.78
        self.assertEqual(rs.fetch_regular_minute_ohlc("BRT", pd.Timestamp("2026-11-12"), 48.78),
                         ("BRT", {"open": 47.33, "high": 52.75, "low": 47.33}))

    @patch.object(rs, "fetch_regular_minute_ohlc")
    def test_repairs_only_invalid_latest_candle(self, fetch):
        date = pd.DatetimeIndex(["2026-11-12"])
        close = pd.DataFrame({"BAD": [48.78], "GOOD": [10.0]}, index=date)
        opening = pd.DataFrame({"BAD": [47.33], "GOOD": [9.5]}, index=date)
        high = pd.DataFrame({"BAD": [52.64], "GOOD": [10.1]}, index=date)
        low = pd.DataFrame({"BAD": [47.82], "GOOD": [9.4]}, index=date)
        fetch.return_value = ("BAD", {"open": 47.33, "high": 52.75, "low": 47.33})
        rs.repair_invalid_latest_daily_ranges(close, opening, high, low)
        self.assertEqual(low.at[date[0], "BAD"], 47.33)
        self.assertEqual(high.at[date[0], "GOOD"], 10.1)
        fetch.assert_called_once()


if __name__ == "__main__":
    unittest.main()

import unittest
from unittest.mock import Mock, patch

import pandas as pd

import update_market_rs as rs


class HznRenameTests(unittest.TestCase):
    def frames(self):
        dates = pd.to_datetime(["2026-11-13", "2026-11-16"])
        return [pd.DataFrame({"HZN": [86.7, 86.7]}, index=dates) for _ in range(6)]

    def response(self, *, previous=86.7, low=82.64):
        payload = {"chart": {"result": [{
            "meta": {"symbol": "HZN", "instrumentType": "EQUITY", "currency": "USD",
                     "exchangeName": "NYQ", "exchangeTimezoneName": "America/New_York",
                     "longName": "Bright Horizon Energy Corporation",
                     "chartPreviousClose": previous},
            "timestamp": [1794862802],
            "indicators": {"quote": [{"open": [87.77], "high": [87.9],
                                     "low": [low], "close": [85.42], "volume": [2847965]}],
                           "adjclose": [{"adjclose": [85.42]}]},
        }]}}
        response = Mock()
        response.json.return_value = payload
        return response

    def test_first_session_replaces_carried_close_with_real_ohlcv(self):
        frames = self.frames()
        with patch.object(rs.requests, "get", return_value=self.response()):
            rs.repair_hzn_first_session(*frames)
        self.assertEqual([frame.at[pd.Timestamp("2026-11-16"), "HZN"]
                          for frame in frames], [85.42, 85.42, 87.77, 87.9, 82.64, 2847965])
        self.assertTrue(all(frame.at[pd.Timestamp("2026-11-13"), "HZN"] == 86.7
                            for frame in frames))

    def test_previous_close_mismatch_rejects_without_partial_edit(self):
        frames = self.frames()
        with patch.object(rs.requests, "get", return_value=self.response(previous=90)):
            with self.assertRaisesRegex(RuntimeError, "identity or BKH prior close"):
                rs.repair_hzn_first_session(*frames)
        self.assertTrue(all(frame.at[pd.Timestamp("2026-11-16"), "HZN"] == 86.7
                            for frame in frames))

    def test_invalid_daily_range_rejects_without_partial_edit(self):
        frames = self.frames()
        with patch.object(rs.requests, "get", return_value=self.response(low=86)):
            with self.assertRaisesRegex(RuntimeError, "OHLCV is invalid"):
                rs.repair_hzn_first_session(*frames)
        self.assertTrue(all(frame.at[pd.Timestamp("2026-11-16"), "HZN"] == 86.7
                            for frame in frames))


if __name__ == "__main__":
    unittest.main()

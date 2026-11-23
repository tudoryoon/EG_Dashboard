import unittest
from datetime import UTC, datetime

import pandas as pd

from update_asset_returns import UNIVERSE, build_snapshot, rank_session


class AssetReturnsTest(unittest.TestCase):
    def setUp(self):
        self.sessions = pd.bdate_range("2025-01-01", "2026-11-20")
        self.end = self.sessions[-1]
        self.closes = pd.DataFrame(100.0, index=self.sessions, columns=[t for t, _, _ in UNIVERSE])

    def test_month_offsets_fall_back_to_prior_session(self):
        self.closes.loc["2025-11-20", "SPY"] = 50
        self.closes.loc["2026-11-20", "SPY"] = 125
        self.closes.loc["2026-02-20", "SPY"] = 80
        row = rank_session(self.closes, self.sessions, self.end)[0]
        self.assertEqual(row["ticker"], "SPY")
        self.assertEqual(row["returns"], {"1M": 25, "3M": 25, "6M": 25, "9M": 56.25, "12M": 150})
        saturday_offset = self.sessions.asof(self.end - pd.DateOffset(months=6))
        self.assertEqual(saturday_offset, pd.Timestamp("2026-05-20"))
        holiday_offset = self.sessions.delete(self.sessions.get_loc(saturday_offset))
        self.closes.loc["2026-05-19", "SPY"] = 50
        self.assertEqual(rank_session(self.closes, holiday_offset, self.end)[0]["returns"]["6M"], 150)

    def test_rank_changes_use_previous_session_and_same_universe(self):
        self.closes.loc[self.sessions[-2], "QQQ"] = 120
        self.closes.loc[self.end, "SPY"] = 120
        result = build_snapshot(self.closes, self.sessions, datetime(2026, 11, 23, tzinfo=UTC))
        self.assertEqual((result["asOfDate"], result["previousDate"]), ("2026-11-20", "2026-11-19"))
        self.assertEqual(len(result["rows"]), 38)
        self.assertGreater(result["rows"][0]["rankChange"], 0)
        self.assertEqual(result["rows"][0]["ticker"], "SPY")
        self.assertLess(next(r["rankChange"] for r in result["rows"] if r["ticker"] == "QQQ"), 0)

    def test_missing_latest_quote_never_uses_stale_close(self):
        self.closes.loc[self.end, "QQQ"] = float("nan")
        with self.assertRaisesRegex(ValueError, "missing valid prices for QQQ"):
            rank_session(self.closes, self.sessions, self.end)


if __name__ == "__main__":
    unittest.main()

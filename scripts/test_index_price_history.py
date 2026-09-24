from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo
import unittest

import pandas as pd

import index_price_history as history
import update_market_briefing as briefing


DATES = pd.to_datetime(["2026-09-21", "2026-09-22", "2026-09-23"])
NOW = datetime(2026, 9, 24, 4, tzinfo=ZoneInfo("America/New_York"))


def bars(dates=DATES, values=(27122.09, 27244.28, 26936.04)):
    return pd.DataFrame({"open": values, "high": [v + 10 for v in values],
                         "low": [v - 10 for v in values], "close": values}, index=dates)


class IndexHistoryTests(unittest.TestCase):
    def test_shared_yahoo_gap_is_recovered_with_actual_bars(self):
        frames = {symbol: bars().iloc[[0, 2]] for symbol in history.INDEX_SYMBOLS}
        with patch.object(history, "fetch_recent_index_ohlc", return_value=bars()):
            result = history.repair_recent_index_frames(frames, now=NOW)
        for frame in result.values():
            self.assertEqual(list(frame.index), list(DATES))
            self.assertAlmostEqual((frame.close.iloc[-1] / frame.close.iloc[-2] - 1) * 100, -1.13139, places=4)
            self.assertTrue(frame.apply(history.valid_ohlc, axis=1).all())

    def test_missing_previous_session_fails_instead_of_using_proxy(self):
        frames = {symbol: bars().iloc[[0, 2]] for symbol in history.INDEX_SYMBOLS}
        with patch.object(history, "fetch_recent_index_ohlc", side_effect=RuntimeError("offline")):
            with self.assertRaisesRegex(RuntimeError, "Unresolved.*2026-09-22"):
                history.repair_recent_index_frames(frames, DATES, now=NOW)

    def test_actual_cached_history_survives_provider_gap(self):
        frames = {symbol: bars().iloc[[0, 2]] for symbol in history.INDEX_SYMBOLS}
        cached = {symbol: bars() for symbol in history.INDEX_SYMBOLS}
        with patch.object(history, "fetch_recent_index_ohlc", side_effect=RuntimeError("offline")):
            result = history.repair_recent_index_frames(frames, DATES, cached, NOW)
        self.assertEqual(result["^IXIC"].loc[DATES[1], "close"], 27244.28)

    def test_weekend_holiday_and_incomplete_day_not_synthetic_bars(self):
        dates = pd.to_datetime(["2026-09-04", "2026-09-08", "2026-09-24"])
        frames = {symbol: bars(dates, [100, 102, 103]) for symbol in history.INDEX_SYMBOLS}
        with patch.object(history, "fetch_recent_index_ohlc", return_value=bars(dates, [100, 102, 103])):
            result = history.repair_recent_index_frames(frames, dates, now=NOW)
        self.assertEqual(result["^IXIC"].index.strftime("%Y-%m-%d").tolist(), ["2026-09-04", "2026-09-08"])

    def test_no_change_to_old_history(self):
        old = bars(pd.to_datetime(["1971-02-05"]), [100])
        old.loc[:, "open"] = 0
        frames = {symbol: pd.concat([old, bars()]) for symbol in history.INDEX_SYMBOLS}
        with patch.object(history, "fetch_recent_index_ohlc", return_value=bars()):
            result = history.repair_recent_index_frames(frames, now=NOW)
        pd.testing.assert_frame_equal(result["^IXIC"].iloc[:1], old, check_freq=False, check_dtype=False)

    def test_official_revision_replaces_estimated_close(self):
        incorrect = bars(values=[27122.09, 27341.2, 26936.04])
        frames = {symbol: incorrect for symbol in history.INDEX_SYMBOLS}
        with patch.object(history, "fetch_recent_index_ohlc", return_value=bars()):
            result = history.repair_recent_index_frames(frames, now=NOW)
        self.assertEqual(result["^IXIC"].loc[DATES[1], "close"], 27244.28)

    def test_parse_rejects_invalid_candle_and_keeps_actual_ohlc(self):
        rows = [dict(date="09/22/2026", open="27,161.20", high="27,288.79", low="27,161.20", close="27,244.28"),
                dict(date="09/23/2026", open="100", high="90", low="95", close="101")]
        parsed = history.parse_index_rows(rows, nasdaq=True)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed.iloc[0].close, 27244.28)
        pd.testing.assert_frame_equal(history.item_to_frame(history.apply_frame_to_item({}, parsed)), parsed)

    def test_briefing_uses_same_index_bars_and_previous_date(self):
        frames = {symbol: bars().iloc[[0, 2]] for symbol in history.INDEX_SYMBOLS}
        reference = pd.DataFrame({"QQQ": [740, 746, 741]}, index=DATES)
        with patch.object(briefing, "OUTPUT_PATH") as path, \
             patch.object(history, "fetch_recent_index_ohlc", return_value=bars()), \
             patch.object(briefing, "repair_recent_index_frames", side_effect=lambda frames, refs, cached: history.repair_recent_index_frames(frames, refs, cached, NOW)):
            path.with_name.return_value.exists.return_value = False
            cards = briefing.build_index_cards(reference, frames)
        nasdaq = next(card for card in cards if card["key"] == "nasdaq")
        self.assertEqual(nasdaq["returns"]["1d"], -1.13)
        self.assertEqual(nasdaq["previousCloseDate"], "2026-09-22")
        self.assertEqual(nasdaq["previousClose"], 27244.28)


if __name__ == "__main__":
    unittest.main()

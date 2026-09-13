import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from market_regime import (BENCHMARKS, calculate, deduplicate, event_score, matured_events,
                           quadrant, regime, resolve_session, swing_structure, wilder_rsi)
from update_market_regime import normalize_frame, publish, validate, APP


class SessionTests(unittest.TestCase):
    def session(self, timestamp):
        return resolve_session(datetime.fromisoformat(timestamp), scheduled=True)

    def test_us_friday_is_korean_saturday(self):
        result = self.session("2026-09-12T05:05:00+09:00")
        self.assertEqual(result["date"], "2026-09-11")
        self.assertEqual(result["waitSeconds"], 0)

    def test_korean_sunday_and_monday_are_skipped(self):
        for day in (13, 14):
            self.assertIsNone(self.session(f"2026-09-{day}T05:05:00+09:00"))

    def test_holiday(self):
        self.assertIsNone(self.session("2026-09-08T05:05:00+09:00"))  # Labor Day

    def test_winter_waits_for_close(self):
        result = self.session("2026-12-02T05:05:00+09:00")
        self.assertEqual(result["date"], "2026-12-01")
        self.assertEqual(result["waitSeconds"], 3600)

    def test_early_close(self):
        self.assertEqual(self.session("2026-11-28T05:05:00+09:00")["waitSeconds"], 0)

    def test_manual_weekend_uses_friday_not_future(self):
        self.assertEqual(resolve_session(datetime.fromisoformat("2026-09-13T12:00:00+09:00"))["date"], "2026-09-11")


class CalculationTests(unittest.TestCase):
    def test_rsi_wilder_seed(self):
        self.assertEqual(wilder_rsi(pd.Series([1., 2, 3, 4, 5, 6])).iloc[-1], 100)
        self.assertEqual(wilder_rsi(pd.Series([6., 5, 4, 3, 2, 1])).iloc[-1], 0)
        self.assertEqual(wilder_rsi(pd.Series([1.] * 6)).iloc[-1], 50)

    def test_event_maturity_and_missing_bar(self):
        c = pd.DataFrame({"A": np.arange(100., 111)})
        signals = pd.DataFrame({"A": [True] + [False] * 10})
        e = matured_events(c, signals)
        self.assertTrue(e.iloc[:5].isna().all().all())
        self.assertAlmostEqual(e.iloc[5, 0], 5)
        c.iloc[3, 0] = np.nan
        self.assertTrue(matured_events(c, signals).isna().all().all())

    def test_cooldown(self):
        out = deduplicate(pd.DataFrame({"A": [True] * 12}))
        self.assertEqual(list(np.flatnonzero(out.A)), [0, 5, 10])

    def test_event_sample_fallback_and_no_sample(self):
        events = pd.DataFrame({"A": [1., -1] * 40})
        self.assertEqual(event_score(events, 79)["window"], 21)
        events.iloc[-15:] = np.nan
        self.assertEqual(event_score(events, 79)["window"], 63)
        self.assertIsNone(event_score(events.iloc[:7], 6))

    def test_neutral_payoff(self):
        events = pd.DataFrame({"A": [1.] * 10, "B": [-1.] * 10})
        self.assertEqual(event_score(events, 9)["score"], 5)

    def test_regime_precedence_and_missing_quadrant(self):
        self.assertEqual(regime(120, 110, 100, 90, True, True, 8), "Power Trend")
        self.assertEqual(regime(120, 110, 100, 90, True, True, 4), "Uptrend")
        self.assertEqual(regime(70, 80, 90, 100, False, False, 2), "Severe Downtrend")
        self.assertEqual(quadrant(None, 8), "표본 부족")

    def test_pivot_does_not_use_unconfirmed_high(self):
        h = np.ones(40)
        h[8], h[20], h[34] = 3, 4, 2
        self.assertEqual(swing_structure(h, np.zeros(40), 35), .5)

    def test_normalization_removes_intraday_and_invalid_bars(self):
        frame = pd.DataFrame({"Close": [10, 10, 10], "High": [11, 9, 11], "Low": [9, 9, 9], "Volume": [100] * 3},
                             index=pd.date_range("2026-09-09", periods=3))
        self.assertEqual(normalize_frame(frame, "2026-09-10").index.strftime("%Y-%m-%d").tolist(), ["2026-09-09"])

    def test_publication_keeps_other_markets_and_rejects_regression(self):
        original = json.loads((APP / "snapshot.js").read_text(encoding="utf-8").strip()[11:-1])
        cache = APP.parents[1] / '.market-regime-cache'
        cache.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=cache) as directory:
            out = Path(directory)
            self.assertTrue(out.resolve().is_relative_to(cache.resolve()))
            publish(original["us"], original["us"]["asof"], [], out)
            result = json.loads((out / "snapshot.js").read_text(encoding="utf-8").strip()[11:-1])
            self.assertEqual(result["kr"], original["kr"])
            self.assertEqual(result["cn"], original["cn"])
            before = (out / "snapshot.js").read_bytes()
            old = {**original["us"], "asof": "2020-01-01"}
            with self.assertRaises(ValueError):
                publish(old, "2020-01-01", [], out)
            self.assertEqual((out / "snapshot.js").read_bytes(), before)

    def test_complete_calculation_and_future_invariance(self):
        import pandas_market_calendars as mcal
        dates = mcal.get_calendar("NYSE").valid_days("2023-01-01", "2026-09-11").tz_localize(None)
        frames = {}
        for i, ticker in enumerate(BENCHMARKS + ["A", "B"]):
            x = np.arange(len(dates))
            c = 100 + x * .1 + np.sin(x / (5 + i)) * 2
            frames[ticker] = pd.DataFrame({"Close": c, "High": c + 1, "Low": c - 1, "Volume": 1000.}, index=dates)
        result = calculate(frames, ["A", "B"], "2026-09-11")
        validate(result, ["A", "B"])
        earlier = calculate({k: v.iloc[:-10] for k, v in frames.items()}, ["A", "B"], dates[-11].date().isoformat())
        row = next(r for r in result["history"] if r["date"] == earlier["asof"])
        for metric in [f"s{i}" for i in range(1, 8)] + [f"p{i}" for i in range(1, 8)]:
            self.assertEqual(row[metric], earlier["latest"][metric], metric)


if __name__ == "__main__":
    unittest.main()

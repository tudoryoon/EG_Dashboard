import unittest
from unittest.mock import patch

import pandas as pd

import update_market_trend_score as trend


def fixture(start="2025-01-02", sessions=422, tickers=("AAA", "BBB")):
    dates = pd.bdate_range(start, periods=sessions).strftime("%Y-%m-%d").tolist()
    histories = {}
    rows = []
    for number, ticker in enumerate(tickers):
        prices = [100 + number * 20 + index * .5 for index in range(sessions)]
        histories[ticker] = {"price": prices, "rsRatingAll": [70] * sessions}
        rows.append({"ticker": ticker, "memberships": {}, "price": prices[-1], "marketCap": 1e10})
    source = {"updatedAt": dates[-1], "historyDates": dates, "histories": histories, "rows": rows}
    market = {"items": {"sp500": {"dates": dates, "values": [1000 + i for i in range(sessions)]}}}
    return source, market


def build(source, market):
    return trend.build_universe_payload("all", trend.UNIVERSES["all"], source, market, {}, {})


class TrendHistoryTests(unittest.TestCase):
    def test_uses_full_input_not_last_252_sessions(self):
        source, market = fixture()
        rows, histories = build(source, market)
        history = histories["AAA"]
        self.assertEqual(len(history["score"]), 422)
        self.assertTrue(all(value is None for value in history["score"][:199]))
        self.assertEqual(history["score"][199], 10)
        self.assertEqual(history["score"][-1], rows[0]["score"])
        self.assertEqual(set(history), {"score", "rank", "climaxScore"})
        self.assertTrue(all(isinstance(value, int) for value in history["score"][199:]))
        self.assertEqual(trend.get_history_dates(source)[0], "2025-01-02")

    def test_warmup_before_2025_is_used_but_not_exported(self):
        source, market = fixture(start="2024-01-02", sessions=500)
        _, histories = build(source, market)
        dates = trend.get_history_dates(source)
        self.assertEqual(dates[0], "2025-01-01")
        self.assertEqual(histories["AAA"]["score"][0], 10)
        self.assertEqual(len(histories["AAA"]["rank"]), len(dates))

    def test_score_is_causal_and_latest_score_matches_old_window(self):
        source, market = fixture()
        _, full = build(source, market)
        prefix = {**source, "historyDates": source["historyDates"][:300],
                  "histories": {ticker: {key: values[:300] for key, values in history.items()}
                                for ticker, history in source["histories"].items()}}
        _, past = build(prefix, market)
        self.assertEqual(full["AAA"]["score"][:300], past["AAA"]["score"])
        self.assertEqual(full["AAA"]["rank"][:300], past["AAA"]["rank"])
        tail = {**source, "historyDates": source["historyDates"][-252:],
                "histories": {ticker: {key: values[-252:] for key, values in history.items()}
                              for ticker, history in source["histories"].items()}}
        _, recent = build(tail, market)
        self.assertEqual(full["AAA"]["score"][-53:], recent["AAA"]["score"][-53:])

    def test_new_listing_keeps_existing_readiness_rules(self):
        source, market = fixture(tickers=("IPO", "DRAM", "SPCX"))
        for history in source["histories"].values():
            history["price"][:350] = [None] * 350
        rows, histories = build(source, market)
        self.assertTrue(all(value is None for value in histories["IPO"]["score"]))
        self.assertIsNone(histories["DRAM"]["score"][398])
        self.assertIsNotNone(histories["DRAM"]["score"][399])
        self.assertIsNone(histories["SPCX"]["score"][368])
        self.assertIsNotNone(histories["SPCX"]["score"][369])
        self.assertIsNone(next(row["score"] for row in rows if row["ticker"] == "IPO"))

    def test_priority_refresh_aligns_untouched_dates_and_preserves_global_rank(self):
        source, market = fixture()
        old_dates = source["historyDates"][-253:-1]
        existing = {"historyDates": old_dates, "rows": {"all": [
            {"ticker": "AAA", "rank": 15, "rankChange": 2},
            {"ticker": "BBB", "rank": 23, "rankChange": 0},
        ]}, "histories": {"all": {
            "AAA": {"score": [5] * 252, "rank": [15] * 252, "climaxScore": [0] * 252},
            "BBB": {"score": [7] * 252, "rank": [23] * 252, "climaxScore": [1] * 252},
        }}}
        with patch.object(trend, "load_market_rs_payload", return_value=source), \
             patch.object(trend, "load_market_price_payload", return_value=market), \
             patch.object(trend, "load_existing_payload", return_value=existing), \
             patch.object(trend, "load_daily_briefing_tickers", return_value={"AAA"}):
            result = trend.build_daily_briefing_priority_payload()
        self.assertEqual(result["historyDates"], source["historyDates"])
        a = result["histories"]["all"]["AAA"]
        b = result["histories"]["all"]["BBB"]
        offset = source["historyDates"].index(old_dates[0])
        self.assertTrue(all(value is None for value in b["score"][:offset]))
        self.assertEqual(b["score"][offset:-1], [7] * 252)
        self.assertIsNone(b["score"][-1])
        self.assertEqual(a["rank"][offset:-1], [15] * 252)
        self.assertIsNone(a["rank"][-1])
        self.assertEqual(a["score"][-1], 10)
        self.assertEqual(result["rows"]["all"][0]["rank"], 15)

    def test_empty_source(self):
        self.assertEqual(build({"historyDates": [], "rows": []}, {}), ([], {}))


if __name__ == "__main__":
    unittest.main()

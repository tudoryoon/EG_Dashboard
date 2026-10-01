import unittest
import pandas as pd

import update_market_breadth as breadth


def fixture(current, prior):
    dates = pd.bdate_range("2025-01-02", periods=len(current))
    warm_dates = pd.bdate_range("2024-01-02", periods=len(prior))
    source = {"updatedAt": dates[-1].strftime("%Y-%m-%d"), "historyDates": dates.strftime("%Y-%m-%d").tolist(),
              "rows": [{"ticker": "A"}], "histories": {"A": {"price": current}}}
    cache = {"dates": warm_dates.strftime("%Y-%m-%d").tolist(), "prices": {"A": prior}, "unavailable": {}}
    return source, cache


class BreadthTests(unittest.TestCase):
    def test_first_2025_day_uses_warmup_and_ties_count(self):
        source, cache = fixture([101, 101, 98, 98], [100] * 251)
        result = breadth.build_breadth(source, cache)
        self.assertEqual(result["dates"][0], "2025-01-02")
        self.assertEqual(result["series"]["newHigh"], [1, 1, 0, 0])
        self.assertEqual(result["series"]["newLow"], [0, 0, 1, 1])

    def test_extreme_expires_after_252_sessions(self):
        source, cache = fixture([100, 100], [110] + [99] * 251)
        result = breadth.build_breadth(source, cache)
        self.assertEqual(result["series"]["newHigh"], [1, 1])

    def test_missing_session_excludes_instead_of_fill(self):
        source, cache = fixture([101, None, 105], [100] * 251)
        result = breadth.build_breadth(source, cache)
        self.assertEqual(result["series"]["eligible"], [1, 0, 0])
        self.assertEqual(result["series"]["newHigh"], [1, 0, 0])

    def test_etf_included_index_and_insufficient_listing_excluded(self):
        source, cache = fixture([101, 102], [100] * 251)
        source["rows"] += [{"ticker": "ETF", "assetType": "ETF"}, {"ticker": "INDEX", "isIndex": True},
                           {"ticker": "IPO"}, {"ticker": "B"}, {"ticker": "C"}]
        source["histories"].update({"ETF": {"price": [90, 89]}, "INDEX": {"price": [200, 201]},
                                    "IPO": {"price": [101, 102]}, "B": {"price": [101, 102]}, "C": {"price": [101, 102]}})
        cache["prices"].update({ticker: [100] * 251 for ticker in ["ETF", "INDEX", "B", "C"]})
        result = breadth.build_breadth(source, cache)
        self.assertEqual(result["universeCount"], 5)
        self.assertEqual(result["series"]["eligible"], [4, 4])
        self.assertEqual(result["series"]["newHigh"], [3, 3])
        self.assertEqual(result["series"]["newLow"], [1, 1])

    def test_initial_coverage_guard_retains_previous_file(self):
        source, cache = fixture([101], [None] * 251)
        with self.assertRaisesRegex(ValueError, "coverage"):
            breadth.build_breadth(source, cache)


if __name__ == "__main__":
    unittest.main()

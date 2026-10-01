import unittest
from unittest.mock import patch

import update_market_rs as rs
import pandas as pd


class ManualCapExemptionTests(unittest.TestCase):
    def test_only_explicit_true_is_exempt(self):
        config = {"members": [
            {"ticker": "MINV", "minMarketCapExempt": True},
            {"ticker": "EEM"},
            {"ticker": "SMALL", "minMarketCapExempt": "true"},
        ]}
        with patch.object(rs, "load_manual_config", return_value=config):
            self.assertEqual(rs.get_manual_market_cap_exemptions(), {"MINV"})

    def test_positive_cap_still_required_and_default_floor_unchanged(self):
        exemptions = {"MINV"}
        self.assertTrue(rs.passes_market_cap_filter("MINV", 100_000_000, exemptions))
        for cap in [None, 0, -1]:
            self.assertFalse(rs.passes_market_cap_filter("MINV", cap, exemptions))
        self.assertFalse(rs.passes_market_cap_filter("OTHER", rs.MIN_MARKET_CAP_USD, exemptions))
        self.assertTrue(rs.passes_market_cap_filter("OTHER", rs.MIN_MARKET_CAP_USD + 1, exemptions))

    def test_scheduled_payload_keeps_minv_but_not_other_small_symbols(self):
        dates = pd.bdate_range("2025-01-02", periods=300)
        prices = pd.DataFrame({ticker: [100 + i / 10 for i in range(300)]
                               for ticker in ["MINV", "BIG", "SMALL", rs.BENCHMARK_SYMBOL]}, index=dates)
        universe = pd.DataFrame([{
            "ticker": ticker, "name": ticker,
            "member_sp500": False, "member_nasdaq100": False,
            "member_dowjones": False, "member_russell2000": False,
        } for ticker in ["MINV", "BIG", "SMALL"]])
        with patch.object(rs, "get_manual_market_cap_exemptions", return_value={"MINV"}), \
             patch.object(rs, "get_manual_universe_members", return_value=[{"ticker": "MINV"}]):
            payload = rs.build_payload(universe, prices, prices, prices, prices + 1, prices - 1,
                                       prices * 1000, {"MINV": 1000, "BIG": 3_000_000, "SMALL": 1000})
        self.assertEqual({row["ticker"] for row in payload["rows"]}, {"MINV", "BIG"})
        self.assertEqual(len(payload["histories"]["MINV"]["price"]), 300)


if __name__ == "__main__":
    unittest.main()

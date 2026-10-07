import unittest
from unittest.mock import patch

import update_market_rs as rs
import add_market_rs_tickers as add
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
             patch.object(rs, "load_existing_rows", return_value={}), \
             patch.object(rs, "get_manual_universe_members", return_value=[{"ticker": "MINV"}]):
            payload = rs.build_payload(universe, prices, prices, prices, prices + 1, prices - 1,
                                       prices * 1000, {"MINV": 1000, "BIG": 3_000_000, "SMALL": 1000})
        self.assertEqual({row["ticker"] for row in payload["rows"]}, {"MINV", "BIG"})
        self.assertEqual(len(payload["histories"]["MINV"]["price"]), 300)

    def test_existing_member_retained_without_admitting_new_small_member(self):
        with patch.object(rs, "get_manual_market_cap_exemptions", return_value=set()):
            exemptions = rs.get_market_cap_exemptions({"BGS": {}, "WBD": {}})
        self.assertEqual(exemptions, {"BGS"})
        self.assertTrue(rs.passes_market_cap_filter("BGS", 196_000_000, exemptions))
        self.assertFalse(rs.passes_market_cap_filter("NEW", 196_000_000, exemptions))
        self.assertFalse(rs.passes_market_cap_filter("WBD", 1_000_000_000, {"WBD"}))
        self.assertFalse(rs.passes_market_cap_filter("BGS", None, exemptions))

    def test_scheduled_payload_retains_existing_small_member(self):
        dates = pd.bdate_range("2025-01-02", periods=300)
        prices = pd.DataFrame({ticker: [100 + i / 10 for i in range(300)]
                               for ticker in ["BGS", "BIG", "NEW", rs.BENCHMARK_SYMBOL]}, index=dates)
        universe = pd.DataFrame([{
            "ticker": ticker, "name": ticker,
            "member_sp500": False, "member_nasdaq100": False,
            "member_dowjones": False, "member_russell2000": ticker == "BGS",
        } for ticker in ["BGS", "BIG", "NEW"]])
        with patch.object(rs, "get_manual_market_cap_exemptions", return_value=set()), \
             patch.object(rs, "load_existing_rows", return_value={"BGS": {}}), \
             patch.object(rs, "get_manual_universe_members", return_value=[]):
            payload = rs.build_payload(universe, prices, prices, prices, prices + 1, prices - 1,
                                       prices * 1000, {"BGS": 1000, "BIG": 3_000_000, "NEW": 1000})
        self.assertEqual({row["ticker"] for row in payload["rows"]}, {"BGS", "BIG"})

    def test_ticker_transfer_resolves_to_skyd_not_wbd(self):
        self.assertEqual(rs.normalize_ticker("PSKY"), "SKYD")
        self.assertFalse(rs.is_terminal_symbol("PSKY"))
        self.assertEqual(rs.normalize_ticker("WBD"), "WBD")
        self.assertTrue(rs.is_terminal_symbol("WBD"))

    def test_fast_add_keeps_configured_index_membership(self):
        dates = pd.bdate_range("2025-01-02", periods=300)
        frame = pd.DataFrame({
            "open": 100.0, "high": 101.0, "low": 99.0,
            "close": 100.0, "adjClose": 100.0, "volume": 1000,
        }, index=dates)
        payload = {"updatedAt": dates[-1].strftime("%Y-%m-%d"),
                   "historyDates": dates.strftime("%Y-%m-%d").tolist(), "rows": []}
        with patch.object(add, "manual_members_by_ticker", return_value={"SKYD": {"member_sp500": True}}):
            row, _ = add.build_new_row_and_history(payload, "SKYD", frame, "Skydance", 5_000_000)
        self.assertTrue(row["memberships"]["sp500"])
        self.assertFalse(row["memberships"]["nasdaq100"])


if __name__ == "__main__":
    unittest.main()

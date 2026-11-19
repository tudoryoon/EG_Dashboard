"""Closed cash acquisitions must not receive a synthetic next-session RS bar."""

import unittest

import update_market_rs as rs


class TerminalAcquisitionTests(unittest.TestCase):
    def test_closed_names_are_removed_from_cached_universe(self):
        existing = {
            "rows": [
                {"ticker": "LXFR", "name": "Luxfer", "memberships": {"russell2000": True}},
                {"ticker": "PCRX", "name": "Pacira", "memberships": {"russell2000": True}},
                {"ticker": "ITGR", "name": "Integer", "memberships": {"russell2000": True}},
                {"ticker": "HZN", "name": "Bright Horizon", "memberships": {"russell2000": True}},
            ]
        }
        result = rs.read_cached_universe(existing)
        self.assertEqual(result["ticker"].tolist(), ["HZN"])

    def test_closed_names_cannot_reenter_through_manual_universe(self):
        self.assertTrue(rs.is_terminal_symbol("LXFR"))
        self.assertTrue(rs.is_terminal_symbol("PCRX"))
        self.assertTrue(rs.is_terminal_symbol("ITGR"))
        self.assertFalse(rs.is_terminal_symbol("HZN"))


if __name__ == "__main__":
    unittest.main()

import argparse
import json
import unittest
from unittest.mock import MagicMock, patch

import update_market_briefing as briefing
import update_market_canslim_earnings as earnings


class RefiningSectorTests(unittest.TestCase):
    def test_sector_has_exactly_five_unique_members(self):
        sector = next(s for s in briefing.SECTOR_GROUPS if s["key"] == "refining")
        self.assertEqual(sector["label"], "정유")
        tickers = [item["ticker"] for item in sector["items"]]
        self.assertEqual(set(tickers), {"VLO", "MPC", "PSX", "DINO", "PBF"})
        self.assertEqual(len(tickers), 5)
        self.assertNotIn("scoreTickers", sector)

    def run_earnings(self, selected, scope="all", empty=False):
        existing = {"VLO": {"ticker": "VLO", "quarters": [{"eps": 1}]}, "KEEP": {"ticker": "KEEP", "quarters": [{"eps": 2}]}}
        output = MagicMock()
        with patch.object(earnings, "parse_args", return_value=argparse.Namespace(scope=scope, tickers=selected)), \
             patch.object(earnings, "load_daily_briefing_tickers", return_value=["VLO", "DINO"]), \
             patch.object(earnings, "load_market_rs_universe_tickers", return_value=["VLO"]), \
             patch.object(earnings, "load_existing_profiles", return_value=existing), \
             patch.object(earnings, "build_ticker_payload", side_effect=lambda ticker: {"ticker": ticker, "quarters": [] if empty else [{"eps": 3}]}), \
             patch.object(earnings, "OUTPUT_PATH", output):
            earnings.main()
            return json.loads(output.write_text.call_args.args[0].split("=", 1)[1].strip().rstrip(";"))

    def test_targeted_refresh_preserves_other_profiles(self):
        data = self.run_earnings(["dino", "DINO"])
        self.assertEqual(data["profiles"]["KEEP"]["quarters"], [{"eps": 2}])
        self.assertEqual(data["profiles"]["VLO"]["quarters"], [{"eps": 1}])
        self.assertEqual(data["profiles"]["DINO"]["quarters"], [{"eps": 3}])
        self.assertEqual(data["scope"]["refreshedTickerCount"], 1)

    def test_unknown_ticker_rejected(self):
        with self.assertRaisesRegex(ValueError, "UNKNOWN"):
            self.run_earnings(["UNKNOWN"])

    def test_empty_response_keeps_previous_earnings(self):
        data = self.run_earnings(["VLO"], empty=True)
        self.assertTrue(data["profiles"]["VLO"]["fallback"])
        self.assertEqual(data["profiles"]["VLO"]["quarters"], [{"eps": 1}])

    def test_default_full_scope_unchanged(self):
        data = self.run_earnings(None)
        self.assertEqual(set(data["profiles"]), {"VLO", "DINO"})
        self.assertEqual(data["scope"]["refreshMode"], "all")

    def test_briefing_scope_still_preserves_other_profiles(self):
        data = self.run_earnings(None, scope="daily-briefing")
        self.assertIn("KEEP", data["profiles"])


if __name__ == "__main__":
    unittest.main()

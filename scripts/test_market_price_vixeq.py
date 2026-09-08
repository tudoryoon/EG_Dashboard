import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import update_market_prices as prices


class VixeqTests(unittest.TestCase):
    def test_sorted_official_closes_without_synthetic_ohlc(self):
        item = prices.parse_vixeq_history("DATE,VIXEQ\n06/23/2014,20.84\n06/19/2014,20.78\n06/20/2014,20.44\n")
        self.assertEqual(item["dates"], ["2014-06-19", "2014-06-20", "2014-06-23"])
        self.assertEqual(item["values"], [20.78, 20.44, 20.84])
        self.assertEqual(item["values"], item["closes"])
        self.assertTrue(item["closeOnly"])
        self.assertFalse({"opens", "highs", "lows"} & item.keys())

    def test_reject_invalid_feed(self):
        for csv in ("<html>Error</html>", "DATE,VIXEQ\n", "DATE,VIXEQ\n06/19/2014,nan\n", "DATE,VIXEQ\n06/19/2014,-1\n"):
            with self.subTest(csv=csv), self.assertRaises(ValueError):
                prices.parse_vixeq_history(csv)

    def test_skip_weekend_and_future(self):
        item = prices.parse_vixeq_history("DATE,VIXEQ\n06/20/2014,20\n06/21/2014,21\n01/01/2099,22\n")
        self.assertEqual(item["dates"], ["2014-06-20"])

    def test_network_failure_retains_existing(self):
        existing = {"dates": ["2026-09-04"], "values": [35.8]}
        with patch.object(prices, "load_existing_item", return_value=existing), patch.object(prices.curl_requests, "get", side_effect=RuntimeError("offline")):
            self.assertEqual(prices.refresh_vixeq_item(Path("unused")), existing)

    def test_first_load_failure_is_not_silent(self):
        with patch.object(prices, "load_existing_item", return_value=None), patch.object(prices.curl_requests, "get", side_effect=RuntimeError("offline")), self.assertRaises(RuntimeError):
            prices.refresh_vixeq_item(Path("unused"))

    def test_provider_date_regression_retains_existing(self):
        existing = {"dates": ["2014-06-19", "2026-09-04"]}
        candidate = {"dates": ["2014-06-19"] * 2000 + ["2026-09-03"]}
        with patch.object(prices, "load_existing_item", return_value=existing), patch.object(prices.curl_requests, "get", return_value=Mock(text="csv")), patch.object(prices, "parse_vixeq_history", return_value=candidate):
            self.assertEqual(prices.refresh_vixeq_item(Path("unused")), existing)


if __name__ == "__main__":
    unittest.main()

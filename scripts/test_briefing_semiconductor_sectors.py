import unittest

import update_market_briefing as briefing


class SemiconductorSectorTests(unittest.TestCase):
    def test_tsm_is_in_both_sectors_without_duplicate_rows(self):
        for key in ("semi_large", "semi_equipment"):
            sector = next(item for item in briefing.SECTOR_GROUPS if item["key"] == key)
            tickers = [item["ticker"] for item in sector["items"]]
            self.assertEqual(tickers.count("TSM"), 1)
            self.assertEqual(len(tickers), len(set(tickers)))
            self.assertIn("TSM", [item["ticker"] for item in briefing.get_sector_scoring_items(sector)])

    def test_existing_equipment_members_are_retained(self):
        sector = next(item for item in briefing.SECTOR_GROUPS if item["key"] == "semi_equipment")
        self.assertEqual(
            {item["ticker"] for item in sector["items"]},
            {"TSM", "ASML", "LRCX", "AMAT", "KLAC", "TER", "AMKR", "ASX"},
        )


if __name__ == "__main__":
    unittest.main()

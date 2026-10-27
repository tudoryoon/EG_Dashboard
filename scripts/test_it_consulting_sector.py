import unittest

import update_market_briefing as briefing


class ItConsultingSectorTests(unittest.TestCase):
    def test_exact_membership_and_default_equal_weight_scoring(self):
        sectors = [s for s in briefing.SECTOR_GROUPS if s['key'] == 'it_consulting']
        self.assertEqual(len(sectors), 1)
        sector = sectors[0]
        self.assertEqual(sector['label'], 'IT 컨설팅')
        keys = [s['key'] for s in briefing.SECTOR_GROUPS]
        self.assertEqual(keys.index('it_consulting'), keys.index('software') + 1)
        self.assertEqual([item['ticker'] for item in sector['items']], ['ACN', 'EPAM', 'GLOB', 'CTSH', 'IT', 'G'])
        self.assertNotIn('scoreTickers', sector)
        self.assertEqual({item['ticker'] for item in briefing.get_sector_scoring_items(sector)},
                         {'ACN', 'EPAM', 'GLOB', 'CTSH', 'IT', 'G'})


if __name__ == '__main__':
    unittest.main()

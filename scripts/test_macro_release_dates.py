import unittest
from datetime import date
from bs4 import BeautifulSoup
from macro_release_dates import monthly_references, parse_bea, parse_bea_entry, parse_bls, parse_ism, put


class ReleaseDateTests(unittest.TestCase):
    def test_combined_months_and_year_rollover(self):
        self.assertEqual(monthly_references('October and November 2025'), ['2025-10', '2025-11'])

    def test_bls_delayed_release(self):
        groups = {}
        parse_bls(BeautifulSoup('<table><tr><td>Tuesday, January 13, 2026</td><td>08:30 AM</td><td>Consumer Price Index for December 2025</td></tr></table>', 'html.parser'), groups, 'official')
        self.assertEqual(groups['cpi']['2025-12']['releaseDate'], '2026-01-13')

    def test_bea_published_timestamp(self):
        groups = {}
        parse_bea(BeautifulSoup('<table><tr><td><a href="/news/test">Personal Income and Outlays, November 2024</a></td><td><time datetime="2024-12-20T08:30:00-05:00"></time></td></tr></table>', 'html.parser'), groups, 'https://www.bea.gov/news/archive', 2024)
        self.assertEqual(groups['pce']['2024-11']['releaseDate'], '2024-12-20')

    def test_gdp_advance_not_revision(self):
        groups = {}
        parse_bea_entry('Gross Domestic Product, Third Quarter 2024 (Advance Estimate)', '2024-10-30', groups, 'official')
        parse_bea_entry('Gross Domestic Product, Third Quarter 2024 (Second Estimate)', '2024-11-27', groups, 'official')
        self.assertEqual(groups['gdp']['2024-07']['releaseDate'], '2024-10-30')

    def test_future_and_reference_month_are_not_release_dates(self):
        groups = {}
        put(groups, 'cpi', '2026-07', '2026-08-12', 'official', date(2026, 8, 1))
        put(groups, 'cpi', '2026-07', '2026-07-01', 'official', date(2026, 8, 1))
        self.assertEqual(groups, {})

    def test_ism_specific_holidays(self):
        groups = {}
        parse_ism(BeautifulSoup('<table><tr><td>July 2026</td><td>1</td><td>6**</td></tr></table>', 'html.parser'), groups, 'official')
        self.assertEqual(groups['ism_services']['2026-06']['releaseDate'], '2026-07-06')


if __name__ == '__main__':
    unittest.main()

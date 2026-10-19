import unittest
import json
from datetime import date
from unittest.mock import patch
from bs4 import BeautifulSoup
from macro_release_dates import cpi_header_release_date, merge_inflation_release_history, monthly_references, parse_bea, parse_bea_entry, parse_bls, parse_cpi_archive, parse_ism, put


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

    def test_cpi_archive_uses_reference_label_and_release_filename(self):
        groups = {}
        parse_cpi_archive(BeautifulSoup('''<ul>
          <li>December 1995 Consumer Price Index (<a href="/news.release/history/cpi_020196.txt">TXT</a>)</li>
          <li><a aria-label="January 2000 Consumer Price Index HTML" href="/news.release/archives/cpi_02182000.htm">HTML</a></li>
          <li>January 2000 Consumer Price Index (<a href="/news.release/archives/cpi_02182000.pdf">PDF</a>)</li>
          <li>January 2026 Consumer Price Index (<a href="/news.release/archives/cpi_02132026.htm">HTML</a>)</li>
          </ul>''', 'html.parser'), groups, 'https://www.bls.gov/bls/news-release/cpi.htm')
        self.assertEqual(groups['cpi']['1995-12']['releaseDate'], '1996-02-01')
        self.assertEqual(groups['cpi']['2000-01']['releaseDate'], '2000-02-18')
        self.assertEqual(len(groups['cpi']), 2)
        self.assertTrue(groups['cpi']['1995-12']['sourceUrl'].startswith('https://www.bls.gov/news.release/'))

    def test_bea_legacy_title_excludes_regional_income(self):
        groups = {}
        parse_bea_entry('Personal Income, January 1999', '1999-03-01', groups, 'official')
        parse_bea_entry('Personal Income by State, January 1999', '1999-02-15', groups, 'regional')
        parse_bea_entry('State Personal Income, January 1999', '1999-02-16', groups, 'regional')
        self.assertEqual(groups['pce']['1999-01']['releaseDate'], '1999-03-01')
        self.assertEqual(groups['pce']['1999-01']['sourceUrl'], 'official')
        parse_bea_entry('Personal Income June 2003', '2003-08-01', groups, 'official')
        self.assertEqual(groups['pce']['2003-06']['releaseDate'], '2003-08-01')

    def test_cpi_header_corrects_archive_filename_typo(self):
        soup = BeautifulSoup('USDL-98-73 THIS RELEASE IS EMBARGOED UNTIL 8:30 A.M. (EST) Tuesday, February 24, 1998', 'html.parser')
        self.assertEqual(cpi_header_release_date(soup, '1998-02-25'), '1998-02-24')
        soup = BeautifulSoup('USDL-98-73 CPI for February is scheduled for release on Thursday, March 19, 1998', 'html.parser')
        self.assertIsNone(cpi_header_release_date(soup, '1998-02-25'))
        soup = BeautifulSoup('October 15, 2015 USDL-15-2006 Technical information', 'html.parser')
        self.assertEqual(cpi_header_release_date(soup, '2015-10-15'), '2015-10-15')
        soup = BeautifulSoup('USDL-98-420 Friday, October 16,1998', 'html.parser')
        self.assertEqual(cpi_header_release_date(soup, '1998-10-16'), '1998-10-16')
        soup = BeautifulSoup('USDL-97-10 Tuesday, January 14, 1996', 'html.parser')
        self.assertIsNone(cpi_header_release_date(soup, '1997-01-14'))

    def test_verified_cache_replaces_both_early_and_late_errors(self):
        payload = {'releaseCalendar': {'groups': {'cpi': {
            '1998-01': {'releaseDate': '1998-02-25', 'sourceUrl': 'filename'},
            '2000-01': {'releaseDate': '2000-02-17', 'sourceUrl': 'wrong'},
        }, 'gdp': {'keep': {}}}}}
        history = {'groups': {'cpi': {
            '1998-01': {'releaseDate': '1998-02-24', 'sourceUrl': 'official-header'},
            '2000-01': {'releaseDate': '2000-02-18', 'sourceUrl': 'official-header'},
        }}}
        with patch('macro_release_dates.INFLATION_HISTORY_PATH') as path:
            path.exists.return_value = True
            path.read_text.return_value = json.dumps(history)
            merge_inflation_release_history(payload)
        groups = payload['releaseCalendar']['groups']
        self.assertEqual(groups['cpi'], history['groups']['cpi'])
        self.assertEqual(groups['gdp'], {'keep': {}})

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

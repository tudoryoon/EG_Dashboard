import unittest
from datetime import datetime, timezone
from update_market_rs_financials import needs_reported_earnings_refresh


class FinancialEarningsPriorityTest(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 27, tzinfo=timezone.utc)
        self.profile = {'financialUpdatedAt': '2026-10-26T21:00:00Z', 'quarters': [{'periodEnd': '2026-06-30'}]}
        self.earnings = {'quarters': [{'period': '2026-09-30', 'releaseDate': '2026-10-23', 'eps': {'actual': 2}}]}

    def test_recent_report_overrides_fourteen_day_stale_gate(self):
        self.assertTrue(needs_reported_earnings_refresh(self.profile, self.earnings, self.now))

    def test_current_quarter_does_not_refresh_repeatedly(self):
        self.profile['quarters'][0]['periodEnd'] = '2026-09-27'
        self.assertFalse(needs_reported_earnings_refresh(self.profile, self.earnings, self.now))

    def test_future_or_unreported_release_is_not_used(self):
        self.earnings['quarters'][0]['releaseDate'] = '2026-10-28'
        self.assertFalse(needs_reported_earnings_refresh(self.profile, self.earnings, self.now))
        self.earnings['quarters'][0]['releaseDate'] = '2026-10-23'
        self.earnings['quarters'][0]['eps']['actual'] = None
        self.assertFalse(needs_reported_earnings_refresh(self.profile, self.earnings, self.now))

    def test_old_release_and_missing_history_do_not_force_refresh(self):
        self.earnings['quarters'][0]['releaseDate'] = '2026-08-01'
        self.assertFalse(needs_reported_earnings_refresh(self.profile, self.earnings, self.now))
        self.assertFalse(needs_reported_earnings_refresh(self.profile, {}, self.now))

    def test_missing_quarter_is_retried_when_source_has_not_caught_up(self):
        self.earnings['quarters'][0]['period'] = None
        self.assertTrue(needs_reported_earnings_refresh(self.profile, self.earnings, self.now))


if __name__ == '__main__':
    unittest.main()

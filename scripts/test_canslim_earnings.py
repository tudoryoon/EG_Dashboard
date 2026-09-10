import unittest
import pandas as pd
from update_market_canslim_earnings import build_quarters


class EarningsPeriodTest(unittest.TestCase):
    def test_duplicate_report_prefers_history_match_without_losing_fourth_quarter(self):
        dates = pd.DataFrame({'EPS Estimate': [1, -4.12, .55, .21, .77], 'Reported EPS': [1.2, -6.56, -6.56, 1.01, -.86]}, index=pd.to_datetime(['2025-11-01', '2026-02-11', '2026-02-11', '2026-05-08', '2026-08-27']))
        history = pd.DataFrame({'epsEstimate': [.55], 'epsActual': [-6.56]}, index=pd.to_datetime(['2025-12-31']))
        rows = build_quarters(dates, history)
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[1]['eps']['estimate'], .55)
        self.assertEqual(rows[1]['period'], '2025-12-31')

    def test_conflicting_duplicates_without_history_are_not_guessed(self):
        dates = pd.DataFrame({'EPS Estimate': [1, 2], 'Reported EPS': [3, 3]}, index=pd.to_datetime(['2026-05-08', '2026-05-08']))
        rows = build_quarters(dates, None)
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]['eps']['estimate'])
        self.assertIsNone(rows[0]['eps']['surprisePct'])

    def test_missing_middle_history_does_not_shift_report_dates(self):
        dates = pd.DataFrame({'EPS Estimate': [1.8, 2.02, 2.4, 3.24], 'Reported EPS': [1.95, 2.05, 2.44, 3.32]}, index=pd.to_datetime(['2025-12-11', '2026-03-04', '2026-06-03', '2026-09-02']))
        history = pd.DataFrame({'epsEstimate': [2.02326, 3.238], 'epsActual': [2.05, 3.32]}, index=pd.to_datetime(['2026-01-31', '2026-07-31']))
        rows = build_quarters(dates, history)
        self.assertEqual([r['period'] for r in rows], [None, '2026-01-31', None, '2026-07-31'])
        self.assertEqual(rows[-1]['eps']['estimate'], 3.238)

    def test_a_future_quarter_is_not_assigned_even_when_eps_matches(self):
        dates = pd.DataFrame({'EPS Estimate': [1], 'Reported EPS': [1.2]}, index=pd.to_datetime(['2026-05-05']))
        history = pd.DataFrame({'epsEstimate': [1], 'epsActual': [1.2]}, index=pd.to_datetime(['2026-06-30']))
        self.assertIsNone(build_quarters(dates, history)[0]['period'])

    def test_calendar_rounded_fiscal_end_is_allowed(self):
        dates = pd.DataFrame({'EPS Estimate': [1], 'Reported EPS': [1.2]}, index=pd.to_datetime(['2026-05-28']))
        history = pd.DataFrame({'epsEstimate': [1], 'epsActual': [1.2]}, index=pd.to_datetime(['2026-05-31']))
        self.assertEqual(build_quarters(dates, history)[0]['period'], '2026-05-31')


if __name__ == '__main__':
    unittest.main()

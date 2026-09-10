import unittest
from financial_statement_overlay import overlay, statement_rows, apply_verified_quarters
from update_market_rs_financials import recompute_quarterly_changes


class StatementOverlayTest(unittest.TestCase):
    def test_foreign_currency_replaces_usd_labelled_guesses(self):
        before = {'usesIrOnly': True, 'quarters': [{'periodEnd': '2026-08-03', 'revenue': 51}]}
        snapshot = {'ticker': 'ASX', 'currency': 'TWD', 'income': {'2026-06-30': {'TotalRevenue': 191064000000}}}
        result = overlay(before, snapshot)
        self.assertEqual(result['currency'], 'TWD')
        self.assertEqual(len(result['quarters']), 1)
        self.assertEqual(result['quarters'][0]['revenue'], 191064000000)
        self.assertEqual(result['quarters'][0]['periodEnd'], '2026-06-30')
        self.assertEqual(before['quarters'][0]['revenue'], 51)

    def test_reported_fallback_does_not_overwrite_curated_margin(self):
        before = {'quarters': [{'periodEnd': '2026-06-27', 'revenue': 100, 'grossMarginPct': 48.1, 'ocf': None, 'metricSources': {'grossMarginPct': 'Curated adjusted bridge'}}]}
        snapshot = {'ticker': 'AAPL', 'currency': 'USD', 'income': {'2026-06-30': {'TotalRevenue': 100, 'GrossProfit': 50.1}}, 'cash': {'2026-06-30': {'OperatingCashFlow': 40, 'CapitalExpenditure': -5}}}
        row = overlay(before, snapshot)['quarters'][0]
        self.assertEqual(row['periodEnd'], '2026-06-27')
        self.assertEqual(row['grossMarginPct'], 48.1)
        self.assertEqual(row['ocf'], 40)
        self.assertEqual(row['fcf'], 35)

    def test_latest_quarter_is_appended_without_losing_history(self):
        before = {'quarters': [{'periodEnd': '2025-06-28', 'revenue': 100}]}
        snapshot = {'ticker': 'TEST', 'currency': 'USD', 'income': {'2026-06-30': {'TotalRevenue': 125}}}
        result = overlay(before, snapshot)
        recompute_quarterly_changes(result['quarters'])
        self.assertEqual(result['quarters'][0]['revenueYoyPct'], 25)
        self.assertEqual(result['quarters'][0]['yoyComparison']['periodEnd'], '2025-06-28')

    def test_margins_do_not_mix_gaap_and_non_gaap(self):
        rows = [{'periodEnd': '2026-06-30', 'revenue': 100, 'operatingMarginPct': 50, 'metricSources': {'operatingMarginPct': 'IR Non-GAAP'}}, {'periodEnd': '2025-06-30', 'revenue': 100, 'operatingMarginPct': 20}]
        recompute_quarterly_changes(rows)
        self.assertIsNone(rows[0]['operatingMarginYoyPp'])
        self.assertEqual(rows[0]['revenueYoyPct'], 0)

    def test_negative_revenue_fallback_and_unknown_currency_rejected(self):
        self.assertEqual(statement_rows({'income': {'2025-05-31': {'TotalRevenue': -33300000}}}), [])
        original = {'quarters': []}
        self.assertEqual(overlay(original, {'ticker': 'TEST', 'currency': None}), original)

    def test_verified_source_overrides_provider_error(self):
        profile = {'quarters': [{'periodEnd': '2025-05-31', 'revenue': 20}]}
        definition = {'period': 'FY2025 Q4', 'periodEnd': '2025-05-31', 'periodStart': '2025-03-01', 'filed': '2026-07-27', 'values': {'revenue': 51076000}, 'source': 'https://example.com/official'}
        result = apply_verified_quarters(profile, [definition])
        self.assertEqual(result['quarters'][0]['revenue'], 51076000)
        self.assertEqual(result['quarters'][0]['periodKey'], 'FY2025Q4')


if __name__ == '__main__':
    unittest.main()

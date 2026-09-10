import unittest
from unittest.mock import patch
import update_market_rs_financials as financials
import repair_company_financial_yoy as repair


class FinancialYoyTest(unittest.TestCase):
    def test_fiscal_comparison_metadata_does_not_rename_a_year(self):
        annual = {'start': '2023-01-30', 'end': '2024-01-28', 'val': 60, 'fy': 2024, 'fp': 'FY', 'form': '10-K', 'filed': '2024-02-21'}
        later_comparison = {**annual, 'fy': 2026, 'filed': '2026-02-25', 'frame': 'CY2023'}
        quarter = {'start': '2023-01-30', 'end': '2023-04-30', 'val': 10, 'fy': 2025, 'fp': 'Q1', 'form': '10-Q', 'filed': '2024-05-29', 'frame': 'CY2023Q1'}
        facts = {'facts': {'us-gaap': {'Revenues': {'units': {'USD': [annual, later_comparison, quarter]}}}}}
        series = financials.extract_tag_series(facts, ['Revenues'])
        self.assertEqual(series['FY2024Q1']['value'], 10)
        self.assertNotIn('FY2023Q1', series)

    def test_concept_change_retains_comparable_history(self):
        recent = {'FY2025Q1': {'end': '2025-03-31', 'value': 120}, 'FY2024Q1': {'end': '2024-03-31', 'value': 100}}
        old = {'FY2024Q1': {'end': '2024-03-31', 'value': 100}, 'FY2023Q1': {'end': '2023-03-31', 'value': 80}}
        with patch.object(financials, '_extract_tag_series_single', side_effect=[recent, old]):
            result = financials.extract_tag_series({}, ['NewRevenue', 'OldRevenue'])
        self.assertEqual(result['FY2023Q1']['value'], 80)
        self.assertEqual(result['FY2025Q1']['value'], 120)

    def test_different_revenue_definitions_are_not_blended(self):
        recent = {'FY2025Q1': {'end': '2025-03-31', 'value': 120}, 'FY2024Q1': {'end': '2024-03-31', 'value': 100}}
        goods_only = {'FY2024Q1': {'end': '2024-03-31', 'value': 50}, 'FY2023Q1': {'end': '2023-03-31', 'value': 40}}
        with patch.object(financials, '_extract_tag_series_single', side_effect=[recent, goods_only]):
            result = financials.extract_tag_series({}, ['Revenue', 'GoodsOnly'])
        self.assertNotIn('FY2023Q1', result)

    def test_yoy_uses_dates_not_unreliable_fy_labels(self):
        rows = [
            {'periodKey': 'FY2026Q4', 'periodEnd': '2026-01-25', 'revenue': 150, 'operatingMarginPct': 40},
            {'periodKey': 'FY2024Q4', 'periodEnd': '2025-01-26', 'revenue': 100, 'operatingMarginPct': 30},
        ]
        financials.recompute_quarterly_changes(rows)
        self.assertEqual(rows[0]['revenueYoyPct'], 50)
        self.assertEqual(rows[0]['operatingMarginYoyPp'], 10)
        self.assertEqual(rows[0]['yoyComparison']['periodEnd'], '2025-01-26')

    def test_missing_prior_is_not_replaced_by_zero_or_previous_quarter(self):
        rows = [{'periodEnd': '2026-06-30', 'revenue': 100, 'revenueYoyPct': None}, {'periodEnd': '2026-03-31', 'revenue': 80}]
        financials.recompute_quarterly_changes(rows)
        self.assertIsNone(rows[0]['revenueYoyPct'])

    def test_repair_preserves_reviewed_opm_yoy_outside_retained_window(self):
        quarter = {'period': 'FY2025 Q1', 'periodKey': 'FY2025Q1', 'periodEnd': '2025-03-31',
                   'revenue': 120, 'operatingMarginPct': 40, 'operatingMarginYoyPp': 5}
        item = {'ticker': 'TEST', 'name': 'Test', 'cik': '1', 'quarters': [quarter]}
        fresh = {**quarter, 'yoyComparison': {'periodEnd': '2024-03-31', 'revenue': 100, 'operatingMarginPct': 31}}
        with patch.object(financials, 'build_company_financials', return_value={'quarters': [fresh]}):
            fixed = repair.repair(item, {})['quarters'][0]
        self.assertEqual(fixed['revenueYoyPct'], 20)
        self.assertEqual(fixed['operatingMarginYoyPp'], 5)
        self.assertNotIn('operatingMarginPct', fixed['yoyComparison'])

    def test_published_m7_has_eight_real_yoy_points_and_preserved_adjustments(self):
        payload = financials.read_previous_payload()
        for ticker in ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA']:
            quarters = payload['financials'][ticker]['quarters']
            self.assertEqual(len(quarters), 8)
            for quarter in quarters:
                comparison = quarter['yoyComparison']
                self.assertTrue(financials.is_same_quarter_year_ago(quarter['periodEnd'], comparison['periodEnd']))
                self.assertEqual(quarter['revenueYoyPct'], financials.safe_round(financials.pct_change(quarter['revenue'], comparison['revenue']), 1))
        self.assertEqual(payload['financials']['AAPL']['quarters'][0]['grossMarginPct'], 48.1)
        self.assertEqual(payload['financials']['NVDA']['quarters'][-1]['periodKey'], 'FY2025Q3')
        self.assertEqual(payload['financials']['GOOGL']['quarters'][-2]['periodEnd'], '2024-12-31')


if __name__ == '__main__':
    unittest.main()

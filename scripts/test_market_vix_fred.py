import unittest
from unittest.mock import Mock, patch

import update_market_vix as vix


META = next(item for item in vix.FIXED_INCOME_SERIES if item['key'] == 'hySpread')
ID = META['fredId']


def csv(rows, header='observation_date'):
    return f'{header},{ID}\n' + '\n'.join(f'{day},{value}' for day, value in rows)


class FredFreshnessTests(unittest.TestCase):
    def test_official_transport_uses_curl_and_checks_response(self):
        url = vix.fred_csv_urls(ID)[0]
        response = Mock(content=b'\xef\xbb\xbfobservation_date,BAMLH0A0HYM2\n2026-09-29,3.08\n')
        with patch.object(vix.curl_requests, 'get', return_value=response) as get, patch.object(vix, 'urlopen') as urllib:
            points = vix.parse_fred_csv(vix.fetch_text(url), ID)
        get.assert_called_once_with(url, impersonate='chrome', timeout=20)
        response.raise_for_status.assert_called_once_with()
        urllib.assert_not_called()
        self.assertEqual(points, {'2026-09-29': 3.08})

    def test_official_transport_does_not_accept_http_error_body(self):
        response = Mock(content=b'error')
        response.raise_for_status.side_effect = RuntimeError('HTTP error')
        with patch.object(vix.curl_requests, 'get', return_value=response), self.assertRaises(RuntimeError):
            vix.fetch_text(vix.fred_csv_urls(ID)[0])

    def refresh(self, official, gateway, saved=None):
        with patch.object(vix, 'fetch_text', side_effect=[official, gateway]) as fetch:
            result = vix.parse_fred_history_item(META, saved or {})
        self.assertEqual(fetch.call_count, 2)
        self.assertIn('fred.stlouisfed.org', fetch.call_args_list[0].args[0])
        return result

    def test_date_headers_and_missing_values(self):
        for header, day in [('DATE', '2026-09-28'), ('observation_date', '2026-09-28'), ('yyyymmdd', '20260928')]:
            self.assertEqual(vix.parse_fred_csv(csv([(day, 3.02)], header), ID), {'2026-09-28': 3.02})
        self.assertEqual(vix.parse_fred_csv(csv([('2026-09-25', '.'), ('2026-09-28', 3.02)]), ID), {'2026-09-28': 3.02})

    def test_official_newer_than_gateway(self):
        result = self.refresh(csv([('2026-09-25', 2.93), ('2026-09-28', 3.02)]), csv([('2026-09-25', 2.93)]))
        self.assertEqual(result['latestDate'], '2026-09-28')
        self.assertEqual(result['change'], .09)

    def test_gateway_can_extend_official_and_official_wins_overlap(self):
        result = self.refresh(csv([('2026-09-25', 2.93)]), csv([('2026-09-25', 2.92), ('2026-09-28', 3.02)]))
        self.assertEqual(result['values'], [2.93, 3.02])
        self.assertIn('ivo-welch', result['latestSourceUrl'])

    def test_official_wins_equal_latest_and_preserves_archive(self):
        saved = {'dates': ['2018-01-02', '2026-09-25'], 'values': [3.5, 2.93]}
        result = self.refresh(csv([('2026-09-28', 3.02)]), csv([('2026-09-28', 3.01)]), saved)
        self.assertEqual(result['dates'], ['2018-01-02', '2026-09-25', '2026-09-28'])
        self.assertEqual(result['values'], [3.5, 2.93, 3.02])
        self.assertIn('fred.stlouisfed.org', result['latestSourceUrl'])

    def test_failure_of_either_endpoint(self):
        valid = csv([('2026-09-28', 3.02)])
        for responses in [(TimeoutError('offline'), valid), (valid, TimeoutError('offline'))]:
            self.assertEqual(self.refresh(*responses)['latestValue'], 3.02)

    def test_regression_and_total_outage_preserve_saved(self):
        saved = {'dates': ['2026-09-28'], 'values': [3.02], 'latestDate': '2026-09-28', 'latestValue': 3.02}
        for response in [TimeoutError('offline'), csv([('2026-09-25', 2.93)])]:
            result = self.refresh(response, response, saved)
            self.assertEqual(result['latestDate'], '2026-09-28')
            self.assertEqual(result['values'], [3.02])
            self.assertEqual(result['fetchStatus'], 'stale')
        with patch.object(vix, 'fetch_text', side_effect=TimeoutError('offline')), self.assertRaises(RuntimeError):
            vix.parse_fred_history_item(META, {})

    def test_bad_values_and_future_dates(self):
        for text in ['<html>error</html>', csv([('2026-09-28', 'nan')]), csv([('2026-09-28', 'inf')]), csv([('2099-01-01', 3)])]:
            with self.assertRaises(ValueError):
                vix.parse_fred_csv(text, ID)
        # Month-end weekend observations are valid for this index.
        self.assertEqual(vix.parse_fred_csv(csv([('2026-05-31', 3)]), ID), {'2026-05-31': 3})


if __name__ == '__main__':
    unittest.main()

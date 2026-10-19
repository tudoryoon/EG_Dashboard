import unittest
from unittest.mock import Mock, patch

import update_market_vix as vix


META = next(item for item in vix.FIXED_INCOME_SERIES if item['key'] == 'hySpread')
ID = META['fredId']


def csv(rows, header='observation_date'):
    return f'{header},{ID}\n' + '\n'.join(f'{day},{value}' for day, value in rows)


class FredFreshnessTests(unittest.TestCase):
    def test_successful_recheck_records_check_time_without_advancing_observation(self):
        result = self.refresh(csv([('2026-10-08', 3.15)]), csv([('2026-10-08', 3.15)]))
        self.assertEqual(result['latestDate'], '2026-10-08')
        self.assertEqual(result['dates'], ['2026-10-08'])
        self.assertEqual(result['fetchStatus'], 'ok')
        self.assertEqual(result['lastCheckedAt'], result['lastSuccessfulFetchAt'])
        self.assertIn('T', result['lastCheckedAt'])

    def test_failed_recheck_preserves_last_success_and_observation(self):
        saved = {'dates': ['2026-10-08'], 'values': [3.15], 'latestDate': '2026-10-08',
                 'lastSuccessfulFetchAt': '2026-10-09T13:08:00+00:00'}
        result = self.refresh(TimeoutError('offline'), TimeoutError('offline'), saved)
        self.assertEqual(result['latestDate'], saved['latestDate'])
        self.assertEqual(result['lastSuccessfulFetchAt'], saved['lastSuccessfulFetchAt'])
        self.assertEqual(result['fetchStatus'], 'stale')
        self.assertGreater(result['lastCheckedAt'], saved['lastSuccessfulFetchAt'])

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


class IsolatedSeriesTests(unittest.TestCase):
    def test_credit_only_preserves_all_other_series_and_overall_latest_date(self):
        saved = {'updatedAt': '2026-10-12', 'generatedAt': 'old', 'family': {'vix': [1]},
                 'curve': {'contracts': [2]}, 'snapshots': [3], 'ranges': [4],
                 'fixedIncome': {'move': {'latestDate': '2026-10-12', 'values': [98]}, 'hySpread': self.saved()}}
        fresh = {'latestDate': '2026-10-09', 'dates': ['2026-10-09'], 'values': [3.2], 'fetchStatus': 'ok'}
        with patch.object(vix, 'parse_fred_history_item', return_value=fresh) as fetch, \
             patch.object(vix, 'fetch_json') as yahoo, patch.object(vix, 'fetch_curve_history') as cboe:
            result = vix.refresh_credit_only(saved)
        self.assertEqual(fetch.call_count, 4)
        for call, meta in zip(fetch.call_args_list, vix.CREDIT_SPREAD_SERIES):
            self.assertEqual(call.args, (meta, saved['fixedIncome'].get(meta['key'], {})))
            self.assertEqual(result['fixedIncome'][meta['key']], fresh)
        yahoo.assert_not_called()
        cboe.assert_not_called()
        self.assertEqual(result['fixedIncome']['hySpread'], fresh)
        self.assertEqual(saved['fixedIncome']['hySpread'], self.saved())
        self.assertEqual(result['fixedIncome']['move'], saved['fixedIncome']['move'])
        for key in ['updatedAt', 'family', 'curve', 'snapshots', 'ranges']:
            self.assertEqual(result[key], saved[key])
        self.assertNotEqual(result['generatedAt'], 'old')

    def test_credit_only_rejects_missing_base_payload(self):
        with self.assertRaises(RuntimeError):
            vix.refresh_credit_only({})

    def saved(self):
        return {'dates': ['2026-10-01'], 'values': [3.24], 'latestDate': '2026-10-01', 'latestValue': 3.24}

    def test_move_failure_does_not_block_credit_spread(self):
        fresh = {'dates': ['2026-10-02'], 'values': [3.10], 'latestDate': '2026-10-02'}
        parser = Mock(side_effect=[TimeoutError('offline'), fresh])
        result = vix.refresh_series([vix.FIXED_INCOME_SERIES[0], META], parser, {'move': self.saved()})
        self.assertEqual(parser.call_count, 2)
        self.assertEqual(result['move']['latestDate'], '2026-10-01')
        self.assertEqual(result['move']['fetchStatus'], 'stale')
        self.assertEqual(result['hySpread'], fresh)

    def test_bad_or_regressing_source_preserves_observation_date(self):
        invalid = [
            {'dates': [], 'values': []},
            {'dates': ['2026-09-30'], 'values': [3.12], 'latestDate': '2026-09-30'},
            {'dates': ['2026-10-02'], 'values': [float('nan')], 'latestDate': '2026-10-02'},
        ]
        for item in invalid:
            result = vix.refresh_series([META], Mock(return_value=item), {'hySpread': self.saved()})['hySpread']
            self.assertEqual(result['latestDate'], '2026-10-01')
            self.assertEqual(result['latestValue'], 3.24)
            self.assertEqual(result['fetchStatus'], 'stale')

    def test_no_saved_history_is_not_silently_accepted(self):
        with self.assertRaises(RuntimeError):
            vix.refresh_series([META], Mock(side_effect=TimeoutError('offline')), {})

    def test_four_credit_series_use_distinct_official_ids(self):
        self.assertEqual({meta['key']: meta['fredId'] for meta in vix.CREDIT_SPREAD_SERIES}, {
            'igSpread': 'BAMLC0A0CM', 'bbbSpread': 'BAMLC0A4CBBB',
            'hySpread': 'BAMLH0A0HYM2', 'cccSpread': 'BAMLH0A3HYC',
        })
        def response(url):
            meta = next(meta for meta in vix.CREDIT_SPREAD_SERIES if meta['fredId'] in url)
            value = {'igSpread': .83, 'bbbSpread': 1.02, 'hySpread': 3.11, 'cccSpread': 12.53}[meta['key']]
            return f"observation_date,{meta['fredId']}\n2026-10-12,{value}\n"
        with patch.object(vix, 'fetch_text', side_effect=response):
            result = vix.refresh_credit_spreads({})
        self.assertEqual([item['latestValue'] for item in result.values()], [.83, 1.02, 3.11, 12.53])
        self.assertTrue(all(item['unit'] == '%' for item in result.values()))

    def test_partial_failure_preserves_saved_series_and_updates_others(self):
        saved = self.saved()
        def fetch(meta, existing):
            if meta['key'] in ('igSpread', 'hySpread'):
                raise TimeoutError('offline')
            return {**meta, 'dates': ['2026-10-12'], 'values': [1], 'latestDate': '2026-10-12'}
        with patch.object(vix, 'parse_fred_history_item', side_effect=fetch):
            result = vix.refresh_credit_spreads({'hySpread': saved})
        self.assertEqual(result['igSpread']['fetchStatus'], 'error')
        self.assertIsNone(result['igSpread']['latestValue'])
        self.assertEqual(result['hySpread']['fetchStatus'], 'stale')
        self.assertEqual(result['hySpread']['latestDate'], saved['latestDate'])
        self.assertEqual(result['hySpread']['values'], saved['values'])
        self.assertEqual(result['bbbSpread']['latestDate'], '2026-10-12')
        self.assertEqual(result['cccSpread']['latestDate'], '2026-10-12')


if __name__ == '__main__':
    unittest.main()

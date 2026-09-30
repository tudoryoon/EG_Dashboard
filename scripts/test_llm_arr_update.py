import copy
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape
from unittest.mock import patch

import update_ai_data_batch as batch
import update_llm_arr as arr


def feed(body, title="OpenAI and Anthropic ARR Tracking", published="Tue, 29 Sep 2026 02:59:47 GMT"):
    return (f'<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><item>'
            f'<title>{escape(title)}</title><link>https://blog.tickertrends.io/p/test</link>'
            f'<pubDate>{published}</pubDate><content:encoded><![CDATA[{body}]]></content:encoded>'
            '</item></channel></rss>').encode()


class PublicArrTests(unittest.TestCase):
    def parse(self, body, **kwargs):
        return arr.parse_feed(feed(body, **kwargs), date(2026, 9, 30))[0]

    def test_latest_pair_uses_publication_not_invented_observation(self):
        p = self.parse('<p>TickerTrends latest ARR tracking places OpenAI at $50.44B and Anthropic at $76.8B in annualized revenue run-rate.</p>')
        self.assertEqual([x['value'] for x in p], [50.44, 76.8])
        self.assertTrue(all(x['asOf'] is None and x['dateBasis'] == 'publication' for x in p))

    def test_actual_date_and_reported_value_not_confused(self):
        p = self.parse('<p>TickerTrends tracked OpenAI ARR reaching $44.3B as of Aug. 12, up from $42.6B on Jul. 29.</p><p>Bloomberg reported OpenAI at $40B as of July 31.</p>')
        self.assertEqual(len(p), 1)
        self.assertEqual((p[0]['value'], p[0]['asOf']), (44.3, '2026-08-12'))

    def test_our_latest_read(self):
        p = self.parse('<p>Our latest OpenAI ARR read reached $42.6B on July 29, up from $37.3B on June 25.</p>')
        self.assertEqual((p[0]['value'], p[0]['date']), (42.6, '2026-07-29'))

    def test_reject_products_forecasts_ranges_and_ambiguous_dates(self):
        for body in [
            'TickerTrends latest OpenAI at $8.8B for Codex ARR.',
            'TickerTrends currently tracking OpenAI at $100B next year.',
            'TickerTrends currently tracking OpenAI at $40B-$50B.',
            'TickerTrends currently tracking OpenAI at $50B as of last Friday.',
            'TickerTrends tracked OpenAI ARR at $50B on October 12, 2026.',
            'TickerTrends latest OpenAI at $40B+.',
            'Bloomberg reported OpenAI at $40B; TickerTrends is tracking this.',
        ]:
            with self.subTest(body=body):
                self.assertEqual(self.parse(f'<p>{body}</p>'), [])

    def test_bad_feed_fails(self):
        with self.assertRaises(ValueError):
            arr.parse_feed(b'<html>Blocked</html>')

    def test_missing_and_product_articles_are_not_new_arr(self):
        self.assertEqual(self.parse('<p>No new data.</p>'), [])
        self.assertEqual(self.parse('<p>TickerTrends latest OpenAI at $8.8B.</p>', title='OpenAI Codex ARR'), [])

    def test_monthly_merge_is_idempotent_preserves_actual_and_history(self):
        baseline = {'updatedAt': '2026-09-17', 'snapshots': [], 'sources': [], 'revenue': {
            'labels': ['2026-07'], 'series': [
                {'key': 'openai', 'mode': 'actual', 'values': [40], 'sourceLabels': ['Bloomberg']},
                {'key': 'openai', 'mode': 'tracking', 'values': [41.3], 'sourceLabels': ['TickerTrends Jul 22']},
                {'key': 'anthropic', 'mode': 'tracking', 'values': [74.1], 'sourceLabels': ['TickerTrends Jul 22']},
            ]}}
        original = copy.deepcopy(baseline)
        p = self.parse('<p>TickerTrends latest ARR tracking places OpenAI at $50.44B and Anthropic at $76.8B.</p>')
        p += self.parse('<p>TickerTrends tracked OpenAI ARR reaching $42.6B on July 29.</p>')
        history = arr.merge_history([], p)
        self.assertEqual(history, arr.merge_history(history, p))
        result = arr.update_payload(baseline, history)
        self.assertEqual(baseline, original)
        self.assertEqual(result['revenue']['series'][0]['values'], [40, None])
        self.assertEqual(result['revenue']['series'][1]['values'], [42.6, 50.44])
        self.assertEqual(result, arr.update_payload(result, history))
        self.assertEqual(baseline, arr.update_payload(baseline, []))

    def test_conflicting_values_fail_closed(self):
        p = self.parse('<p>TickerTrends latest ARR tracking places OpenAI at $50.44B.</p>')
        q = {**p[0], 'value': 99, 'sourceUrl': 'https://blog.tickertrends.io/p/other'}
        with self.assertRaises(ValueError):
            arr.update_payload({'revenue': {'labels': [], 'series': []}}, [p[0], q])


class IndependentBatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        (batch.ROOT / 'output').mkdir(exist_ok=True)

    def test_batch_continues_and_outputs_only_successful_paths(self):
        with tempfile.TemporaryDirectory(dir=batch.ROOT / 'output') as folder:
            output = Path(folder) / 'github-output'
            results = [
                {'name': 'A', 'status': 'failed', 'changed': []},
                {'name': 'B', 'status': 'updated', 'changed': ['data/b.js']},
                {'name': 'C', 'status': 'unchanged', 'changed': []},
                {'name': 'D', 'status': 'updated', 'changed': ['data/d.js']},
            ]
            with patch.object(batch, 'run_task', side_effect=results) as run, patch.dict(batch.os.environ, {'GITHUB_OUTPUT': str(output), 'GITHUB_STEP_SUMMARY': ''}):
                batch.main()
            self.assertEqual(run.call_count, 4)
            self.assertEqual(output.read_text(), 'changed_files=data/b.js data/d.js\nfailed_count=1\n')

    def test_failure_restores_output_and_later_task_still_updates(self):
        with tempfile.TemporaryDirectory(dir=batch.ROOT / 'output') as folder:
            root = Path(folder)
            (root / 'a.json').write_text('{"old":1}')
            (root / 'b.json').write_text('{"old":2}')
            def failed(*args, **kwargs):
                (root / 'a.json').write_text('{"partial":true}')
                (root / 'new.json').write_text('{}')
                raise RuntimeError('simulated collection failure')
            first = batch.run_task('A', 'a.py', ['a.json', 'new.json'], 1, root, failed, batch.validate)
            self.assertEqual(first['status'], 'failed')
            self.assertEqual(json.loads((root / 'a.json').read_text()), {'old': 1})
            self.assertFalse((root / 'new.json').exists())
            def success(*args, **kwargs):
                (root / 'b.json').write_text('{"fresh":3}')
            second = batch.run_task('B', 'b.py', ['b.json'], 1, root, success, batch.validate)
            self.assertEqual(second['changed'], ['b.json'])
            self.assertEqual(json.loads((root / 'b.json').read_text()), {'fresh': 3})

    def test_successful_exit_with_invalid_output_is_rolled_back(self):
        with tempfile.TemporaryDirectory(dir=batch.ROOT / 'output') as folder:
            root = Path(folder)
            path = root / 'a.json'
            path.write_text('{}')
            def corrupt(*args, **kwargs):
                path.write_text('partial')
            result = batch.run_task('A', 'a.py', ['a.json'], 1, root, corrupt, batch.validate)
            self.assertEqual(result['status'], 'failed')
            self.assertEqual(path.read_text(), '{}')


if __name__ == '__main__':
    unittest.main()

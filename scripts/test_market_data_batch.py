import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import update_market_data_batch as batch
from update_ai_data_batch import run_task


class MarketBatchTests(unittest.TestCase):
    def test_failed_price_collection_still_exports_vix_for_publish(self):
        results = [
            {'name': 'VIX', 'status': 'updated', 'changed': ['data/market-vix-data.js']},
            {'name': 'Prices', 'status': 'failed', 'changed': []},
            {'name': 'Valuation', 'status': 'unchanged', 'changed': []},
        ]
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'output'
            with patch.object(batch, 'run_task', side_effect=results) as collect, patch.dict(
                os.environ, {'GITHUB_OUTPUT': str(output), 'GITHUB_STEP_SUMMARY': ''}
            ):
                batch.main()
            self.assertEqual(collect.call_count, 3)
            self.assertIn('changed_files=data/market-vix-data.js', output.read_text())
            self.assertIn('failed_count=1', output.read_text())

    def test_partial_write_is_rolled_back_without_touching_other_dataset(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'data').mkdir()
            price = root / 'data/market-price-data.js'
            vix = root / 'data/market-vix-data.js'
            price.write_text('original')
            vix.write_text('fresh credit spread')

            def fail(*args, **kwargs):
                price.write_text('incomplete')
                raise RuntimeError('collector failed')

            result = run_task('Prices', 'unused.py', ['data/market-price-data.js'], 10, root=root, execute=fail)
            self.assertEqual(result['status'], 'failed')
            self.assertEqual(price.read_text(), 'original')
            self.assertEqual(vix.read_text(), 'fresh credit spread')

    def test_workflow_installs_briefing_calendar_dependency(self):
        root = Path(__file__).resolve().parents[1]
        workflow = (root / '.github/workflows/update-market-prices.yml').read_text()
        install = next(line for line in workflow.splitlines() if 'pip install' in line)
        self.assertIn('pandas_market_calendars', install)
        self.assertIn('python scripts/test_market_data_batch.py', workflow)


if __name__ == '__main__':
    unittest.main()

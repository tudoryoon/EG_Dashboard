"""Offline checks for the independently hosted scorecard snapshot."""
import hashlib
import json
import re
import unittest
from pathlib import Path

from import_market_regime_artifact import extract, parse_data

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'study' / 'market-regime'


class MarketRegimeArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        text = (APP / 'snapshot.js').read_text(encoding='utf-8').strip()
        cls.data = json.loads(text.removeprefix('const DATA=')[:-1])
        cls.provenance = json.loads((APP / 'provenance.json').read_text(encoding='utf-8'))

    def test_snapshot_integrity(self):
        digest = hashlib.sha256(json.dumps(self.data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        self.assertEqual(digest, self.provenance['snapshotSha256'])
        self.assertFalse(self.provenance['automaticRefresh'])
        self.assertEqual(set(self.data), {'us', 'kr', 'cn'})
        for key, market in self.data.items():
            with self.subTest(market=key):
                dates = [row['date'] for row in market['history']]
                self.assertEqual(len(dates), 252)
                self.assertEqual(dates, sorted(set(dates)))
                self.assertEqual(dates[-1], market['asof'])
                self.assertEqual(market['asof'], self.provenance['markets'][key]['asOf'])
                for row in market['history']:
                    for metric, value in row.items():
                        if re.fullmatch(r's[1-8]', metric) and value is not None:
                            self.assertGreaterEqual(value, 0)
                            self.assertLessEqual(value, 10)

    def test_no_claude_host_runtime_or_network_dependency(self):
        html = (APP / 'index.html').read_text(encoding='utf-8')
        renderer = (APP / 'scorecard.js').read_text(encoding='utf-8')
        for marker in ('__FRAME_', 'claudeusercontent', 'frame-ancestors', 'Authorization'):
            self.assertNotIn(marker, html + renderer)
        self.assertIn("connect-src 'none'", html)
        self.assertIsNone(re.search(r'fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon', renderer))
        for name in ('snapshot.js', 'scorecard.js', 'integration.js'):
            self.assertIn(f'./{name}?', html)

    def test_isolated_route(self):
        dashboard = (ROOT / 'dashboard.js').read_text(encoding='utf-8')
        index = (ROOT / 'index.html').read_text(encoding='utf-8')
        self.assertIn('MarketRegime: "market-regime"', dashboard)
        self.assertIn('sandbox="allow-scripts"', dashboard)
        self.assertIn('event.source !== frame.contentWindow', dashboard)
        self.assertNotIn('study/market-regime/', index)

    def test_safe_data_parser(self):
        self.assertEqual(parse_data('const DATA={us:{},kr:{},cn:{}};'), {'us': {}, 'kr': {}, 'cn': {}})
        for declaration in (
            'const DATA={us:{},kr:{},cn:{}}; alert(1)',
            'const DATA={us:{},us:{},kr:{},cn:{}};',
            'const DATA={us:fetch("x"),kr:{},cn:{}};',
            'const DATA={us:{},kr:{}};',
        ):
            with self.subTest(declaration=declaration), self.assertRaises(ValueError):
                parse_data(declaration)

    def test_original_parity_when_source_is_present(self):
        source = ROOT / 'artifacts' / 'market-regime-source.html'
        if not source.exists():
            self.skipTest('Authenticated source HTML is intentionally not committed')
        data, css, _, renderer = extract(source.read_text(encoding='utf-8'))
        self.assertEqual(data, self.data)
        self.assertEqual(css.strip(), (APP / 'scorecard.css').read_text(encoding='utf-8').strip())
        self.assertEqual(renderer.strip(), (APP / 'scorecard.js').read_text(encoding='utf-8').strip())


if __name__ == '__main__':
    unittest.main()

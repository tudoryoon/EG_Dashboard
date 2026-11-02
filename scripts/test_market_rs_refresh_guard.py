import copy
import io
import json
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from market_rs_refresh_guard import (
    ROOT, REFRESH_KEYS, build_refresh_plan, collected_after_close,
    evaluate_refresh, latest_completed_session, load_payload,
)


class RefreshPlanTest(unittest.TestCase):
    def setUp(self):
        self.rs = {"updatedAt": "2026-11-02"}
        self.trend = {"updatedAt": "2026-11-02"}
        self.financials = {"updatedAt": "2026-11-02T21:20:00Z", "errors": {}}
        self.earnings = {"updatedAt": "2026-11-02T21:20:00Z", "scope": {"refreshMode": "all"}}

    def plan(self, **kwargs):
        return build_refresh_plan(
            self.rs, self.trend, self.financials, self.earnings,
            "2026-11-02", full_earnings_allowed=True, **kwargs,
        )

    def test_all_current_does_not_repeat_collection(self):
        result = self.plan()
        self.assertFalse(result["should_run"])
        self.assertTrue(all(result[key] is False for key in REFRESH_KEYS))

    def test_current_rs_does_not_hide_stale_trend(self):
        self.trend["updatedAt"] = "2026-10-30"
        result = self.plan()
        self.assertFalse(result["refresh_rs"])
        self.assertTrue(result["refresh_trend"])
        self.assertFalse(result["refresh_financials"])

    def test_current_rs_does_not_hide_missing_financial_batch(self):
        self.financials["updatedAt"] = "2026-10-30T22:00:00Z"
        result = self.plan()
        self.assertFalse(result["refresh_rs"])
        self.assertTrue(result["refresh_financials"])

    def test_failed_financial_batch_can_retry_even_after_checkpoint(self):
        self.financials["errors"] = {"AAPL": "provider unavailable"}
        self.assertTrue(self.plan()["refresh_financials"])

    def test_daily_briefing_eps_cannot_mark_full_canslim_complete(self):
        self.earnings["scope"]["refreshMode"] = "daily-briefing"
        result = self.plan()
        self.assertFalse(result["refresh_rs"])
        self.assertFalse(result["refresh_earnings_daily"])
        self.assertTrue(result["refresh_earnings_all"])

    def test_full_eps_refresh_remains_on_backup_or_dispatch(self):
        self.earnings["scope"]["refreshMode"] = "daily-briefing"
        result = build_refresh_plan(
            self.rs, self.trend, self.financials, self.earnings,
            "2026-11-02", full_earnings_allowed=False,
        )
        self.assertFalse(result["refresh_earnings_all"])

    def test_selected_ticker_refresh_is_not_full_or_briefing_coverage(self):
        self.earnings["scope"]["refreshMode"] = "selected-tickers"
        result = self.plan()
        self.assertTrue(result["refresh_earnings_daily"])
        self.assertTrue(result["refresh_earnings_all"])

    def test_old_full_eps_refresh_does_not_hide_new_session(self):
        self.earnings["updatedAt"] = "2026-10-30T22:00:00Z"
        result = self.plan()
        self.assertTrue(result["refresh_earnings_daily"])
        self.assertTrue(result["refresh_earnings_all"])

    def test_stale_rs_forces_trend_rebuild(self):
        self.rs["updatedAt"] = "2026-10-30"
        result = self.plan()
        self.assertTrue(result["refresh_rs"])
        self.assertTrue(result["refresh_trend"])
        self.assertTrue(result["refresh_breadth"])

    def test_partial_rs_or_trend_requires_full_refresh(self):
        self.rs["refreshScope"] = {"mode": "daily-briefing-priority"}
        self.assertTrue(self.plan()["refresh_rs"])
        self.rs.pop("refreshScope")
        self.trend["refreshScope"] = {"mode": "daily-briefing-priority"}
        self.assertTrue(self.plan()["refresh_trend"])

    def test_prices_only_does_not_collect_financial_data(self):
        result = self.plan(force=True, prices_only=True)
        self.assertTrue(result["refresh_rs"])
        self.assertTrue(result["refresh_trend"])
        for key in ["refresh_breadth", "refresh_financials", "refresh_earnings_daily", "refresh_earnings_all"]:
            self.assertFalse(result[key])

    def test_manual_force_keeps_existing_force_behavior(self):
        self.assertTrue(all(self.plan(force=True)[key] for key in REFRESH_KEYS))

    def test_qqq_lag_cannot_move_trend_behind_saved_rs(self):
        self.trend["updatedAt"] = "2026-10-30"
        result = build_refresh_plan(self.rs, self.trend, self.financials, self.earnings, "2026-10-30")
        self.assertFalse(result["refresh_rs"])
        self.assertTrue(result["refresh_trend"])

    def test_missing_datasets_are_retried(self):
        result = build_refresh_plan({}, {}, {}, {}, "2026-11-02", full_earnings_allowed=True)
        self.assertTrue(all(result[key] for key in REFRESH_KEYS))

    def test_financial_timestamp_must_be_after_session_close(self):
        self.assertFalse(collected_after_close({"updatedAt": "2026-11-02T20:59:00Z"}, "2026-11-02"))
        self.assertTrue(collected_after_close({"updatedAt": "2026-11-02T21:10:00Z"}, "2026-11-02"))
        self.assertTrue(collected_after_close({"updatedAt": "2026-08-31T20:10:00Z"}, "2026-08-31"))
        self.assertFalse(collected_after_close({"updatedAt": "2026-11-02"}, "2026-11-02"))
        self.assertFalse(collected_after_close({"updatedAt": "bad date"}, "2026-11-02"))

    def test_plan_does_not_mutate_inputs(self):
        previous = copy.deepcopy([self.rs, self.trend, self.financials, self.earnings])
        self.plan()
        self.assertEqual(previous, [self.rs, self.trend, self.financials, self.earnings])

    def test_qqq_failure_before_close_skips_all_collectors(self):
        with patch('market_rs_refresh_guard.latest_completed_session', side_effect=OSError('offline')):
            result = evaluate_refresh(
                self.rs, self.trend, self.financials, self.earnings,
                event_name='schedule', refresh_if_stale=False, prices_only=False,
                full_earnings_allowed=True, now=datetime(2026, 11, 2, 20, tzinfo=timezone.utc),
            )
        self.assertFalse(result['should_run'])

    def test_qqq_failure_after_close_refreshes_conservatively(self):
        with patch('market_rs_refresh_guard.latest_completed_session', side_effect=OSError('offline')):
            result = evaluate_refresh(
                self.rs, self.trend, self.financials, self.earnings,
                event_name='workflow_dispatch', refresh_if_stale=True, prices_only=False,
                full_earnings_allowed=True, now=datetime(2026, 11, 2, 22, tzinfo=timezone.utc),
            )
        self.assertTrue(all(result[key] for key in REFRESH_KEYS))

    def test_cloudflare_retry_uses_dataset_specific_plan(self):
        self.earnings['scope']['refreshMode'] = 'daily-briefing'
        with patch('market_rs_refresh_guard.latest_completed_session', return_value='2026-11-02'):
            result = evaluate_refresh(
                self.rs, self.trend, self.financials, self.earnings,
                event_name='workflow_dispatch', refresh_if_stale=True, prices_only=False,
                full_earnings_allowed=True, now=datetime(2026, 11, 2, 21, 57, tzinfo=timezone.utc),
            )
        self.assertFalse(result['refresh_rs'])
        self.assertTrue(result['refresh_earnings_all'])

    def test_qqq_date_selection_handles_winter_close(self):
        dates = ['2026-10-30T13:30:00+00:00', '2026-11-02T14:30:00+00:00']
        response = {'chart': {'result': [{'timestamp': [int(datetime.fromisoformat(d).timestamp()) for d in dates]}]}}
        with patch('market_rs_refresh_guard.urlopen', side_effect=lambda *a, **k: io.BytesIO(json.dumps(response).encode())):
            self.assertEqual(latest_completed_session(datetime(2026, 11, 2, 21, 5, tzinfo=timezone.utc)), '2026-10-30')
            self.assertEqual(latest_completed_session(datetime(2026, 11, 2, 21, 27, tzinfo=timezone.utc)), '2026-11-02')

    def test_loader_missing_and_malformed_files(self):
        path = Path('test-data.js')
        with patch.object(Path, 'read_text', side_effect=FileNotFoundError):
            self.assertEqual(load_payload(path, 'test'), {})
        with patch.object(Path, 'read_text', return_value='window.test = invalid;'):
            self.assertEqual(load_payload(path, 'test'), {})
        with patch.object(Path, 'read_text', return_value='window.test = {"updatedAt":"2026-11-02"};'):
            self.assertEqual(load_payload(path, 'test'), self.rs)

    def test_workflow_wires_each_collector_to_its_own_flag(self):
        text = (ROOT / '.github/workflows/update-market-rs.yml').read_text(encoding='utf-8')
        for name, output in [
            ('Refresh full daily market RS universe', 'refresh_rs'),
            ('Refresh full daily market trend score universe', 'refresh_trend'),
            ('Refresh market RS financials', 'refresh_financials'),
            ('Refresh Daily Briefing reported EPS before financial prioritization', 'refresh_earnings_daily'),
            ('Refresh full CANSLIM EPS surprise history', 'refresh_earnings_all'),
        ]:
            block = text.split(f'      - name: {name}\n', 1)[1].split('\n      - name:', 1)[0]
            self.assertIn(f"if: steps.refresh-guard.outputs.{output} == 'true'", block)
            self.assertNotIn('outputs.should_run', block)
        crons = re.findall(r'- cron: "([^"]+)"', text)
        allowed = re.search(r'FULL_EARNINGS_ALLOWED: (.*)', text).group(1)
        self.assertIn(f"github.event.schedule == '{crons[1]}'", allowed)
        self.assertIn("github.event_name == 'workflow_dispatch'", allowed)


if __name__ == '__main__':
    unittest.main()

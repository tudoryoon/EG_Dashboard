import unittest
from datetime import date
from unittest.mock import patch
from update_study_calendar import build_policy_event, collect_policy_events, parse_policy_schedule


class PolicyCalendarTests(unittest.TestCase):
    def test_fomc_uses_final_day_and_skips_notation_votes(self):
        raw = '''<div class="panel"><h4>2026 FOMC Meetings</h4>
        <div class="fomc-meeting"><div class="fomc-meeting__month">September</div><div class="fomc-meeting__date">15-16*</div></div>
        <div class="fomc-meeting"><div class="fomc-meeting__month">August</div><div class="fomc-meeting__date">22 (notation vote)</div></div></div>'''
        self.assertEqual(parse_policy_schedule(raw, 'FOMC'), [(date(2026, 9, 16), True)])

    def test_fomc_kst_and_dst(self):
        september = build_policy_event('FOMC', date(2026, 9, 16), True)
        december = build_policy_event('FOMC', date(2026, 12, 9))
        self.assertEqual((september['date'], september['kstDate'], september['time']), ('2026-09-16', '2026-09-17', '03:00'))
        self.assertEqual(december['time'], '04:00')

    def test_boj_uses_decision_not_minutes(self):
        raw = '<h2 id="p2026">2026</h2><table><tr><td>Sept. 17 (Thurs.), 18 (Fri.)</td><td>-</td><td>Oct. 1 (Thurs.)</td><td>Nov. 5 (Thurs.)</td></tr></table>'
        self.assertEqual(parse_policy_schedule(raw, 'BOJ'), [(date(2026, 9, 18), False)])
        event = build_policy_event('BOJ', date(2026, 9, 18))
        self.assertEqual(event['time'], '')
        self.assertEqual(event['kstDate'], '2026-09-18')
        self.assertNotIn('usDate', event)

    def test_official_fallback_stays_in_four_week_window(self):
        with patch('update_study_calendar.fetch_schedule_text', side_effect=ValueError('unavailable')):
            events, failures = collect_policy_events(date(2026, 9, 7), date(2026, 10, 4))
        self.assertEqual([event['date'] for event in events], ['2026-09-16', '2026-09-18'])
        self.assertEqual(len(failures), 2)

    def test_empty_source_is_an_error(self):
        with self.assertRaises(ValueError):
            parse_policy_schedule('<html></html>', 'FOMC')


if __name__ == '__main__':
    unittest.main()

import unittest
from datetime import datetime
from session import weekly_session


class WeeklySessionTests(unittest.TestCase):
    def test_saturday_eleven_kst(self):
        result = weekly_session(datetime.fromisoformat("2026-09-19T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-18")
        self.assertEqual(result["issueDate"], "2026-09-19")
        self.assertEqual(result["weekEnding"], "2026-09-18")

    def test_before_release_keeps_previous_issue(self):
        result = weekly_session(datetime.fromisoformat("2026-09-19T01:59:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-11")
        self.assertEqual(result["issueDate"], "2026-09-12")

    def test_good_friday(self):
        result = weekly_session(datetime.fromisoformat("2026-04-04T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-04-02")

    def test_christmas_and_winter_timezone(self):
        result = weekly_session(datetime.fromisoformat("2026-12-26T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-12-24")

    def test_delayed_execution_on_monday(self):
        result = weekly_session(datetime.fromisoformat("2026-09-14T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-11")
        self.assertEqual(result["issueDate"], "2026-09-12")

    def test_delayed_execution_on_sunday(self):
        result = weekly_session(datetime.fromisoformat("2026-09-20T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-18")
        self.assertEqual(result["issueDate"], "2026-09-19")


if __name__ == "__main__":
    unittest.main()

import unittest
from datetime import datetime
from session import weekly_session


class WeeklySessionTests(unittest.TestCase):
    def test_sunday_eleven_kst(self):
        result = weekly_session(datetime.fromisoformat("2026-09-13T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-11")
        self.assertEqual(result["issueDate"], "2026-09-13")

    def test_before_release_keeps_previous_issue(self):
        result = weekly_session(datetime.fromisoformat("2026-09-13T01:59:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-04")

    def test_good_friday(self):
        result = weekly_session(datetime.fromisoformat("2026-04-05T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-04-02")

    def test_christmas_and_winter_timezone(self):
        result = weekly_session(datetime.fromisoformat("2026-12-27T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-12-24")

    def test_delayed_execution_on_monday(self):
        result = weekly_session(datetime.fromisoformat("2026-09-14T02:00:00+00:00"))
        self.assertEqual(result["sessionDate"], "2026-09-11")


if __name__ == "__main__":
    unittest.main()

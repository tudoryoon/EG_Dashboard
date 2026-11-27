import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
import json

from update_market_scorecard import completed, merge, parse_sox_membership, update


class ScorecardTest(unittest.TestCase):
    def test_sox_published_membership(self):
        rows = ["Company Name    T%02d    %s" % (i, "3.43" if i == 0 else "3.33") for i in range(30)]
        header = "PHLX Semiconductor\nTicker: SOX\nData as of: 11/02/2026\n"
        parsed = parse_sox_membership(header + "\n".join(rows), "2026-11-25")
        self.assertEqual(len(parsed["members"]), 30)
        for contents, date in [(rows[:-1], "2026-11-25"), (rows, "2026-10-30"), (rows, "2027-03-01")]:
            with self.assertRaises(ValueError):
                parse_sox_membership(header + "\n".join(contents), date)

    def test_holiday_and_half_day(self):
        for day, hour, minute, expected in [(26, 22, 0, "2026-11-25"), (27, 18, 5, "2026-11-25"),
                                             (27, 18, 11, "2026-11-27")]:
            self.assertEqual(completed("us", datetime(2026, 11, day, hour, minute, tzinfo=timezone.utc)), expected)

    def test_history_preserves_published_days_and_backfills_gap(self):
        old = {"asof": "2026-11-23", "history": [{"date": "2026-11-23", "s4": 4}]}
        self.assertIs(merge(old, {"asof": "2026-11-23"}), old)
        new = {"asof": "2026-11-25", "history": [{"date": "2026-11-23", "s4": 7},
                {"date": "2026-11-24", "s4": 6}, {"date": "2026-11-25", "s4": 5}]}
        self.assertEqual([r["s4"] for r in merge(old, new)["history"]], [4, 6, 5])

    def test_missing_member_list_does_not_advance_date(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "usq.json"
            old = json.dumps({"asof": "2026-11-24"})
            path.write_text(old)
            with patch("update_market_scorecard.completed", return_value="2026-11-25"), \
                 patch("update_market_scorecard.universe", return_value={}):
                with self.assertRaisesRegex(ValueError, "Too few members"):
                    update("usq", path.parent, path.parent)
            self.assertEqual(path.read_text(), old)


if __name__ == "__main__":
    unittest.main()

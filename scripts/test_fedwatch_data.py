import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import fedwatch_data as fedwatch
import update_market_briefing_fedwatch as updater


COLUMNS = ["375-400", "400-425", "425-450", "450-475", "475-500", "500-525", "525-550", "550-575", "575-600"]


def fixture(body, columns=COLUMNS):
    return ("<table><tr><td colspan='10'>CME FEDWATCH TOOL - CONDITIONAL MEETING PROBABILITIES</td></tr>"
            "<tr><th>MEETING DATE</th>" + "".join(f"<th>{column}</th>" for column in columns)
            + "</tr>" + body + "</table>")


def meeting_row(values, day="10/28/2026"):
    return f"<tr><td>{day}</td>" + "".join(f"<td>{value}</td>" for value in values) + "</tr>"


TABLE = fixture(meeting_row(["62.4%", "37.6%"] + ["0.0%"] * 7))


class FedWatchTests(unittest.TestCase):
    def test_official_table_matches_capture_without_column_shift(self):
        columns, rows = fedwatch.parse_probability_table(TABLE)
        self.assertEqual(columns, COLUMNS)
        self.assertEqual(rows[0]["meetingDate"], "2026-10-28")
        self.assertEqual(rows[0]["probabilities"], [62.4, 37.6] + [0.0] * 7)
        self.assertEqual(rows[0]["maxRange"], "375-400")

    def test_preserves_cme_rounding_instead_of_adjusting_to_100(self):
        body = meeting_row(["4.9%", "33.0%", "45.5%", "16.5%"] + ["0.0%"] * 5, "2027-01-27")
        _, rows = fedwatch.parse_probability_table(fixture(body))
        self.assertAlmostEqual(sum(rows[0]["probabilities"]), 99.9)
        self.assertEqual(rows[0]["maxProbability"], 45.5)

    def test_merged_unreachable_outcomes_are_zero(self):
        body = "<tr><td>10/28/2026</td><td>62.4%</td><td>37.6%</td><td colspan='7'></td></tr>"
        _, rows = fedwatch.parse_probability_table(fixture(body))
        self.assertEqual(rows[0]["probabilities"], [62.4, 37.6] + [0.0] * 7)

    def test_missing_cells_are_rejected_not_silently_padded(self):
        with self.assertRaisesRegex(ValueError, "align"):
            fedwatch.parse_probability_table(fixture(meeting_row(["62.4%", "37.6%"])))

    def test_invalid_probability_and_total_are_rejected(self):
        for first, second in [("NaN%", "37.6%"), ("101%", "0%"), ("10%", "20%")]:
            with self.subTest(first=first), self.assertRaises(ValueError):
                fedwatch.parse_probability_table(fixture(meeting_row([first, second] + ["0%"] * 7)))

    def test_duplicate_dates_and_columns_are_rejected(self):
        body = meeting_row(["62.4%", "37.6%"] + ["0%"] * 7)
        with self.assertRaisesRegex(ValueError, "duplicated"):
            fedwatch.parse_probability_table(fixture(body + body))
        with self.assertRaisesRegex(ValueError, "columns"):
            fedwatch.parse_probability_table(fixture(body, [COLUMNS[0]] * 9))

    def test_wrong_table_is_not_accepted(self):
        with self.assertRaisesRegex(RuntimeError, "not found"):
            fedwatch.parse_probability_table("<table><tr><td>Target Rate</td><td>NOW</td></tr></table>")

    def test_public_page_session_and_probability_postback(self):
        root = fedwatch.CME_FEDWATCH_URL
        tool = "https://cmegroup-tools.quikstrike.net/User/QuikStrikeTools.aspx?insid=test"
        view = tool.replace("QuikStrikeTools.aspx", "QuikStrikeView.aspx")
        page = ('<form action="./QuikStrikeView.aspx?insid=test">'
                '<input type="hidden" name="__VIEWSTATE" value="test-state">'
                '<a href="javascript:__doPostBack(\'official$lbPTree\',\'\')">Probabilities</a>'
                '<span>375-400 (Current)</span></form>')

        def response(text, url):
            result = MagicMock()
            result.text, result.url = text, url
            return result

        session = MagicMock()
        session.get.side_effect = [response(f'<iframe src="{tool}"></iframe>', root),
                                   response("Loading View", tool), response(page, view)]
        session.post.return_value = response(TABLE, view)
        html, current = fedwatch.fetch_probability_html(session)
        self.assertEqual(html, TABLE)
        self.assertEqual(current, "375-400")
        self.assertEqual(session.post.call_args.kwargs["data"]["__EVENTTARGET"], "official$lbPTree")
        self.assertEqual(session.post.call_args.kwargs["data"]["__VIEWSTATE"], "test-state")
        self.assertEqual(session.post.call_args.kwargs["headers"]["Referer"], view)

    def test_rejects_unexpected_form_host(self):
        with self.assertRaisesRegex(ValueError, "URL"):
            fedwatch._tool_url(fedwatch.CME_FEDWATCH_URL, "https://example.com/form")

    def test_snapshot_is_direct_and_does_not_invent_source_timestamp(self):
        now = datetime(2026, 10, 1, 6, 0, tzinfo=timezone.utc)
        with patch.object(fedwatch, "fetch_probability_html", return_value=(TABLE, "375-400")), \
             patch.object(fedwatch, "datetime", wraps=datetime) as clock:
            clock.now.return_value = now
            result = fedwatch.build_fedwatch_snapshot()
        self.assertEqual(result["method"], "official-probability-table")
        self.assertEqual(result["asOf"], "2026-10-01")
        self.assertEqual(result["refreshedAt"], now.isoformat())
        self.assertNotIn("sourceUpdatedAt", result)
        self.assertNotIn("settlementSourceUrl", result)

    def test_network_failure_retries_then_fails_without_reconstruction(self):
        with patch.object(fedwatch, "fetch_probability_html", side_effect=RuntimeError("offline")) as fetch:
            with self.assertRaisesRegex(RuntimeError, "could not be refreshed"):
                fedwatch.build_fedwatch_snapshot()
        self.assertEqual(fetch.call_count, 2)

    def test_failed_refresh_does_not_write_or_redate_previous_briefing(self):
        previous = {"updatedAt": "2026-09-30", "fedWatch": {"asOf": "2026-09-29"}}
        with patch.object(updater, "parse_market_briefing_payload", return_value=previous), \
             patch.object(updater, "build_fedwatch_snapshot", side_effect=RuntimeError("offline")), \
             patch.object(updater, "write_market_briefing_payload") as write:
            with self.assertRaises(RuntimeError):
                updater.main()
        write.assert_not_called()
        self.assertEqual(previous["fedWatch"]["asOf"], "2026-09-29")


if __name__ == "__main__":
    unittest.main()

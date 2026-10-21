import json
import unittest
from datetime import date
from unittest.mock import Mock, patch

from calendar_earnings_sources import collect_sources, parse_yahoo_summary, reconcile
from update_study_calendar import apply_confirmed_earnings, localize_event, request_rows

START = date(2026, 10, 5)
END = date(2026, 11, 1)
COLLECTION_END = date(2026, 11, 29)
NOW = "2026-10-06T17:00:00+09:00"
UNIVERSE = {"MSFT": {"name": "Microsoft", "sector": "Cloud"},
            "DRAM": {"name": "DRAM ETF", "sector": "Memory"}}


def yahoo_markup(ticker="MSFT", dates=("2026-10-28",), quote_type="EQUITY"):
    body = {"quoteSummary": {"result": [{"price": {"symbol": ticker, "quoteType": quote_type},
            "calendarEvents": {"earnings": {"earningsDate": [{"fmt": d} for d in dates],
            "earningsCallDate": [{"fmt": "2026-07-29"}], "isEarningsDateEstimate": False}}}]}}
    return '<script type="application/json">' + json.dumps({"body": json.dumps(body)}) + '</script>'


def cache(nasdaq_date=None, yahoo_dates=(), failed=False):
    events = [] if nasdaq_date is None else [{"ticker": "MSFT", "date": nasdaq_date, "session": "A",
                                            "sourceUrl": "https://www.nasdaq.com", "fetchedAt": NOW}]
    return {"sources": {
        "Nasdaq": {"events": events, "checks": {nasdaq_date: {"status": "failed" if failed else "success",
                   "lastSuccessAt": NOW}} if nasdaq_date else {}},
        "Yahoo": {"records": {"MSFT": {"ticker": "MSFT", "dates": list(yahoo_dates),
                  "sourceUrl": "https://finance.yahoo.com/quote/MSFT/", "fetchedAt": NOW}},
                  "checks": {"MSFT": {"status": "success", "lastSuccessAt": NOW}}}}}


def resolve(data, previous=()):
    return reconcile(UNIVERSE, START, END, COLLECTION_END, data, previous, localize_event)


class EarningsCalendarTests(unittest.TestCase):
    def test_yahoo_uses_date_not_old_conference_call(self):
        result = parse_yahoo_summary(yahoo_markup(), "MSFT")
        self.assertEqual(result["dates"], ["2026-10-28"])
        self.assertEqual(result["session"], "")
        self.assertFalse(result["providerEstimate"])

    def test_yahoo_wrong_symbol_and_challenge_are_rejected(self):
        for markup in [yahoo_markup("AAPL"), "<html>Access denied</html>"]:
            with self.assertRaises(ValueError):
                parse_yahoo_summary(markup, "MSFT")

    def test_yahoo_range_is_not_fabricated_as_single_date(self):
        result = parse_yahoo_summary(yahoo_markup(dates=("2026-10-27", "2026-10-30")), "MSFT")
        events, audit = resolve(cache(yahoo_dates=result["dates"]))
        self.assertEqual(events, [])
        self.assertEqual(next(s for s in audit["symbols"] if s["ticker"] == "MSFT")["status"], "date-range")

    def test_yahoo_only_fills_missing_symbol_without_official_badge(self):
        events, _ = resolve(cache(yahoo_dates=("2026-10-28",)))
        self.assertEqual(events[0]["date"], "2026-10-28")
        self.assertFalse(events[0]["confirmed"])
        self.assertEqual(events[0]["verificationStatus"], "single-source")

    def test_agreement_cross_checked_not_confirmed(self):
        events, _ = resolve(cache("2026-10-28", ("2026-10-28",)))
        self.assertEqual(len(events), 1)
        self.assertFalse(events[0]["confirmed"])
        self.assertEqual(events[0]["verificationStatus"], "cross-checked")
        self.assertEqual((events[0]["session"], events[0]["kstDate"]), ("A", "2026-10-29"))

    def test_conflict_keeps_previous_date_and_both_sources(self):
        old = {"ticker": "MSFT", "date": "2026-10-29", "confirmed": False}
        events, _ = resolve(cache("2026-10-28", ("2026-10-29",)), [old])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["date"], "2026-10-29")
        self.assertEqual(events[0]["verificationStatus"], "conflict")
        self.assertEqual(len(events[0]["evidence"]), 2)

    def test_fresh_non_estimated_date_overrides_previous_nasdaq_estimate(self):
        data = cache("2026-10-29", ("2026-10-20",))
        data["sources"]["Yahoo"]["records"]["MSFT"]["providerEstimate"] = False
        old = {"ticker": "MSFT", "date": "2026-10-29", "confirmed": False}
        for previous in [[], [old]]:
            events, _ = resolve(data, previous)
            event = events[0]
            self.assertEqual(event["date"], "2026-10-20")
            self.assertEqual(event["verificationStatus"], "conflict")
            self.assertFalse(event["confirmed"])
            self.assertEqual(len(event["evidence"]), 2)
            self.assertIn("비추정", event["note"])
            self.assertEqual(event["session"], "")  # Never borrow A/B from a different date.

    def test_estimated_or_failed_yahoo_check_does_not_override_nasdaq(self):
        for estimate, status in [(True, "success"), (None, "success"), (False, "failed")]:
            data = cache("2026-10-29", ("2026-10-20",))
            data["sources"]["Yahoo"]["records"]["MSFT"]["providerEstimate"] = estimate
            data["sources"]["Yahoo"]["checks"]["MSFT"]["status"] = status
            events, _ = resolve(data)
            self.assertEqual(events[0]["date"], "2026-10-29")

    def test_official_date_is_not_overridden_by_provider_flag(self):
        data = cache("2026-10-29", ("2026-10-20",))
        data["sources"]["Yahoo"]["records"]["MSFT"]["providerEstimate"] = False
        old = {"ticker": "MSFT", "date": "2026-10-29", "confirmed": True}
        events, _ = resolve(data, [old])
        self.assertEqual(events[0]["date"], "2026-10-29")
        self.assertTrue(events[0]["confirmed"])

    def test_spcx_official_october_20_after_hours_replaces_november_estimate(self):
        universe = {"SPCX": {"name": "SpaceX", "sector": "M7 빅테크"}}
        old = [{"ticker": "SPCX", "date": "2026-11-03", "confirmed": False,
                "evidence": [{"source": "Nasdaq", "date": "2026-11-03", "url": "nasdaq"}]}]
        start, end = date(2026, 10, 19), date(2026, 11, 15)
        events = apply_confirmed_earnings(old, universe, start, end)
        self.assertEqual(len(events), 1)
        self.assertEqual((events[0]["date"], events[0]["session"], events[0]["kstDate"]),
                         ("2026-10-20", "A", "2026-10-21"))
        self.assertEqual(events[0]["time"], "05:00 이후")
        self.assertEqual(events[0]["callKst"], "10/21 05:30")
        self.assertEqual(events[0]["verificationStatus"], "confirmed")
        self.assertIn("ir.spacex.com", events[0]["sourceUrl"])
        again = apply_confirmed_earnings(events, universe, start, end)
        self.assertEqual(again, events)  # Daily checks must not append duplicate evidence.
        self.assertEqual(apply_confirmed_earnings([], universe, date(2026, 11, 1), end), [])

    def test_official_confirmation_wins(self):
        old = {"ticker": "MSFT", "date": "2026-10-29", "confirmed": True}
        events, _ = resolve(cache("2026-10-28", ("2026-10-28",)), [old])
        self.assertTrue(events[0]["confirmed"])
        self.assertEqual(events[0]["date"], "2026-10-29")

    def test_later_conflicting_estimate_cannot_hide_current_window_candidate(self):
        old = {"ticker": "MSFT", "date": "2026-11-04", "confirmed": False}
        events, _ = resolve(cache("2026-11-04", ("2026-10-28",)), [old])
        self.assertEqual(events[0]["date"], "2026-10-28")
        self.assertEqual(events[0]["verificationStatus"], "conflict")
        self.assertEqual(len(events[0]["evidence"]), 2)

    def test_failed_sources_preserve_old_event_and_label_stale(self):
        old = {"ticker": "MSFT", "date": "2026-10-28", "confirmed": False,
               "verificationLabel": "예상·교차 확인"}
        events, _ = resolve(cache(), [old])
        self.assertEqual(events[0]["verificationStatus"], "cached")
        self.assertTrue(events[0]["stale"])
        self.assertNotEqual(events[0]["verificationLabel"], old["verificationLabel"])

    def test_etf_excluded_and_future_date_outside_display(self):
        events, audit = resolve(cache(yahoo_dates=("2026-11-17",)))
        statuses = {s["ticker"]: s["status"] for s in audit["symbols"]}
        self.assertEqual(statuses, {"DRAM": "excluded-etf", "MSFT": "outside-window"})
        self.assertEqual(events[0]["date"], "2026-11-17")

    def test_null_nasdaq_response_cannot_erase_schedule(self):
        response = Mock()
        response.json.return_value = {"data": None}
        session = Mock()
        session.get.return_value = response
        with patch("update_study_calendar.time.sleep"), self.assertRaises(RuntimeError):
            request_rows(session, START)

    def test_nasdaq_wrong_date_is_rejected(self):
        response = Mock()
        response.json.return_value = {"data": {"asOf": "Tue, Oct 06, 2026", "rows": []}}
        session = Mock()
        session.get.return_value = response
        with patch("update_study_calendar.time.sleep"), self.assertRaises(RuntimeError):
            request_rows(session, START)

    def test_nasdaq_valid_empty_array_allowed(self):
        response = Mock()
        response.json.return_value = {"data": {"asOf": "Mon, Oct 05, 2026", "rows": []}}
        session = Mock()
        session.get.return_value = response
        self.assertEqual(request_rows(session, START), [])

    def test_independent_collectors_keep_failed_partitions(self):
        data = cache("2026-10-28", ("2026-10-28",))
        before = list(data["sources"]["Nasdaq"]["events"])
        nasdaq = Mock(side_effect=ValueError("blocked"))
        yahoo = Mock(side_effect=ValueError("blocked"))
        result = collect_sources(UNIVERSE, START, COLLECTION_END, data, nasdaq, NOW, yahoo)
        self.assertEqual(result["sources"]["Nasdaq"]["events"], before)
        self.assertEqual(result["sources"]["Yahoo"]["records"]["MSFT"]["dates"], ["2026-10-28"])
        yahoo.assert_called_once_with("MSFT")

    def test_yahoo_etf_identification(self):
        self.assertTrue(parse_yahoo_summary(yahoo_markup("DRAM", quote_type="ETF"), "DRAM")["excluded"])

    def test_provider_outage_stops_after_first_failed_batch(self):
        universe = {f"TEST{i:02}": {"name": "Test", "sector": "Test"} for i in range(20)}
        yahoo = Mock(side_effect=ValueError("provider blocked"))
        result = collect_sources(universe, START, START, {}, Mock(return_value=[]), NOW, yahoo)
        self.assertEqual(yahoo.call_count, 16)
        self.assertEqual(len(result["sources"]["Yahoo"]["checks"]), 20)
        self.assertTrue(all(c["status"] == "failed" for c in result["sources"]["Yahoo"]["checks"].values()))

    def test_date_range_can_corroborate_an_existing_nasdaq_date(self):
        events, _ = resolve(cache("2026-10-28", ("2026-10-27", "2026-10-30")))
        self.assertEqual(events[0]["date"], "2026-10-28")
        self.assertEqual(events[0]["verificationStatus"], "cross-checked")
        self.assertFalse(events[0]["confirmed"])


if __name__ == "__main__":
    unittest.main()

# Earnings calendar collection

The existing `Update AI Data and Research Calendar` workflow runs daily at
02:00 UTC (11:00 KST). Scheduled start times are not execution guarantees.
No additional workflow is required.

## Universe and date windows

- Read unique U.S. symbols from the Daily Briefing `SECTOR_GROUPS` source.
- Exclude known ETFs (DRAM) and symbols identified as ETFs by Yahoo.
- Collect eight calendar weeks starting Monday; display the first four weeks.
- Keep earnings on the U.S. date. Show KST separately, with New York DST.
- A/B means after/before the U.S. regular session, not the conference-call time.

## Sources and reconciliation

- Nasdaq: validate the API response date and rows schema for every weekday.
- Yahoo: read each company's public quoteSummary/calendarEvents payload. Verify
  the response symbol and quote type; use the provider's earnings reporting date,
  not its old earnings-call date or a synthetic timestamp.
- Multiple dates from Yahoo represent an interval, not multiple announcements.
  A Nasdaq date inside that interval can be corroborated; the interval alone is
  not placed on an invented date.
- Agreement is cross-checked, not officially confirmed. Yahoo's own estimated
  flag does not replace a company IR announcement.
- Conflicting dates preserve the previous date if it remains a candidate;
  otherwise use Nasdaq, flag the conflict and retain both sources as evidence.
- If that later candidate is outside the four-week display but another candidate
  is inside it, show the earlier date with a conflict warning instead of hiding
  the company. This is not a claim that the earlier date is confirmed.
- Registered company IR confirmations override provider estimates. Existing
  LITE/COHR/CSCO confirmations remain supported; no universal IR crawler is claimed.
- Investing remains a reference for later targeted/manual verification. It is
  not silently reported as an active collector, and blocked pages are not bypassed.

## Persistence and failures

`data/calendar-earnings-cache.json` stores source-specific events, checks,
last-success timestamps and reconciled eight-week events. Successful date/ticker
partitions update independently; failures retain the preceding partition.
Nasdaq null/missing rows are a failure, not an empty earnings day. Yahoo stops
after a whole batch of 16 failures rather than repeatedly querying a blocked site.
Previously visible schedules remain as cached/recheck entries if providers lose
them. Dates expire when outside the new collection window.

Every target has a state: confirmed, cross-checked, single-source, conflict,
cached, date-range, outside-window, unconfirmed, or excluded-etf. An unconfirmed
symbol is not proof of a missing event in the four-week display window.

Source counts and last successful checks are available in the calendar footer
and GitHub job summary. The calendar JS and recovery cache form one isolated
batch task: if the task fails, both files revert, while other successful AI
collectors can still publish normally.

## Validation

```text
python -m unittest discover -s scripts -p 'test_study_calendar*.py'
node scripts/test_study_calendar_view.cjs
python -u scripts/update_study_calendar.py
```

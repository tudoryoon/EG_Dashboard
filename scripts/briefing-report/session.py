"""Resolve the final NYSE session for the most recent Sunday 11:00 KST issue."""
import json
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pandas_market_calendars as mcal


def weekly_session(now=None):
    now = now or datetime.now(timezone.utc)
    korea = now.astimezone(ZoneInfo("Asia/Seoul"))
    sunday = korea.date() - timedelta(days=(korea.weekday() + 1) % 7)
    if korea.date() == sunday and korea.time() < time(11):
        sunday -= timedelta(days=7)
    friday = sunday - timedelta(days=2)
    schedule = mcal.get_calendar("NYSE").schedule(
        start_date=friday - timedelta(days=4), end_date=friday
    )
    if schedule.empty:
        raise ValueError("No NYSE sessions for the reporting week")
    close = schedule.iloc[-1]["market_close"].to_pydatetime()
    if close > now:
        raise ValueError("The reporting week has not closed yet")
    return {
        "issueDate": sunday.isoformat(),
        "weekEnding": friday.isoformat(),
        "sessionDate": schedule.index[-1].date().isoformat(),
        "marketCloseUtc": close.isoformat(),
    }


if __name__ == "__main__":
    print(json.dumps(weekly_session()))

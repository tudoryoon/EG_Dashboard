"""Resolve the final NYSE session for the most recent Saturday 11:00 KST issue."""
import json
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pandas_market_calendars as mcal


def weekly_session(now=None):
    now = now or datetime.now(timezone.utc)
    korea = now.astimezone(ZoneInfo("Asia/Seoul"))
    saturday = korea.date() - timedelta(days=(korea.weekday() - 5) % 7)
    if korea.date() == saturday and korea.time() < time(11):
        saturday -= timedelta(days=7)
    friday = saturday - timedelta(days=1)
    schedule = mcal.get_calendar("NYSE").schedule(
        start_date=friday - timedelta(days=4), end_date=friday
    )
    if schedule.empty:
        raise ValueError("No NYSE sessions for the reporting week")
    close = schedule.iloc[-1]["market_close"].to_pydatetime()
    if close > now:
        raise ValueError("The reporting week has not closed yet")
    return {
        "issueDate": saturday.isoformat(),
        "weekEnding": friday.isoformat(),
        "sessionDate": schedule.index[-1].date().isoformat(),
        "marketCloseUtc": close.isoformat(),
    }


if __name__ == "__main__":
    print(json.dumps(weekly_session()))

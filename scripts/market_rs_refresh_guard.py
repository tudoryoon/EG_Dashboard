from __future__ import annotations

import json
import os
from datetime import date, datetime, time, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
NEW_YORK = ZoneInfo("America/New_York")
REFRESH_KEYS = (
    "refresh_rs", "refresh_trend", "refresh_breadth", "refresh_financials",
    "refresh_earnings_daily", "refresh_earnings_all",
)


def load_payload(path: Path, variable: str) -> dict:
    try:
        text = path.read_text(encoding="utf-8").strip()
        prefix = f"window.{variable}"
        if not text.startswith(prefix):
            return {}
        payload = json.loads(text.split("=", 1)[1].strip().rstrip(";"))
        return payload if isinstance(payload, dict) else {}
    except (OSError, ValueError, IndexError):
        return {}


def price_session(payload: dict) -> str:
    try:
        return date.fromisoformat(str(payload.get("updatedAt") or "")).isoformat()
    except ValueError:
        return ""


def collected_after_close(payload: dict, session: str) -> bool:
    try:
        stamp = datetime.fromisoformat(str(payload.get("updatedAt") or "").replace("Z", "+00:00"))
        close = datetime.combine(date.fromisoformat(session), time(16, 10), NEW_YORK)
        return stamp.tzinfo is not None and stamp >= close
    except ValueError:
        return False


def build_refresh_plan(
    rs: dict, trend: dict, financials: dict, earnings: dict, latest_session: str,
    *, force: bool = False, prices_only: bool = False, full_earnings_allowed: bool = False,
) -> dict:
    # A lagging QQQ response must not make downstream data older than saved RS.
    session = max(latest_session, price_session(rs))
    rs_partial = (rs.get("refreshScope") or {}).get("mode") == "daily-briefing-priority"
    trend_partial = (trend.get("refreshScope") or {}).get("mode") == "daily-briefing-priority"
    refresh_rs = force or rs_partial or not price_session(rs) or price_session(rs) < session
    refresh_trend = refresh_rs or trend_partial or not price_session(trend) or price_session(trend) < session
    earnings_mode = (earnings.get("scope") or {}).get("refreshMode")
    earnings_current = collected_after_close(earnings, session)
    plan = {
        "refresh_rs": refresh_rs,
        "refresh_trend": refresh_trend,
        "refresh_breadth": refresh_rs and not prices_only,
        "refresh_financials": not prices_only and (
            force or not collected_after_close(financials, session) or bool(financials.get("errors"))
        ),
        "refresh_earnings_daily": not prices_only and (
            force or not earnings_current or earnings_mode not in {"all", "daily-briefing"}
        ),
        # A Daily Briefing refresh is not evidence of a full-universe EPS refresh.
        "refresh_earnings_all": not prices_only and full_earnings_allowed and (
            force or not earnings_current or earnings_mode != "all"
        ),
    }
    plan["should_run"] = any(plan.values())
    pending = ", ".join(key.removeprefix("refresh_") for key in REFRESH_KEYS if plan[key]) or "none"
    plan["reason"] = f"Latest completed session {session or 'unknown'}; datasets needing refresh: {pending}"
    return plan


def latest_completed_session(now: datetime) -> str:
    request = Request(
        "https://query1.finance.yahoo.com/v8/finance/chart/QQQ"
        "?range=10d&interval=1d&includePrePost=false&events=history",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urlopen(request, timeout=15) as response:
        result = json.loads(response.read().decode("utf-8"))["chart"]["result"][0]
    sessions = sorted({
        datetime.fromtimestamp(value, timezone.utc).astimezone(NEW_YORK).date()
        for value in (result.get("timestamp") or [])
    })
    local = now.astimezone(NEW_YORK)
    if local.weekday() < 5 and local.time() < time(16, 10):
        sessions = [day for day in sessions if day < local.date()]
    if not sessions:
        raise ValueError("QQQ has no completed sessions")
    return sessions[-1].isoformat()


def evaluate_refresh(
    rs: dict, trend: dict, financials: dict, earnings: dict,
    *, event_name: str, refresh_if_stale: bool, prices_only: bool,
    full_earnings_allowed: bool, now: datetime,
) -> dict:
    force = event_name != "schedule" and not refresh_if_stale
    latest_session = price_session(rs)
    warning = ""
    if not force:
        try:
            latest_session = latest_completed_session(now)
        except Exception as error:
            local = now.astimezone(NEW_YORK)
            if local.weekday() < 5 and local.time() < time(16, 10):
                return {
                    **dict.fromkeys(REFRESH_KEYS, False), "should_run": False,
                    "reason": f"QQQ check failed before market close; retry later: {error}",
                }
            force = True
            warning = f"QQQ check failed after market close; forcing guarded refresh: {error}. "
    plan = build_refresh_plan(
        rs, trend, financials, earnings, latest_session, force=force,
        prices_only=prices_only, full_earnings_allowed=full_earnings_allowed,
    )
    plan["reason"] = warning + plan["reason"]
    return plan


def main() -> None:
    datasets = [
        load_payload(ROOT / "data" / file, variable)
        for file, variable in [
            ("market-rs-data.js", "marketRsData"),
            ("market-trend-score-data.js", "marketTrendScoreData"),
            ("market-rs-financials-data.js", "marketRsFinancialsData"),
            ("market-canslim-earnings-data.js", "marketCanslimEarningsData"),
        ]
    ]
    plan = evaluate_refresh(
        *datasets, event_name=os.getenv("GITHUB_EVENT_NAME", "workflow_dispatch"),
        refresh_if_stale=os.getenv("REFRESH_IF_STALE") == "true",
        prices_only=os.getenv("PRICES_ONLY") == "true",
        full_earnings_allowed=os.getenv("FULL_EARNINGS_ALLOWED") == "true",
        now=datetime.now(timezone.utc),
    )
    for key, value in plan.items():
        output = str(value).lower() if isinstance(value, bool) else str(value).replace("\n", " ").replace("\r", " ")
        print(f"{key}={output}")


if __name__ == "__main__":
    main()

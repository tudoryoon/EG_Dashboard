from __future__ import annotations

import ast
import json
import time
from datetime import date, datetime, time as datetime_time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests


ROOT = Path(__file__).resolve().parents[1]
BRIEFING_SCRIPT = ROOT / "scripts" / "update_market_briefing.py"
OUTPUT_PATH = ROOT / "data" / "study-calendar-data.js"

KST = ZoneInfo("Asia/Seoul")
NEW_YORK = ZoneInfo("America/New_York")
NASDAQ_API = "https://api.nasdaq.com/api/calendar/earnings"
NASDAQ_PAGE = "https://www.nasdaq.com/market-activity/earnings"

# Macro events remain a deliberately small, manually verified list. The earnings
# side is automated from the complete Daily Briefing universe below.
KNOWN_MACRO_EVENTS = [
    {
        "date": "2026-08-03",
        "time": "23:00",
        "kind": "macro",
        "title": "ISM 제조업 PMI (7월)",
        "sourceLabel": "ISM",
        "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/",
    },
    {
        "date": "2026-08-04",
        "time": "23:00",
        "kind": "macro",
        "title": "JOLTS 구인·이직 보고서 (6월)",
        "sourceLabel": "BLS",
        "sourceUrl": "https://www.bls.gov/schedule/2026/08_sched_list.htm",
    },
    {
        "date": "2026-08-05",
        "time": "23:00",
        "kind": "macro",
        "title": "ISM 서비스업 PMI (7월)",
        "sourceLabel": "ISM",
        "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/",
    },
    {
        "date": "2026-08-07",
        "time": "21:30",
        "kind": "macro",
        "title": "미국 고용보고서 (7월)",
        "note": "비농업고용·실업률·시간당 평균임금",
        "sourceLabel": "BLS",
        "sourceUrl": "https://www.bls.gov/schedule/2026/08_sched_list.htm",
    },
    {
        "date": "2026-08-12",
        "time": "21:30",
        "kind": "macro",
        "title": "소비자물가 CPI (7월)",
        "note": "Headline·Core CPI",
        "sourceLabel": "BLS",
        "sourceUrl": "https://www.bls.gov/schedule/2026/08_sched_list.htm",
    },
    {
        "date": "2026-08-13",
        "time": "21:30",
        "kind": "macro",
        "title": "생산자물가 PPI (7월)",
        "note": "Headline·Core PPI",
        "sourceLabel": "BLS",
        "sourceUrl": "https://www.bls.gov/schedule/2026/08_sched_list.htm",
    },
    {
        "date": "2026-08-14",
        "time": "21:30",
        "kind": "macro",
        "title": "미국 소매판매 (7월)",
        "sourceLabel": "US Census",
        "sourceUrl": "https://www.census.gov/retail/release_schedule.html",
    },
]


def load_daily_briefing_universe() -> dict[str, dict[str, str]]:
    tree = ast.parse(BRIEFING_SCRIPT.read_text(encoding="utf-8"), filename=str(BRIEFING_SCRIPT))
    groups = None
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(isinstance(target, ast.Name) and target.id == "SECTOR_GROUPS" for target in node.targets):
            groups = ast.literal_eval(node.value)
            break
    if groups is None:
        raise RuntimeError("SECTOR_GROUPS was not found in update_market_briefing.py")

    universe: dict[str, dict[str, str]] = {}
    for group in groups:
        sector = str(group.get("label") or "")
        for item in group.get("items") or []:
            ticker = str(item.get("ticker") or "").strip().upper()
            if not ticker or ticker.endswith((".KS", ".TW", ".TWO")):
                continue
            universe.setdefault(
                ticker,
                {
                    "name": str(item.get("name") or ticker),
                    "sector": sector,
                },
            )
    return universe


def week_bounds(today: date) -> list[tuple[str, date, date]]:
    monday = today - timedelta(days=today.weekday())
    return [
        ("this-week", monday, monday + timedelta(days=6)),
        ("next-week", monday + timedelta(days=7), monday + timedelta(days=13)),
    ]


def request_rows(session: requests.Session, target_date: date) -> list[dict]:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = session.get(NASDAQ_API, params={"date": target_date.isoformat()}, timeout=25)
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data") or {}
            return data.get("rows") or []
        except (requests.RequestException, ValueError, TypeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Nasdaq earnings request failed for {target_date}: {last_error}")


def normalize_symbol(value: str) -> str:
    return str(value or "").strip().upper().replace("/", ".").replace("-", ".")


def localize_event(api_date: date, time_code: str) -> tuple[date, str, str]:
    if time_code == "time-after-hours":
        market_close = datetime.combine(api_date, datetime_time(16, 0), tzinfo=NEW_YORK)
        local = market_close.astimezone(KST)
        return local.date(), "A", f"{local:%H:%M} 이후"
    if time_code == "time-pre-market":
        market_open = datetime.combine(api_date, datetime_time(9, 30), tzinfo=NEW_YORK)
        local = market_open.astimezone(KST)
        return local.date(), "B", f"{local:%H:%M} 이전"
    return api_date, "", "시간 미정"


def build_earnings_events(
    universe: dict[str, dict[str, str]],
    start: date,
    end: date,
) -> list[dict]:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.nasdaq.com/",
        }
    )

    events: list[dict] = []
    seen: set[tuple[str, str]] = set()
    current = start
    while current <= end:
        if current.weekday() < 5:
            for row in request_rows(session, current):
                raw_symbol = str(row.get("symbol") or "").strip().upper()
                symbol = normalize_symbol(raw_symbol)
                match = universe.get(raw_symbol) or universe.get(symbol)
                if match is None:
                    continue

                local_date, session_code, local_time = localize_event(current, str(row.get("time") or ""))
                dedupe_key = (raw_symbol, local_date.isoformat())
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)

                details = []
                fiscal_ending = str(row.get("fiscalQuarterEnding") or "").strip()
                eps_forecast = str(row.get("epsForecast") or "").strip()
                if fiscal_ending:
                    details.append(f"회계분기 종료 {fiscal_ending}")
                if eps_forecast:
                    details.append(f"EPS 컨센서스 {eps_forecast}")
                details.append("Nasdaq/Zacks 예상 일정")

                company_name = str(row.get("name") or match["name"]).strip()
                events.append(
                    {
                        "date": local_date.isoformat(),
                        "time": local_time,
                        "kind": "earnings",
                        "ticker": raw_symbol,
                        "session": session_code,
                        "title": f"{company_name} 실적 발표",
                        "note": " · ".join(details),
                        "sector": match["sector"],
                        "sourceLabel": "Nasdaq",
                        "sourceUrl": f"{NASDAQ_PAGE}?date={current:%Y-%m-%d}",
                    }
                )
        current += timedelta(days=1)

    return sorted(events, key=lambda item: (item["date"], item["time"], item["ticker"]))


def format_range(start: date, end: date) -> str:
    return f"{start:%Y.%m.%d} - {end:%m.%d}"


def week_status(today: date, start: date, end: date) -> str:
    if today > end:
        return "완료"
    if today < start:
        return "예정"
    return "진행 중"


def main() -> None:
    today = datetime.now(KST).date()
    universe = load_daily_briefing_universe()
    bounds = week_bounds(today)
    start = bounds[0][1]
    end = bounds[-1][2]
    earnings = build_earnings_events(universe, start, end)

    weeks = []
    for key, week_start, week_end in bounds:
        events = [
            item
            for item in [*KNOWN_MACRO_EVENTS, *earnings]
            if week_start <= date.fromisoformat(item["date"]) <= week_end
        ]
        events.sort(key=lambda item: (item["date"], item["time"], item.get("ticker", "")))
        weeks.append(
            {
                "key": key,
                "label": "이번 주" if key == "this-week" else "다음 주",
                "range": format_range(week_start, week_end),
                "status": week_status(today, week_start, week_end),
                "events": events,
            }
        )

    payload = {
        "updatedAt": today.isoformat(),
        "timezone": "Asia/Seoul",
        "coverage": {
            "dailyBriefingUniverse": len(universe),
            "matchedEarnings": len(earnings),
            "windowStart": start.isoformat(),
            "windowEnd": end.isoformat(),
        },
        "methodology": {
            "macro": "BLS·Census·ISM 등 공식 발표 일정을 우선 사용",
            "earnings": "Daily Briefing 전체 미국 종목을 Nasdaq 공개 Earnings Calendar와 자동 대조",
            "timing": "(B)는 미국 장전, (A)는 미국 장후. 날짜와 시각은 모두 KST 기준",
            "warning": "Nasdaq 일정은 Zacks 데이터와 과거 발표 패턴에 기반한 예상일을 포함하므로 기업 IR 확정 공지에 따라 변경될 수 있음",
        },
        "weeks": weeks,
        "fallbackSources": [
            {"label": "Nasdaq Earnings Calendar", "url": NASDAQ_PAGE},
            {"label": "Yahoo Finance Earnings Calendar", "url": "https://finance.yahoo.com/calendar/earnings/"},
        ],
    }

    serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    OUTPUT_PATH.write_text(f"window.studyCalendarData = {serialized};\n", encoding="utf-8")
    print(
        f"Updated {OUTPUT_PATH.relative_to(ROOT)}: "
        f"{len(universe)} Daily Briefing tickers, {len(earnings)} earnings events"
    )


if __name__ == "__main__":
    main()

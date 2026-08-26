from __future__ import annotations

import ast
import html
import json
import re
import time
from datetime import date, datetime, time as datetime_time, timedelta
from html.parser import HTMLParser
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
BLS_ICAL_URL = "https://www.bls.gov/schedule/news_release/bls.ics"
BEA_SCHEDULE_URL = "https://www.bea.gov/news/schedule"
CENSUS_SCHEDULE_URL = "https://www.census.gov/economic-indicators/calendar-listview.html"
ISM_SCHEDULE_URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/"

# BLS and ISM occasionally block non-browser requests. These dates are copied
# from their official 2026 release calendars so the daily job never drops the
# principal U.S. macro releases while the source endpoint is unavailable.
BLS_2026_FALLBACKS = (
    ("2026-09-01", "10:00", "JOLTS 구인·이직 보고서", "구인·채용·퇴직 · July 2026"),
    ("2026-09-04", "08:30", "미국 고용보고서", "비농업고용·실업률·시간당 평균임금 · August 2026"),
    ("2026-09-10", "08:30", "생산자물가 PPI", "Headline·Core PPI · August 2026"),
    ("2026-09-11", "08:30", "소비자물가 CPI", "Headline·Core CPI · August 2026"),
    ("2026-09-29", "10:00", "JOLTS 구인·이직 보고서", "구인·채용·퇴직 · August 2026"),
    ("2026-10-02", "08:30", "미국 고용보고서", "비농업고용·실업률·시간당 평균임금 · September 2026"),
    ("2026-10-14", "08:30", "소비자물가 CPI", "Headline·Core CPI · September 2026"),
    ("2026-10-15", "08:30", "생산자물가 PPI", "Headline·Core PPI · September 2026"),
    ("2026-11-03", "10:00", "JOLTS 구인·이직 보고서", "구인·채용·퇴직 · September 2026"),
    ("2026-11-06", "08:30", "미국 고용보고서", "비농업고용·실업률·시간당 평균임금 · October 2026"),
    ("2026-11-10", "08:30", "소비자물가 CPI", "Headline·Core CPI · October 2026"),
    ("2026-11-13", "08:30", "생산자물가 PPI", "Headline·Core PPI · October 2026"),
    ("2026-12-01", "10:00", "JOLTS 구인·이직 보고서", "구인·채용·퇴직 · October 2026"),
    ("2026-12-04", "08:30", "미국 고용보고서", "비농업고용·실업률·시간당 평균임금 · November 2026"),
    ("2026-12-10", "08:30", "소비자물가 CPI", "Headline·Core CPI · November 2026"),
    ("2026-12-15", "08:30", "생산자물가 PPI", "Headline·Core PPI · November 2026"),
)
ISM_2026_FALLBACKS = (
    ("2026-09-01", "ISM 제조업 PMI"),
    ("2026-09-03", "ISM 서비스업 PMI"),
    ("2026-10-01", "ISM 제조업 PMI"),
    ("2026-10-05", "ISM 서비스업 PMI"),
    ("2026-11-02", "ISM 제조업 PMI"),
    ("2026-11-04", "ISM 서비스업 PMI"),
    ("2026-12-01", "ISM 제조업 PMI"),
    ("2026-12-03", "ISM 서비스업 PMI"),
)

# Company IR confirmations override third-party estimated dates. Earnings are
# placed on the U.S. market date, while kstDate/time preserve the local view.
CONFIRMED_EARNINGS = {
    "LITE": {
        "usDate": "2026-08-11",
        "callKst": "08/12 06:00",
        "sourceLabel": "Lumentum IR",
        "sourceUrl": "https://investor.lumentum.com/financial-news-releases/news-details/2026/Lumentum-Announces-Reporting-Date-for-Fourth-Quarter-and-Fiscal-Year-2026-Results/default.aspx",
    },
    "COHR": {
        "usDate": "2026-08-12",
        "callKst": "08/13 05:30",
        "sourceLabel": "Coherent IR",
        "sourceUrl": "https://www.coherent.com/news/press-releases/fy2026-fourth-quarter-fy2026-conference-call-announced",
    },
    "CSCO": {
        "usDate": "2026-08-12",
        "callKst": "08/13 05:30",
        "sourceLabel": "Cisco IR",
        "sourceUrl": "https://s21.q4cdn.com/812015656/files/doc_earnings/2026/q3/transcript/Q3FY26-Prepared-Remarks.pdf",
    },
}


class ReleaseTableParser(HTMLParser):
    """Extract plain-text rows from the public agency schedule tables."""

    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._row is not None and self._cell is not None:
            value = " ".join("".join(self._cell).split())
            self._row.append(value)
            self._cell = None
        elif tag == "tr" and self._row:
            if any(self._row):
                self.rows.append(self._row)
            self._row = None


def fetch_schedule_text(url: str) -> str:
    response = requests.get(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; EG-Dashboard/1.0)"},
        timeout=25,
    )
    response.raise_for_status()
    return response.text


def parse_schedule_rows(markup: str) -> list[list[str]]:
    parser = ReleaseTableParser()
    parser.feed(markup)
    return parser.rows


def parse_us_date(value: str, default_year: int | None = None) -> date | None:
    normalized = " ".join(html.unescape(value).replace(",", "").split())
    for pattern in ("%B %d %Y", "%b %d %Y"):
        try:
            return datetime.strptime(normalized, pattern).date()
        except ValueError:
            pass
    if default_year:
        for pattern in ("%B %d", "%b %d"):
            try:
                parsed = datetime.strptime(normalized, pattern)
                return date(default_year, parsed.month, parsed.day)
            except ValueError:
                pass
    return None


def parse_us_time(value: str) -> datetime_time | None:
    normalized = " ".join(value.upper().replace(".", "").split())
    for pattern in ("%I:%M %p", "%I %p"):
        try:
            return datetime.strptime(normalized, pattern).time()
        except ValueError:
            pass
    return None


def convert_to_kst(release_date: date, eastern_time: datetime_time) -> tuple[str, str]:
    eastern = datetime.combine(release_date, eastern_time, tzinfo=NEW_YORK)
    local = eastern.astimezone(KST)
    return local.date().isoformat(), f"{local:%H:%M}"


def build_macro_event(
    *,
    release_date: date,
    eastern_time: datetime_time,
    title: str,
    note: str,
    source_label: str,
    source_url: str,
) -> dict:
    kst_date, kst_time = convert_to_kst(release_date, eastern_time)
    eastern_label = f"미국 {eastern_time:%H:%M} ET"
    return {
        "date": release_date.isoformat(),
        "time": kst_time,
        "kind": "macro",
        "title": title,
        "note": " · ".join(item for item in [note, eastern_label] if item),
        "sourceLabel": source_label,
        "sourceUrl": source_url,
        "usDate": release_date.isoformat(),
        "kstDate": kst_date,
    }


def parse_ical_events(raw_text: str) -> list[dict[str, str]]:
    lines: list[str] = []
    for line in raw_text.replace("\r\n", "\n").split("\n"):
        if line.startswith((" ", "\t")) and lines:
            lines[-1] += line[1:]
        else:
            lines.append(line)

    events: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for line in lines:
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT":
            if current:
                events.append(current)
            current = None
            continue
        if current is None or ":" not in line:
            continue
        raw_key, raw_value = line.split(":", 1)
        key = raw_key.split(";", 1)[0]
        current[key] = raw_value.replace("\\,", ",").replace("\\n", " ")
    return events


def parse_ical_datetime(value: str) -> tuple[date, datetime_time] | None:
    normalized = value.strip().rstrip("Z")
    for pattern in ("%Y%m%dT%H%M%S", "%Y%m%dT%H%M", "%Y%m%d"):
        try:
            parsed = datetime.strptime(normalized, pattern)
            return parsed.date(), parsed.time()
        except ValueError:
            pass
    return None


def build_bls_macro_events(start: date, end: date) -> list[dict]:
    title_config = (
        ("Employment Situation", "미국 고용보고서", "비농업고용·실업률·시간당 평균임금"),
        ("Consumer Price Index", "소비자물가 CPI", "Headline·Core CPI"),
        ("Producer Price Index", "생산자물가 PPI", "Headline·Core PPI"),
        ("Job Openings and Labor Turnover", "JOLTS 구인·이직 보고서", "구인·채용·퇴직"),
    )
    events: list[dict] = []
    for item in parse_ical_events(fetch_schedule_text(BLS_ICAL_URL)):
        parsed = parse_ical_datetime(item.get("DTSTART", ""))
        summary = item.get("SUMMARY", "")
        if parsed is None or not start <= parsed[0] <= end:
            continue
        matched = next((config for config in title_config if config[0] in summary), None)
        if matched is None:
            continue
        release_date, eastern_time = parsed
        source_url = f"https://www.bls.gov/schedule/{release_date:%Y/%m}_sched_list.htm"
        events.append(
            build_macro_event(
                release_date=release_date,
                eastern_time=eastern_time,
                title=matched[1],
                note=f"{matched[2]} · {summary}",
                source_label="BLS",
                source_url=source_url,
            )
        )
    return events


def build_bea_macro_events(start: date, end: date) -> list[dict]:
    events: list[dict] = []
    for row in parse_schedule_rows(fetch_schedule_text(BEA_SCHEDULE_URL)):
        if len(row) < 3:
            continue
        date_time_match = re.fullmatch(r"(.+?)\s+(\d{1,2}:\d{2}\s+[AP]M)", row[0].strip(), re.I)
        if date_time_match is None:
            continue
        release_date = parse_us_date(date_time_match.group(1), start.year)
        eastern_time = parse_us_time(date_time_match.group(2))
        description = " ".join(row[2:])
        if release_date is None or eastern_time is None or not start <= release_date <= end:
            continue
        if "Personal Income and Outlays" in description:
            events.append(
                build_macro_event(
                    release_date=release_date,
                    eastern_time=eastern_time,
                    title="PCE 물가 · 개인소득/지출",
                    note=f"Headline·Core PCE · {description}",
                    source_label="BEA",
                    source_url=BEA_SCHEDULE_URL,
                )
            )
        elif description.startswith("GDP ("):
            events.append(
                build_macro_event(
                    release_date=release_date,
                    eastern_time=eastern_time,
                    title="미국 GDP",
                    note=description,
                    source_label="BEA",
                    source_url=BEA_SCHEDULE_URL,
                )
            )
    return events


def build_bls_fallback_events(start: date, end: date) -> list[dict]:
    events: list[dict] = []
    for date_value, time_value, title, note in BLS_2026_FALLBACKS:
        release_date = date.fromisoformat(date_value)
        eastern_time = datetime.strptime(time_value, "%H:%M").time()
        if not start <= release_date <= end:
            continue
        events.append(
            build_macro_event(
                release_date=release_date,
                eastern_time=eastern_time,
                title=title,
                note=f"{note} · BLS 2026 공식 발표 일정",
                source_label="BLS",
                source_url="https://www.bls.gov/schedule/2026/",
            )
        )
    return events


def build_ism_fallback_events(start: date, end: date) -> list[dict]:
    events: list[dict] = []
    for date_value, title in ISM_2026_FALLBACKS:
        release_date = date.fromisoformat(date_value)
        if not start <= release_date <= end:
            continue
        events.append(
            build_macro_event(
                release_date=release_date,
                eastern_time=datetime_time(10, 0),
                title=title,
                note="ISM 2026 공식 발표 일정",
                source_label="ISM",
                source_url=ISM_SCHEDULE_URL,
            )
        )
    return events


def build_census_macro_events(start: date, end: date) -> list[dict]:
    title_config = (
        ("Advance Monthly Sales for Retail and Food Services", "미국 소매판매", "Retail Sales"),
        ("Advance Report on Durable Goods", "내구재 주문", "Durable Goods Orders"),
        ("New Residential Construction", "주택착공·건축허가", "Housing Starts · Building Permits"),
    )
    events: list[dict] = []
    for row in parse_schedule_rows(fetch_schedule_text(CENSUS_SCHEDULE_URL)):
        if len(row) < 4:
            continue
        description, date_text, time_text, reference = row[:4]
        release_date = parse_us_date(date_text, start.year)
        eastern_time = parse_us_time(time_text)
        if release_date is None or eastern_time is None or not start <= release_date <= end:
            continue
        matched = next((config for config in title_config if config[0] in description), None)
        if matched is None:
            continue
        events.append(
            build_macro_event(
                release_date=release_date,
                eastern_time=eastern_time,
                title=matched[1],
                note=f"{matched[2]} · {reference}",
                source_label="U.S. Census Bureau",
                source_url=CENSUS_SCHEDULE_URL,
            )
        )
    return events


def build_ism_macro_events(start: date, end: date) -> list[dict]:
    events: list[dict] = []
    for row in parse_schedule_rows(fetch_schedule_text(ISM_SCHEDULE_URL)):
        if len(row) < 3:
            continue
        match = re.fullmatch(r"([A-Za-z]+)\s+(\d{4})", row[0].strip())
        if match is None:
            continue
        try:
            month_number = datetime.strptime(match.group(1), "%B").month
            year = int(match.group(2))
            manufacturing_day = int(row[1])
            services_day = int(row[2])
        except ValueError:
            continue
        for day_number, title in (
            (manufacturing_day, "ISM 제조업 PMI"),
            (services_day, "ISM 서비스업 PMI"),
        ):
            try:
                release_date = date(year, month_number, day_number)
            except ValueError:
                continue
            if not start <= release_date <= end:
                continue
            events.append(
                build_macro_event(
                    release_date=release_date,
                    eastern_time=datetime_time(10, 0),
                    title=title,
                    note=f"ISM 공식 발표 · {match.group(1)} {year}",
                    source_label="ISM",
                    source_url=ISM_SCHEDULE_URL,
                )
            )
    return events


def load_existing_macro_events(start: date, end: date) -> list[dict]:
    if not OUTPUT_PATH.exists():
        return []
    raw_text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.studyCalendarData = "
    if raw_text.startswith(prefix):
        raw_text = raw_text[len(prefix):]
    if raw_text.endswith(";"):
        raw_text = raw_text[:-1]
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        return []
    return [
        event
        for week in payload.get("weeks", [])
        for event in week.get("events", [])
        if event.get("kind") == "macro"
        and event.get("date")
        and start <= date.fromisoformat(event["date"]) <= end
    ]


def build_macro_events(start: date, end: date) -> tuple[list[dict], list[str]]:
    official_builders = (
        ("BLS", build_bls_macro_events),
        ("BEA", build_bea_macro_events),
        ("U.S. Census Bureau", build_census_macro_events),
        ("ISM", build_ism_macro_events),
    )
    events: list[dict] = []
    failures: list[str] = []
    for source_name, builder in official_builders:
        try:
            events.extend(builder(start, end))
        except (requests.RequestException, ValueError, OSError) as error:
            failures.append(f"{source_name}: {error.__class__.__name__}")

    # Keep the calendar complete when BLS or ISM serves a bot challenge. The
    # fallback is intentionally only the official 2026 schedule, not estimates.
    events.extend(build_bls_fallback_events(start, end))
    events.extend(build_ism_fallback_events(start, end))

    deduped_events: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for event in events:
        key = (event["date"], event["title"])
        if key in seen:
            continue
        deduped_events.append(event)
        seen.add(key)
    for event in load_existing_macro_events(start, end):
        key = (event["date"], event["title"])
        if key not in seen:
            deduped_events.append(event)
            seen.add(key)

    return sorted(deduped_events, key=lambda item: (item["date"], item["time"], item["title"])), failures


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
    keys = ("this-week", "next-week", "week-3", "week-4")
    return [
        (key, monday + timedelta(days=index * 7), monday + timedelta(days=(index + 1) * 7 - 1))
        for index, key in enumerate(keys)
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


def apply_confirmed_earnings(
    events: list[dict],
    universe: dict[str, dict[str, str]],
    start: date,
    end: date,
) -> list[dict]:
    active_confirmations: list[tuple[str, dict, date, date, str, str]] = []

    for ticker, confirmation in CONFIRMED_EARNINGS.items():
        match = universe.get(ticker)
        if match is None:
            continue
        us_date = date.fromisoformat(confirmation["usDate"])
        local_date, session_code, local_time = localize_event(us_date, "time-after-hours")
        if not start <= us_date <= end:
            continue
        active_confirmations.append(
            (ticker, confirmation, us_date, local_date, session_code, local_time)
        )

    active_tickers = {item[0] for item in active_confirmations}
    retained = [event for event in events if event.get("ticker") not in active_tickers]

    for ticker, confirmation, us_date, local_date, session_code, local_time in active_confirmations:
        match = universe[ticker]
        retained.append(
            {
                "date": us_date.isoformat(),
                "time": local_time,
                "kind": "earnings",
                "ticker": ticker,
                "session": session_code,
                "title": f"{match['name']} ({ticker}) 실적 발표",
                "note": (
                    f"기업 IR 공식 확정 · 미국 {us_date:%m/%d} 장후 · "
                    f"컨퍼런스콜 KST {confirmation['callKst']}"
                ),
                "sector": match["sector"],
                "sourceLabel": confirmation["sourceLabel"],
                "sourceUrl": confirmation["sourceUrl"],
                "usDate": us_date.isoformat(),
                "kstDate": local_date.isoformat(),
                "callKst": confirmation["callKst"],
                "confirmed": True,
            }
        )

    return retained


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
                dedupe_key = (raw_symbol, current.isoformat())
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
                        "date": current.isoformat(),
                        "time": local_time,
                        "kind": "earnings",
                        "ticker": raw_symbol,
                        "session": session_code,
                        "title": f"{company_name} ({raw_symbol}) 실적 발표",
                        "note": " · ".join(details),
                        "sector": match["sector"],
                        "sourceLabel": "Nasdaq",
                        "sourceUrl": f"{NASDAQ_PAGE}?date={current:%Y-%m-%d}",
                        "usDate": current.isoformat(),
                        "kstDate": local_date.isoformat(),
                        "confirmed": False,
                    }
                )
        current += timedelta(days=1)

    events = apply_confirmed_earnings(events, universe, start, end)
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
    today_kst = datetime.now(KST).date()
    today_us = datetime.now(NEW_YORK).date()
    universe = load_daily_briefing_universe()
    bounds = week_bounds(today_us)
    start = bounds[0][1]
    end = bounds[-1][2]
    earnings = build_earnings_events(universe, start, end)
    macro_events, macro_failures = build_macro_events(start, end)

    weeks = []
    week_labels = {
        "this-week": "이번 주",
        "next-week": "다음 주",
        "week-3": "3주차",
        "week-4": "4주차",
    }
    for key, week_start, week_end in bounds:
        events = [
            item
            for item in [*macro_events, *earnings]
            if week_start <= date.fromisoformat(item["date"]) <= week_end
        ]
        events.sort(key=lambda item: (item["date"], item["time"], item.get("ticker", "")))
        weeks.append(
            {
                "key": key,
                "label": week_labels[key],
                "range": format_range(week_start, week_end),
                "status": week_status(today_us, week_start, week_end),
                "events": events,
            }
        )

    payload = {
        "updatedAt": today_kst.isoformat(),
        "timezone": "America/New_York",
        "displayTimezone": "Asia/Seoul",
        "calendarToday": today_us.isoformat(),
        "coverage": {
            "dailyBriefingUniverse": len(universe),
            "matchedEarnings": len(earnings),
            "matchedMacro": len(macro_events),
            "windowStart": start.isoformat(),
            "windowEnd": end.isoformat(),
        },
        "methodology": {
            "macro": "미국 Macro는 BLS·BEA·U.S. Census Bureau·ISM의 공식 발표 일정에서 매일 갱신",
            "earnings": "기업 IR 공식 공지를 우선 적용하고 나머지는 Daily Briefing 미국 종목을 Nasdaq Earnings Calendar와 자동 대조",
            "timing": "일정은 모두 미국 현지 발표일에 배치. 실적과 Macro 모두 KST 시각을 함께 표시",
            "warning": "공식 확정 배지가 없는 일정은 Nasdaq/Zacks 예상일을 포함하므로 기업 IR 공지에 따라 변경될 수 있음",
            "macroWarning": "공식 기관 일정에 일시적 접속 문제가 생기면 직전 저장 일정만 유지하며, 다음 실행에서 재확인",
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
        f"{len(universe)} Daily Briefing tickers, {len(earnings)} earnings events, "
        f"{len(macro_events)} U.S. macro events"
    )
    if macro_failures:
        print(f"Macro source warnings: {', '.join(macro_failures)}")


if __name__ == "__main__":
    main()

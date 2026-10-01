from __future__ import annotations

import math
import re
from datetime import date, datetime, timezone
from urllib.parse import urljoin, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests


CME_FEDWATCH_URL = "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
CME_TOOL_HOST = "cmegroup-tools.quikstrike.net"


def _tool_url(base: str, value: str) -> str:
    result = urljoin(base, value)
    parsed = urlsplit(result)
    if parsed.scheme != "https" or parsed.hostname != CME_TOOL_HOST:
        raise ValueError("Unexpected CME FedWatch tool URL")
    return result


def _cells(row) -> list[str]:
    cells = []
    for cell in row.find_all(["td", "th"], recursive=False):
        text = cell.get_text(" ", strip=True)
        span = int(cell.get("colspan", 1))
        if span < 1 or span > 100:
            raise ValueError("Invalid FedWatch table column span")
        cells.append(text)
        cells.extend([""] * (span - 1))
    return cells


def _meeting_date(value: str) -> str:
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d %b %Y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"Invalid FedWatch meeting date: {value!r}")


def parse_probability_table(html: str) -> tuple[list[str], list[dict[str, object]]]:
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        table_rows = [_cells(row) for row in table.find_all("tr") if row.find_parent("table") is table]
        header_index = next(
            (index for index, cells in enumerate(table_rows)
             if cells and cells[0].strip().upper() == "MEETING DATE"),
            None,
        )
        if header_index is None:
            continue
        columns = [re.sub(r"\s+", "", value) for value in table_rows[header_index][1:]]
        if not columns or any(not re.fullmatch(r"\d+-\d+", column) for column in columns):
            continue
        bounds = [tuple(map(int, column.split("-"))) for column in columns]
        if len(set(columns)) != len(columns) or bounds != sorted(bounds) or any(hi - lo != 25 for lo, hi in bounds):
            raise ValueError("Invalid FedWatch target-rate columns")

        rows = []
        for cells in table_rows[header_index + 1:]:
            if not cells or not cells[0]:
                continue
            meeting_date = _meeting_date(cells[0])
            if len(cells) != len(columns) + 1:
                raise ValueError(f"FedWatch probability columns do not align for {meeting_date}")
            probabilities = []
            for value in cells[1:]:
                # CME leaves unreachable outcomes blank, including merged trailing cells.
                if not value.strip():
                    probability = 0.0
                elif re.fullmatch(r"\d+(?:\.\d+)?\s*%", value):
                    probability = float(value.replace("%", "").strip())
                else:
                    raise ValueError(f"Invalid FedWatch probability: {value!r}")
                if not math.isfinite(probability) or not 0 <= probability <= 100:
                    raise ValueError("FedWatch probability is outside 0-100")
                probabilities.append(probability)
            if abs(sum(probabilities) - 100.0) > 0.05 * len(columns) + 0.051:
                raise ValueError(f"FedWatch probabilities do not sum to 100 for {meeting_date}")
            max_index = max(range(len(probabilities)), key=probabilities.__getitem__)
            rows.append({"meetingDate": meeting_date, "probabilities": probabilities,
                         "maxProbability": probabilities[max_index], "maxRange": columns[max_index]})
        if not rows or [row["meetingDate"] for row in rows] != sorted({row["meetingDate"] for row in rows}):
            raise ValueError("FedWatch meeting dates are empty, duplicated, or out of order")
        return columns, rows
    raise RuntimeError("CME official FedWatch probability table was not found")


def fetch_probability_html(session) -> tuple[str, str]:
    response = session.get(CME_FEDWATCH_URL, timeout=30)
    response.raise_for_status()
    page = BeautifulSoup(response.text, "html.parser")
    iframe = next((frame for frame in page.find_all("iframe")
                   if urlsplit(urljoin(CME_FEDWATCH_URL, frame.get("src", ""))).hostname == CME_TOOL_HOST), None)
    if iframe is None:
        raise RuntimeError("CME official FedWatch iframe was not found")

    response = session.get(_tool_url(CME_FEDWATCH_URL, iframe["src"]),
                           headers={"Referer": CME_FEDWATCH_URL}, timeout=30)
    response.raise_for_status()
    tool_url = _tool_url(CME_FEDWATCH_URL, response.url)
    # The public iframe initializes a session in Tools, then renders the View page.
    parsed = urlsplit(tool_url)
    if parsed.path.endswith("/QuikStrikeTools.aspx"):
        view_url = urlunsplit(parsed._replace(path=parsed.path.replace("QuikStrikeTools.aspx", "QuikStrikeView.aspx")))
        response = session.get(view_url, headers={"Referer": tool_url}, timeout=30)
        response.raise_for_status()
        tool_url = _tool_url(tool_url, response.url)

    page = BeautifulSoup(response.text, "html.parser")
    current_match = re.search(r"(\d+\s*-\s*\d+)\s*\(Current\)", page.get_text(" ", strip=True))
    current_range = re.sub(r"\s+", "", current_match.group(1)) if current_match else ""
    link = next((link for link in page.find_all("a") if link.get_text(strip=True) == "Probabilities"), None)
    event = re.fullmatch(r"javascript:__doPostBack\('([^']+)',''\)", link.get("href", "")) if link else None
    form = link.find_parent("form") if link else None
    if event is None or form is None:
        raise RuntimeError("CME official probability-tab form was not found")
    fields = {item["name"]: item.get("value", "") for item in form.find_all("input", type="hidden") if item.get("name")}
    if not fields.get("__VIEWSTATE"):
        raise RuntimeError("CME official probability-tab form state was missing")
    fields.update({"__EVENTTARGET": event.group(1), "__EVENTARGUMENT": ""})
    response = session.post(_tool_url(tool_url, form.get("action", tool_url)), data=fields,
                            headers={"Referer": tool_url}, timeout=30)
    response.raise_for_status()
    _tool_url(tool_url, response.url)
    return response.text, current_range


def build_fedwatch_snapshot() -> dict[str, object]:
    last_error = None
    for attempt in range(2):
        try:
            with curl_requests.Session(impersonate="chrome") as session:
                html, current_range = fetch_probability_html(session)
            columns, rows = parse_probability_table(html)
            now = datetime.now(timezone.utc)
            as_of = now.astimezone(ZoneInfo("America/Chicago")).date()
            if date.fromisoformat(str(rows[0]["meetingDate"])) < as_of:
                raise ValueError("CME FedWatch table starts with a past meeting")
            return {
                "source": "CME FedWatch 공식 확률표",
                "sourceUrl": CME_FEDWATCH_URL,
                "asOf": as_of.isoformat(),
                "asOfBasis": "retrieval-date-america-chicago",
                "refreshedAt": now.isoformat(),
                "title": "CME FedWatch Tool - Conditional Meeting Probabilities",
                "sourceNote": (
                    "CME 공식 FedWatch의 Probabilities 표를 직접 수집한 값입니다. "
                    "자체 재계산하지 않으며, 조회일과 수집 시각 기준 스냅샷이므로 이후 장중 CME 화면과는 달라질 수 있습니다."
                ),
                "columns": columns,
                "rows": rows,
                "currentTargetRange": current_range,
                "method": "official-probability-table",
                "isFallback": False,
            }
        except Exception as error:
            last_error = error
            print(f"CME FedWatch official table attempt {attempt + 1} failed: {error}", flush=True)
    raise RuntimeError(f"CME official FedWatch table could not be refreshed: {last_error}")

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

import requests


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-briefing-data.js"
FEDWATCH_SOURCE_URL = "https://www.cmegroup.com/ko/markets/interest-rates/cme-fedwatch-tool.html"
FEDWATCH_MIRROR_URL = "https://www.oanda.jp/lab-education/dictionary/fedwatchtool/"
FEDWATCH_DISPLAY_COLUMNS = ["250-275", "275-300", "300-325", "325-350", "350-375", "375-400", "400-425", "425-450", "450-475", "475-500"]
USER_AGENT = {"User-Agent": "Mozilla/5.0"}


def parse_market_briefing_payload() -> dict[str, object]:
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.marketBriefingData\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse {OUTPUT_PATH}")
    return json.loads(match.group(1))


def write_market_briefing_payload(payload: dict[str, object]) -> None:
    OUTPUT_PATH.write_text(
        "window.marketBriefingData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def normalize_fedwatch_range_label(label: str) -> str:
    match = re.match(r"^\s*(\d+(?:\.\d+)?)%-\s*(\d+(?:\.\d+)?)%\s*$", str(label))
    if not match:
        return str(label)
    lower = int(round(float(match.group(1)) * 100))
    upper = int(round(float(match.group(2)) * 100))
    return f"{lower}-{upper}"


def fedwatch_column_sort_key(label: str) -> tuple[int, str]:
    match = re.match(r"^(\d+)-(\d+)$", str(label))
    if not match:
        return (10_000, str(label))
    return (int(match.group(1)), str(label))


def strip_html_tags(value: str) -> str:
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    return unescape(value).replace("\xa0", " ").strip()


def parse_percent_cell(value: object) -> float:
    text = strip_html_tags(str(value)).replace("%", "").replace(",", "").strip()
    if not text or text in {"-", "--", "–", "—", "−"}:
        return 0.0
    return round(float(text), 1)


def normalize_fedwatch_date(value: object) -> str:
    text = strip_html_tags(str(value)).strip()
    match = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", text)
    if not match:
        raise ValueError(f"unrecognized FedWatch meeting date: {text!r}")
    year, month, day = (int(part) for part in match.groups())
    return f"{year:04d}-{month:02d}-{day:02d}"


def extract_html_table_cells(row_html: str) -> list[str]:
    return [
        strip_html_tags(match.group(2))
        for match in re.finditer(r"<(t[dh])\b[^>]*>(.*?)</\1>", row_html, flags=re.IGNORECASE | re.DOTALL)
    ]


def find_fedwatch_table(html: str) -> list[list[str]]:
    for table_match in re.finditer(r"<table\b[^>]*>.*?</table>", html, flags=re.IGNORECASE | re.DOTALL):
        table_html = table_match.group(0)
        if "300-325" not in table_html or "FOMC" not in table_html:
            continue
        rows = []
        for row_match in re.finditer(r"<tr\b[^>]*>.*?</tr>", table_html, flags=re.IGNORECASE | re.DOTALL):
            cells = extract_html_table_cells(row_match.group(0))
            if cells:
                rows.append(cells)
        if len(rows) >= 2:
            return rows
    raise RuntimeError("FedWatch probability table was not found in OANDA mirror HTML")


def build_mirror_fedwatch_snapshot() -> dict[str, object]:
    response = requests.get(FEDWATCH_MIRROR_URL, headers=USER_AGENT, timeout=30)
    response.raise_for_status()
    table_rows = find_fedwatch_table(response.text)
    source_columns = [normalize_fedwatch_range_label(column) for column in table_rows[0][1:]]
    columns = sorted(set(FEDWATCH_DISPLAY_COLUMNS + source_columns), key=fedwatch_column_sort_key)
    rows = []
    for table_row in table_rows[1:]:
        if len(table_row) < 2:
            continue
        meeting_date = normalize_fedwatch_date(table_row[0])
        by_column = {}
        for column, value in zip(source_columns, table_row[1:]):
            by_column[column] = parse_percent_cell(value)
        probabilities = [by_column.get(column, 0.0) for column in columns]
        max_probability = max(probabilities) if probabilities else None
        max_index = probabilities.index(max_probability) if max_probability is not None else None
        rows.append(
            {
                "meetingDate": meeting_date,
                "probabilities": probabilities,
                "maxProbability": max_probability,
                "maxRange": columns[max_index] if max_index is not None else None,
            }
        )
    if not rows:
        raise RuntimeError("FedWatch mirror table had no meeting rows")
    return {
        "source": "CME FedWatch via OANDA mirror",
        "sourceUrl": FEDWATCH_SOURCE_URL,
        "mirrorSourceUrl": FEDWATCH_MIRROR_URL,
        "asOf": datetime.now(timezone.utc).date().isoformat(),
        "refreshedAt": datetime.now(timezone.utc).isoformat(),
        "title": "CME FedWatch Tool - Conditional Meeting Probabilities",
        "columns": columns,
        "rows": rows,
        "isFallback": False,
    }


def main() -> None:
    payload = parse_market_briefing_payload()
    previous_fedwatch = payload.get("fedWatch") if isinstance(payload.get("fedWatch"), dict) else {}
    fedwatch = build_mirror_fedwatch_snapshot()
    payload["fedWatch"] = fedwatch
    write_market_briefing_payload(payload)
    print(f"Wrote FedWatch snapshot to {OUTPUT_PATH}")
    print(f"FedWatch asOf: {fedwatch.get('asOf')}")
    print(f"Rows: {len(fedwatch.get('rows') or [])}")
    if previous_fedwatch:
        print(f"Previous asOf: {previous_fedwatch.get('asOf')}")


if __name__ == "__main__":
    main()

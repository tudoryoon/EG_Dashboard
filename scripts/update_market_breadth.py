from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


STOCKBEE_SHEET_ID = "1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE"
STOCKBEE_SOURCE_URL = "https://stockbee.blogspot.com/p/mm.html"
STOCKBEE_SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    f"{STOCKBEE_SHEET_ID}/pubhtml?widget=true&headers=false"
)
START_DATE = "2009-01-01"
STOCKBEE_YEAR_GIDS = {
    2026: "1082103394",
    2025: "780188096",
    2024: "1146204629",
    2023: "632667710",
    2022: "1394777987",
    2021: "1981550515",
    2020: "2093835319",
    2019: "1089581064",
    2018: "280217788",
    2017: "1391207759",
    2016: "233732777",
    2015: "0",
    2014: "1622090416",
    2013: "299051502",
    2012: "2142678713",
    2011: "24026662",
    2010: "1622166415",
    2009: "1397702728",
}
PRIMARY_COLUMN_KEYS = {
    "up25Quarter": (
        "Number of stocks up 25% plus in a quarter",
        "Quarter +25%",
        "#15803d",
        False,
    ),
    "down25Quarter": (
        "Number of stocks down 25% + in a quarter",
        "Quarter -25%",
        "#b91c1c",
        True,
    ),
}
INDEX_PROXIES = {
    "dow": {"label": "Dow Jones", "symbol": "^DJI", "color": "#6b7280"},
    "sp500": {"label": "S&P 500", "symbol": "^GSPC", "color": "#111827"},
    "nasdaq": {"label": "NASDAQ Composite", "symbol": "^IXIC", "color": "#0f766e"},
    "nasdaq100": {"label": "NASDAQ 100", "symbol": "^NDX", "color": "#2563eb"},
    "sox": {"label": "SOX", "symbol": "^SOX", "color": "#7c3aed"},
    "russell2000": {"label": "Russell 2000", "symbol": "^RUT", "color": "#d97706"},
}
RANGES = [
    {"key": "1m", "label": "1M"},
    {"key": "3m", "label": "3M"},
    {"key": "6m", "label": "6M"},
    {"key": "ytd", "label": "YTD"},
    {"key": "1y", "label": "1Y"},
    {"key": "3y", "label": "3Y"},
    {"key": "5y", "label": "5Y"},
    {"key": "10y", "label": "10Y"},
    {"key": "max", "label": "Max"},
]


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=45) as response:  # nosec B310 - fixed public data endpoints
        return response.read().decode("utf-8-sig", errors="replace")


def fetch_json(url: str) -> dict:
    return json.loads(fetch_text(url))


def stockbee_csv_url(gid: str) -> str:
    return f"https://docs.google.com/spreadsheets/d/{STOCKBEE_SHEET_ID}/gviz/tq?tqx=out:csv&gid={gid}"


def yahoo_chart_url(symbol: str) -> str:
    encoded = quote(symbol, safe="")
    period2 = int(datetime.now(timezone.utc).timestamp())
    period1 = int(datetime.fromisoformat(f"{START_DATE}T00:00:00+00:00").timestamp())
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1={period1}&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def parse_stockbee_date(value: str) -> str | None:
    value = (value or "").strip()
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def parse_number(value: str) -> float | None:
    cleaned = (value or "").strip().replace(",", "").replace("%", "")
    if cleaned in {"", "-", "N/A", "#N/A"}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def normalize_header(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def find_column(headers: list[str], needle: str) -> int:
    normalized_needle = normalize_header(needle)
    for index, header in enumerate(headers):
        if normalize_header(header) == normalized_needle:
            return index
    for index, header in enumerate(headers):
        if normalized_needle in normalize_header(header):
            return index
    raise ValueError(f"Missing Stockbee column: {needle}")


def find_date_column(headers: list[str]) -> int:
    for index, header in enumerate(headers):
        if "date" in normalize_header(header):
            return index
    raise ValueError("Missing Stockbee date column")


def find_quarter_25_column(headers: list[str], direction: str) -> int:
    direction_terms = ("up", "plus") if direction == "up" else ("down",)
    best_index = None
    for index, header in enumerate(headers):
        normalized = normalize_header(header)
        if "25" not in normalized or "quarter" not in normalized:
            continue
        if any(term in normalized for term in direction_terms):
            if "month" not in normalized:
                return index
            best_index = index
    if best_index is not None:
        return best_index
    raise ValueError(f"Missing Stockbee quarter 25% {direction} column")


def fetch_stockbee_primary_series() -> dict[str, object]:
    rows_by_date: dict[str, dict[str, float]] = {}
    last_year_seen = None
    max_allowed_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    for year in sorted(STOCKBEE_YEAR_GIDS):
        gid = STOCKBEE_YEAR_GIDS[year]
        text = fetch_text(stockbee_csv_url(gid))
        csv_rows = [row for row in csv.reader(io.StringIO(text)) if row and any(cell.strip() for cell in row)]
        if not csv_rows:
            continue
        headers = csv_rows[0]
        date_index = find_date_column(headers)
        column_indexes = {
            "up25Quarter": find_quarter_25_column(headers, "up"),
            "down25Quarter": find_quarter_25_column(headers, "down"),
        }
        for row in csv_rows[1:]:
            if len(row) <= date_index:
                continue
            day = parse_stockbee_date(row[date_index])
            if not day or day < START_DATE or day > max_allowed_date:
                continue
            values = {}
            for key, column_index in column_indexes.items():
                value = parse_number(row[column_index] if len(row) > column_index else "")
                if value is not None:
                    values[key] = value
            if values:
                rows_by_date[day] = values
                last_year_seen = year

    dates = sorted(rows_by_date)
    series: dict[str, object] = {}
    for key, (source_label, label, color, bearish) in PRIMARY_COLUMN_KEYS.items():
        values: list[int | None] = []
        for day in dates:
            value = rows_by_date[day].get(key)
            values.append(int(value) if value is not None else None)
        finite_values = [value for value in values if value is not None]
        latest = finite_values[-1] if finite_values else None
        latest_index = next((index for index in range(len(values) - 1, -1, -1) if values[index] is not None), None)
        latest_date = dates[latest_index] if latest_index is not None else ""
        previous = None
        if latest_index is not None:
            for index in range(latest_index - 1, -1, -1):
                if values[index] is not None:
                    previous = values[index]
                    break
        delta = latest - previous if latest is not None and previous is not None else None
        series[key] = {
            "label": label,
            "description": source_label,
            "color": color,
            "isBearish": bearish,
            "dates": dates,
            "values": values,
            "latest": latest,
            "previous": previous,
            "delta": delta,
            "updatedAt": latest_date,
            "startDate": dates[0] if dates else START_DATE,
        }
    return {
        "series": series,
        "dates": dates,
        "updatedAt": dates[-1] if dates else "",
        "startDate": dates[0] if dates else START_DATE,
        "lastYearSeen": last_year_seen,
    }


def fetch_index_series(symbol: str, label: str, color: str) -> dict[str, object]:
    payload = fetch_json(yahoo_chart_url(symbol))
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = (result.get("indicators") or {}).get("quote") or [{}]
    adjclose_data = (result.get("indicators") or {}).get("adjclose") or [{}]
    closes = adjclose_data[0].get("adjclose") or quote_data[0].get("close") or []

    dates: list[str] = []
    values: list[float] = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        day = (datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=timestamp)).strftime("%Y-%m-%d")
        if day < START_DATE:
            continue
        dates.append(day)
        values.append(round(float(close), 4))
    latest = values[-1] if values else None
    return {
        "label": label,
        "symbol": symbol,
        "color": color,
        "dates": dates,
        "values": values,
        "latest": latest,
        "updatedAt": dates[-1] if dates else "",
        "startDate": dates[0] if dates else START_DATE,
    }


def main() -> None:
    stockbee = fetch_stockbee_primary_series()
    indices = {
        key: fetch_index_series(config["symbol"], config["label"], config["color"])
        for key, config in INDEX_PROXIES.items()
    }
    updated_dates = [stockbee["updatedAt"], *[item["updatedAt"] for item in indices.values() if item.get("updatedAt")]]
    start_dates = [stockbee["startDate"], *[item["startDate"] for item in indices.values() if item.get("startDate")]]

    panel = {
        "key": "primaryQuarter25",
        "label": "Stockbee Primary Indicator: Quarter +/-25%",
        "subtitle": "Number of stocks up/down 25% or more over a quarter. Major US indexes can be overlaid as rebased index lines.",
        "unit": "count",
        "source": {
            "name": "Stockbee Market Monitor",
            "url": STOCKBEE_SOURCE_URL,
            "sheetUrl": STOCKBEE_SHEET_URL,
            "lastYearSheet": stockbee["lastYearSeen"],
        },
        "series": stockbee["series"],
        "indices": indices,
        "thresholds": [],
    }

    payload = {
        "updatedAt": max(updated_dates) if updated_dates else "",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "startDate": min(start_dates) if start_dates else START_DATE,
        "defaultRange": "3y",
        "ranges": RANGES,
        "source": {
            "name": "Stockbee published Google Sheet / Yahoo Finance",
            "url": STOCKBEE_SOURCE_URL,
            "sheetUrl": STOCKBEE_SHEET_URL,
            "note": (
                "Primary Indicator uses Stockbee published sheet columns: Number of stocks up 25% plus in a quarter "
                "and Number of stocks down 25% + in a quarter. Index overlays use Yahoo Finance adjusted closes."
            ),
        },
        "panels": {
            "primaryQuarter25": panel,
        },
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-breadth-data.js"
    output_path.write_text(
        "window.marketBreadthData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {output_path}")
    print(f"stockbee: {stockbee['updatedAt']}")
    for key, item in stockbee["series"].items():
        print(f"{key}: {item['updatedAt']} {item['latest']}")
    for key, item in indices.items():
        print(f"{key}: {item['updatedAt']} {item['latest']}")


if __name__ == "__main__":
    main()

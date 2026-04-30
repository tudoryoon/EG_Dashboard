from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from xml.etree import ElementTree as ET
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


START_DATE = "2017-01-01"
RANGES = [
    {"key": "1m", "label": "1M"},
    {"key": "3m", "label": "3M"},
    {"key": "6m", "label": "6M"},
    {"key": "1y", "label": "1Y"},
    {"key": "3y", "label": "3Y"},
    {"key": "5y", "label": "5Y"},
    {"key": "max", "label": "Max"},
]

US_TREASURY_SERIES = {
    "us2y": ("US 2Y", "#111827"),
    "us10y": ("US 10Y", "#2563eb"),
    "us30y": ("US 30Y", "#dc2626"),
}

YAHOO_SERIES = {
    "dxy": ("DX-Y.NYB", "Dollar Index", "#111827"),
    "wti": ("CL=F", "WTI", "#7c3aed"),
    "brent": ("BZ=F", "Brent", "#2563eb"),
    "gold": ("GC=F", "Gold", "#d97706"),
    "silver": ("SI=F", "Silver", "#6b7280"),
    "copper": ("HG=F", "Copper", "#b45309"),
}


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=60) as response:  # nosec B310 - fixed public endpoints
        return response.read().decode("utf-8-sig")


def fetch_json(url: str) -> dict:
    return json.loads(fetch_text(url))


def fred_csv_url(series_id: str) -> str:
    return f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"


def yahoo_chart_url(symbol: str) -> str:
    encoded = quote(symbol, safe="")
    period2 = int(datetime.now(timezone.utc).timestamp())
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1=1483228800&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def parse_us_treasury_yields() -> dict[str, tuple[list[str], list[float]]]:
    series = {key: ([], []) for key in ("us2y", "us10y", "us30y")}
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "d": "http://schemas.microsoft.com/ado/2007/08/dataservices",
        "m": "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata",
    }
    start_year = int(START_DATE[:4])
    current_year = datetime.now(timezone.utc).year
    for year in range(start_year, current_year + 1):
        url = (
            "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml"
            f"?data=daily_treasury_yield_curve&field_tdr_date_value={year}"
        )
        root = ET.fromstring(fetch_text(url))
        for entry in root.findall("atom:entry", ns):
            properties = entry.find("atom:content/m:properties", ns)
            if properties is None:
                continue
            raw_date = properties.findtext("d:NEW_DATE", default="", namespaces=ns)
            if not raw_date:
                continue
            date_key = raw_date.split("T", 1)[0]
            if date_key < START_DATE:
                continue
            for key, field_name in {"us2y": "BC_2YEAR", "us10y": "BC_10YEAR", "us30y": "BC_30YEAR"}.items():
                raw_value = properties.findtext(f"d:{field_name}", default="", namespaces=ns).strip()
                if raw_value in {"", "N/A"}:
                    continue
                series[key][0].append(date_key)
                series[key][1].append(round(float(raw_value), 4))
    return series


def parse_japan_yields() -> dict[str, tuple[list[str], list[float]]]:
    url = "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv"
    lines = fetch_text(url).splitlines()
    header_index = next(index for index, line in enumerate(lines) if line.startswith("Date,"))
    reader = csv.DictReader(lines[header_index:])

    buckets = {
        "jp2y": {"column": "2Y", "label": "Japan 2Y", "color": "#111827", "dash": [6, 4]},
        "jp10y": {"column": "10Y", "label": "Japan 10Y", "color": "#2563eb", "dash": [6, 4]},
        "jp30y": {"column": "30Y", "label": "Japan 30Y", "color": "#dc2626", "dash": [6, 4]},
    }
    series = {key: ([], []) for key in buckets}

    for row in reader:
        raw_date = (row.get("Date") or "").strip()
        if not raw_date:
            continue
        try:
            date_key = datetime.strptime(raw_date, "%Y/%m/%d").strftime("%Y-%m-%d")
        except ValueError:
            continue
        if date_key < START_DATE:
            continue
        for key, meta in buckets.items():
            raw_value = (row.get(meta["column"]) or "").strip()
            if raw_value in {"", "-", "--"}:
                continue
            series[key][0].append(date_key)
            series[key][1].append(round(float(raw_value), 4))
    return series


def parse_yahoo_series(symbol: str) -> tuple[list[str], list[float]]:
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
        date_key = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d")
        if date_key < START_DATE:
            continue
        dates.append(date_key)
        values.append(round(float(close), 4))
    return dates, values


def build_series_item(
    label: str,
    color: str,
    dates: list[str],
    values: list[float],
    dash: list[int] | None = None,
) -> dict[str, object]:
    item: dict[str, object] = {
        "name": label,
        "color": color,
        "dates": dates,
        "values": values,
    }
    if dash:
        item["dash"] = dash
    return item


def main() -> None:
    us_series = parse_us_treasury_yields()
    japan_series = parse_japan_yields()
    rates_series = {
        key: build_series_item(label, color, *us_series[key])
        for key, (label, color) in US_TREASURY_SERIES.items()
    }
    rates_series["jp2y"] = build_series_item("Japan 2Y", "#111827", *japan_series["jp2y"], [6, 4])
    rates_series["jp10y"] = build_series_item("Japan 10Y", "#2563eb", *japan_series["jp10y"], [6, 4])
    rates_series["jp30y"] = build_series_item("Japan 30Y", "#dc2626", *japan_series["jp30y"], [6, 4])

    dxy_dates, dxy_values = parse_yahoo_series("DX-Y.NYB")
    wti_dates, wti_values = parse_yahoo_series("CL=F")
    brent_dates, brent_values = parse_yahoo_series("BZ=F")
    gold_dates, gold_values = parse_yahoo_series("GC=F")
    silver_dates, silver_values = parse_yahoo_series("SI=F")
    copper_dates, copper_values = parse_yahoo_series("HG=F")

    panels = {
        "rates": {
            "title": "US & Japan Sovereign Yields",
            "subtitle": "Daily 2Y / 10Y / 30Y. US Treasury from Treasury XML, Japan JGB from MOF.",
            "source": "US Treasury / Japan MOF",
            "mode": "raw",
            "yAxisLabel": "Yield %",
            "formatter": "percent2",
            "series": rates_series,
        },
        "dxy": {
            "title": "Dollar Index",
            "subtitle": "Daily DXY close from Yahoo Finance.",
            "source": "Yahoo Finance",
            "mode": "raw",
            "yAxisLabel": "Index",
            "formatter": "number1",
            "series": {
                "dxy": build_series_item("Dollar Index", "#111827", dxy_dates, dxy_values),
            },
        },
        "energy": {
            "title": "WTI & Brent",
            "subtitle": "Daily front-month futures closes.",
            "source": "Yahoo Finance",
            "mode": "raw",
            "yAxisLabel": "$ / bbl",
            "formatter": "dollar1",
            "series": {
                "wti": build_series_item("WTI", "#7c3aed", wti_dates, wti_values),
                "brent": build_series_item("Brent", "#2563eb", brent_dates, brent_values),
            },
        },
        "metals": {
            "title": "Gold / Silver / Copper",
            "subtitle": "Daily futures closes normalized to 100 at the selected start date for easier cross-asset comparison.",
            "source": "Yahoo Finance",
            "mode": "normalized",
            "yAxisLabel": "Start = 100",
            "formatter": "number1",
            "series": {
                "gold": build_series_item("Gold", "#d97706", gold_dates, gold_values),
                "silver": build_series_item("Silver", "#6b7280", silver_dates, silver_values),
                "copper": build_series_item("Copper", "#b45309", copper_dates, copper_values),
            },
        },
    }

    latest_dates = []
    for panel in panels.values():
        for item in panel["series"].values():
            dates = item.get("dates") or []
            if dates:
                latest_dates.append(dates[-1])

    payload = {
        "updatedAt": max(latest_dates) if latest_dates else "",
        "startDate": START_DATE,
        "defaultRange": "max",
        "ranges": RANGES,
        "panels": panels,
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-macro-data.js"
    output_path.write_text(
        "window.marketMacroData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()

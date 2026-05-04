from __future__ import annotations

import csv
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any

import requests


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "macro-indicators-data.js"
COMMON_START_MONTH = "2010-04"
FRED_GRAPH_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="
FRED_GATEWAY_BASE = "https://www.ivo-welch.info/cgi-bin/fredwrap?symbol="


@dataclass(frozen=True)
class SeriesConfig:
    key: str
    label: str
    source_id: str | None
    unit: str
    color: str
    primary: bool = False


INDICATORS: list[dict[str, Any]] = [
    {
        "key": "employment",
        "title": "Employment Situation",
        "category": "Labor",
        "startMonth": "2006-03",
        "sourceLabel": "FRED / BLS",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("payems", "Nonfarm Payrolls", "PAYEMS", "thousands", "#111827", True),
            SeriesConfig("unrate", "Unemployment Rate", "UNRATE", "percent", "#2563eb"),
            SeriesConfig("ahe", "Average Hourly Earnings", "CES0500000003", "currency", "#d93025"),
        ],
    },
    {
        "key": "cpi",
        "title": "CPI",
        "category": "Inflation",
        "startMonth": "1957-01",
        "sourceLabel": "FRED / BLS",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("headline_cpi", "Headline CPI", "CPIAUCSL", "index", "#111827", True),
            SeriesConfig("core_cpi", "Core CPI", "CPILFESL", "index", "#d93025"),
        ],
    },
    {
        "key": "pce",
        "title": "PCE / Core PCE",
        "category": "Inflation",
        "startMonth": "1959-01",
        "sourceLabel": "FRED / BEA",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("headline_pce", "Headline PCE", "PCEPI", "index", "#111827", True),
            SeriesConfig("core_pce", "Core PCE", "PCEPILFE", "index", "#d93025"),
        ],
    },
    {
        "key": "ppi",
        "title": "PPI",
        "category": "Inflation",
        "startMonth": "2010-04",
        "sourceLabel": "FRED / BLS",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("final_demand_ppi", "Final Demand PPI", "PPIFIS", "index", "#111827", True),
            SeriesConfig("core_ppi", "Core PPI", "PPIFES", "index", "#d93025"),
        ],
    },
    {
        "key": "retail_sales",
        "title": "Retail Sales",
        "category": "Growth / Demand",
        "startMonth": "1992-01",
        "sourceLabel": "FRED / U.S. Census Bureau",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("retail_sales", "Retail Sales", "RSAFS", "usd_millions", "#111827", True),
        ],
    },
    {
        "key": "ism_services",
        "title": "ISM Services PMI",
        "category": "Business Cycle",
        "startMonth": "2008-01",
        "sourceLabel": "ISM public report",
        "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/services/",
        "status": "manual",
        "statusNote": "manual/source pending",
        "series": [
            SeriesConfig("services_pmi", "Services PMI", None, "index", "#111827", True),
            SeriesConfig("services_prices", "Prices", None, "index", "#d93025"),
            SeriesConfig("services_employment", "Employment", None, "index", "#2563eb"),
            SeriesConfig("services_new_orders", "New Orders", None, "index", "#0f766e"),
        ],
    },
    {
        "key": "ism_manufacturing",
        "title": "ISM Manufacturing PMI",
        "category": "Business Cycle",
        "startMonth": "1948-01",
        "sourceLabel": "ISM public report",
        "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/pmi/",
        "status": "manual",
        "statusNote": "manual/source pending",
        "series": [
            SeriesConfig("manufacturing_pmi", "Manufacturing PMI", None, "index", "#111827", True),
            SeriesConfig("manufacturing_new_orders", "New Orders", None, "index", "#2563eb"),
            SeriesConfig("manufacturing_prices", "Prices Paid", None, "index", "#d93025"),
        ],
    },
    {
        "key": "jolts",
        "title": "JOLTS",
        "category": "Labor",
        "startMonth": "2000-12",
        "sourceLabel": "FRED / BLS",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("job_openings", "Job Openings", "JTSJOL", "thousands", "#111827", True),
            SeriesConfig("quits_rate", "Quits Rate", "JTSQUR", "percent", "#d93025"),
            SeriesConfig("hires", "Hires", "JTSHIR", "thousands", "#2563eb"),
        ],
    },
    {
        "key": "durable_goods",
        "title": "Durable Goods Orders",
        "category": "Growth / Demand",
        "startMonth": "1992-02",
        "sourceLabel": "FRED / U.S. Census Bureau",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("durable_goods_orders", "Durable Goods Orders", "DGORDER", "usd_millions", "#111827", True),
            SeriesConfig("core_capex_orders", "Core Capital Goods", "NEWORDER", "usd_millions", "#2563eb"),
        ],
    },
    {
        "key": "housing",
        "title": "Housing Starts / Building Permits",
        "category": "Rate Sensitive",
        "startMonth": "1960-01",
        "sourceLabel": "FRED / U.S. Census Bureau",
        "sourceUrl": "https://fred.stlouisfed.org/",
        "status": "auto",
        "series": [
            SeriesConfig("housing_starts", "Housing Starts", "HOUST", "thousands", "#111827", True),
            SeriesConfig("building_permits", "Building Permits", "PERMIT", "thousands", "#d93025"),
        ],
    },
]


def fetch_text(url: str) -> str:
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=60)
            response.raise_for_status()
            return response.text
        except Exception as error:  # pragma: no cover - network variability
            last_error = error
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def fred_csv_urls(series_id: str, start_month: str) -> list[str]:
    return [
        f"{FRED_GATEWAY_BASE}{series_id}",
        f"{FRED_GRAPH_BASE}{series_id}&cosd={start_month}-01",
    ]


def month_key(date_text: str) -> str:
    return date_text[:7]


def parse_fred_series(series_id: str, start_month: str) -> dict[str, Any]:
    last_error: Exception | None = None
    points: list[dict[str, Any]] = []
    for url in fred_csv_urls(series_id, start_month):
        try:
            text = fetch_text(url)
            reader = csv.DictReader(StringIO(text))
            points = []
            for row in reader:
                lower_row = {str(key).lower(): value for key, value in row.items()}
                date_text = (row.get("DATE") or lower_row.get("yyyymmdd") or "").strip()
                value = (row.get(series_id) or lower_row.get(series_id.lower()) or "").strip()
                if not date_text or value in {"", "."}:
                    continue
                if len(date_text) == 8 and date_text.isdigit():
                    date_text = f"{date_text[:4]}-{date_text[4:6]}-{date_text[6:8]}"
                month = month_key(date_text)
                if month < start_month:
                    continue
                points.append({"date": month, "value": float(value)})
            if points:
                break
        except Exception as error:  # pragma: no cover - network variability
            last_error = error
            points = []
    if not points and last_error is not None:
        raise last_error
    return {
        "dates": [point["date"] for point in points],
        "values": [point["value"] for point in points],
    }


def safe_round(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def compute_snapshot(dates: list[str], values: list[float]) -> dict[str, Any]:
    if not dates or not values:
        return {
            "latestDate": None,
            "latestValue": None,
            "previousValue": None,
            "deltaValue": None,
            "momPct": None,
            "yoyPct": None,
        }
    latest_value = float(values[-1])
    previous_value = float(values[-2]) if len(values) >= 2 else None
    delta_value = latest_value - previous_value if previous_value is not None else None
    mom_pct = ((latest_value / previous_value) - 1) * 100 if previous_value not in {None, 0} else None
    yoy_base = float(values[-13]) if len(values) >= 13 else None
    yoy_pct = ((latest_value / yoy_base) - 1) * 100 if yoy_base not in {None, 0} else None
    return {
        "latestDate": dates[-1],
        "latestValue": safe_round(latest_value, 4),
        "previousValue": safe_round(previous_value, 4),
        "deltaValue": safe_round(delta_value, 4),
        "momPct": safe_round(mom_pct, 2),
        "yoyPct": safe_round(yoy_pct, 2),
    }


def build_indicator_payload(config: dict[str, Any]) -> dict[str, Any]:
    indicator_series: list[dict[str, Any]] = []
    latest_months: list[str] = []
    available_start_months: list[str] = []

    for series in config["series"]:
        if config["status"] != "auto" or not series.source_id:
            indicator_series.append(
                {
                    "key": series.key,
                    "label": series.label,
                    "sourceId": series.source_id,
                    "unit": series.unit,
                    "color": series.color,
                    "primary": series.primary,
                    "dates": [],
                    "values": [],
                    **compute_snapshot([], []),
                }
            )
            continue

        parsed = parse_fred_series(series.source_id, config["startMonth"])
        snapshot = compute_snapshot(parsed["dates"], parsed["values"])
        if parsed["dates"]:
            latest_months.append(parsed["dates"][-1])
            available_start_months.append(parsed["dates"][0])
        indicator_series.append(
            {
                "key": series.key,
                "label": series.label,
                "sourceId": series.source_id,
                "unit": series.unit,
                "color": series.color,
                "primary": series.primary,
                "dates": parsed["dates"],
                "values": [safe_round(value, 4) for value in parsed["values"]],
                **snapshot,
            }
        )

    latest_month = max(latest_months) if latest_months else None
    available_start_month = min(available_start_months) if available_start_months else None
    return {
        "key": config["key"],
        "title": config["title"],
        "category": config["category"],
        "startMonth": config["startMonth"],
        "commonStartMonth": COMMON_START_MONTH,
        "availableStartMonth": available_start_month,
        "latestMonth": latest_month,
        "sourceLabel": config["sourceLabel"],
        "sourceUrl": config["sourceUrl"],
        "status": config["status"],
        "statusNote": config.get("statusNote"),
        "series": indicator_series,
    }


def build_payload() -> dict[str, Any]:
    indicators = [build_indicator_payload(config) for config in INDICATORS]
    categories = [
        {"key": "inflation", "label": "Inflation", "items": ["CPI", "PPI", "PCE / Core PCE"]},
        {"key": "labor", "label": "Labor", "items": ["Employment Situation", "JOLTS"]},
        {"key": "growth", "label": "Growth / Demand", "items": ["Retail Sales", "Durable Goods Orders"]},
        {"key": "business_cycle", "label": "Business Cycle", "items": ["ISM Manufacturing PMI", "ISM Services PMI"]},
        {"key": "rate_sensitive", "label": "Rate Sensitive", "items": ["Housing Starts / Building Permits"]},
    ]
    return {
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commonStartMonth": COMMON_START_MONTH,
        "indicators": indicators,
        "categories": categories,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.macroIndicatorsData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Indicators: {len(payload['indicators'])}")


if __name__ == "__main__":
    main()

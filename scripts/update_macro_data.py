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
    release_url: str | None = None
    release_unit: str | None = None


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
            SeriesConfig("payems", "Nonfarm Payrolls", "PAYEMS", "thousands", "#111827", True, "https://www.moneycontrol.com/economic-calendar/united-states-non-farm-payrolls/3248716", "thousands"),
            SeriesConfig("unrate", "Unemployment Rate", "UNRATE", "percent", "#2563eb", False, "https://www.moneycontrol.com/economic-calendar/usa-unemployment-rate/3248717", "percent"),
            SeriesConfig("ahe", "Average Hourly Earnings", "CES0500000003", "currency", "#d93025", False, "https://www.moneycontrol.com/economic-calendar/average-hourly-earnings-mom/3248715", "percent"),
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
            SeriesConfig("headline_cpi", "Headline CPI", "CPIAUCSL", "index", "#111827", True, "https://www.moneycontrol.com/economic-calendar/united-states-inflation-rate-mom-final/5128770", "percent"),
            SeriesConfig("core_cpi", "Core CPI", "CPILFESL", "index", "#d93025", False, "https://www.moneycontrol.com/economic-calendar/united-states-core-inflation-rate-mom-final/13516542", "percent"),
            SeriesConfig("food_cpi", "Food", "CPIUFDSL", "index", "#16a34a"),
            SeriesConfig("energy_cpi", "Energy", "CPIENGSL", "index", "#f97316"),
            SeriesConfig("shelter_cpi", "Shelter", "CUSR0000SAH1", "index", "#2563eb"),
            SeriesConfig("rent_cpi", "Rent of Primary Residence", "CUSR0000SEHA", "index", "#06b6d4"),
            SeriesConfig("oer_cpi", "Owners' Equivalent Rent", "CUSR0000SEHC", "index", "#7c3aed"),
            SeriesConfig("transport_services_cpi", "Transportation Services", "CUSR0000SAS4", "index", "#b45309"),
            SeriesConfig("medical_services_cpi", "Medical Care Services", "CUSR0000SAM2", "index", "#ec4899"),
            SeriesConfig("new_vehicles_cpi", "New Vehicles", "CUSR0000SETA01", "index", "#64748b"),
            SeriesConfig("used_cars_cpi", "Used Cars & Trucks", "CUSR0000SETA02", "index", "#8b5cf6"),
            SeriesConfig("apparel_cpi", "Apparel", "CPIAPPSL", "index", "#0f766e"),
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
            SeriesConfig("headline_pce", "Headline PCE", "PCEPI", "index", "#111827", True, "https://www.moneycontrol.com/economic-calendar/usa-pce-price-index-mom/13516496", "percent"),
            SeriesConfig("core_pce", "Core PCE", "PCEPILFE", "index", "#d93025", False, "https://www.moneycontrol.com/economic-calendar/core-pce-price-index-mom/13516494", "percent"),
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
            SeriesConfig("final_demand_ppi", "Final Demand PPI", "PPIFIS", "index", "#111827", True, "https://www.moneycontrol.com/economic-calendar/united-states-ppi-mom/13516126", "percent"),
            SeriesConfig("core_ppi", "Core PPI", "PPIFES", "index", "#d93025", False, "https://www.moneycontrol.com/economic-calendar/united-states-core-producer-prices-mom/13516228", "percent"),
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
            SeriesConfig("retail_sales", "Retail Sales", "RSAFS", "usd_millions", "#111827", True, "https://www.moneycontrol.com/economic-calendar/united-states-retail-sales-mom/5877376", "percent"),
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
            SeriesConfig("job_openings", "Job Openings", "JTSJOL", "thousands", "#111827", True, "https://www.moneycontrol.com/economic-calendar/jolts-job-openings/4770591", "millions"),
            SeriesConfig("quits_rate", "Quits Rate", "JTSQUR", "percent", "#d93025", False, "https://www.moneycontrol.com/economic-calendar/jolts-job-quits/13516226", "millions"),
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
            SeriesConfig("durable_goods_orders", "Durable Goods Orders", "DGORDER", "usd_millions", "#111827", True, "https://www.moneycontrol.com/economic-calendar/united-states-durable-goods-orders-mom/119", "percent"),
            SeriesConfig("core_capex_orders", "Core Capital Goods", "NEWORDER", "usd_millions", "#2563eb", False, "https://www.moneycontrol.com/economic-calendar/usa-durable-goods-orders-ex-transp-mom/121", "percent"),
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
            SeriesConfig("housing_starts", "Housing Starts", "HOUST", "thousands", "#111827", True, "https://www.moneycontrol.com/economic-calendar/usa-housing-starts/12206442", "millions"),
            SeriesConfig("building_permits", "Building Permits", "PERMIT", "thousands", "#d93025", False, "https://www.moneycontrol.com/economic-calendar/united-states-building-permits/12206443", "millions"),
        ],
    },
]

RELEASE_START_DATE = "2025-01-01"


def load_existing_payload() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.macroIndicatorsData = "
    if text.startswith(prefix):
        text = text[len(prefix):]
    if text.endswith(";"):
        text = text[:-1]
    try:
        return json.loads(text)
    except Exception:
        return {}


def fetch_text(url: str) -> str:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
            response.raise_for_status()
            return response.text
        except Exception as error:  # pragma: no cover - network variability
            last_error = error
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def fred_csv_urls(series_id: str, start_month: str) -> list[str]:
    fred_graph_url = f"{FRED_GRAPH_BASE}{series_id}&cosd={start_month}-01"
    fred_gateway_url = f"{FRED_GATEWAY_BASE}{series_id}"
    if series_id in {"CPIAUCSL", "CPILFESL"}:
        return [fred_graph_url, fred_gateway_url]
    return [fred_gateway_url, fred_graph_url]


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
                date_text = (row.get("DATE") or lower_row.get("observation_date") or lower_row.get("yyyymmdd") or "").strip()
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


def parse_release_numeric(text: str) -> tuple[float | None, str | None]:
    cleaned = (text or "").strip().replace(",", "")
    if not cleaned or cleaned == "-":
        return None, None
    multiplier = 1.0
    unit = "plain"
    if cleaned.endswith("%"):
        unit = "percent"
        cleaned = cleaned[:-1]
    elif cleaned.endswith("K"):
        unit = "thousands"
        multiplier = 1_000
        cleaned = cleaned[:-1]
    elif cleaned.endswith("M"):
        unit = "millions"
        multiplier = 1_000_000
        cleaned = cleaned[:-1]
    elif cleaned.endswith("B"):
        unit = "billions"
        multiplier = 1_000_000_000
        cleaned = cleaned[:-1]
    try:
        return float(cleaned) * multiplier, unit
    except ValueError:
        return None, unit


def format_release_numeric(value: float | None, unit: str | None) -> str | None:
    if value is None:
        return None
    if unit == "percent":
        return f"{value:.2f}%"
    if unit == "thousands":
        return f"{value / 1_000:.0f}K"
    if unit == "millions":
        formatted = f"{value / 1_000_000:.3f}".rstrip("0").rstrip(".")
        return f"{formatted}M"
    if unit == "billions":
        formatted = f"{value / 1_000_000_000:.3f}".rstrip("0").rstrip(".")
        return f"{formatted}B"
    return f"{value:.2f}"


def format_release_surprise(value: float | None, unit: str | None) -> str | None:
    if value is None:
        return None
    prefix = "+" if value >= 0 else ""
    if unit == "percent":
        return f"{prefix}{value:.2f}%p"
    if unit == "thousands":
        return f"{prefix}{value / 1_000:.0f}K"
    if unit == "millions":
        return f"{prefix}{value / 1_000_000:.3f}M"
    if unit == "billions":
        return f"{prefix}{value / 1_000_000_000:.3f}B"
    return f"{prefix}{value:.2f}"


def parse_moneycontrol_release_history(url: str, release_unit: str | None) -> list[dict[str, Any]]:
    from bs4 import BeautifulSoup

    text = fetch_text(url)
    soup = BeautifulSoup(text, "html.parser")
    table = soup.select_one("#hist_tbl")
    if not table:
        return []

    rows: list[dict[str, Any]] = []
    for tr in table.select("tbody tr"):
        tds = tr.select("td")
        if len(tds) < 6:
            continue
        release_date = datetime.strptime(tds[0].get_text(" ", strip=True), "%b %d, %Y").strftime("%Y-%m-%d")
        if release_date < RELEASE_START_DATE:
            continue
        reference = tds[2].get_text(" ", strip=True)
        actual_text = tds[3].get_text(" ", strip=True)
        previous_text = tds[4].get_text(" ", strip=True)
        consensus_text = tds[5].get_text(" ", strip=True)
        if not actual_text or actual_text == "-":
            continue
        actual_value, actual_unit = parse_release_numeric(actual_text)
        previous_value, previous_unit = parse_release_numeric(previous_text)
        consensus_value, consensus_unit = parse_release_numeric(consensus_text)
        unit = release_unit or actual_unit or consensus_unit or previous_unit
        surprise_value = actual_value - consensus_value if actual_value is not None and consensus_value is not None else None
        rows.append(
            {
                "releaseDate": release_date,
                "time": tds[1].get_text(" ", strip=True),
                "reference": reference,
                "actual": actual_text,
                "actualValue": safe_round(actual_value, 4),
                "previous": previous_text if previous_text else "-",
                "consensus": consensus_text if consensus_text else "-",
                "surprise": format_release_surprise(surprise_value, unit) if surprise_value is not None else None,
                "surpriseValue": safe_round(surprise_value, 4),
                "unit": unit,
            }
        )

    deduped: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = row["reference"]
        existing = deduped.get(key)
        if not existing:
            deduped[key] = row
            continue
        existing_has_consensus = existing.get("consensus") not in {"", "-", None}
        row_has_consensus = row.get("consensus") not in {"", "-", None}
        if row_has_consensus and not existing_has_consensus:
            deduped[key] = row
            continue
        if row["releaseDate"] > existing["releaseDate"]:
            deduped[key] = row

    return sorted(deduped.values(), key=lambda item: item["releaseDate"])


def build_indicator_payload(config: dict[str, Any], existing_indicator: dict[str, Any] | None = None) -> dict[str, Any]:
    indicator_series: list[dict[str, Any]] = []
    latest_months: list[str] = []
    available_start_months: list[str] = []
    series_by_key = {
        str(series.get("key")): series
        for series in (existing_indicator or {}).get("series", [])
        if isinstance(series, dict)
    }

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

        existing_series = series_by_key.get(series.key, {})
        try:
            parsed = parse_fred_series(series.source_id, config["startMonth"])
            release_history = parse_moneycontrol_release_history(series.release_url, series.release_unit) if series.release_url else []
            latest_release = release_history[-1] if release_history else None
            snapshot = compute_snapshot(parsed["dates"], parsed["values"])
            payload_series = {
                "key": series.key,
                "label": series.label,
                "sourceId": series.source_id,
                "unit": series.unit,
                "color": series.color,
                "primary": series.primary,
                "dates": parsed["dates"],
                "values": [safe_round(value, 4) for value in parsed["values"]],
                "releaseHistory": release_history,
                "latestRelease": latest_release,
                **snapshot,
            }
        except Exception as error:  # pragma: no cover - network variability
            if existing_series:
                payload_series = {
                    "key": series.key,
                    "label": series.label,
                    "sourceId": series.source_id,
                    "unit": series.unit,
                    "color": series.color,
                    "primary": series.primary,
                    "dates": existing_series.get("dates", []),
                    "values": existing_series.get("values", []),
                    "releaseHistory": existing_series.get("releaseHistory", []),
                    "latestRelease": existing_series.get("latestRelease"),
                    "latestDate": existing_series.get("latestDate"),
                    "latestValue": existing_series.get("latestValue"),
                    "previousValue": existing_series.get("previousValue"),
                    "deltaValue": existing_series.get("deltaValue"),
                    "momPct": existing_series.get("momPct"),
                    "yoyPct": existing_series.get("yoyPct"),
                    "fetchStatus": "stale",
                    "fetchError": str(error),
                }
            else:
                payload_series = {
                    "key": series.key,
                    "label": series.label,
                    "sourceId": series.source_id,
                    "unit": series.unit,
                    "color": series.color,
                    "primary": series.primary,
                    "dates": [],
                    "values": [],
                    "releaseHistory": [],
                    "latestRelease": None,
                    "fetchStatus": "error",
                    "fetchError": str(error),
                    **compute_snapshot([], []),
                }

        if payload_series["dates"]:
            latest_months.append(str(payload_series["dates"][-1]))
            available_start_months.append(str(payload_series["dates"][0]))
        indicator_series.append(payload_series)

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
    existing_payload = load_existing_payload()
    existing_by_key = {
        str(indicator.get("key")): indicator
        for indicator in existing_payload.get("indicators", [])
        if isinstance(indicator, dict)
    }
    indicators = [build_indicator_payload(config, existing_by_key.get(config["key"])) for config in INDICATORS]
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

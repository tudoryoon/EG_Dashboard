from __future__ import annotations

import csv
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any

import requests


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "macro-indicators-data.js"
ISM_HISTORY_PATH = Path(__file__).resolve().parents[1] / "data" / "ism-history-2016.json"
COMMON_START_MONTH = "2016-01"
FRED_GRAPH_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="
FRED_GATEWAY_BASE = "https://www.ivo-welch.info/cgi-bin/fredwrap?symbol="
BLS_TIMESERIES_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
BLS_CPI_FALLBACKS = {
    "CPIAUCSL": "CUSR0000SA0",
    "CPILFESL": "CUSR0000SA0L1E",
}
BLS_CPI_OFFICIAL_YOY = {
    "CPIAUCSL": "CUUR0000SA0",
    "CPILFESL": "CUUR0000SA0L1E",
}
BLS_DIRECT_SERIES = {"WPSFD4", "WPSFD49104"}
MANUAL_RELEASE_OVERRIDES = {
    "headline_pce": {
        "releaseDate": "2026-06-25",
        "time": "21:30",
        "reference": "May",
        "actual": "0.4%",
        "actualValue": 0.4,
        "previous": "0.4%",
        "consensus": "0.5%",
        "surprise": "-0.10%p",
        "surpriseValue": -0.1,
        "unit": "percent",
    },
    "core_pce": {
        "releaseDate": "2026-06-25",
        "time": "21:30",
        "reference": "May",
        "actual": "0.3%",
        "actualValue": 0.3,
        "previous": "0.3%",
        "consensus": "0.3%",
        "surprise": "+0.00%p",
        "surpriseValue": 0.0,
        "unit": "percent",
    },
    "final_demand_ppi": {
        "releaseDate": "2026-06-11",
        "time": "18:00",
        "reference": "PPI MoM May",
        "actual": "1.1%",
        "actualValue": 1.1,
        "previous": "1.1%",
        "consensus": "0.7%",
        "surprise": "+0.40%p",
        "surpriseValue": 0.4,
        "unit": "percent",
    },
    "core_ppi": {
        "releaseDate": "2026-06-11",
        "time": "18:00",
        "reference": "Core PPI MoM May",
        "actual": "0.4%",
        "actualValue": 0.4,
        "previous": "0.7%",
        "consensus": "0.5%",
        "surprise": "-0.10%p",
        "surpriseValue": -0.1,
        "unit": "percent",
    },
}

ISM_MONTH_SLUGS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]
ISM_REPORT_CONFIG = {
    "ism_services": {
        "path": "services",
        "reportName": "Services",
        "seriesLabels": {
            "services_pmi": ["servicespmi"],
            "services_business_activity": ["businessactivityproduction", "businessactivity"],
            "services_new_orders": ["neworders"],
            "services_employment": ["employment"],
            "services_prices": ["prices"],
        },
    },
    "ism_manufacturing": {
        "path": "pmi",
        "reportName": "Manufacturing",
        "seriesLabels": {
            "manufacturing_pmi": ["manufacturingpmi"],
            "manufacturing_new_orders": ["neworders"],
            "manufacturing_production": ["production"],
            "manufacturing_employment": ["employment"],
            "manufacturing_prices": ["prices"],
        },
    },
}


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
        "sourceLabel": "ISM official / Trading Economics history",
        "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/",
        "status": "auto",
        "statusNote": "2016+ historical archive with recent months overwritten by official ISM reports",
        "series": [
            SeriesConfig("services_pmi", "Services PMI", None, "index", "#111827", True),
            SeriesConfig("services_business_activity", "Business Activity", None, "index", "#16a34a"),
            SeriesConfig("services_new_orders", "New Orders", None, "index", "#0f766e"),
            SeriesConfig("services_employment", "Employment", None, "index", "#2563eb"),
            SeriesConfig("services_prices", "Prices", None, "index", "#d93025"),
        ],
    },
    {
        "key": "ism_manufacturing",
        "title": "ISM Manufacturing PMI",
        "category": "Business Cycle",
        "startMonth": "1948-01",
        "sourceLabel": "ISM official / Trading Economics history",
        "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/",
        "status": "auto",
        "statusNote": "2016+ historical archive with recent months overwritten by official ISM reports",
        "series": [
            SeriesConfig("manufacturing_pmi", "Manufacturing PMI", None, "index", "#111827", True),
            SeriesConfig("manufacturing_new_orders", "New Orders", None, "index", "#0f766e"),
            SeriesConfig("manufacturing_production", "Production", None, "index", "#16a34a"),
            SeriesConfig("manufacturing_employment", "Employment", None, "index", "#2563eb"),
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


def load_ism_history() -> dict[str, dict[str, float]]:
    if not ISM_HISTORY_PATH.exists():
        return {}
    try:
        payload = json.loads(ISM_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return {
        str(series_key): {
            str(month): float(value)
            for month, value in values.items()
            if str(month) >= COMMON_START_MONTH
        }
        for series_key, values in payload.get("series", {}).items()
        if isinstance(values, dict)
    }


def fetch_text(url: str, timeout: int = 20, attempts: int = 3) -> str:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=timeout)
            response.raise_for_status()
            return response.text
        except Exception as error:  # pragma: no cover - network variability
            last_error = error
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def normalize_ism_label(value: str) -> str:
    return "".join(character for character in value.lower() if character.isascii() and character.isalnum())


def matches_ism_alias(label: str, alias: str) -> bool:
    return label == alias or (alias.endswith("pmi") and label.startswith(alias))


def parse_ism_official_history(indicator_key: str) -> dict[str, Any]:
    from bs4 import BeautifulSoup

    report_config = ISM_REPORT_CONFIG[indicator_key]
    report_name = str(report_config["reportName"])
    series_labels = report_config["seriesLabels"]
    by_series: dict[str, dict[str, float]] = {series_key: {} for series_key in series_labels}
    source_urls: dict[str, str] = {}
    errors: list[str] = []
    session = requests.Session()
    # ISM redirects browser-like user agents to its member SSO. Its public
    # report pages remain available to a plain HTTP client.
    session.trust_env = False
    headers = {"User-Agent": "curl/8.5.0", "Accept": "text/html"}

    for month_slug in ISM_MONTH_SLUGS:
        url = (
            "https://www.ismworld.org/supply-management-news-and-reports/reports/"
            f"ism-pmi-reports/{report_config['path']}/{month_slug}/"
        )
        try:
            response = session.get(url, headers=headers, timeout=25)
            response.raise_for_status()
            if "ecommerce.ismworld.org" in response.url:
                raise RuntimeError("redirected to ISM member login")
            soup = BeautifulSoup(response.text, "html.parser")
            headings = " ".join(heading.get_text(" ", strip=True) for heading in soup.find_all("h1"))
            report_match = re.search(
                rf"({'|'.join(ISM_MONTH_SLUGS)})\s+(20\d{{2}})\s+ISM.*?{re.escape(report_name)}",
                headings,
                flags=re.IGNORECASE,
            )
            if not report_match:
                continue
            report_month = datetime.strptime(
                f"{report_match.group(1).title()} {report_match.group(2)}", "%B %Y"
            ).strftime("%Y-%m")

            page_values: dict[str, float] = {}
            for table in soup.find_all("table"):
                table_values: dict[str, float] = {}
                for row in table.find_all("tr"):
                    cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
                    if len(cells) < 2:
                        continue
                    normalized_label = normalize_ism_label(cells[0])
                    matched_key = next(
                        (
                            series_key
                            for series_key, aliases in series_labels.items()
                            if any(matches_ism_alias(normalized_label, alias) for alias in aliases)
                        ),
                        None,
                    )
                    if not matched_key:
                        continue
                    value_match = re.search(r"-?\d+(?:\.\d+)?", cells[1].replace(",", ""))
                    if value_match:
                        table_values[matched_key] = float(value_match.group(0))
                if len(table_values) >= 3 and next(iter(series_labels)) in table_values:
                    page_values = table_values
                    break

            if not page_values:
                continue
            for series_key, value in page_values.items():
                by_series[series_key][report_month] = value

            # The latest official report embeds 12 months of headline PMI and
            # four months of each subindex. Older month pages disappear over
            # time, so harvest those embedded history tables as well.
            primary_key = next(iter(series_labels))
            for table in soup.find_all("table"):
                rows = table.find_all("tr")
                if len(rows) < 2:
                    continue
                header_cells = [
                    cell.get_text(" ", strip=True) for cell in rows[0].find_all(["th", "td"])
                ]
                if not header_cells:
                    continue
                normalized_header = normalize_ism_label(header_cells[0])
                history_key: str | None = None
                value_index = -1
                if normalized_header == "month" and len(header_cells) > 1:
                    normalized_series_header = normalize_ism_label(header_cells[1])
                    if any(
                        matches_ism_alias(normalized_series_header, alias)
                        for alias in series_labels[primary_key]
                    ):
                        history_key = primary_key
                        value_index = 1
                else:
                    history_key = next(
                        (
                            series_key
                            for series_key, aliases in series_labels.items()
                            if any(matches_ism_alias(normalized_header, alias) for alias in aliases)
                        ),
                        None,
                    )
                if not history_key:
                    continue
                for row in rows[1:]:
                    cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
                    if len(cells) < 2:
                        continue
                    month_match = re.fullmatch(r"([A-Za-z]+)\s+(20\d{2})", cells[0].strip())
                    if not month_match:
                        continue
                    try:
                        history_month = datetime.strptime(
                            f"{month_match.group(1)[:3].title()} {month_match.group(2)}", "%b %Y"
                        ).strftime("%Y-%m")
                    except ValueError:
                        continue
                    value_cell = cells[value_index]
                    value_match = re.search(r"-?\d+(?:\.\d+)?", value_cell.replace(",", ""))
                    if value_match:
                        by_series[history_key][history_month] = float(value_match.group(0))
            source_urls[report_month] = url
        except Exception as error:  # pragma: no cover - network variability
            errors.append(f"{month_slug}: {error}")

    available_months = sorted({month for values in by_series.values() for month in values})
    if not available_months:
        raise RuntimeError("No official ISM report tables were available" + (f" ({'; '.join(errors)})" if errors else ""))
    latest_month = available_months[-1]
    return {
        "series": by_series,
        "latestMonth": latest_month,
        "latestUrl": source_urls.get(latest_month),
        "errors": errors,
    }


def fred_csv_urls(series_id: str, start_month: str) -> list[str]:
    fred_graph_url = f"{FRED_GRAPH_BASE}{series_id}&cosd={start_month}-01"
    fred_gateway_url = f"{FRED_GATEWAY_BASE}{series_id}"
    # The lightweight gateway is materially faster and the latest CPI month is
    # merged from the official BLS API below when FRED propagation lags.
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


def parse_bls_series(series_id: str, start_year: int, end_year: int) -> dict[str, Any]:
    response = requests.post(
        BLS_TIMESERIES_URL,
        json={"seriesid": [series_id], "startyear": str(start_year), "endyear": str(end_year)},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != "REQUEST_SUCCEEDED":
        raise RuntimeError(f"BLS request failed for {series_id}: {payload.get('message')}")

    rows = ((payload.get("Results") or {}).get("series") or [{}])[0].get("data") or []
    points = []
    for row in rows:
        period = str(row.get("period") or "")
        value = row.get("value")
        if not period.startswith("M") or value in {"-", "", None}:
            continue
        month = f"{row.get('year')}-{period[1:]}"
        points.append({"date": month, "value": float(value)})
    points.sort(key=lambda item: item["date"])
    return {
        "dates": [point["date"] for point in points],
        "values": [point["value"] for point in points],
    }


def parse_bls_series_range(series_id: str, start_year: int, end_year: int) -> dict[str, Any]:
    merged: dict[str, float] = {}
    chunk_start = start_year
    while chunk_start <= end_year:
        chunk_end = min(chunk_start + 19, end_year)
        chunk = parse_bls_series(series_id, chunk_start, chunk_end)
        merged.update(dict(zip(chunk["dates"], chunk["values"])))
        chunk_start = chunk_end + 1

    months = sorted(merged)
    return {
        "dates": months,
        "values": [merged[month] for month in months],
    }


def parse_series_data(series_id: str, start_month: str) -> dict[str, Any]:
    if series_id in BLS_DIRECT_SERIES:
        return parse_bls_series_range(series_id, int(start_month[:4]), datetime.now(timezone.utc).year)
    return parse_fred_series(series_id, start_month)


def merge_latest_bls_fallback(parsed: dict[str, Any], source_id: str) -> dict[str, Any]:
    bls_series_id = BLS_CPI_FALLBACKS.get(source_id)
    if not bls_series_id:
        return parsed

    current_year = datetime.now(timezone.utc).year
    try:
        bls = parse_bls_series(bls_series_id, current_year - 1, current_year)
    except Exception:
        return parsed
    by_month = dict(zip(parsed.get("dates", []), parsed.get("values", [])))
    for month, value in zip(bls["dates"], bls["values"]):
        by_month[month] = value

    months = sorted(month for month in by_month if month >= parsed.get("dates", [""])[0])
    return {
        "dates": months,
        "values": [by_month[month] for month in months],
    }


def build_bls_official_yoy_values(dates: list[str], source_id: str) -> list[float | None] | None:
    bls_series_id = BLS_CPI_OFFICIAL_YOY.get(source_id)
    if not bls_series_id or not dates:
        return None

    start_year = int(dates[0][:4]) - 1
    current_year = datetime.now(timezone.utc).year
    try:
        bls = parse_bls_series_range(bls_series_id, start_year, current_year)
    except Exception:
        return None
    by_month = dict(zip(bls["dates"], bls["values"]))
    yoy_values: list[float | None] = []
    for month in dates:
        previous_month = f"{int(month[:4]) - 1}-{month[5:7]}"
        current_value = by_month.get(month)
        previous_value = by_month.get(previous_month)
        if current_value is None or previous_value in {None, 0}:
            yoy_values.append(None)
        else:
            yoy_values.append(safe_round(((current_value / previous_value) - 1) * 100, 2))
    return yoy_values


def safe_round(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def compute_yoy_values(dates: list[str], values: list[float]) -> list[float | None]:
    by_month = dict(zip(dates, values))
    yoy_values: list[float | None] = []
    for month in dates:
        previous_month = f"{int(month[:4]) - 1}-{month[5:7]}"
        current_value = by_month.get(month)
        previous_value = by_month.get(previous_month)
        if current_value is None or previous_value in {None, 0}:
            yoy_values.append(None)
        else:
            yoy_values.append(safe_round(((float(current_value) / float(previous_value)) - 1) * 100, 2))
    return yoy_values


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
    yoy_pct = compute_yoy_values(dates, values)[-1]
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

    # Release-history enrichment is optional; do not let a slow mirror block the
    # official FRED/BLS time-series refresh.
    text = fetch_text(url, timeout=6, attempts=1)
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


def apply_manual_release_override(series_key: str, release_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    override = MANUAL_RELEASE_OVERRIDES.get(series_key)
    if not override:
        return release_history
    filtered = [
        row
        for row in release_history
        if not (
            row.get("releaseDate") == override["releaseDate"]
            and row.get("reference") == override["reference"]
        )
    ]
    filtered.append(override)
    return sorted(filtered, key=lambda item: item["releaseDate"])


def month_name_from_key(month: str | None) -> str:
    if not month:
        return ""
    try:
        return datetime.strptime(month, "%Y-%m").strftime("%b")
    except ValueError:
        return month


def build_fallback_release_row(series: SeriesConfig, snapshot: dict[str, Any]) -> dict[str, Any] | None:
    latest_month = snapshot.get("latestDate")
    mom_pct = snapshot.get("momPct")
    if latest_month is None or mom_pct is None:
        return None
    reference_label = {
        "headline_cpi": "Inflation Rate MoM",
        "core_cpi": "Core Inflation Rate MoM",
        "headline_pce": "PCE Price Index MoM",
        "core_pce": "Core PCE Price Index MoM",
        "final_demand_ppi": "PPI MoM",
        "core_ppi": "Core PPI MoM",
    }.get(series.key, f"{series.label} MoM")
    return {
        "releaseDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "time": "-",
        "reference": f"{reference_label} {month_name_from_key(str(latest_month))}".strip(),
        "actual": format_release_numeric(float(mom_pct), "percent"),
        "actualValue": safe_round(float(mom_pct), 4),
        "previous": "-",
        "consensus": "-",
        "surprise": None,
        "surpriseValue": None,
        "unit": "percent",
        "source": "BLS calculated MoM fallback",
    }


def append_fallback_release_if_needed(
    release_history: list[dict[str, Any]],
    series: SeriesConfig,
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    fallback = build_fallback_release_row(series, snapshot)
    if not fallback:
        return release_history
    latest_month_name = month_name_from_key(str(snapshot.get("latestDate")))
    if release_history and latest_month_name and latest_month_name in str(release_history[-1].get("reference", "")):
        return release_history
    deduped = [row for row in release_history if row.get("reference") != fallback["reference"]]
    deduped.append(fallback)
    return sorted(deduped, key=lambda item: item["releaseDate"])


def build_indicator_payload(config: dict[str, Any], existing_indicator: dict[str, Any] | None = None) -> dict[str, Any]:
    indicator_series: list[dict[str, Any]] = []
    latest_months: list[str] = []
    available_start_months: list[str] = []
    ism_history: dict[str, Any] | None = None
    ism_fetch_error: str | None = None
    ism_baseline = load_ism_history() if config["key"] in ISM_REPORT_CONFIG else {}
    if config["key"] in ISM_REPORT_CONFIG:
        try:
            ism_history = parse_ism_official_history(config["key"])
        except Exception as error:  # pragma: no cover - network variability
            ism_fetch_error = str(error)
    series_by_key = {
        str(series.get("key")): series
        for series in (existing_indicator or {}).get("series", [])
        if isinstance(series, dict)
    }

    for series in config["series"]:
        existing_series = series_by_key.get(series.key, {})
        if config["key"] in ISM_REPORT_CONFIG:
            by_month = dict(ism_baseline.get(series.key, {}))
            by_month.update(zip(existing_series.get("dates", []), existing_series.get("values", [])))
            if ism_history:
                by_month.update(ism_history["series"].get(series.key, {}))
            dates = sorted(by_month)
            values = [float(by_month[month]) for month in dates]
            payload_series = {
                "key": series.key,
                "label": series.label,
                "sourceId": series.source_id,
                "unit": series.unit,
                "color": series.color,
                "primary": series.primary,
                "dates": dates,
                "values": values,
                "releaseHistory": existing_series.get("releaseHistory", []),
                "latestRelease": existing_series.get("latestRelease"),
                **compute_snapshot(dates, values),
            }
            if ism_fetch_error:
                payload_series["fetchStatus"] = "stale" if dates else "error"
                payload_series["fetchError"] = ism_fetch_error
            if dates:
                latest_months.append(dates[-1])
                available_start_months.append(dates[0])
            indicator_series.append(payload_series)
            continue

        try:
            parsed = parse_series_data(series.source_id, config["startMonth"])
            parsed = merge_latest_bls_fallback(parsed, series.source_id)
            parsed_latest_month = parsed["dates"][-1] if parsed.get("dates") else None
            existing_latest_month = (existing_series.get("dates") or [None])[-1] if existing_series else None
            if parsed_latest_month and existing_latest_month and parsed_latest_month < existing_latest_month:
                raise RuntimeError(
                    f"{series.source_id} returned stale history through {parsed_latest_month}; "
                    f"preserving existing {existing_latest_month}"
                )
            existing_release_history = existing_series.get("releaseHistory", []) if isinstance(existing_series, dict) else []
            latest_month_name = month_name_from_key(parsed_latest_month)
            existing_release_is_current = bool(
                existing_release_history
                and latest_month_name
                and latest_month_name in str(existing_release_history[-1].get("reference", ""))
            )
            if existing_release_is_current:
                release_history = existing_release_history
                release_fetch_error = None
            else:
                try:
                    release_history = parse_moneycontrol_release_history(series.release_url, series.release_unit) if series.release_url else []
                except Exception as release_error:
                    release_history = existing_release_history
                    release_fetch_error = str(release_error)
                else:
                    release_fetch_error = None
            release_history = apply_manual_release_override(series.key, release_history)
            snapshot = compute_snapshot(parsed["dates"], parsed["values"])
            if release_fetch_error:
                release_history = append_fallback_release_if_needed(release_history, series, snapshot)
            latest_release = release_history[-1] if release_history else None
            yoy_values = compute_yoy_values(parsed["dates"], parsed["values"])
            official_yoy_values = build_bls_official_yoy_values(parsed["dates"], series.source_id)
            if official_yoy_values:
                yoy_values = [
                    official_value if official_value is not None else fallback_value
                    for official_value, fallback_value in zip(official_yoy_values, yoy_values)
                ]
            if yoy_values:
                snapshot["yoyPct"] = yoy_values[-1]
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
            if yoy_values:
                payload_series["yoyValues"] = yoy_values
            if release_fetch_error:
                payload_series["releaseFetchStatus"] = "stale"
                payload_series["releaseFetchError"] = release_fetch_error
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
        "sourceUrl": (ism_history or {}).get("latestUrl") or config["sourceUrl"],
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

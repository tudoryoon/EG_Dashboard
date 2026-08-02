from __future__ import annotations

import json
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
import requests


ROOT = Path(__file__).resolve().parents[1]
RS_DATA_PATH = ROOT / "data" / "market-rs-data.js"
BRIEFING_DATA_PATH = ROOT / "data" / "market-briefing-data.js"
OUTPUT_PATH = ROOT / "data" / "market-rs-financials-data.js"
SEC_TICKER_CACHE_PATH = ROOT / "data" / "sec-company-tickers-cache.json"
SEC_TICKER_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
SEC_ARCHIVES_BASE_URL = "https://www.sec.gov/Archives/edgar/data"
SEC_HEADERS = {
    "User-Agent": "EG Dashboard research contact@example.com",
    "Accept-Encoding": "gzip, deflate",
}
TARGET_MEMBERSHIPS = ("sp500", "nasdaq100")
NON_COMPANY_TICKERS = {"DRAM"}
UNSUPPORTED_AUTOMATED_TICKERS = {"VIK"}
SEC_CIK_OVERRIDES = {"XOM": "0000034088"}

REVENUE_TAGS = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "RegulatedAndUnregulatedOperatingRevenue",
    "RevenuesNetOfInterestExpense",
    "OperatingRevenues",
    "Revenues",
    "SalesRevenueNet",
    "SalesRevenueGoodsNet",
]
NET_INTEREST_INCOME_TAGS = ["InterestIncomeExpenseNet"]
NONINTEREST_INCOME_TAGS = ["NoninterestIncome"]
GROSS_PROFIT_TAGS = ["GrossProfit"]
OPERATING_INCOME_TAGS = ["OperatingIncomeLoss"]
EPS_DILUTED_TAGS = ["EarningsPerShareDiluted"]
OCF_TAGS = ["NetCashProvidedByUsedInOperatingActivities"]
CAPEX_TAGS = [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
    "PaymentsToAcquireBusinessesAndPropertyPlantAndEquipment",
]
FINANCIAL_FORMS = {"10-Q", "10-K", "20-F", "40-F", "6-K"}
EARNINGS_RELEASE_FORMS = {"8-K", "6-K"}
EARNINGS_RELEASE_DOC_LIMIT = 8
EARNINGS_RELEASE_FILING_SCAN_LIMIT = 12
SEC_REQUEST_INTERVAL_SECONDS = 0.16
_SEC_REQUEST_LOCK = threading.Lock()
_SEC_LAST_REQUEST_AT = 0.0


def read_js_payload(path: Path, variable_name: str) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8").strip()
    prefix = f"window.{variable_name} = "
    if text.startswith(prefix):
        text = text[len(prefix) :]
    if text.endswith(";"):
        text = text[:-1]
    return json.loads(text)


def write_js_payload(path: Path, variable_name: str, payload: dict[str, Any]) -> None:
    path.write_text(
        f"window.{variable_name} = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def read_previous_payload() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {}
    try:
        return read_js_payload(OUTPUT_PATH, "marketRsFinancialsData")
    except Exception:
        return {}


def load_daily_briefing_tickers() -> set[str]:
    payload = read_js_payload(BRIEFING_DATA_PATH, "marketBriefingData")
    tickers: set[str] = set()
    for sector in payload.get("sectorPanels", []):
        if not isinstance(sector, dict):
            continue
        for item in sector.get("items", []):
            if not isinstance(item, dict):
                continue
            ticker = str(item.get("ticker") or "").strip().upper()
            if ticker and ticker not in NON_COMPANY_TICKERS and "." not in ticker:
                tickers.add(ticker)
    return tickers


def safe_round(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def safe_float(value: object) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def clean_text(value: object) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text


def normalize_label(value: object) -> str:
    text = clean_text(value).lower()
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    text = re.sub(r"[^a-z0-9%/ .&+-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_numeric_cell(value: object) -> tuple[float | None, bool]:
    if value is None:
        return None, False
    text = clean_text(value)
    if not text or text.lower() in {"nan", "none", "-", "--", "nm", "n/m"}:
        return None, False
    is_percent = "%" in text
    negative = bool(re.search(r"^\(.*\)$", text))
    text = text.replace("$", "").replace(",", "").replace("%", "").replace("(", "").replace(")", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None, is_percent
    try:
        value_float = float(match.group(0))
    except ValueError:
        return None, is_percent
    return (-value_float if negative else value_float), is_percent


def scaled_amount(value: float | None, scale: float) -> float | None:
    if value is None:
        return None
    return float(value) * scale


def fetch_response(url: str) -> requests.Response:
    global _SEC_LAST_REQUEST_AT
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with _SEC_REQUEST_LOCK:
                wait_seconds = SEC_REQUEST_INTERVAL_SECONDS - (time.monotonic() - _SEC_LAST_REQUEST_AT)
                if wait_seconds > 0:
                    time.sleep(wait_seconds)
                _SEC_LAST_REQUEST_AT = time.monotonic()
            response = requests.get(url, headers=SEC_HEADERS, timeout=40)
            response.raise_for_status()
            return response
        except requests.RequestException as error:
            last_error = error
            if attempt == 4:
                break
            time.sleep(1.5 * (2**attempt))
    raise RuntimeError(f"SEC request failed after retries: {url}") from last_error


def fetch_json(url: str) -> dict[str, Any]:
    return fetch_response(url).json()


def fetch_text(url: str) -> str:
    return fetch_response(url).text


def load_sec_ticker_map() -> dict[str, dict[str, Any]]:
    try:
        payload = fetch_json(SEC_TICKER_URL)
        SEC_TICKER_CACHE_PATH.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    except Exception:
        if not SEC_TICKER_CACHE_PATH.exists():
            raise
        payload = json.loads(SEC_TICKER_CACHE_PATH.read_text(encoding="utf-8"))
    mapping: dict[str, dict[str, Any]] = {}
    for item in payload.values():
        ticker = str(item.get("ticker") or "").upper()
        if not ticker:
            continue
        mapping[ticker] = {
            "cik": str(item.get("cik_str")).zfill(10),
            "title": item.get("title") or ticker,
        }
    return mapping


def sec_ticker_candidates(ticker: str) -> list[str]:
    clean = ticker.upper().strip()
    candidates = [clean]
    if "." in clean:
        candidates.append(clean.replace(".", "-"))
    if "-" in clean:
        candidates.append(clean.replace("-", "."))
    return list(dict.fromkeys(candidates))


def normalize_calendar_period(frame: str | None, end: str | None) -> str | None:
    if frame:
        match = re.match(r"CY(\d{4})Q([1-4])$", frame)
        if match:
            return f"FY{match.group(1)}Q{match.group(2)}"
    if end and re.match(r"\d{4}-\d{2}-\d{2}", end):
        month = int(end[5:7])
        quarter = ((month - 1) // 3) + 1
        return f"FY{end[:4]}Q{quarter}"
    return None


def fiscal_period_key(fy: int | None, fp: str | None, *, annual_as_q4: bool = False) -> str | None:
    if not isinstance(fy, int):
        return None
    if fp in {"Q1", "Q2", "Q3", "Q4"}:
        return f"FY{fy}Q{str(fp)[1]}"
    if fp == "FY" and annual_as_q4:
        return f"FY{fy}Q4"
    return None


def fiscal_year_key(fy: int | None, frame: str | None) -> str | None:
    if isinstance(fy, int):
        return str(fy)
    if frame:
        match = re.match(r"CY(\d{4})$", frame)
        if match:
            return match.group(1)
    return None


def format_fiscal_period_label(period: str) -> str:
    match = re.match(r"FY(\d{4})Q([1-4])$", period)
    if match:
        return f"FY{match.group(1)} Q{match.group(2)}"
    return period


def next_day_iso(date_text: str | None) -> str | None:
    if not date_text:
        return None
    try:
        return (datetime.fromisoformat(date_text) + timedelta(days=1)).date().isoformat()
    except ValueError:
        return None


def parse_iso_date(date_text: str | None) -> datetime | None:
    if not date_text:
        return None
    try:
        return datetime.fromisoformat(date_text)
    except ValueError:
        return None


def duration_days(start: str | None, end: str | None) -> int | None:
    start_date = parse_iso_date(start)
    end_date = parse_iso_date(end)
    if not start_date or not end_date:
        return None
    return (end_date - start_date).days


def is_full_year_fact(start: str | None, end: str | None) -> bool:
    days = duration_days(start, end)
    return days is not None and days >= 300


def is_quarter_length_fact(start: str | None, end: str | None) -> bool:
    days = duration_days(start, end)
    return days is not None and 45 <= days <= 125


def is_same_quarter_year_ago(current_end: str | None, prior_end: str | None) -> bool:
    current_date = parse_iso_date(current_end)
    prior_date = parse_iso_date(prior_end)
    if not current_date or not prior_date:
        return False
    return 330 <= (current_date - prior_date).days <= 400


def fiscal_year_from_end(end: str | None, fallback: int | None = None) -> int | None:
    if end and re.match(r"\d{4}-\d{2}-\d{2}$", end):
        return int(end[:4])
    return fallback if isinstance(fallback, int) else None


def annual_fiscal_year(fy: int | None, end: str | None, frame: str | None = None) -> int | None:
    """Resolve the year of an annual fact without trusting stale comparison-row FY metadata."""
    end_year = fiscal_year_from_end(end)
    frame_match = re.match(r"CY(\d{4})$", str(frame or ""))
    frame_year = int(frame_match.group(1)) if frame_match else None
    if isinstance(frame_year, int):
        return frame_year
    if isinstance(fy, int) and isinstance(end_year, int):
        # SEC comparison columns may retain the filing's current FY even when the
        # fact itself ends two or more years earlier.
        if abs(fy - end_year) > 1:
            return end_year
        return fy
    return fy if isinstance(fy, int) else end_year


def infer_quarter_period_from_range(
    start: str | None,
    end: str | None,
    annual_ranges: list[dict[str, Any]],
) -> str | None:
    start_date = parse_iso_date(start)
    end_date = parse_iso_date(end)
    if not start_date or not end_date or not is_quarter_length_fact(start, end):
        return None

    for annual in annual_ranges:
        annual_start = parse_iso_date(annual.get("start"))
        annual_end = parse_iso_date(annual.get("end"))
        annual_fy = annual.get("fy")
        if not annual_start or not annual_end or not isinstance(annual_fy, int):
            continue
        if not (annual_start <= start_date and end_date <= annual_end):
            continue
        if end_date.date() == annual_end.date():
            return f"FY{annual_fy}Q4"
        total_days = max(1, (annual_end - annual_start).days + 1)
        offset_days = max(0, ((start_date - annual_start).days + (end_date - annual_start).days) / 2)
        quarter = min(4, max(1, int((offset_days / total_days) * 4) + 1))
        return f"FY{annual_fy}Q{quarter}"
    return None


def infer_fiscal_year(
    fy: int | None,
    fp: str | None,
    start: str | None,
    end: str | None,
    annual_ranges: list[dict[str, Any]],
) -> int | None:
    if fp not in {"Q1", "Q2", "Q3", "Q4"}:
        return fy if isinstance(fy, int) else None

    start_date = parse_iso_date(start)
    end_date = parse_iso_date(end)
    if start_date and end_date:
        for annual in annual_ranges:
            annual_start = parse_iso_date(annual.get("start"))
            annual_end = parse_iso_date(annual.get("end"))
            if annual_start and annual_end and annual_start <= start_date and end_date <= annual_end:
                return int(annual["fy"])

        previous_annuals = [
            annual
            for annual in annual_ranges
            if parse_iso_date(annual.get("end")) and parse_iso_date(annual.get("end")) < end_date
        ]
        if previous_annuals:
            latest = max(previous_annuals, key=lambda annual: parse_iso_date(annual.get("end")) or datetime.min)
            latest_end = parse_iso_date(latest.get("end"))
            if latest_end:
                years_after = max(1, ((end_date - latest_end).days + 370) // 371)
                return int(latest["fy"]) + years_after

    return fy if isinstance(fy, int) else None


def is_ytd_fact(start: str | None, end: str | None, fiscal_quarter: int) -> bool:
    if fiscal_quarter <= 1:
        return False
    if not start or not end:
        return False
    try:
        start_date = datetime.fromisoformat(start)
        end_date = datetime.fromisoformat(end)
    except ValueError:
        return False
    duration_days = (end_date - start_date).days
    return duration_days > 120 if fiscal_quarter == 2 else duration_days > 210


def select_unit(units: dict[str, list[dict[str, Any]]], preferred: tuple[str, ...]) -> tuple[str | None, list[dict[str, Any]]]:
    for unit in preferred:
        if unit in units:
            return unit, units[unit]
    if units:
        first = next(iter(units))
        return first, units[first]
    return None, []


def extract_tag_series(
    facts: dict[str, Any],
    tags: list[str],
    preferred_units: tuple[str, ...] = ("USD",),
    *,
    allow_annual_derive: bool = True,
) -> dict[str, dict[str, Any]]:
    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    selected_rows: list[dict[str, Any]] = []
    selected_tag = None
    selected_unit = None
    selected_latest_period = ""

    for tag in tags:
        concept = us_gaap.get(tag)
        if not concept:
            continue
        unit, rows = select_unit(concept.get("units", {}), preferred_units)
        periods: list[str] = []
        for row in rows:
            frame = row.get("frame")
            if row.get("form") not in FINANCIAL_FORMS or row.get("val") is None:
                continue
            period = fiscal_period_key(row.get("fy"), row.get("fp"), annual_as_q4=True)
            if not period and frame and re.match(r"CY\d{4}Q[1-4]$", frame):
                period = normalize_calendar_period(frame, row.get("end"))
            if not period and frame and re.match(r"CY\d{4}$", frame):
                period = f"FY{frame[2:6]}Q4"
            if period:
                periods.append(period)
        latest_period = max(periods) if periods else ""
        if rows and latest_period and latest_period > selected_latest_period:
            selected_rows = rows
            selected_tag = tag
            selected_unit = unit
            selected_latest_period = latest_period

    if not selected_rows:
        return {}

    quarters: dict[str, dict[str, Any]] = {}
    annuals: dict[str, dict[str, Any]] = {}
    ytd: dict[tuple[str, int], dict[str, Any]] = {}
    annual_ranges = sorted(
        [
            {
                "fy": annual_fiscal_year(row.get("fy"), row.get("end"), row.get("frame")),
                "start": row.get("start"),
                "end": row.get("end"),
            }
            for row in selected_rows
            if isinstance(row.get("fy"), int)
            and row.get("fp") == "FY"
            and row.get("start")
            and row.get("end")
            and row.get("val") is not None
            and is_full_year_fact(row.get("start"), row.get("end"))
        ],
        key=lambda item: (int(item["fy"]), str(item.get("filed") or "")) if isinstance(item.get("fy"), int) else (0, ""),
    )
    framed_fact_keys = {
        (row.get("end"), row.get("filed"))
        for row in selected_rows
        if row.get("frame") and re.match(r"CY\d{4}Q[1-4]$", str(row.get("frame")))
    }

    for row in selected_rows:
        form = row.get("form")
        if form not in FINANCIAL_FORMS:
            continue
        value = row.get("val")
        if value is None:
            continue
        frame = row.get("frame")
        end = row.get("end")
        fy = row.get("fy")
        fp = row.get("fp")
        inferred_fy = infer_fiscal_year(fy, fp, row.get("start"), end, annual_ranges)
        framed_quarter_period = (
            infer_quarter_period_from_range(row.get("start"), end, annual_ranges)
            if frame and re.match(r"CY\d{4}Q[1-4]$", frame)
            else None
        )
        period = framed_quarter_period or fiscal_period_key(inferred_fy, fp) or normalize_calendar_period(frame, end)
        item = {
            "value": float(value),
            "start": row.get("start"),
            "end": end,
            "filed": row.get("filed"),
            "form": form,
            "tag": selected_tag,
            "unit": selected_unit,
        }

        if frame and re.match(r"CY\d{4}Q[1-4]$", frame):
            if frame.endswith("Q4") and is_full_year_fact(row.get("start"), end):
                annual_year = str(annual_fiscal_year(fy, end) or inferred_fy or frame[2:6])
                existing_annual = annuals.get(annual_year)
                if not existing_annual or str(item.get("filed") or "") >= str(existing_annual.get("filed") or ""):
                    annuals[annual_year] = item
                continue
            existing = quarters.get(period or "")
            if not existing or str(item.get("filed") or "") >= str(existing.get("filed") or ""):
                quarters[period or ""] = item
            continue

        if frame and re.match(r"CY\d{4}$", frame):
            year = str(annual_fiscal_year(fy, end, frame) or inferred_fy or "")
            if year and is_full_year_fact(row.get("start"), end):
                annuals[year] = item
            continue

        if not frame and (end, row.get("filed")) in framed_fact_keys:
            continue

        if isinstance(inferred_fy, int) and fp in {"Q1", "Q2", "Q3"}:
            quarter = int(str(fp)[1])
            fiscal_period = fiscal_period_key(inferred_fy, fp) or period
            if quarter == 1:
                existing = quarters.get(fiscal_period or "")
                if not existing or str(item.get("filed") or "") >= str(existing.get("filed") or ""):
                    quarters[fiscal_period or ""] = item
                ytd[(str(inferred_fy), quarter)] = {**item, "period": fiscal_period}
            elif is_ytd_fact(row.get("start"), end, quarter):
                ytd[(str(inferred_fy), quarter)] = {**item, "period": fiscal_period}
            elif fiscal_period:
                existing = quarters.get(fiscal_period)
                if not existing or str(item.get("filed") or "") >= str(existing.get("filed") or ""):
                    quarters[fiscal_period] = item

    if allow_annual_derive:
        for year, annual in annuals.items():
            q4_key = f"FY{year}Q4"
            q_values = [quarters.get(f"FY{year}Q{quarter}") for quarter in (1, 2, 3)]
            if all(item and item.get("value") is not None for item in q_values):
                derived = dict(annual)
                derived["value"] = float(annual["value"]) - sum(float(item["value"]) for item in q_values if item)
                derived["start"] = next_day_iso(q_values[-1].get("end") if q_values[-1] else None)
                derived["derived"] = "FY-Q1-Q2-Q3"
                existing_q4 = quarters.get(q4_key)
                first_three_values = [float(item["value"]) for item in q_values if item]
                first_three_average = sum(first_three_values) / 3
                existing_q4_value = safe_float((existing_q4 or {}).get("value"))
                existing_q4_looks_cumulative = (
                    existing_q4_value is not None
                    and min(first_three_values) > 0
                    and existing_q4_value > sum(first_three_values)
                    and existing_q4_value / first_three_average > 2.8
                    and max(first_three_values) / min(first_three_values) < 2
                )
                if existing_q4 is None or existing_q4_looks_cumulative:
                    quarters[q4_key] = derived

        for (year, quarter), item in ytd.items():
            period = item.get("period") or f"{year}Q{quarter}"
            if period in quarters:
                continue
            if quarter == 1:
                quarters[period] = item
                continue
            previous = ytd.get((year, quarter - 1))
            if previous:
                derived = dict(item)
                derived["value"] = float(item["value"]) - float(previous["value"])
                derived["start"] = next_day_iso(previous.get("end"))
                derived["derived"] = f"YTD-Q{quarter - 1}"
                quarters[period] = derived

        # A few issuers expose a full-year fact with a quarter-looking frame. If
        # Q1-Q3 are stable quarterly values and Q4 alone is clearly the annual
        # total, convert it to the standalone fourth quarter.
        derivable_tags = set(
            REVENUE_TAGS + GROSS_PROFIT_TAGS + OPERATING_INCOME_TAGS + OCF_TAGS + CAPEX_TAGS
        )
        if selected_tag in derivable_tags:
            fiscal_years = sorted(
                {
                    match.group(1)
                    for period in quarters
                    if (match := re.match(r"FY(\d{4})Q[1-4]$", period))
                }
            )
            for year in fiscal_years:
                q_items = [quarters.get(f"FY{year}Q{quarter}") for quarter in (1, 2, 3, 4)]
                if not all(item and safe_float(item.get("value")) is not None for item in q_items):
                    continue
                q_values = [float(item["value"]) for item in q_items if item]
                first_three = q_values[:3]
                q4_value = q_values[3]
                if min(first_three) <= 0 or q4_value <= 0:
                    continue
                stable_spread = max(first_three) / min(first_three)
                first_three_average = sum(first_three) / 3
                if q4_value > sum(first_three) and q4_value / first_three_average > 2.8 and stable_spread < 2:
                    derived = dict(q_items[3] or {})
                    derived["value"] = q4_value - sum(first_three)
                    derived["start"] = next_day_iso((q_items[2] or {}).get("end"))
                    derived["derived"] = "FY-Q1-Q2-Q3-stable-series"
                    quarters[f"FY{year}Q4"] = derived

    return {key: value for key, value in quarters.items() if key}


def divide(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return float(numerator) / float(denominator)


def previous_fiscal_quarter(period: str) -> str | None:
    match = re.match(r"FY(\d{4})Q([1-4])$", period)
    if not match:
        return None
    year = int(match.group(1))
    quarter = int(match.group(2))
    if quarter == 1:
        return f"FY{year - 1}Q4"
    return f"FY{year}Q{quarter - 1}"


def get_series_field(series_list: list[dict[str, dict[str, Any]]], period: str, field: str) -> Any:
    for series in series_list:
        value = series.get(period, {}).get(field)
        if value:
            return value
    return None


def pct_change(current: float | None, previous: float | None) -> float | None:
    ratio = divide(current, previous)
    if ratio is None:
        return None
    return (ratio - 1) * 100


def latest_period_key(series: dict[str, dict[str, Any]]) -> str:
    return max(series) if series else ""


def add_series(
    left: dict[str, dict[str, Any]],
    right: dict[str, dict[str, Any]],
    *,
    tag: str,
) -> dict[str, dict[str, Any]]:
    combined: dict[str, dict[str, Any]] = {}
    for period in sorted(set(left) & set(right)):
        left_item = left.get(period, {})
        right_item = right.get(period, {})
        left_value = left_item.get("value")
        right_value = right_item.get("value")
        if left_value is None or right_value is None:
            continue
        combined[period] = {
            "value": float(left_value) + float(right_value),
            "end": left_item.get("end") or right_item.get("end"),
            "filed": max(str(left_item.get("filed") or ""), str(right_item.get("filed") or "")) or None,
            "form": left_item.get("form") or right_item.get("form"),
            "tag": tag,
            "unit": left_item.get("unit") or right_item.get("unit"),
            "derived": "net-interest-income-plus-noninterest-income",
        }
    return combined


def sec_archive_doc_url(cik: str, accession: str, document_name: str) -> str:
    cik_int = int(cik)
    accession_clean = accession.replace("-", "")
    return f"{SEC_ARCHIVES_BASE_URL}/{cik_int}/{accession_clean}/{document_name}"


def filing_index_url(cik: str, accession: str) -> str:
    cik_int = int(cik)
    accession_clean = accession.replace("-", "")
    return f"{SEC_ARCHIVES_BASE_URL}/{cik_int}/{accession_clean}/index.json"


def likely_earnings_release_name(name: str) -> bool:
    lowered = name.lower()
    if not lowered.endswith((".htm", ".html", ".txt")):
        return False
    if any(part in lowered for part in ["xsl", "xml", "schema", "cal.xml", "def.xml", "lab.xml", "pre.xml"]):
        return False
    strong_tokens = ["ex99", "ex-99", "exhibit99", "exhibit-99", "dex99", "earningsrelease", "earnings-release"]
    if any(token in lowered for token in strong_tokens):
        return True
    return bool(re.search(r"(?:^|[^0-9])99[-_.]?1(?:[^0-9]|$)", lowered))


def load_earnings_release_documents(cik: str) -> list[dict[str, Any]]:
    submissions = fetch_json(SEC_SUBMISSIONS_URL.format(cik=cik))
    recent = submissions.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    accessions = recent.get("accessionNumber", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    primary_documents = recent.get("primaryDocument", [])
    filing_items = recent.get("items", [])
    documents: list[dict[str, Any]] = []

    scanned = 0
    for index, form in enumerate(forms):
        if form not in EARNINGS_RELEASE_FORMS:
            continue
        item_codes = str(filing_items[index] if index < len(filing_items) else "")
        if form == "8-K" and item_codes and "2.02" not in item_codes:
            continue
        scanned += 1
        if scanned > EARNINGS_RELEASE_FILING_SCAN_LIMIT:
            break
        accession = accessions[index]
        filing_date = filing_dates[index] if index < len(filing_dates) else None
        report_date = report_dates[index] if index < len(report_dates) else None
        candidate_names: list[str] = []
        try:
            index_payload = fetch_json(filing_index_url(cik, accession))
            for item in index_payload.get("directory", {}).get("item", []):
                name = str(item.get("name") or "")
                if likely_earnings_release_name(name):
                    candidate_names.append(name)
        except Exception:
            pass

        if not candidate_names and index < len(primary_documents):
            primary = str(primary_documents[index] or "")
            if primary.endswith((".htm", ".html", ".txt")):
                candidate_names.append(primary)

        for name in dict.fromkeys(candidate_names):
            try:
                url = sec_archive_doc_url(cik, accession, name)
                html = fetch_text(url)
            except Exception:
                continue
            normalized = html.lower()
            earnings_terms = sum(
                term in normalized
                for term in ("revenue", "gross margin", "operating income", "earnings per share")
            )
            if (
                "non-gaap" not in normalized
                and "non gaap" not in normalized
                and "free cash flow" not in normalized
                and earnings_terms < 2
            ):
                continue
            documents.append(
                {
                    "accession": accession,
                    "form": form,
                    "filingDate": filing_date,
                    "reportDate": report_date,
                    "document": name,
                    "url": url,
                    "html": html,
                }
            )
            break
        if len(documents) >= EARNINGS_RELEASE_DOC_LIMIT:
            break
        time.sleep(0.04)
    return documents


def document_scale(html: str) -> float:
    text = normalize_label(html[:100000])
    if "in thousands" in text or "amounts in thousands" in text or "dollars in thousands" in text:
        return 1_000.0
    if "in millions" in text or "amounts in millions" in text or "dollars in millions" in text:
        return 1_000_000.0
    return 1.0


def metric_preferred(existing: dict[str, Any], key: str, source_key: str) -> bool:
    if existing.get(key) is None:
        return True
    return str(existing.get(f"{source_key}Source") or "").lower().startswith("sec gaap")


def plausible_percent(value: float | None) -> bool:
    return value is not None and -100 <= float(value) <= 100


def plausible_eps(value: float | None) -> bool:
    return value is not None and -100 <= float(value) <= 100


def plausible_margin_from_amount(amount: float | None, revenue: float | None) -> float | None:
    margin = divide(amount, revenue)
    if margin is None:
        return None
    pct = margin * 100
    return pct if plausible_percent(pct) else None


def plausible_cash_flow(value: float | None, revenue: float | None) -> bool:
    if value is None:
        return False
    if revenue:
        ratio = abs(float(value)) / abs(float(revenue))
        if ratio > 3:
            return False
    return True


def first_numeric_after_label(values: list[object], max_abs: float | None = None) -> tuple[float | None, bool]:
    for value in values[1:]:
        numeric, is_percent = parse_numeric_cell(value)
        if numeric is None:
            continue
        # Avoid selecting year/date header fragments that leaked into body cells.
        if not is_percent and 1900 <= abs(numeric) <= 2100 and float(numeric).is_integer():
            continue
        if max_abs is not None and abs(numeric) > max_abs:
            continue
        return numeric, is_percent
    return None, False


def extract_metrics_from_release_html(html: str) -> dict[str, Any]:
    scale = document_scale(html)
    metrics: dict[str, Any] = {
        "revenue": None,
        "grossProfit": None,
        "grossMarginPct": None,
        "nonGaapGrossProfit": None,
        "nonGaapGrossMarginPct": None,
        "operatingIncome": None,
        "operatingMarginPct": None,
        "nonGaapOperatingIncome": None,
        "nonGaapOperatingMarginPct": None,
        "epsDiluted": None,
        "nonGaapEpsDiluted": None,
        "ocf": None,
        "fcf": None,
    }
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table")[:50]:
        table_label = normalize_label(table.get_text(" ", strip=True)[:1200])
        is_fcf_reconciliation = "free cash flow" in table_label
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            values = [cell.get_text(" ", strip=True) for cell in cells]
            labels = [normalize_label(value) for value in values[:3] if normalize_label(value)]
            label = " ".join(labels[:2])
            if not label or label in {"nan"}:
                continue
            numeric, is_percent = first_numeric_after_label(values)
            if numeric is None:
                continue

            has_non_gaap = "non-gaap" in label or "non gaap" in label
            has_adjusted = "adjusted" in label
            if metrics["revenue"] is None and "revenue" in label and not any(
                excluded in label for excluded in ["deferred", "cost", "remaining", "rpo", "unearned"]
            ):
                metrics["revenue"] = scaled_amount(numeric, scale)

            if has_non_gaap and "gross margin" in label:
                gross_numeric, gross_is_percent = first_numeric_after_label(values)
                if gross_is_percent and plausible_percent(gross_numeric):
                    metrics["nonGaapGrossMarginPct"] = gross_numeric
                elif gross_numeric is not None:
                    metrics["nonGaapGrossProfit"] = scaled_amount(gross_numeric, scale)
            elif has_non_gaap and "gross profit" in label and "margin" not in label:
                metrics["nonGaapGrossProfit"] = scaled_amount(numeric, scale)
            elif not has_adjusted and "gross margin" in label:
                gross_numeric, gross_is_percent = first_numeric_after_label(values)
                if gross_is_percent and plausible_percent(gross_numeric):
                    metrics["grossMarginPct"] = gross_numeric
            elif not has_adjusted and "gross profit" in label and "margin" not in label:
                metrics["grossProfit"] = scaled_amount(numeric, scale)

            is_non_gaap_operating = has_non_gaap or has_adjusted
            if is_non_gaap_operating and any(term in label for term in ["operating margin", "margin from operations"]):
                margin_numeric, margin_is_percent = first_numeric_after_label(values, max_abs=100)
                if margin_is_percent and plausible_percent(margin_numeric):
                    metrics["nonGaapOperatingMarginPct"] = margin_numeric
            elif is_non_gaap_operating and any(
                term in label
                for term in [
                    "income from operations",
                    "operating income",
                    "operating profit",
                    "profit from operations",
                ]
            ) and "margin" not in label:
                metrics["nonGaapOperatingIncome"] = scaled_amount(numeric, scale)
            elif any(term in label for term in ["operating margin", "margin from operations"]):
                margin_numeric, _ = first_numeric_after_label(values, max_abs=100)
                if plausible_percent(margin_numeric):
                    metrics["operatingMarginPct"] = margin_numeric
            elif any(
                term in label
                for term in ["income from operations", "operating income", "operating profit", "profit from operations"]
            ) and "margin" not in label:
                metrics["operatingIncome"] = scaled_amount(numeric, scale)

            if has_non_gaap and any(term in label for term in ["diluted earnings per share", "diluted eps", "earnings per share", "net income per share"]):
                eps_numeric, _ = first_numeric_after_label(values, max_abs=100)
                if plausible_eps(eps_numeric):
                    metrics["nonGaapEpsDiluted"] = eps_numeric
            elif not has_adjusted and any(term in label for term in ["diluted earnings per share", "diluted eps", "earnings per share", "net income per share"]):
                eps_numeric, _ = first_numeric_after_label(values, max_abs=100)
                if plausible_eps(eps_numeric):
                    metrics["epsDiluted"] = eps_numeric

            if any(term in label for term in ["net cash provided by operating activities", "cash provided by operating activities", "operating cash flow"]) and not any(
                term in label for term in ["percentage", "margin"]
            ):
                # Cash flow statements often present YTD before quarterly columns. If a
                # release has a free-cash-flow reconciliation table, prefer that row.
                if metrics["ocf"] is None or is_fcf_reconciliation:
                    metrics["ocf"] = scaled_amount(numeric, scale)
            if "free cash flow" in label and "margin" not in label:
                metrics["fcf"] = scaled_amount(numeric, scale)
    return metrics


def match_release_to_period(row: dict[str, Any], releases: list[dict[str, Any]]) -> dict[str, Any] | None:
    period_end = parse_iso_date(row.get("periodEnd"))
    if not period_end:
        return None
    candidates: list[tuple[int, dict[str, Any]]] = []
    for release in releases:
        release_date = parse_iso_date(release.get("reportDate")) or parse_iso_date(release.get("filingDate"))
        if not release_date:
            continue
        diff_days = (release_date - period_end).days
        if -5 <= diff_days <= 70:
            candidates.append((abs(diff_days), release))
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item[0])[0][1]


def build_ir_release_metrics(cik: str) -> list[dict[str, Any]]:
    releases = []
    for document in load_earnings_release_documents(cik):
        metrics = extract_metrics_from_release_html(str(document.get("html") or ""))
        if not any(value is not None for value in metrics.values()):
            continue
        releases.append({**{key: value for key, value in document.items() if key != "html"}, "metrics": metrics})
    return releases


def quarter_start_iso(period_end: str | None) -> str | None:
    end_date = parse_iso_date(period_end)
    if end_date is None:
        return None
    quarter_month = ((end_date.month - 1) // 3) * 3 + 1
    return end_date.replace(month=quarter_month, day=1).date().isoformat()


def build_ir_only_rows(releases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows_by_period: dict[str, dict[str, Any]] = {}
    for release in releases:
        period_end = str(release.get("reportDate") or "")
        period_key = normalize_calendar_period(None, period_end)
        if not period_key:
            continue
        metrics = release.get("metrics") or {}
        revenue = safe_float(metrics.get("revenue"))
        gross_margin = safe_float(metrics.get("nonGaapGrossMarginPct"))
        if gross_margin is None:
            gross_margin = safe_float(metrics.get("grossMarginPct"))
        gross_profit = safe_float(metrics.get("nonGaapGrossProfit"))
        if gross_profit is None:
            gross_profit = safe_float(metrics.get("grossProfit"))
        if gross_margin is None:
            gross_margin = plausible_margin_from_amount(gross_profit, revenue)
        operating_margin = safe_float(metrics.get("nonGaapOperatingMarginPct"))
        if operating_margin is None:
            operating_margin = safe_float(metrics.get("operatingMarginPct"))
        operating_income = safe_float(metrics.get("nonGaapOperatingIncome"))
        if operating_income is None:
            operating_income = safe_float(metrics.get("operatingIncome"))
        if operating_margin is None:
            operating_margin = plausible_margin_from_amount(operating_income, revenue)
        eps = safe_float(metrics.get("nonGaapEpsDiluted"))
        if eps is None:
            eps = safe_float(metrics.get("epsDiluted"))
        source_label = f"Official IR earnings release ({release.get('form')} {release.get('filingDate')})"
        adjusted = any(
            metrics.get(key) is not None
            for key in (
                "nonGaapGrossProfit",
                "nonGaapGrossMarginPct",
                "nonGaapOperatingIncome",
                "nonGaapOperatingMarginPct",
                "nonGaapEpsDiluted",
            )
        )
        adjusted_suffix = " Non-GAAP" if adjusted else " Reported"
        row = {
            "period": format_fiscal_period_label(period_key),
            "periodKey": period_key,
            "periodStart": quarter_start_iso(period_end),
            "periodEnd": period_end,
            "filed": release.get("filingDate"),
            "revenue": safe_round(revenue, 0),
            "revenueYoyPct": None,
            "grossMarginPct": safe_round(gross_margin, 1),
            "operatingMarginPct": safe_round(operating_margin, 1),
            "operatingMarginYoyPp": None,
            "epsDiluted": safe_round(eps, 2),
            "ocf": safe_round(safe_float(metrics.get("ocf")), 0),
            "fcf": safe_round(safe_float(metrics.get("fcf")), 0),
            "irReleaseUrl": release.get("url"),
            "irReleaseDate": release.get("filingDate"),
            "metricSources": {
                "revenue": source_label + " Reported",
                "grossMarginPct": source_label + adjusted_suffix,
                "operatingMarginPct": source_label + adjusted_suffix,
                "epsDiluted": source_label + adjusted_suffix,
                "ocf": source_label + " Reported",
                "fcf": source_label + " Reported",
            },
        }
        if any(row.get(key) is not None for key in ("revenue", "grossMarginPct", "operatingMarginPct", "epsDiluted")):
            existing = rows_by_period.get(period_key)
            if not existing or str(row.get("filed") or "") >= str(existing.get("filed") or ""):
                rows_by_period[period_key] = row

    rows = sorted(rows_by_period.values(), key=lambda item: str(item.get("periodKey") or ""), reverse=True)
    by_period = {str(row.get("periodKey")): row for row in rows}
    for row in rows:
        period_key = str(row.get("periodKey") or "")
        match = re.match(r"FY(\d{4})Q([1-4])$", period_key)
        if not match:
            continue
        prior = by_period.get(f"FY{int(match.group(1)) - 1}Q{match.group(2)}")
        if not prior:
            continue
        row["revenueYoyPct"] = safe_round(pct_change(row.get("revenue"), prior.get("revenue")), 1)
        current_opm = safe_float(row.get("operatingMarginPct"))
        prior_opm = safe_float(prior.get("operatingMarginPct"))
        if current_opm is not None and prior_opm is not None:
            row["operatingMarginYoyPp"] = safe_round(current_opm - prior_opm, 1)
    return rows[:8]


def recompute_quarterly_changes(rows: list[dict[str, Any]]) -> None:
    by_period = {str(row.get("periodKey") or ""): row for row in rows}
    for row in rows:
        period_key = str(row.get("periodKey") or "")
        match = re.match(r"FY(\d{4})Q([1-4])$", period_key)
        if not match:
            continue
        prior = by_period.get(f"FY{int(match.group(1)) - 1}Q{match.group(2)}")
        if not prior:
            continue
        row["revenueYoyPct"] = safe_round(pct_change(row.get("revenue"), prior.get("revenue")), 1)
        current_opm = safe_float(row.get("operatingMarginPct"))
        prior_opm = safe_float(prior.get("operatingMarginPct"))
        row["operatingMarginYoyPp"] = (
            safe_round(current_opm - prior_opm, 1)
            if current_opm is not None and prior_opm is not None
            else None
        )


def apply_ir_metrics(rows: list[dict[str, Any]], releases: list[dict[str, Any]]) -> int:
    applied = 0
    for row in rows:
        metric_sources = {
            "revenue": "SEC GAAP companyfacts",
            "grossMarginPct": "SEC GAAP companyfacts",
            "operatingMarginPct": "SEC GAAP companyfacts",
            "epsDiluted": "SEC GAAP companyfacts",
            "ocf": "SEC GAAP companyfacts",
            "fcf": "SEC GAAP companyfacts",
        }
        release = match_release_to_period(row, releases)
        if not release:
            row["metricSources"] = metric_sources
            continue
        metrics = release.get("metrics", {})
        source_label = f"IR earnings release ({release.get('form')} {release.get('filingDate')})"
        gross_margin = metrics.get("nonGaapGrossMarginPct")
        if plausible_percent(gross_margin):
            existing_gross_margin = safe_float(row.get("grossMarginPct"))
            likely_reconciliation_adjustment = (
                abs(float(gross_margin)) < 0.05
                or (
                    existing_gross_margin is not None
                    and float(gross_margin) < 5
                    and existing_gross_margin > 10
                )
            )
            if not likely_reconciliation_adjustment:
                row["grossMarginPct"] = safe_round(gross_margin, 1)
                metric_sources["grossMarginPct"] = source_label + " Non-GAAP"
                applied += 1

        operating_margin = metrics.get("nonGaapOperatingMarginPct")
        if plausible_percent(operating_margin):
            existing_operating_margin = safe_float(row.get("operatingMarginPct"))
            likely_reconciliation_adjustment = (
                abs(float(operating_margin)) < 0.05
                or (
                    existing_operating_margin is not None
                    and (
                        (float(operating_margin) < 0 and existing_operating_margin > 5)
                        or (float(operating_margin) >= 95 and existing_operating_margin < 80)
                    )
                )
            )
            if not likely_reconciliation_adjustment:
                row["operatingMarginPct"] = safe_round(operating_margin, 1)
                metric_sources["operatingMarginPct"] = source_label + " Non-GAAP"
                applied += 1

        row["irReleaseUrl"] = release.get("url")
        row["irReleaseDate"] = release.get("filingDate")
        row["metricSources"] = metric_sources
    return applied


def build_company_financials(ticker: str, name: str, cik: str) -> dict[str, Any]:
    if ticker in UNSUPPORTED_AUTOMATED_TICKERS:
        return {
            "ticker": ticker,
            "name": name,
            "cik": cik,
            "financialUpdatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "Official filing review required",
            "basis": "Automatic SEC extraction disabled because the issuer's reported units are not comparable with the US-GAAP parser.",
            "irReleaseCount": 0,
            "irValuesApplied": 0,
            "nonGaapRows": 0,
            "quarters": [],
        }
    facts = fetch_json(SEC_COMPANY_FACTS_URL.format(cik=cik))
    ir_releases = build_ir_release_metrics(cik)
    revenue = extract_tag_series(facts, REVENUE_TAGS)
    bank_revenue = add_series(
        extract_tag_series(facts, NET_INTEREST_INCOME_TAGS),
        extract_tag_series(facts, NONINTEREST_INCOME_TAGS),
        tag="InterestIncomeExpenseNet+NoninterestIncome",
    )
    if latest_period_key(bank_revenue) > latest_period_key(revenue):
        revenue = bank_revenue
    if revenue and latest_period_key(revenue) < "FY2024Q1":
        revenue = {}
    gross_profit = extract_tag_series(facts, GROSS_PROFIT_TAGS)
    operating_income = extract_tag_series(facts, OPERATING_INCOME_TAGS)
    eps = extract_tag_series(facts, EPS_DILUTED_TAGS, ("USD/shares", "USD/shares"), allow_annual_derive=False)
    ocf = extract_tag_series(facts, OCF_TAGS)
    capex = extract_tag_series(facts, CAPEX_TAGS)

    periods = sorted(
        set(revenue) or (set(gross_profit) | set(operating_income) | set(eps) | set(ocf) | set(capex)),
        reverse=True,
    )
    rows: list[dict[str, Any]] = []
    for period in periods:
        revenue_value = revenue.get(period, {}).get("value")
        gross_profit_value = gross_profit.get(period, {}).get("value")
        op_income_value = operating_income.get(period, {}).get("value")
        eps_value = eps.get(period, {}).get("value")
        ocf_value = ocf.get(period, {}).get("value")
        capex_value = capex.get(period, {}).get("value")
        prior_year_period = ""
        period_match = re.match(r"FY(\d{4})Q([1-4])$", period)
        if period_match:
            prior_year_period = f"FY{int(period_match.group(1)) - 1}Q{period_match.group(2)}"
        current_period_end = revenue.get(period, {}).get("end")
        prior_period_end = revenue.get(prior_year_period, {}).get("end")
        comparable_prior_period = is_same_quarter_year_ago(current_period_end, prior_period_end)
        prior_revenue = (
            revenue.get(prior_year_period, {}).get("value")
            if comparable_prior_period
            else None
        )
        prior_op_margin = None
        if prior_year_period and comparable_prior_period:
            prior_op_margin = divide(operating_income.get(prior_year_period, {}).get("value"), revenue.get(prior_year_period, {}).get("value"))
        op_margin = divide(op_income_value, revenue_value)
        fcf_value = None
        if ocf_value is not None and capex_value is not None:
            fcf_value = float(ocf_value) - abs(float(capex_value))
        period_start = get_series_field([revenue, operating_income, ocf], period, "start")
        if not period_start:
            previous_period = previous_fiscal_quarter(period)
            previous_end = get_series_field([revenue, operating_income, ocf], previous_period or "", "end")
            period_start = next_day_iso(previous_end)

        rows.append(
            {
                "period": format_fiscal_period_label(period),
                "periodKey": period,
                "periodStart": period_start,
                "periodEnd": get_series_field([revenue, operating_income, ocf], period, "end"),
                "filed": get_series_field([revenue, operating_income, ocf], period, "filed"),
                "revenue": safe_round(revenue_value, 0),
                "revenueYoyPct": safe_round(pct_change(revenue_value, prior_revenue), 1),
                "grossMarginPct": safe_round(divide(gross_profit_value, revenue_value) * 100 if divide(gross_profit_value, revenue_value) is not None else None, 1),
                "operatingMarginPct": safe_round(op_margin * 100 if op_margin is not None else None, 1),
                "operatingMarginYoyPp": safe_round((op_margin - prior_op_margin) * 100 if op_margin is not None and prior_op_margin is not None else None, 1),
                "epsDiluted": safe_round(eps_value, 2),
                "ocf": safe_round(ocf_value, 0),
                "fcf": safe_round(fcf_value, 0),
            }
        )

    if not rows:
        rows = build_ir_only_rows(ir_releases)
    rows.sort(key=lambda item: str(item.get("periodKey") or ""), reverse=True)
    ir_values_applied = apply_ir_metrics(rows, ir_releases)
    recompute_quarterly_changes(rows)
    non_gaap_rows = sum(
        1
        for row in rows[:8]
        if any("Non-GAAP" in str(source) for source in (row.get("metricSources") or {}).values())
    )

    return {
        "ticker": ticker,
        "name": name,
        "cik": cik,
        "financialUpdatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "SEC EDGAR companyfacts + EDGAR earnings release exhibits",
        "basis": "SEC GAAP companyfacts for Revenue, EPS, OCF, and FCF. Only explicitly percentage-labelled Non-GAAP GPM/OPM from official IR exhibits may replace GAAP margins.",
        "irReleaseCount": len(ir_releases),
        "irValuesApplied": ir_values_applied,
        "nonGaapRows": non_gaap_rows,
        "quarters": rows[:8],
    }


def main() -> None:
    rs_payload = read_js_payload(RS_DATA_PATH, "marketRsData")
    briefing_tickers = load_daily_briefing_tickers()
    extra_tickers_env = os.environ.get("MARKET_RS_FINANCIALS_EXTRA_TICKERS", "")
    extra_tickers = {
        ticker.strip().upper()
        for ticker in re.split(r"[\s,]+", extra_tickers_env)
        if ticker.strip()
    }
    base_target_rows = [
        row
        for row in rs_payload.get("rows", [])
        if (
            any((row.get("memberships") or {}).get(key) for key in TARGET_MEMBERSHIPS)
            or str(row.get("ticker") or "").upper() in briefing_tickers
        )
    ]
    target_rows_by_ticker = {
        str(row.get("ticker") or "").upper(): row
        for row in base_target_rows
        if row.get("ticker")
    }
    for row in rs_payload.get("rows", []):
        ticker = str(row.get("ticker") or "").upper()
        if ticker in extra_tickers and ticker not in target_rows_by_ticker:
            target_rows_by_ticker[ticker] = row
    target_rows = list(target_rows_by_ticker.values())
    previous_payload = read_previous_payload()
    force_refresh = os.environ.get("MARKET_RS_FINANCIALS_FORCE_REFRESH", "").lower() in {"1", "true", "yes"}
    max_companies_text = os.environ.get("MARKET_RS_FINANCIALS_MAX_COMPANIES", "").strip()
    max_companies = int(max_companies_text) if max_companies_text.isdigit() and int(max_companies_text) > 0 else None
    worker_text = os.environ.get("MARKET_RS_FINANCIALS_WORKERS", "4").strip()
    workers = max(1, min(8, int(worker_text))) if worker_text.isdigit() else 4
    stale_days_text = os.environ.get("MARKET_RS_FINANCIALS_STALE_DAYS", "14").strip()
    try:
        stale_days = int(stale_days_text)
    except ValueError:
        stale_days = 14
    target_tickers_env = os.environ.get("MARKET_RS_FINANCIALS_TICKERS", "")
    explicit_tickers = {
        ticker.strip().upper()
        for ticker in re.split(r"[\s,]+", target_tickers_env)
        if ticker.strip()
    }
    financials: dict[str, Any] = dict(previous_payload.get("financials") or {})
    fallback_ticker_map = {
        str(ticker).upper(): {
            "cik": str(item.get("cik") or "").zfill(10),
            "title": item.get("name") or ticker,
        }
        for ticker, item in financials.items()
        if isinstance(item, dict) and item.get("cik")
    }
    try:
        ticker_map = load_sec_ticker_map()
    except Exception as error:
        ticker_map = fallback_ticker_map
        print(f"SEC ticker map unavailable; using {len(ticker_map)} cached profile mappings: {error}", flush=True)
    for ticker, cik in SEC_CIK_OVERRIDES.items():
        existing_mapping = ticker_map.get(ticker) or fallback_ticker_map.get(ticker) or {}
        ticker_map[ticker] = {"cik": cik, "title": existing_mapping.get("title") or ticker}
    missing: list[str] = []
    errors: dict[str, str] = dict(previous_payload.get("errors") or {})

    def ticker_updated_at(ticker: str) -> str:
        financial = financials.get(ticker) or {}
        return str(financial.get("financialUpdatedAt") or "")

    def is_stale(ticker: str) -> bool:
        if ticker not in financials:
            return True
        if stale_days < 0:
            return False
        updated_at = parse_iso_date(ticker_updated_at(ticker).replace("Z", "+00:00"))
        if updated_at is None:
            return True
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - updated_at).days >= stale_days

    sorted_rows = sorted(
        target_rows,
        key=lambda item: (
            0 if str(item.get("ticker") or "").upper() in explicit_tickers else 1,
            0 if str(item.get("ticker") or "").upper() in briefing_tickers else 1,
            ticker_updated_at(str(item.get("ticker") or "").upper()),
            str(item.get("ticker")),
        ),
    )
    pending_rows = [
        row
        for row in sorted_rows
        if (
            str(row.get("ticker") or "").upper() in explicit_tickers
            or force_refresh
            or is_stale(str(row.get("ticker") or "").upper())
        )
    ]
    if max_companies is not None:
        pending_rows = pending_rows[:max_companies]

    def build_output_payload() -> dict[str, Any]:
        sp500_count = sum(1 for row in target_rows if (row.get("memberships") or {}).get("sp500"))
        nasdaq100_count = sum(1 for row in target_rows if (row.get("memberships") or {}).get("nasdaq100"))
        russell2000_count = sum(1 for row in target_rows if (row.get("memberships") or {}).get("russell2000"))
        briefing_count = sum(
            1 for row in target_rows if str(row.get("ticker") or "").upper() in briefing_tickers
        )
        non_gaap_company_count = sum(1 for item in financials.values() if int(item.get("nonGaapRows") or 0) > 0)
        official_ir_company_count = sum(1 for item in financials.values() if int(item.get("irValuesApplied") or 0) > 0)
        covered_tickers = {
            ticker
            for ticker, item in financials.items()
            if isinstance(item, dict) and item.get("quarters")
        }
        target_tickers = {str(row.get("ticker") or "").upper() for row in target_rows}
        pending_tickers = sorted(ticker for ticker in target_tickers if ticker and ticker not in covered_tickers)
        briefing_covered = len(briefing_tickers & covered_tickers)
        briefing_pending = len(briefing_tickers - covered_tickers)
        return {
            "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "scope": {
                "universe": "Daily Briefing + S&P 500 + NASDAQ 100",
                "universes": ["dailyBriefing", *TARGET_MEMBERSHIPS] + (["manual_extra"] if extra_tickers else []),
                "counts": {
                    "dailyBriefing": briefing_count,
                    "dailyBriefingCovered": briefing_covered,
                    "dailyBriefingPending": briefing_pending,
                    "sp500": sp500_count,
                    "nasdaq100": nasdaq100_count,
                    "russell2000Extra": russell2000_count,
                    "total": len(target_rows),
                    "covered": len([ticker for ticker in covered_tickers if ticker in target_tickers]),
                    "pending": len(pending_tickers),
                    "nonGaapCompanies": non_gaap_company_count,
                    "officialIrCompanies": official_ir_company_count,
                },
                "tickers": sorted(row.get("ticker") for row in target_rows),
                "pendingTickers": pending_tickers,
                "source": "SEC EDGAR companyfacts + EDGAR 8-K/6-K earnings release exhibits",
                "basis": "Daily Briefing, S&P500, and NASDAQ100 coverage. Revenue, EPS, OCF, and FCF use SEC GAAP companyfacts. Only explicitly percentage-labelled Non-GAAP GPM/OPM from official IR exhibits may replace GAAP margins. ETFs and unsupported non-US filing formats remain blank.",
            },
            "metrics": [
                {"key": "revenue", "label": "Revenue", "unit": "usd", "note": "YoY is shown against the same quarter a year ago."},
                {"key": "grossMarginPct", "label": "GPM", "unit": "percent", "note": "Explicit percentage-labelled Non-GAAP gross margin from official IR release when available; SEC GAAP fallback."},
                {"key": "operatingMarginPct", "label": "OPM", "unit": "percent", "note": "Explicit percentage-labelled Non-GAAP operating margin from official IR release when available; SEC GAAP fallback. YoY pp change is recomputed on the selected basis."},
                {"key": "epsDiluted", "label": "EPS", "unit": "usdPerShare", "note": "SEC GAAP diluted EPS. EPS surprise remains a separate Yahoo Finance dataset."},
                {"key": "ocf", "label": "OCF", "unit": "usd"},
                {"key": "fcf", "label": "FCF", "unit": "usd", "note": "SEC cash flow data: OCF minus absolute capex cash outflow."},
            ],
            "financials": dict(sorted(financials.items())),
            "missing": sorted(set(missing)),
            "errors": dict(sorted(errors.items())),
        }

    print(
        f"Target companies: {len(target_rows)}; existing: {len(financials)}; pending this run: {len(pending_rows)}",
        flush=True,
    )

    def process_company(row: dict[str, Any]) -> tuple[str, dict[str, Any] | None, str | None, bool]:
        ticker = str(row.get("ticker") or "").upper()
        mapping = next((ticker_map.get(candidate) for candidate in sec_ticker_candidates(ticker) if ticker_map.get(candidate)), None)
        if not mapping:
            return ticker, None, None, True
        try:
            profile = build_company_financials(ticker, str(row.get("name") or mapping["title"]), mapping["cik"])
            return ticker, profile, None, False
        except Exception as error:  # pragma: no cover - source variability
            return ticker, None, str(error), False

    completed = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(process_company, row): row for row in pending_rows}
        for future in as_completed(future_map):
            ticker, profile, error, has_no_cik = future.result()
            completed += 1
            if has_no_cik:
                missing.append(ticker)
                print(f"Skipped {completed}/{len(pending_rows)} {ticker}: no SEC CIK", flush=True)
            elif error:
                errors[ticker] = error
                print(f"Failed {completed}/{len(pending_rows)} {ticker}: {error}", flush=True)
            elif profile is not None:
                financials[ticker] = profile
                errors.pop(ticker, None)
                print(f"Processed {completed}/{len(pending_rows)} {ticker}", flush=True)
            if completed % 10 == 0:
                write_js_payload(OUTPUT_PATH, "marketRsFinancialsData", build_output_payload())
                print(f"Checkpoint saved after {completed}/{len(pending_rows)}", flush=True)

    payload = build_output_payload()
    write_js_payload(OUTPUT_PATH, "marketRsFinancialsData", payload)
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Companies: {payload['scope']['counts']['covered']} / {len(target_rows)}")
    if missing:
        print(f"Missing CIK: {', '.join(missing)}")
    if errors:
        print(f"Errors: {len(errors)}")


if __name__ == "__main__":
    main()

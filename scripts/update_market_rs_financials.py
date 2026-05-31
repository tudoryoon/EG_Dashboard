from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests


ROOT = Path(__file__).resolve().parents[1]
RS_DATA_PATH = ROOT / "data" / "market-rs-data.js"
OUTPUT_PATH = ROOT / "data" / "market-rs-financials-data.js"
SEC_TICKER_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
SEC_HEADERS = {
    "User-Agent": "EG Dashboard research contact@example.com",
    "Accept-Encoding": "gzip, deflate",
}
TARGET_MEMBERSHIPS = ("sp500", "nasdaq100")

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


def safe_round(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def fetch_json(url: str) -> dict[str, Any]:
    response = requests.get(url, headers=SEC_HEADERS, timeout=40)
    response.raise_for_status()
    return response.json()


def load_sec_ticker_map() -> dict[str, dict[str, Any]]:
    payload = fetch_json(SEC_TICKER_URL)
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


def fiscal_year_from_end(end: str | None, fallback: int | None = None) -> int | None:
    if end and re.match(r"\d{4}-\d{2}-\d{2}$", end):
        return int(end[:4])
    return fallback if isinstance(fallback, int) else None


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
                "fy": fiscal_year_from_end(row.get("end"), row.get("fy")),
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
            existing = quarters.get(period or "")
            if not existing or str(item.get("filed") or "") >= str(existing.get("filed") or ""):
                quarters[period or ""] = item
            continue

        if frame and re.match(r"CY\d{4}$", frame):
            year = str(fiscal_year_from_end(end, fy) or fiscal_year_key(fy, frame) or "")
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
            if q4_key in quarters:
                continue
            q_values = [quarters.get(f"FY{year}Q{quarter}") for quarter in (1, 2, 3)]
            if all(item and item.get("value") is not None for item in q_values):
                derived = dict(annual)
                derived["value"] = float(annual["value"]) - sum(float(item["value"]) for item in q_values if item)
                derived["start"] = next_day_iso(q_values[-1].get("end") if q_values[-1] else None)
                derived["derived"] = "FY-Q1-Q2-Q3"
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


def build_company_financials(ticker: str, name: str, cik: str) -> dict[str, Any]:
    facts = fetch_json(SEC_COMPANY_FACTS_URL.format(cik=cik))
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
        prior_revenue = revenue.get(prior_year_period, {}).get("value")
        prior_op_margin = None
        if prior_year_period:
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

    return {
        "ticker": ticker,
        "name": name,
        "cik": cik,
        "source": "SEC EDGAR companyfacts",
        "basis": "SEC GAAP/XBRL proxy; Non-GAAP margins are not consistently available from free SEC data.",
        "quarters": rows[:4],
    }


def main() -> None:
    rs_payload = read_js_payload(RS_DATA_PATH, "marketRsData")
    target_rows = [
        row
        for row in rs_payload.get("rows", [])
        if any((row.get("memberships") or {}).get(key) for key in TARGET_MEMBERSHIPS)
    ]
    ticker_map = load_sec_ticker_map()
    financials: dict[str, Any] = {}
    missing: list[str] = []
    errors: dict[str, str] = {}

    for index, row in enumerate(sorted(target_rows, key=lambda item: str(item.get("ticker")))):
        ticker = str(row.get("ticker") or "").upper()
        mapping = next((ticker_map.get(candidate) for candidate in sec_ticker_candidates(ticker) if ticker_map.get(candidate)), None)
        if not mapping:
            missing.append(ticker)
            continue
        try:
            financials[ticker] = build_company_financials(ticker, str(row.get("name") or mapping["title"]), mapping["cik"])
        except Exception as error:  # pragma: no cover - source variability
            errors[ticker] = str(error)
        time.sleep(0.12)
        if (index + 1) % 20 == 0:
            print(f"Processed {index + 1}/{len(target_rows)}")

    sp500_count = sum(1 for row in target_rows if (row.get("memberships") or {}).get("sp500"))
    nasdaq100_count = sum(1 for row in target_rows if (row.get("memberships") or {}).get("nasdaq100"))

    payload = {
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "scope": {
            "universe": "S&P 500 + NASDAQ 100",
            "universes": list(TARGET_MEMBERSHIPS),
            "counts": {"sp500": sp500_count, "nasdaq100": nasdaq100_count, "total": len(target_rows)},
            "tickers": sorted(row.get("ticker") for row in target_rows),
            "source": "SEC EDGAR companyfacts",
            "basis": "SEC GAAP/XBRL proxy. Free SEC data does not provide standardized Non-GAAP GPM/OPM across issuers.",
        },
        "metrics": [
            {"key": "revenue", "label": "Revenue", "unit": "usd", "note": "YoY is shown against the same quarter a year ago."},
            {"key": "grossMarginPct", "label": "GPM", "unit": "percent", "note": "GAAP gross profit / revenue proxy."},
            {"key": "operatingMarginPct", "label": "OPM", "unit": "percent", "note": "GAAP operating income / revenue proxy. YoY pp change is shown."},
            {"key": "epsDiluted", "label": "EPS", "unit": "usdPerShare", "note": "GAAP diluted EPS when disclosed as a quarterly XBRL fact."},
            {"key": "ocf", "label": "OCF", "unit": "usd"},
            {"key": "fcf", "label": "FCF", "unit": "usd", "note": "OCF minus absolute capex cash outflow."},
        ],
        "financials": financials,
        "missing": missing,
        "errors": errors,
    }
    write_js_payload(OUTPUT_PATH, "marketRsFinancialsData", payload)
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Companies: {len(financials)} / {len(target_rows)}")
    if missing:
        print(f"Missing CIK: {', '.join(missing)}")
    if errors:
        print(f"Errors: {len(errors)}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
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

REVENUE_TAGS = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
    "SalesRevenueGoodsNet",
]
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


def normalize_period(frame: str | None, end: str | None) -> str | None:
    if frame:
        match = re.match(r"CY(\d{4})Q([1-4])$", frame)
        if match:
            return f"{match.group(1)}Q{match.group(2)}"
    if end and re.match(r"\d{4}-\d{2}-\d{2}", end):
        month = int(end[5:7])
        quarter = ((month - 1) // 3) + 1
        return f"{end[:4]}Q{quarter}"
    return None


def period_from_fiscal_period(fy: int | None, fp: str | None, end: str | None) -> str | None:
    if not isinstance(fy, int) or fp not in {"Q1", "Q2", "Q3"} or not end:
        return None
    match = re.match(r"(\d{4})-\d{2}-\d{2}", end)
    if not match:
        return None
    return f"{match.group(1)}Q{str(fp)[1]}"


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
            if frame and re.match(r"CY\d{4}Q[1-4]$", frame):
                periods.append(frame[2:])
            elif frame and re.match(r"CY\d{4}$", frame):
                periods.append(f"{frame[2:]}Q4")
            elif isinstance(row.get("fy"), int) and row.get("fp") in {"Q1", "Q2", "Q3"}:
                periods.append(f"{row['fy']}Q{str(row['fp'])[1]}")
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
        period = normalize_period(frame, end)
        item = {
            "value": float(value),
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
            annuals[frame[2:6]] = item
            continue

        if not frame and (end, row.get("filed")) in framed_fact_keys:
            continue

        if isinstance(fy, int) and fp in {"Q1", "Q2", "Q3"}:
            quarter = int(str(fp)[1])
            fiscal_period = period_from_fiscal_period(fy, fp, end) or period
            if quarter == 1:
                existing = quarters.get(fiscal_period or "")
                if not existing or str(item.get("filed") or "") >= str(existing.get("filed") or ""):
                    quarters[fiscal_period or ""] = item
                ytd[(str(fy), quarter)] = {**item, "period": fiscal_period}
            elif is_ytd_fact(row.get("start"), end, quarter):
                ytd[(str(fy), quarter)] = {**item, "period": fiscal_period}
            elif fiscal_period:
                existing = quarters.get(fiscal_period)
                if not existing or str(item.get("filed") or "") >= str(existing.get("filed") or ""):
                    quarters[fiscal_period] = item

    if allow_annual_derive:
        for year, annual in annuals.items():
            q4_key = f"{year}Q4"
            if q4_key in quarters:
                continue
            q_values = [quarters.get(f"{year}Q{quarter}") for quarter in (1, 2, 3)]
            if all(item and item.get("value") is not None for item in q_values):
                derived = dict(annual)
                derived["value"] = float(annual["value"]) - sum(float(item["value"]) for item in q_values if item)
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
                derived["derived"] = f"YTD-Q{quarter - 1}"
                quarters[period] = derived

    return {key: value for key, value in quarters.items() if key}


def divide(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator in {None, 0}:
        return None
    return float(numerator) / float(denominator)


def pct_change(current: float | None, previous: float | None) -> float | None:
    ratio = divide(current, previous)
    if ratio is None:
        return None
    return (ratio - 1) * 100


def build_company_financials(ticker: str, name: str, cik: str) -> dict[str, Any]:
    facts = fetch_json(SEC_COMPANY_FACTS_URL.format(cik=cik))
    revenue = extract_tag_series(facts, REVENUE_TAGS)
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
        prior_year_period = f"{int(period[:4]) - 1}{period[4:]}" if re.match(r"\d{4}Q[1-4]", period) else ""
        prior_revenue = revenue.get(prior_year_period, {}).get("value")
        prior_op_margin = None
        if prior_year_period:
            prior_op_margin = divide(operating_income.get(prior_year_period, {}).get("value"), revenue.get(prior_year_period, {}).get("value"))
        op_margin = divide(op_income_value, revenue_value)
        fcf_value = None
        if ocf_value is not None and capex_value is not None:
            fcf_value = float(ocf_value) - abs(float(capex_value))

        rows.append(
            {
                "period": period,
                "periodEnd": revenue.get(period, {}).get("end")
                or operating_income.get(period, {}).get("end")
                or ocf.get(period, {}).get("end"),
                "filed": revenue.get(period, {}).get("filed")
                or operating_income.get(period, {}).get("filed")
                or ocf.get(period, {}).get("filed"),
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
    nasdaq_rows = [
        row
        for row in rs_payload.get("rows", [])
        if (row.get("memberships") or {}).get("nasdaq100")
    ]
    ticker_map = load_sec_ticker_map()
    financials: dict[str, Any] = {}
    missing: list[str] = []
    errors: dict[str, str] = {}

    for index, row in enumerate(sorted(nasdaq_rows, key=lambda item: str(item.get("ticker")))):
        ticker = str(row.get("ticker") or "").upper()
        mapping = ticker_map.get(ticker)
        if not mapping:
            missing.append(ticker)
            continue
        try:
            financials[ticker] = build_company_financials(ticker, str(row.get("name") or mapping["title"]), mapping["cik"])
        except Exception as error:  # pragma: no cover - source variability
            errors[ticker] = str(error)
        time.sleep(0.12)
        if (index + 1) % 20 == 0:
            print(f"Processed {index + 1}/{len(nasdaq_rows)}")

    payload = {
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "scope": {
            "universe": "NASDAQ 100",
            "tickers": sorted(row.get("ticker") for row in nasdaq_rows),
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
    print(f"Companies: {len(financials)} / {len(nasdaq_rows)}")
    if missing:
        print(f"Missing CIK: {', '.join(missing)}")
    if errors:
        print(f"Errors: {len(errors)}")


if __name__ == "__main__":
    main()

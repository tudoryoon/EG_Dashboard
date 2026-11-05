from __future__ import annotations

import csv
import json
import math
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen


DRAM_SHEET_ID = "1BsfqsQ3fXN1JGXJlR8mbs2r-lXWt0S3Dcl5OVw1kPXs"
NAND_SHEET_ID = "1fPRlsHibMUg8ZwRXWkeQ3hAZHoGMK2O4J98KfliMT4s"
START_DATE = date(2022, 1, 1)

TARGET_MAP = {
    "ddr5_16gb": "DDR5 16Gb (2Gx8)",
    "ddr4_16gb": "DDR4 16Gb (2Gx8)",
    "ddr4_8gb": "DDR4 8Gb (1Gx8)",
    "gddr6_8gb": "GDDR6 8Gb",
    "ddr5_rdimm_32gb": "DDR5 RDIMM",
    "wafer_512gb_tlc": "TLC 512Gb",
    "wafer_256gb_tlc": "TLC 256Gb",
}
MODULE_KEY = "ddr5_rdimm_32gb"
MODULE_PRODUCT = "DDR5 RDIMM 32GB 4800/5600"


def module_price(raw: str | None, digits: int = 3) -> float | None:
    try:
        value = float(raw or "")
    except ValueError:
        return None
    return round(value, digits) if math.isfinite(value) else None


def csv_url(sheet_id: str) -> str:
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet=Historical"


def fetch_rows(url: str) -> list[dict[str, str]]:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request) as response:  # nosec B310 - fixed public Google Sheets URLs
        payload = response.read().decode("utf-8-sig")
    return list(csv.DictReader(payload.splitlines()))


def build_labels(start_date: date, end_date: date) -> list[str]:
    labels: list[str] = []
    cursor = start_date
    while cursor <= end_date:
        labels.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return labels


def build_payload(rows: list[dict[str, str]], today: date) -> dict:
    labels = build_labels(START_DATE, today)
    label_index = {label: index for index, label in enumerate(labels)}
    items = {
        key: {
            "history": [None] * len(labels),
            "latestValue": None,
            "latestChangePct": None,
            "latestDate": None,
        }
        for key in TARGET_MAP
    }

    items[MODULE_KEY].update(
        highHistory=[None] * len(labels),
        lowHistory=[None] * len(labels),
        latestHigh=None,
        latestLow=None,
        dateBasis="sheet_collection_date",
    )
    observed_dates: list[str] = []
    latest_observed = ""

    for row in rows:
        canonical_product = (row.get("Canonical_Product") or "").strip()
        matched_key = next((key for key, name in TARGET_MAP.items() if name == canonical_product), None)
        row_date = (row.get("Date") or "").strip()
        if not matched_key or row_date not in label_index:
            continue
        if matched_key == MODULE_KEY and (row.get("Product") or "").strip() != MODULE_PRODUCT:
            continue

        price_average = row.get("Price_Average") or ""
        change_pct = row.get("Change_Pct") or ""
        if matched_key == MODULE_KEY:
            value = module_price(price_average)
            high = module_price(row.get("Price_High"))
            low = module_price(row.get("Price_Low"))
            if value is None or value <= 0:
                continue
            if (high is not None and high < value) or (low is not None and (low <= 0 or low > value)):
                continue
            change = module_price(change_pct, 2)
        else:
            value = round(float(price_average), 3) if price_average else None
            change = round(float(change_pct), 2) if change_pct else None

        target = items[matched_key]
        target["history"][label_index[row_date]] = value
        if matched_key == MODULE_KEY:
            target["highHistory"][label_index[row_date]] = high
            target["lowHistory"][label_index[row_date]] = low
        observed_dates.append(row_date)

        if not target["latestDate"] or row_date > target["latestDate"]:
            target["latestDate"] = row_date
            target["latestValue"] = value
            target["latestChangePct"] = change
            if matched_key == MODULE_KEY:
                target["latestHigh"] = high
                target["latestLow"] = low

        if row_date > latest_observed:
            latest_observed = row_date

    first_observed = min(observed_dates, default=None)

    return {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "updatedAt": latest_observed,
        "periodStart": labels[0],
        "periodEnd": labels[-1],
        "firstObservedDate": first_observed,
        "labels": labels,
        "items": items,
    }


def main() -> None:
    rows = fetch_rows(csv_url(DRAM_SHEET_ID)) + fetch_rows(csv_url(NAND_SHEET_ID))
    payload = build_payload(rows, datetime.now(timezone.utc).date())
    output_path = Path(__file__).resolve().parents[1] / "data" / "memory-data-history.js"
    output_path.write_text(
        "window.memoryDataHistoryData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

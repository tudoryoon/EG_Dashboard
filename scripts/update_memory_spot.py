from __future__ import annotations

import csv
import json
import math
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup


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
DRAMEXCHANGE_URL = "https://www.dramexchange.com/"
DIRECT_PRODUCTS = {
    "ddr5_16gb": "DDR5 16Gb (2Gx8) 4800/5600",
    "ddr4_16gb": "DDR4 16Gb (2Gx8) 3200",
    "ddr4_8gb": "DDR4 8Gb (1Gx8) 3200",
}
SOURCE_TZ = timezone(timedelta(hours=8))
KST = timezone(timedelta(hours=9))
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "memory-data-history.js"


def module_price(raw: str | None, digits: int = 3) -> float | None:
    try:
        value = float(raw or "")
    except ValueError:
        return None
    return round(value, digits) if math.isfinite(value) else None


def csv_url(sheet_id: str) -> str:
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet=Historical"


def fetch_rows(url: str) -> list[dict[str, str]]:
    return list(csv.DictReader(fetch_text(url).splitlines()))


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=30) as response:  # nosec B310 - fixed public source URLs
        return response.read().decode("utf-8-sig")


def parse_direct_dram(html: str, now: datetime) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.find(id="NationalDramSpotPrice_show_day")
    match = re.search(
        r"([A-Za-z]{3})\.?\s*(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*\(GMT\+8\)",
        heading.get_text(" ", strip=True) if heading else "",
    )
    if not match:
        raise ValueError("DRAM source publication timestamp missing or changed")
    month, day, year, hour, minute = match.groups()
    month_number = ("jan feb mar apr may jun jul aug sep oct nov dec".split()).index(month.lower()) + 1
    published = datetime(int(year), month_number, int(day), int(hour), int(minute), tzinfo=SOURCE_TZ)
    if published > now + timedelta(minutes=5):
        raise ValueError("DRAM source publication timestamp is in the future")

    products = {product: key for key, product in DIRECT_PRODUCTS.items()}
    quotes = {}
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"], recursive=False)
        values = [cell.get_text(" ", strip=True) for cell in cells]
        if not values or values[0] not in products:
            continue
        table = row.find_parent("table")
        headers = []
        for candidate in table.find_all("tr"):
            cells = candidate.find_all(["th", "td"], recursive=False)
            if cells and cells[0].get_text(strip=True) == "Item":
                headers = [re.sub(r"\s+", "", cell.get_text()) for cell in cells]
                break
        expected_headers = ["Item", "DailyHigh", "DailyLow", "SessionHigh", "SessionLow", "SessionAverage", "SessionChange", "History"]
        if headers != expected_headers or len(values) != len(expected_headers):
            raise ValueError("DRAM source price columns changed")
        high, low, average = [module_price(values[index].replace(",", "")) for index in (3, 4, 5)]
        change = module_price(values[6].replace("%", "").replace(",", "").strip(), 2)
        if any(value is None or value <= 0 for value in (high, low, average)) or not low <= average <= high or change is None:
            raise ValueError(f"Invalid DRAM source quote: {values[0]}")
        quotes[products[values[0]]] = {"average": average, "high": high, "low": low, "changePct": change}
    if set(quotes) != set(DIRECT_PRODUCTS):
        raise ValueError("DRAM source did not supply all three exact chip benchmarks")
    return {
        "date": published.date().isoformat(),
        "publishedAt": published.isoformat(),
        "collectedAt": now.astimezone(timezone.utc).isoformat(timespec="seconds"),
        "items": quotes,
    }


def merge_direct_dram(payload: dict, previous: dict, quote: dict | None, today: date) -> None:
    snapshots = dict(previous.get("directDramHistory") or {})
    if quote:
        day = quote["date"]
        existing = snapshots.get(day)
        if not existing or quote["publishedAt"] >= existing["publishedAt"]:
            snapshots[day] = quote
    payload["directDramHistory"] = snapshots
    label_index = {label: index for index, label in enumerate(payload["labels"])}
    for day, snapshot in sorted(snapshots.items()):
        if day not in label_index or day > today.isoformat():
            continue
        for key in DIRECT_PRODUCTS:
            price = snapshot.get("items", {}).get(key)
            if not price:
                continue
            item = payload["items"][key]
            index = label_index[day]
            # The sheet supplies the archived daily value once it catches up.
            if item["history"][index] is not None:
                continue
            item["history"][index] = price["average"]
            if not item["latestDate"] or day >= item["latestDate"]:
                item.update(
                    latestDate=day, latestValue=price["average"], latestChangePct=price["changePct"],
                    latestSource={"name": "DRAMeXchange", "url": DRAMEXCHANGE_URL,
                                  "publishedAt": snapshot["publishedAt"], "collectedAt": snapshot["collectedAt"]},
                )
            payload["updatedAt"] = max(payload["updatedAt"], day)
            payload["firstObservedDate"] = min(payload["firstObservedDate"] or day, day)


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
    now = datetime.now(timezone.utc)
    today = now.astimezone(KST).date()
    previous = {}
    if OUTPUT_PATH.exists():
        previous = json.loads(OUTPUT_PATH.read_text(encoding="utf-8").split("=", 1)[1].strip().removesuffix(";"))
    rows = fetch_rows(csv_url(DRAM_SHEET_ID)) + fetch_rows(csv_url(NAND_SHEET_ID))
    payload = build_payload(rows, today)
    quote = None
    try:
        quote = parse_direct_dram(fetch_text(DRAMEXCHANGE_URL), now)
        print(f"DRAMeXchange direct quote: {quote['publishedAt']}")
    except Exception as error:
        print(f"::warning::Direct DRAM fetch failed; keeping sheet history and saved direct quotes: {error}", file=sys.stderr)
    merge_direct_dram(payload, previous, quote, today)
    OUTPUT_PATH.write_text(
        "window.memoryDataHistoryData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

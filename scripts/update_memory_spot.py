from __future__ import annotations

import argparse
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


def parse_publication_timestamp(text: str, now: datetime) -> datetime:
    match = re.search(
        r"([A-Za-z]{3})\.?\s*(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*\(GMT\+8\)",
        text,
    )
    if not match:
        raise ValueError("Source publication timestamp missing or changed")
    month, day, year, hour, minute = match.groups()
    month_number = ("jan feb mar apr may jun jul aug sep oct nov dec".split()).index(month.lower()) + 1
    published = datetime(int(year), month_number, int(day), int(hour), int(minute), tzinfo=SOURCE_TZ)
    if published > now + timedelta(minutes=5):
        raise ValueError("Source publication timestamp is in the future")
    return published


def parse_direct_dram(html: str, now: datetime) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.find(id="NationalDramSpotPrice_show_day")
    published = parse_publication_timestamp(heading.get_text(" ", strip=True) if heading else "", now)

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


def parse_direct_module(html: str, now: datetime) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"], recursive=False)
        values = [cell.get_text(" ", strip=True) for cell in cells]
        if not values or values[0] != MODULE_PRODUCT:
            continue
        table = row.find_parent("table")
        section = table.find_parent("div", class_="left_tab")
        heading = section.select_one(".tab_time") if section else None
        published = parse_publication_timestamp(heading.get_text(" ", strip=True) if heading else "", now)
        header = next((candidate for candidate in table.find_all("tr")
                       if candidate.find(["td", "th"]) and candidate.find(["td", "th"]).get_text(strip=True) == "Item"), None)
        headers = [re.sub(r"\s+", "", cell.get_text()) for cell in header.find_all(["td", "th"], recursive=False)] if header else []
        expected = ["Item", "WeeklyHigh", "WeeklyLow", "SessionHigh", "SessionLow", "SessionAverage", "AverageChange", "History"]
        if headers != expected or len(values) != len(expected):
            raise ValueError("RDIMM source price columns changed")
        high, low, average = [module_price(values[index].replace(",", "")) for index in (3, 4, 5)]
        change = module_price(values[6].replace("%", "").replace(",", "").strip(), 2)
        if any(value is None or value <= 0 for value in (high, low, average)) or not low <= average <= high or change is None:
            raise ValueError("Invalid RDIMM source quote")
        return {
            "date": published.date().isoformat(),
            "observedDate": now.astimezone(KST).date().isoformat(),
            "publishedAt": published.isoformat(),
            "collectedAt": now.astimezone(timezone.utc).isoformat(timespec="seconds"),
            "items": {MODULE_KEY: {"average": average, "high": high, "low": low, "changePct": change}},
        }
    raise ValueError("RDIMM source did not supply the exact 32GB 4800/5600 benchmark")


def merge_direct_module(payload: dict, previous: dict, quote: dict | None, today: date) -> None:
    day = today.isoformat()
    snapshot = previous.get("directModuleCurrent")
    if snapshot and snapshot.get("observedDate") != day:
        snapshot = None
    if quote and quote["observedDate"] == day and (not snapshot or quote["publishedAt"] >= snapshot["publishedAt"]):
        snapshot = quote
    payload["directModuleCurrent"] = snapshot
    if not snapshot:
        return
    # Weekly prices are recorded on their collection date, not relabeled as a new daily publication.
    index = payload["labels"].index(day)
    item = payload["items"][MODULE_KEY]
    price = snapshot["items"][MODULE_KEY]
    for field, value in (("history", price["average"]), ("highHistory", price["high"]), ("lowHistory", price["low"])):
        item[field][index] = value
    item.update(
        latestDate=day, latestValue=price["average"], latestHigh=price["high"], latestLow=price["low"],
        latestChangePct=price["changePct"], dateBasis="collection_date",
        latestSource={"name": "DRAMeXchange", "url": DRAMEXCHANGE_URL,
                      "publishedAt": snapshot["publishedAt"], "collectedAt": snapshot["collectedAt"]},
    )
    payload["updatedAt"] = max(payload["updatedAt"], day)
    payload["firstObservedDate"] = min(payload["firstObservedDate"] or day, day)


def merge_direct_dram(payload: dict, previous: dict, quote: dict | None, today: date) -> None:
    day = today.isoformat()
    snapshot = previous.get("directDramCurrent") or previous.get("directDramHistory", {}).get(day)
    if snapshot and snapshot.get("date") != day:
        snapshot = None
    if quote and quote["date"] == day and (not snapshot or quote["publishedAt"] >= snapshot["publishedAt"]):
        snapshot = quote
    payload["directDramCurrent"] = snapshot
    if not snapshot:
        return
    index = payload["labels"].index(day)
    for key in DIRECT_PRODUCTS:
        price = snapshot["items"][key]
        item = payload["items"][key]
        item["history"][index] = price["average"]
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", choices=("all", "dram", "other"), default="all")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    today = now.astimezone(KST).date()
    previous = {}
    if OUTPUT_PATH.exists():
        previous = json.loads(OUTPUT_PATH.read_text(encoding="utf-8").split("=", 1)[1].strip().removesuffix(";"))
    rows = fetch_rows(csv_url(DRAM_SHEET_ID))
    if args.scope != "dram":
        rows += fetch_rows(csv_url(NAND_SHEET_ID))
    payload = build_scoped_payload(rows, today, previous, args.scope)
    if args.scope != "other":
        html = ""
        try:
            html = fetch_text(DRAMEXCHANGE_URL)
        except Exception as error:
            print(f"::warning::Direct source fetch failed; keeping history and today's saved quotes: {error}", file=sys.stderr)
        for label, parser_fn, merge_fn in (("DRAM", parse_direct_dram, merge_direct_dram),
                                           ("RDIMM", parse_direct_module, merge_direct_module)):
            quote = None
            if html:
                try:
                    quote = parser_fn(html, now)
                    print(f"DRAMeXchange {label} quote: {quote['publishedAt']}")
                except Exception as error:
                    print(f"::warning::Direct {label} parse failed; keeping history and today's saved quote: {error}", file=sys.stderr)
            merge_fn(payload, previous, quote, today)
    else:
        current = previous.get("directDramCurrent")
        payload["directDramCurrent"] = current if current and current.get("date") == today.isoformat() else None
        current_module = previous.get("directModuleCurrent")
        payload["directModuleCurrent"] = current_module if current_module and current_module.get("observedDate") == today.isoformat() else None
    OUTPUT_PATH.write_text(
        "window.memoryDataHistoryData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def build_scoped_payload(rows: list[dict[str, str]], today: date, previous: dict, scope: str) -> dict:
    selected = set(TARGET_MAP)
    if scope == "dram":
        selected = set(DIRECT_PRODUCTS) | {MODULE_KEY}
    elif scope == "other":
        selected -= set(DIRECT_PRODUCTS) | {MODULE_KEY}
    selected_names = {TARGET_MAP[key] for key in selected}
    direct_names = {TARGET_MAP[key] for key in [*DIRECT_PRODUCTS, MODULE_KEY]}
    # History comes from the existing source; today's chip/module observations are direct only.
    filtered = [row for row in rows if row.get("Canonical_Product") in selected_names
                and not (row.get("Date") == today.isoformat()
                         and row.get("Canonical_Product") in direct_names)]
    payload = build_payload(filtered, today)
    for key in set(TARGET_MAP) - selected:
        old = previous.get("items", {}).get(key)
        if not old:
            continue
        item = dict(old)
        for field in ("history", "highHistory", "lowHistory"):
            if field in old:
                by_date = dict(zip(previous["labels"], old[field]))
                item[field] = [by_date.get(day) for day in payload["labels"]]
        payload["items"][key] = item
    payload["updatedAt"] = max((item.get("latestDate") or "" for item in payload["items"].values()), default="")
    observed = [day for item in payload["items"].values()
                for day, value in zip(payload["labels"], item["history"]) if value is not None]
    payload["firstObservedDate"] = min(observed, default=None)
    return payload


if __name__ == "__main__":
    main()

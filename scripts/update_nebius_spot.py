from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_URL = "https://api.nebius.cloud/billing/v1alpha1/spot-price/list-series"
DOCS_URL = "https://docs.nebius.com/signup-billing/spot-prices"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "nebius-spot-data.js"
PREFIX = "window.nebiusSpotData = "
UTC = timezone.utc
GPU_ITEMS = [
    {"key": "b300", "label": "B300", "color": "#c6313c", "platforms": ["gpu-b300-sxm"],
     "regions": ["eu-west2", "uk-south1", "us-north1"]},
    {"key": "b200", "label": "B200", "color": "#ed8a23", "platforms": ["gpu-b200-sxm", "gpu-b200-sxm-a"],
     "regions": ["me-west1", "us-central1"]},
    {"key": "h200", "label": "H200", "color": "#2688ac", "platforms": ["gpu-h200-sxm"],
     "regions": ["eu-north1", "eu-west1", "us-central1"]},
    {"key": "h100", "label": "H100", "color": "#3c9b57", "platforms": ["gpu-h100-sxm"],
     "regions": ["eu-north1"]},
    {"key": "rtx6000", "label": "RTX PRO 6000", "color": "#9762ad", "platforms": ["gpu-rtx6000", "gpu-rtx6000-a"],
     "regions": ["eu-south1", "uk-south2", "us-central1"]},
]


def iso_time(value: datetime) -> str:
    return value.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Nebius timestamp lacks a timezone")
    return parsed.astimezone(UTC)


def fetch_json(params: dict) -> dict:
    request = Request(API_URL + "?" + urlencode(params), headers={"User-Agent": "EG-Dashboard/1.0"})
    with urlopen(request, timeout=60) as response:  # nosec B310 - fixed public API
        return json.load(response)


def fetch_history(now: datetime) -> dict:
    # Start inside the 30-day retention window; the first partial day is excluded below.
    start = (now - timedelta(days=30)).replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    end = now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    params = {"filters.startTime": iso_time(start), "filters.endTime": iso_time(end),
              "aggregation.granularity": "GRANULARITY_HOUR_1",
              "aggregation.method": "METHOD_AVG_PRICE", "pageSize": 100}
    items, snapshots, seen_tokens = [], [], set()
    while True:
        raw = fetch_json(params)
        if not isinstance(raw.get("items"), list) or not raw.get("snapshotTime"):
            raise ValueError("Nebius response schema changed")
        items.extend(raw["items"])
        snapshots.append(parse_time(raw["snapshotTime"]))
        token = raw.get("nextPageToken")
        if not token:
            break
        if token in seen_tokens:
            raise ValueError("Nebius pagination token repeated")
        seen_tokens.add(token)
        params["pageToken"] = token
    return {"items": items, "snapshotTime": iso_time(min(snapshots)),
            "requestedStart": iso_time(start), "requestedEnd": iso_time(end)}


def load_existing() -> dict:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8-sig").strip()
    if not text.startswith(PREFIX):
        raise ValueError("Unexpected Nebius history export")
    return json.loads(text[len(PREFIX):].rstrip(";"))


def daily_region_prices(raw: dict, now: datetime) -> dict:
    cutoff = now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    platform_map = {platform: item for item in GPU_ITEMS for platform in item["platforms"]}
    daily, seen_regions = {}, set()
    for row in raw.get("items", []):
        config = platform_map.get(row.get("computeInstance", {}).get("platform"))
        region = row.get("region")
        if not config or region not in config["regions"]:
            continue
        pair = (config["key"], region)
        if pair in seen_regions:
            raise ValueError(f"Multiple SKUs for a fixed Nebius market: {pair}")
        seen_regions.add(pair)
        if row.get("currency", "").lower() != "usd" or row.get("unitTitle", "").lower() != "gpu hour":
            raise ValueError("Nebius prices must be USD per GPU hour, not per instance")
        hourly = defaultdict(dict)
        for point in row.get("points", []):
            end = parse_time(point["timestamp"])
            if end.minute or end.second or end.microsecond:
                raise ValueError("Expected hourly Nebius interval boundaries")
            if end > cutoff:
                continue
            value = float(point["value"])
            if not math.isfinite(value) or value < 0:
                raise ValueError("Invalid Nebius hourly price")
            # API timestamps mark interval ENDS: 00:00 is the previous day's final hour.
            start = end - timedelta(hours=1)
            day = start.date().isoformat()
            previous = hourly[day].get(start.hour)
            if previous is not None and previous != value:
                raise ValueError("Conflicting prices for one Nebius hour")
            hourly[day][start.hour] = value
        daily[pair] = {day: mean(hours.values()) for day, hours in hourly.items() if len(hours) == 24}
    return daily


def build_payload(raw: dict, existing: dict, now: datetime) -> dict:
    if existing and existing.get("methodVersion") != 1:
        raise ValueError("Nebius history method changed; explicit migration required")
    daily = daily_region_prices(raw, now)
    if not any(daily.values()):
        raise ValueError("No complete UTC days received; preserving stored Nebius history")
    cutoff = now.astimezone(UTC).date().isoformat()
    regional = {}
    for config in GPU_ITEMS:
        key = config["key"]
        previous = existing.get("series", {}).get(key, {})
        if previous and previous.get("regions") != config["regions"]:
            raise ValueError("Fixed Nebius region basket changed; explicit migration required")
        regional[key] = {}
        for region in config["regions"]:
            stored = dict(zip(existing.get("labels", []), previous.get("regionValues", {}).get(region, [])))
            values = {day: value for day, value in stored.items()
                      if day < cutoff and isinstance(value, (int, float)) and math.isfinite(value) and value >= 0}
            values.update({day: round(value, 8) for day, value in daily.get((key, region), {}).items()})
            regional[key][region] = values
    dates = sorted({day for regions in regional.values() for values in regions.values() for day in values})
    if not dates:
        raise ValueError("No complete UTC days received; preserving stored Nebius history")
    labels = []
    cursor, end = datetime.fromisoformat(dates[0]).date(), datetime.fromisoformat(dates[-1]).date()
    while cursor <= end:
        labels.append(cursor.isoformat())
        cursor += timedelta(days=1)
    series = {}
    for config in GPU_ITEMS:
        regions = regional[config["key"]]
        values = [round(mean(regions[region][day] for region in config["regions"]), 8)
                  if all(day in regions[region] for region in config["regions"]) else None for day in labels]
        valid = [(day, value) for day, value in zip(labels, values) if value is not None]
        series[config["key"]] = {**config, "values": values,
            "regionValues": {region: [regions[region].get(day) for day in labels] for region in config["regions"]},
            "latestDate": valid[-1][0] if valid else "", "latestValue": valid[-1][1] if valid else None}
    latest = max((item["latestDate"] for item in series.values()), default="")
    if not latest:
        raise ValueError("No complete fixed-region GPU averages")
    return {"methodVersion": 1, "updatedAt": latest, "generatedAt": iso_time(now),
        "sourceSnapshotAt": raw.get("snapshotTime", ""), "labels": labels, "series": series,
        "source": {"name": "Nebius official public SpotPriceService", "url": "https://nebius.com/spot-prices",
                   "apiUrl": API_URL, "docsUrl": DOCS_URL, "unit": "USD / GPU-hour", "timezone": "UTC"},
        "methodology": {"hoursPerDay": 24, "aggregation": "METHOD_AVG_PRICE",
            "note": "각 지역의 공식 시간별 평균 24개를 UTC 일평균으로 만든 뒤, 고정 지역 구성으로 단순평균합니다. 시간·거래량·가동 GPU 수 가중평균이 아니며, 중단 가능한 Spot/PVM 가격으로 온디맨드·예약 계약가격과 다릅니다.",
            "coverage": "공식 API는 최근 30일만 제공합니다. 최초 확보한 완전한 일자부터 매일 누적 보관하며, 24시간 또는 고정 지역 중 하나라도 빠진 일자의 종합값은 비워둡니다. 당일 진행 중 수치는 제외합니다."}}


def main() -> None:
    now = datetime.now(UTC)
    raw = fetch_history(now)
    payload = build_payload(raw, load_existing(), now)
    temporary = OUTPUT_PATH.with_suffix(".js.tmp")
    temporary.write_text(PREFIX + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8", newline="\n")
    temporary.replace(OUTPUT_PATH)
    print(f"Nebius daily spot: {payload['labels'][0]} to {payload['updatedAt']} UTC")
    for item in payload["series"].values():
        print(f"{item['label']}: {item['latestValue']} ({item['latestDate']}, {len(item['regions'])} regions)")


if __name__ == "__main__":
    main()

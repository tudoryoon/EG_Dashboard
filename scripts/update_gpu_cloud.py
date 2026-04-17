from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen


START_DATE = date(2024, 7, 11)
PRICING_URL = "https://www.runpod.io/gpu-pricing"

ITEMS = {
    "a100_pcie_80gb": {
        "label": "A100 PCIe 80GB",
        "events": [
            {"date": "2024-07-11", "value": 1.89, "note": "Pre-cut price referenced in July 12, 2024 Runpod blog"},
            {"date": "2024-07-12", "value": 1.69, "note": "July 12, 2024 Runpod secure cloud price cut"},
            {"date": "2025-01-05", "value": 1.64, "note": "January 5, 2025 Wayback snapshot of Runpod pricing"},
            {"date": "2026-04-17", "value": 1.19, "note": "Current Runpod GPU pricing page"},
        ],
    },
    "h100_pcie_80gb": {
        "label": "H100 PCIe 80GB",
        "events": [
            {"date": "2024-07-11", "value": 3.69, "note": "Pre-cut price referenced in July 12, 2024 Runpod blog"},
            {"date": "2024-07-12", "value": 3.29, "note": "July 12, 2024 Runpod secure cloud price cut"},
            {"date": "2025-01-05", "value": 2.69, "note": "January 5, 2025 Wayback snapshot of Runpod pricing"},
            {"date": "2025-04-17", "value": 2.39, "note": "April 17, 2025 Wayback snapshot of Runpod pricing"},
            {"date": "2026-04-17", "value": 1.99, "note": "Current Runpod GPU pricing page"},
        ],
    },
    "h200_sxm_141gb": {
        "label": "H200 SXM 141GB",
        "events": [
            {"date": "2025-01-02", "value": 3.99, "note": "Runpod H200 launch blog"},
            {"date": "2026-04-17", "value": 3.59, "note": "Current Runpod GPU pricing page"},
        ],
    },
}

CURRENT_PRICE_MAP = {
    "a100_pcie_80gb": "A100 PCIe",
    "h100_pcie_80gb": "H100 PCIe",
    "h200_sxm_141gb": "H200",
}


def build_labels(start_date: date, end_date: date) -> list[str]:
    labels: list[str] = []
    cursor = start_date
    while cursor <= end_date:
        labels.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return labels


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request) as response:  # nosec B310 - fixed public URL
        return response.read().decode("utf-8", errors="ignore")


def extract_current_prices() -> dict[str, float]:
    text = re.sub(r"\s+", " ", fetch_text(PRICING_URL))
    results: dict[str, float] = {}

    for item_key, marker in CURRENT_PRICE_MAP.items():
        match = re.search(rf"{re.escape(marker)}.*?\$\s*([0-9]+(?:\.[0-9]+)?)\s*/hr", text)
        if match:
            results[item_key] = round(float(match.group(1)), 2)

    return results


def pct_change(previous: float | None, current: float | None) -> float | None:
    if previous is None or current is None or previous == 0:
        return None
    return round((current / previous - 1) * 100, 2)


def main() -> None:
    today = datetime.now(timezone.utc).date()
    labels = build_labels(START_DATE, today)
    label_index = {label: index for index, label in enumerate(labels)}
    current_prices = extract_current_prices()

    items: dict[str, dict[str, object]] = {}
    latest_observed = ""
    first_observed = None

    for item_key, meta in ITEMS.items():
        events = [dict(event) for event in meta["events"]]
        today_key = today.isoformat()
        current_value = current_prices.get(item_key)
        if current_value is not None:
            if events and events[-1]["date"] == today_key:
                events[-1]["value"] = current_value
            elif not events or events[-1]["date"] < today_key:
                events.append({"date": today_key, "value": current_value, "note": "Current Runpod GPU pricing page"})

        history = [None] * len(labels)
        sorted_events = sorted(events, key=lambda event: event["date"])

        for index, event in enumerate(sorted_events):
            event_date = event["date"]
            event_value = round(float(event["value"]), 2)
            if event_date not in label_index:
                continue
            start_idx = label_index[event_date]
            end_date = today_key if index == len(sorted_events) - 1 else sorted_events[index + 1]["date"]
            end_idx = label_index.get(end_date, len(labels) - 1)
            stop_idx = len(labels) if index == len(sorted_events) - 1 else end_idx
            for cursor in range(start_idx, stop_idx):
                history[cursor] = event_value

        latest_value = next((value for value in reversed(history) if value is not None), None)
        latest_date = next((labels[idx] for idx in range(len(history) - 1, -1, -1) if history[idx] is not None), None)
        latest_change = None
        if len(sorted_events) >= 2:
            latest_change = pct_change(float(sorted_events[-2]["value"]), float(sorted_events[-1]["value"]))

        if latest_date:
            latest_observed = max(latest_observed, latest_date)
        if sorted_events:
            first_observed = sorted_events[0]["date"] if first_observed is None else min(first_observed, sorted_events[0]["date"])

        items[item_key] = {
            "history": history,
            "latestValue": latest_value,
            "latestChangePct": latest_change,
            "latestDate": latest_date,
            "events": sorted_events,
        }

    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "updatedAt": latest_observed,
        "periodStart": labels[0],
        "periodEnd": labels[-1],
        "firstObservedDate": first_observed,
        "labels": labels,
        "items": items,
        "benchmark": {
            "name": "Runpod public on-demand pricing",
            "url": PRICING_URL,
            "notes": "Series is modeled as daily step data between publicly observed pricing events.",
        },
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "gpu-cloud-history.js"
    output_path.write_text(
        "window.gpuCloudHistoryData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

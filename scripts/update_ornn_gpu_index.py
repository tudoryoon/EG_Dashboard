from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


API_BASE = "https://ornn-backend-api-135941626504.us-central1.run.app/api/gpu"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "ornn-gpu-index-data.js"

GPU_ITEMS = [
    {"key": "h100_sxm", "label": "H100", "apiName": "H100 SXM", "color": "#111827"},
    {"key": "h200", "label": "H200", "apiName": "H200", "color": "#2563eb"},
    {"key": "b200", "label": "B200", "apiName": "B200", "color": "#16a34a"},
    {"key": "a100_sxm4", "label": "A100", "apiName": "A100 SXM4", "color": "#7c3aed"},
    {"key": "rtx_5090", "label": "RTX 5090", "apiName": "RTX 5090", "color": "#f97316"},
]


def fetch_json(url: str) -> dict[str, object]:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=45) as response:  # nosec B310 - fixed public API URL
        return json.loads(response.read().decode("utf-8"))


def normalize_date(timestamp: str) -> str:
    return timestamp[:10]


def pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return round((current / previous - 1) * 100, 2)


def build_series(item: dict[str, str]) -> dict[str, object]:
    api_name = item["apiName"]
    url = f"{API_BASE}/{quote(api_name)}/index-history"
    payload = fetch_json(url)
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        rows = []

    clean_rows = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        timestamp = row.get("timestamp")
        value = row.get("index_value")
        if not timestamp or value is None:
            continue
        clean_rows.append({"date": normalize_date(str(timestamp)), "value": round(float(value), 4)})

    clean_rows.sort(key=lambda row: row["date"])
    dates = [row["date"] for row in clean_rows]
    values = [row["value"] for row in clean_rows]
    latest_value = values[-1] if values else None
    previous_value = values[-2] if len(values) > 1 else None

    return {
        "key": item["key"],
        "label": item["label"],
        "apiName": item["apiName"],
        "color": item["color"],
        "dates": dates,
        "values": values,
        "latestValue": latest_value,
        "previousValue": previous_value,
        "latestChangePct": pct_change(latest_value, previous_value),
        "latestDate": dates[-1] if dates else "",
    }


def main() -> None:
    series = {item["key"]: build_series(item) for item in GPU_ITEMS}
    all_dates = sorted({date for item in series.values() for date in item["dates"]})
    latest_date = all_dates[-1] if all_dates else ""

    payload = {
        "updatedAt": latest_date,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "Ornn Compute Price Index",
            "dashboardUrl": "https://dashboard.ornnai.com/",
            "apiBase": API_BASE,
            "unit": "USD per GPU-hour",
        },
        "defaultGpu": "h100_sxm",
        "defaultRange": "3m",
        "ranges": [
            {"key": "1w", "label": "1W", "days": 7},
            {"key": "1m", "label": "1M", "days": 30},
            {"key": "3m", "label": "3M", "days": 90},
        ],
        "series": series,
    }

    OUTPUT_PATH.write_text(
        "window.ornnGpuIndexData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Updated through {latest_date}")


if __name__ == "__main__":
    main()

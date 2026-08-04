from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


CURRENT_URL = "https://easyconomics.com/api/gpu-prices"
HISTORY_URL = "https://easyconomics.com/api/gpu-prices/history"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "easyconomics-gpu-index-data.js"


def fetch_json(url: str) -> dict[str, object]:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (EG Dashboard data updater)"})
    with urlopen(request, timeout=45) as response:  # nosec B310 - fixed public API URL
        return json.loads(response.read().decode("utf-8"))


def number(value: object) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def clean_points(rows: object) -> list[dict[str, object]]:
    if not isinstance(rows, list):
        return []
    points: list[dict[str, object]] = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("date"):
            continue
        value = number(row.get("value"))
        if value is None:
            continue
        points.append({"date": str(row["date"])[:10], "value": value})
    return sorted(points, key=lambda point: str(point["date"]))


def main() -> None:
    history_response = fetch_json(HISTORY_URL)
    current_response = fetch_json(CURRENT_URL)
    history = history_response.get("data") if isinstance(history_response, dict) else None
    current = current_response.get("data") if isinstance(current_response, dict) else None
    if not isinstance(history, dict) or not isinstance(current, dict):
        raise RuntimeError("Easyconomics GPU API returned an unexpected payload")

    external = history.get("external_index")
    if not isinstance(external, dict):
        raise RuntimeError("Easyconomics external GPU index history is missing")
    anchor = external.get("anchor")
    if not isinstance(anchor, dict):
        raise RuntimeError("Easyconomics GPU index anchor is missing")

    anchor_date = str(anchor.get("date") or "")[:10]
    anchor_value = number(anchor.get("value"))
    backfill_points = clean_points(external.get("points"))
    daily_points = clean_points(history.get("index"))
    if not anchor_date or anchor_value is None or not backfill_points or not daily_points:
        raise RuntimeError("Easyconomics GPU index history is incomplete")

    internal_anchor = next(
        (number(point["value"]) for point in daily_points if point["date"] == anchor_date),
        number(daily_points[0]["value"]),
    )
    if internal_anchor is None or internal_anchor == 0:
        raise RuntimeError("Easyconomics GPU index internal anchor is invalid")
    scale_factor = anchor_value / internal_anchor

    backfill_map = {
        str(point["date"]): round(float(point["value"]), 4)
        for point in backfill_points
        if str(point["date"]) <= anchor_date
    }
    daily_map = {
        str(point["date"]): round(float(point["value"]) * scale_factor, 4)
        for point in daily_points
        if str(point["date"]) >= anchor_date
    }
    labels = sorted(set(backfill_map) | set(daily_map))
    backfill_values = [backfill_map.get(label) for label in labels]
    daily_values = [daily_map.get(label) for label in labels]

    insights = current.get("insights") if isinstance(current.get("insights"), dict) else {}
    latest_date = str(current.get("as_of") or labels[-1])[:10]
    latest_value = daily_map.get(latest_date)
    if latest_value is None:
        latest_value = next((value for value in reversed(daily_values) if value is not None), None)

    payload = {
        "updatedAt": latest_date,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "Easyconomics GPU Price Index",
            "pageUrl": "https://easyconomics.com/gpu-price-index",
            "apiUrl": HISTORY_URL,
            "backfillName": external.get("source") or "GetDeploying GPU Price Index",
            "backfillUrl": external.get("source_url") or "https://getdeploying.com/gpu-price-index",
        },
        "baseDate": external.get("base_date") or "2025-01-06",
        "baseValue": 100,
        "anchor": {"date": anchor_date, "value": round(anchor_value, 4)},
        "labels": labels,
        "backfillValues": backfill_values,
        "dailyValues": daily_values,
        "latestValue": latest_value,
        "weeklyChangePct": number(insights.get("index_wow_pct")),
        "coverage": {
            "gpuCount": len(current.get("gpus") or []),
            "providerCount": len(current.get("providers") or []),
            "catalogVersion": current.get("catalog_version") or "",
        },
    }
    OUTPUT_PATH.write_text(
        "window.easyconomicsGpuIndexData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Updated through {latest_date}: {latest_value}")


if __name__ == "__main__":
    main()

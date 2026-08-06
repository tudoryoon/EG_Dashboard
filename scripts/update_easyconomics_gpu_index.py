from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen


CURRENT_URL = "https://easyconomics.com/api/gpu-prices"
HISTORY_URL = "https://easyconomics.com/api/gpu-prices/history"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "easyconomics-gpu-index-data.js"

CAPTURE_START_DATE = date(2026, 4, 3)
CAPTURED_RENTAL_VALUES = {
    "neo_cloud_h100": [
        2.60, 2.61, 2.61, 2.63, 2.64, 2.63, 2.64, 2.63, 2.64, 2.64, 2.55, 2.53, 2.47, 2.48,
        2.48, 2.50, 2.47, 2.52, 2.51, 2.50, 2.53, 2.51, 2.50, 2.50, 2.52, 2.53, 2.53, 2.53,
        2.52, 2.56, 2.53, 2.54, 2.58, 2.56, 2.59, 2.55, 2.54, 2.54, 2.57, 2.57, 2.57, 2.57,
        2.63, 2.60, 2.63, 2.64, 2.69, 2.66, 2.60, 2.61, 2.63, 2.62, 2.61, 2.60, 2.61, 2.60,
        2.61, 2.61, 2.60, 2.60, 2.64, 2.64, 2.62, 2.67, 2.76, 2.73, 2.74, 2.78, 2.76, 2.76,
        2.79, 2.79, 2.78, 2.75, 2.75, 2.78, 2.77, 2.76, 2.77, 2.77, 2.74, 2.73, 2.71, 2.72,
        2.71, 2.69, 2.67, 2.63, 2.63, 2.63, 2.63, 2.63, 2.63, 2.65, 2.64, 2.59, 2.66, 2.67,
        2.69, 2.70, 2.71, 2.68, 2.67, 2.70, 2.65, 2.66, 2.67, 2.72, 2.69, 2.70, 2.70, 2.70,
        2.68, 2.69, 2.71, 2.75, 2.76, 2.75, 2.77, 2.78, 2.78, 2.80,
    ],
    "neo_cloud_a100": [
        1.48, 1.48, 1.48, 1.48, 1.48, 1.48, 1.41, 1.41, 1.41, 1.41, 1.43, 1.43, 1.43, 1.43,
        1.43, 1.42, 1.42, 1.44, 1.44, 1.44, 1.43, 1.43, 1.43, 1.43, 1.45, 1.45, 1.45, 1.46,
        1.46, 1.45, 1.45, 1.46, 1.47, 1.46, 1.46, 1.47, 1.47, 1.47, 1.48, 1.48, 1.48, 1.48,
        1.48, 1.49, 1.49, 1.51, 1.51, 1.51, 1.51, 1.51, 1.53, 1.53, 1.55, 1.55, 1.56, 1.56,
        1.55, 1.55, 1.55, 1.60, 1.60, 1.60, 1.61, 1.61, 1.61, 1.61, 1.63, 1.62, 1.62, 1.61,
        1.61, 1.63, 1.63, 1.63, 1.64, 1.64, 1.64, 1.63, 1.63, 1.63, 1.64, 1.62, 1.63, 1.63,
        1.63, 1.63, 1.63, 1.64, 1.64, 1.64, 1.64, 1.64, 1.64, 1.64, 1.64, 1.64, 1.64, 1.64,
        1.64, 1.65, 1.64, 1.65, 1.65, 1.64, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65,
        1.65, 1.65, 1.65, 1.64, 1.65, 1.66, 1.64, 1.64, 1.64, 1.64,
    ],
}


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


def load_existing_payload() -> dict[str, object]:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.easyconomicsGpuIndexData = "
    if not text.startswith(prefix):
        return {}
    try:
        payload = json.loads(text[len(prefix):].rstrip(";"))
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def write_payload(payload: dict[str, object]) -> None:
    OUTPUT_PATH.write_text(
        "window.easyconomicsGpuIndexData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def build_captured_rental_series() -> dict[str, dict[str, object]]:
    metadata = {
        "neo_cloud_h100": {"label": "Neo-Cloud / H100", "gpu": "H100"},
        "neo_cloud_a100": {"label": "Neo-Cloud / A100", "gpu": "A100"},
    }
    output: dict[str, dict[str, object]] = {}
    for key, values in CAPTURED_RENTAL_VALUES.items():
        dates = [(CAPTURE_START_DATE + timedelta(days=index)).isoformat() for index in range(len(values))]
        output[key] = {
            "key": key,
            "label": metadata[key]["label"],
            "gpu": metadata[key]["gpu"],
            "market": "Neo-Cloud",
            "unit": "USD per GPU-hour",
            "dates": dates,
            "values": values,
            "latestDate": dates[-1],
            "latestValue": values[-1],
            "sourceMode": "public_chart_digitization",
            "sourceNote": "Easyconomics 공개 차트 캡처를 축 좌표 기준으로 복원했으며 값은 $0.01 단위로 반올림했습니다.",
        }
    return output


def normalize_descriptor(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def rental_target_key(descriptor: str) -> str | None:
    normalized = normalize_descriptor(descriptor)
    if not ("neo" in normalized and "cloud" in normalized):
        return None
    if "h100" in normalized:
        return "neo_cloud_h100"
    if "a100" in normalized:
        return "neo_cloud_a100"
    return None


def clean_rental_points(rows: object) -> list[dict[str, object]]:
    if not isinstance(rows, list):
        return []
    points: list[dict[str, object]] = []
    value_keys = ("value", "price", "average", "avg", "avg_price", "hourly_price", "median")
    for row in rows:
        if not isinstance(row, dict):
            continue
        raw_date = row.get("date") or row.get("timestamp") or row.get("as_of")
        if not raw_date:
            continue
        value = None
        for key in value_keys:
            candidate = number(row.get(key))
            if candidate is not None:
                value = candidate
                break
        if value is None:
            continue
        points.append({"date": str(raw_date)[:10], "value": round(value, 4)})
    deduped = {str(point["date"]): point for point in points}
    return [deduped[key] for key in sorted(deduped)]


def find_api_rental_series(payload: object) -> dict[str, list[dict[str, object]]]:
    candidates: dict[str, list[list[dict[str, object]]]] = {
        "neo_cloud_h100": [],
        "neo_cloud_a100": [],
    }

    def visit(node: object, path: tuple[str, ...] = (), context: tuple[str, ...] = ()) -> None:
        if isinstance(node, dict):
            local_context = context + tuple(
                str(value)
                for key, value in node.items()
                if key in {"key", "label", "name", "gpu", "gpu_name", "market", "provider", "provider_type", "category"}
                and isinstance(value, str)
            )
            descriptor = " ".join((*path, *local_context))
            target_key = rental_target_key(descriptor)
            dates = node.get("dates")
            values = node.get("values")
            if target_key and isinstance(dates, list) and isinstance(values, list) and len(dates) == len(values):
                rows = [{"date": raw_date, "value": raw_value} for raw_date, raw_value in zip(dates, values)]
                points = clean_rental_points(rows)
                if points:
                    candidates[target_key].append(points)
            for key, value in node.items():
                visit(value, (*path, str(key)), local_context)
            return
        if not isinstance(node, list):
            return

        for target_key in candidates:
            matching_rows = []
            for row in node:
                if not isinstance(row, dict):
                    continue
                row_descriptor = " ".join((*path, *context, *(str(value) for value in row.values() if isinstance(value, str))))
                if rental_target_key(row_descriptor) == target_key:
                    matching_rows.append(row)
            points = clean_rental_points(matching_rows)
            if points:
                candidates[target_key].append(points)
        for value in node:
            visit(value, path, context)

    visit(payload)
    return {
        key: max(series, key=lambda points: (len(points), str(points[-1]["date"])))
        for key, series in candidates.items()
        if series
    }


def merge_rental_series(history: dict[str, object], existing: dict[str, object]) -> dict[str, dict[str, object]]:
    output = build_captured_rental_series()
    existing_series = existing.get("rentalSeries") if isinstance(existing, dict) else None
    if isinstance(existing_series, dict):
        for key, series in existing_series.items():
            if isinstance(series, dict):
                output[key] = series

    api_series = find_api_rental_series(history)
    for key, points in api_series.items():
        prior = output.get(key) or {}
        prior_dates = prior.get("dates") if isinstance(prior, dict) else []
        if isinstance(prior_dates, list) and len(points) < len(prior_dates):
            continue
        dates = [str(point["date"]) for point in points]
        values = [number(point["value"]) for point in points]
        label = "Neo-Cloud / H100" if key == "neo_cloud_h100" else "Neo-Cloud / A100"
        output[key] = {
            "key": key,
            "label": label,
            "gpu": "H100" if key == "neo_cloud_h100" else "A100",
            "market": "Neo-Cloud",
            "unit": "USD per GPU-hour",
            "dates": dates,
            "values": values,
            "latestDate": dates[-1],
            "latestValue": values[-1],
            "sourceMode": "public_api",
            "sourceNote": "Easyconomics 공개 GPU 가격 히스토리 API에서 직접 가져왔습니다.",
        }
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update Easyconomics aggregate and GPU rental series.")
    parser.add_argument(
        "--seed-captures",
        action="store_true",
        help="Seed the two public-chart series without calling the remote API.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    existing_payload = load_existing_payload()
    if args.seed_captures:
        if not existing_payload:
            raise RuntimeError("Existing Easyconomics payload is required before capture seeding")
        existing_payload["rentalSeries"] = build_captured_rental_series()
        write_payload(existing_payload)
        print(f"Seeded captured rental series in {OUTPUT_PATH}")
        return

    try:
        history_response = fetch_json(HISTORY_URL)
        current_response = fetch_json(CURRENT_URL)
    except Exception as exc:
        if isinstance(existing_payload.get("rentalSeries"), dict):
            print(f"Easyconomics API unavailable; preserved existing rental series: {exc}")
            return
        raise
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
        "rentalSeries": merge_rental_series({"history": history, "current": current}, existing_payload),
    }
    write_payload(payload)
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Updated through {latest_date}: {latest_value}")


if __name__ == "__main__":
    main()

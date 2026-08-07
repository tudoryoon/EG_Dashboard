from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "easyconomics-gpu-index-data.js"
OUTPUT_PREFIX = "window.easyconomicsGpuIndexData = "
SOURCE_URL = "https://www.silicondata.com/products/silicon-index"

MODEL_CONFIG = {
    "neo_cloud_h100": {"slug": "h100", "gpu": "H100"},
    "neo_cloud_a100": {"slug": "a100", "gpu": "A100"},
}


def fetch_html(url: str) -> str:
    request = Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "EG-Dashboard-Neo-Cloud-Benchmark/1.0",
        },
    )
    for attempt in range(4):
        try:
            with urlopen(request, timeout=60) as response:  # nosec B310 - fixed public source
                return response.read().decode("utf-8")
        except (OSError, TimeoutError, URLError):
            if attempt == 3:
                raise
            time.sleep(2**attempt)
    raise RuntimeError(f"Unable to fetch {url}")


def load_payload() -> dict[str, object]:
    text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    if not text.startswith(OUTPUT_PREFIX):
        raise RuntimeError(f"Unexpected data prefix in {OUTPUT_PATH}")
    payload = json.loads(text[len(OUTPUT_PREFIX) :].rstrip(";"))
    if not isinstance(payload, dict):
        raise RuntimeError("Neo-Cloud benchmark payload is not an object")
    return payload


def parse_public_snapshot(html: str) -> dict[str, dict[str, object]]:
    snapshot: dict[str, dict[str, object]] = {}
    for key, config in MODEL_CONFIG.items():
        marker = f'href="/products/silicon-index/{config["slug"]}"'
        start = html.find(marker)
        end = html.find("</a>", start)
        if start < 0 or end < 0:
            raise RuntimeError(f"Could not locate the {config['gpu']} benchmark card")
        card = html[start:end]
        price_match = re.search(
            r">Neo-Cloud</span>.*?\$([0-9]+(?:\.[0-9]+)?)",
            card,
            flags=re.DOTALL,
        )
        date_match = re.search(r"As of ([A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4})", card)
        if not price_match or not date_match:
            raise RuntimeError(f"Could not parse the {config['gpu']} Neo-Cloud value")
        source_date = datetime.strptime(date_match.group(1), "%b %d, %Y").date().isoformat()
        snapshot[key] = {
            "date": source_date,
            "value": round(float(price_match.group(1)), 4),
        }
    return snapshot


def merge_point(series: dict[str, object], source_date: str, value: float) -> bool:
    dates = [str(item) for item in series.get("dates", [])]
    values = list(series.get("values", []))
    points = {
        item_date: float(item_value)
        for item_date, item_value in zip(dates, values)
        if item_value is not None
    }
    changed = points.get(source_date) != value
    points[source_date] = value
    ordered_dates = sorted(points)
    series["dates"] = ordered_dates
    series["values"] = [round(points[item_date], 4) for item_date in ordered_dates]
    series["latestDate"] = ordered_dates[-1]
    series["latestValue"] = round(points[ordered_dates[-1]], 4)
    series["sourceMode"] = "public_neo_cloud_benchmark"
    series["sourceNote"] = (
        "2026-04-03~2026-08-02 구간은 기존 공개 차트 복원값이며, 이후 최신값은 "
        "Silicon Data 공개 Neo-Cloud 벤치마크 카드에서 직접 갱신합니다."
    )
    return changed


def write_payload(payload: dict[str, object]) -> None:
    OUTPUT_PATH.write_text(
        OUTPUT_PREFIX + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    payload = load_payload()
    snapshot = parse_public_snapshot(fetch_html(SOURCE_URL))
    rental_series = payload.get("rentalSeries")
    if not isinstance(rental_series, dict):
        raise RuntimeError("Existing Neo-Cloud benchmark series is missing")

    changed = False
    for key, point in snapshot.items():
        series = rental_series.get(key)
        if not isinstance(series, dict):
            raise RuntimeError(f"Existing series is missing: {key}")
        changed = merge_point(series, str(point["date"]), float(point["value"])) or changed

    latest_source_date = max(str(point["date"]) for point in snapshot.values())
    benchmark_source = {
        "name": "Silicon Data Neo-Cloud GPU Rental Price Index",
        "pageUrl": SOURCE_URL,
        "historyProvenance": "Existing public-chart reconstruction retained for continuity",
        "dailyUpdate": "Latest public benchmark card value",
        "calculationOwner": "Silicon Data",
    }
    metadata_changed = (
        payload.get("benchmarkUpdatedAt") != latest_source_date
        or payload.get("benchmarkSource") != benchmark_source
    )
    if not changed and not metadata_changed:
        print(f"No new public Neo-Cloud benchmark after {latest_source_date}")
        return

    payload["benchmarkUpdatedAt"] = latest_source_date
    payload["generatedAt"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    payload["benchmarkSource"] = benchmark_source
    write_payload(payload)
    values = ", ".join(
        f"{MODEL_CONFIG[key]['gpu']} ${float(point['value']):.2f} ({point['date']})"
        for key, point in snapshot.items()
    )
    print(f"Updated public Neo-Cloud benchmark: {values}")


if __name__ == "__main__":
    main()

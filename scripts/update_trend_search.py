from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pytrends.request import TrendReq


ROOT = Path(__file__).resolve().parents[1]
WATCHLIST_PATH = ROOT / "data" / "trend-search-watchlist.json"
OUTPUT_PATH = ROOT / "data" / "trend-search-data.js"
MAX_KEYWORDS = 5


def load_existing_payload() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {}
    raw = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.trendSearchData = "
    if not raw.startswith(prefix):
        return {}
    try:
        return json.loads(raw[len(prefix) :].rstrip(";\n"))
    except json.JSONDecodeError:
        return {}


def new_client() -> TrendReq:
    return TrendReq(
        hl="en-US",
        tz=540,
        timeout=(10, 35),
        retries=0,
        backoff_factor=0.0,
        requests_args={"headers": {"User-Agent": "Mozilla/5.0 (EG Dashboard trend refresh)"}},
    )


def fetch_request(config: dict[str, Any]) -> dict[str, Any]:
    keywords = [str(value).strip() for value in config.get("keywords", []) if str(value).strip()]
    if not 1 <= len(keywords) <= MAX_KEYWORDS:
        raise ValueError(f"{config.get('id', 'request')}: 1-{MAX_KEYWORDS} keywords are required")

    geo = str(config.get("geo") or "").upper()
    mode = str(config.get("mode") or "web").lower()
    gprop = "youtube" if mode == "youtube" else ""
    timeframe = str(config.get("range") or "today 12-m")
    client = new_client()
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            client.build_payload(keywords, timeframe=timeframe, geo=geo, gprop=gprop)
            raw = client.interest_over_time()
            if raw is None or raw.empty:
                raise ValueError("Google Trends returned no interest-over-time observations")
            if "isPartial" in raw.columns:
                raw = raw.drop(columns=["isPartial"])
            raw = raw.reset_index()
            date_column = "date" if "date" in raw.columns else raw.columns[0]
            labels = [value.strftime("%Y-%m-%d") for value in raw[date_column]]
            series = []
            for keyword in keywords:
                if keyword not in raw.columns:
                    raise ValueError(f"Missing keyword column: {keyword}")
                values = [int(value) if value == value else None for value in raw[keyword].tolist()]
                series.append({"key": keyword, "label": keyword, "values": values})
            return {
                "id": str(config.get("id") or "custom"),
                "label": str(config.get("label") or " / ".join(keywords)),
                "keywords": keywords,
                "geo": geo,
                "mode": mode,
                "range": timeframe,
                "labels": labels,
                "series": series,
                "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        except Exception as error:
            last_error = error
            if attempt == 0:
                time.sleep(4)
    raise RuntimeError(str(last_error))


def main() -> None:
    watchlist = json.loads(WATCHLIST_PATH.read_text(encoding="utf-8"))
    existing = load_existing_payload()
    existing_by_id = {str(item.get("id")): item for item in existing.get("requests", [])}
    requests = []
    succeeded = 0

    for config in watchlist.get("requests", []):
        request_id = str(config.get("id") or "")
        try:
            item = fetch_request(config)
            succeeded += 1
            print(f"Updated {request_id}: {len(item['labels'])} observations")
        except Exception as error:
            item = existing_by_id.get(request_id)
            if item:
                item = {**item, "lastError": str(error)}
                print(f"Kept cached {request_id}: {error}")
            else:
                print(f"Skipped {request_id}: {error}")
                continue
        requests.append(item)

    if not requests:
        raise RuntimeError("No Google Trends data was available and no cached data could be preserved")

    payload = {
        "schemaVersion": 1,
        "updatedAt": datetime.now(timezone.utc).date().isoformat() if succeeded else str(existing.get("updatedAt") or ""),
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "Google Trends",
            "description": "Google Trends interest is a normalized relative-interest index, not absolute search volume.",
            "url": "https://trends.google.com/trends/",
        },
        "requests": requests,
    }
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    OUTPUT_PATH.write_text(f"window.trendSearchData = {serialized};\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)} ({succeeded}/{len(requests)} live refreshes)")


if __name__ == "__main__":
    main()

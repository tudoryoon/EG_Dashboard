from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


BASE_URL = "https://openrouter.ai"
RANKINGS_API_BASE = "/api/frontend/v1/rankings"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "openrouter-rankings-data.js"
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "EG-Dashboard/1.0 (+https://github.com/tudoryoon/EG_Dashboard)",
}
CHART_ENDPOINTS = {
    "models": {
        "title": "Top Models",
        "subtitle": "Weekly usage of models across OpenRouter",
        "endpoint": f"{RANKINGS_API_BASE}/model-rankings-chart",
        "unit": "tokens",
        "topN": 12,
    },
    "marketShare": {
        "title": "Market Share",
        "subtitle": "OpenRouter token share by model author",
        "endpoint": f"{RANKINGS_API_BASE}/market-share",
        "unit": "tokens",
        "topN": 10,
    },
    "tools": {
        "title": "Tool Calls",
        "subtitle": "Tool usage across models on OpenRouter",
        "endpoint": f"{RANKINGS_API_BASE}/tools",
        "unit": "calls",
        "topN": 10,
    },
    "images": {
        "title": "Images",
        "subtitle": "Total images processed on OpenRouter",
        "endpoint": f"{RANKINGS_API_BASE}/images",
        "unit": "images",
        "topN": 10,
    },
    "imageOutput": {
        "title": "Image Output",
        "subtitle": "Total images generated on OpenRouter",
        "endpoint": f"{RANKINGS_API_BASE}/image-output",
        "unit": "images",
        "topN": 10,
    },
    "naturalLanguage": {
        "title": "Natural Language",
        "subtitle": "Usage by natural language prompt category on OpenRouter",
        "endpoint": f"{RANKINGS_API_BASE}/natural-language",
        "unit": "tokens",
        "topN": 10,
    },
}
LEADERBOARD_VIEWS = ["day", "week", "month"]
DAILY_USAGE_ENDPOINT = "/api/v1/datasets/rankings-daily"

# OpenRouter's model metadata does not expose a canonical open-weight flag.
# Keep this list deliberately conservative and surface everything else as
# "verification needed" rather than incorrectly labelling a proprietary model.
OPEN_WEIGHT_PREFIXES = (
    "deepseek/",
    "qwen/",
    "meta-llama/",
    "microsoft/phi",
    "nvidia/nemotron",
    "google/gemma",
    "allenai/olmo",
    "openai/gpt-oss",
    "moonshotai/kimi-k2",
    "z-ai/glm-4.5",
    "z-ai/glm-5",
    "mistralai/mixtral",
    "mistralai/mistral-nemo",
    "mistralai/open-mistral",
    "mistralai/devstral",
)
CLOSED_API_PREFIXES = (
    "anthropic/",
    "openai/",
    "google/",
    "x-ai/",
    "cohere/",
    "poolside/",
    "upstage/",
    "perplexity/",
    "amazon/",
    "ai21/",
)


def fetch_json(
    path: str,
    params: dict[str, str] | None = None,
    *,
    require_api_key: bool = False,
) -> dict[str, Any]:
    headers = dict(HEADERS)
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if require_api_key:
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        headers["Authorization"] = f"Bearer {api_key}"
    response = requests.get(BASE_URL + path, headers=headers, params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def normalize_model_id(value: str | None) -> str:
    return str(value or "").strip().removeprefix("~")


def title_from_slug(slug: str) -> str:
    raw = normalize_model_id(slug)
    name = raw.split("/", 1)[-1]
    name = name.split(":")[0]
    return " ".join(part.upper() if part in {"gpt", "llm", "vl", "ai"} else part.capitalize() for part in name.replace("_", "-").split("-"))


def model_author(slug: str) -> str:
    raw = normalize_model_id(slug)
    return raw.split("/", 1)[0] if "/" in raw else "openrouter"


def classify_model_openness(model_id: str) -> str:
    normalized = normalize_model_id(model_id).lower().split(":", 1)[0]
    if normalized == "other":
        return "unknown"
    if normalized.startswith(OPEN_WEIGHT_PREFIXES):
        return "open"
    if normalized.startswith(CLOSED_API_PREFIXES):
        return "closed"
    return "unknown"


def openness_label(value: str) -> str:
    return {
        "open": "Open weights",
        "closed": "Closed API",
        "unknown": "Verification needed",
    }.get(value, "Verification needed")


def build_model_name_map() -> dict[str, str]:
    try:
        data = fetch_json("/api/v1/models").get("data", [])
    except Exception as error:
        print(f"Unable to fetch OpenRouter model metadata: {error}")
        return {}
    names: dict[str, str] = {}
    for row in data:
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        for key in (row.get("id"), row.get("canonical_slug")):
            normalized = normalize_model_id(str(key or ""))
            if normalized:
                names[normalized] = name
    return names


def display_name(model_id: str, model_names: dict[str, str]) -> str:
    normalized = normalize_model_id(model_id)
    base = normalized.split(":", 1)[0]
    return model_names.get(normalized) or model_names.get(base) or title_from_slug(base)


def normalize_chart_payload(raw: dict[str, Any], model_names: dict[str, str], config: dict[str, Any]) -> dict[str, Any]:
    rows = raw.get("data", {})
    if isinstance(rows, dict):
        cached_at = rows.get("cachedAt")
        rows = rows.get("data", [])
    else:
        cached_at = raw.get("cachedAt")
    rows = rows or []
    totals: dict[str, float] = {}
    latest = rows[-1].get("ys", {}) if rows else {}
    for key, value in latest.items():
        try:
            totals[key] = float(value)
        except Exception:
            continue
    top_keys = [key for key, _ in sorted(totals.items(), key=lambda item: item[1], reverse=True) if key != "Others"]
    top_keys = top_keys[: int(config.get("topN") or 10)]
    if "Others" in latest:
        top_keys.append("Others")

    return {
        "title": config["title"],
        "subtitle": config["subtitle"],
        "unit": config["unit"],
        "cachedAt": cached_at,
        "dates": [row.get("x") for row in rows],
        "series": [
            {
                "key": key,
                "label": "Others" if key == "Others" else display_name(key, model_names),
                "author": "" if key == "Others" else model_author(key),
                "openness": "unknown" if key == "Others" else classify_model_openness(key),
                "values": [row.get("ys", {}).get(key, 0) for row in rows],
            }
            for key in top_keys
        ],
    }


def normalize_leaderboard_row(row: dict[str, Any], rank: int, model_names: dict[str, str]) -> dict[str, Any]:
    model_id = normalize_model_id(row.get("model_permaslug"))
    variant_id = normalize_model_id(row.get("variant_permaslug") or model_id)
    prompt_tokens = int(row.get("total_prompt_tokens") or 0)
    completion_tokens = int(row.get("total_completion_tokens") or 0)
    reasoning_tokens = int(row.get("total_native_tokens_reasoning") or 0)
    total_tokens = prompt_tokens + completion_tokens + reasoning_tokens
    return {
        "rank": rank,
        "date": str(row.get("date") or "")[:10],
        "modelId": model_id,
        "variantId": variant_id,
        "variant": row.get("variant") or "",
        "name": display_name(model_id, model_names),
        "author": model_author(model_id),
        "openness": classify_model_openness(model_id),
        "opennessLabel": openness_label(classify_model_openness(model_id)),
        "tokens": total_tokens,
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "reasoningTokens": reasoning_tokens,
        "requests": int(row.get("count") or 0),
        "toolCalls": int(row.get("total_tool_calls") or 0),
        "change": row.get("change"),
    }


def load_existing_payload() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {}
    prefix = "window.openrouterRankingsData = "
    try:
        raw = OUTPUT_PATH.read_text(encoding="utf-8").strip()
        if raw.startswith(prefix):
            return json.loads(raw[len(prefix):].rstrip(";"))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Unable to load previous OpenRouter payload: {error}")
    return {}


def build_daily_usage_payload(existing_daily: dict[str, Any] | None = None) -> dict[str, Any]:
    fallback = existing_daily if isinstance(existing_daily, dict) else None
    try:
        raw = fetch_json(DAILY_USAGE_ENDPOINT, require_api_key=True)
    except Exception as error:
        print(f"Unable to fetch OpenRouter daily usage dataset: {error}")
        if fallback and fallback.get("dates"):
            fallback["stale"] = True
            fallback["status"] = "Using the latest stored daily dataset."
            return fallback
        return {
            "available": False,
            "title": "Daily Usage: Open vs Closed",
            "subtitle": "OpenRouter daily token usage by model-weight availability",
            "unit": "tokens",
            "dates": [],
            "series": [],
            "coverage": "OpenRouter's official daily dataset requires an API key. Add OPENROUTER_API_KEY as a GitHub Actions secret to enable this chart.",
            "status": "Awaiting OpenRouter API key",
        }

    grouped: dict[str, dict[str, int]] = {}
    for row in raw.get("data", []):
        date = str(row.get("date") or "")[:10]
        if not date:
            continue
        try:
            tokens = int(row.get("total_tokens") or 0)
        except (TypeError, ValueError):
            continue
        bucket = grouped.setdefault(date, {"open": 0, "closed": 0, "unknown": 0})
        bucket[classify_model_openness(str(row.get("model_permaslug") or ""))] += tokens

    dates = sorted(grouped)
    meta = raw.get("meta") or {}
    return {
        "available": bool(dates),
        "title": "Daily Usage: Open vs Closed",
        "subtitle": "Daily OpenRouter token usage, grouped by model-weight availability",
        "unit": "tokens",
        "dates": dates,
        "asOf": meta.get("as_of") or "",
        "coverage": "Official OpenRouter daily Top 50 model totals plus the aggregated Other row. Other and unclassified models remain in Verification needed.",
        "status": "Official OpenRouter daily dataset",
        "series": [
            {"key": "open", "label": "Open weights", "values": [grouped[date]["open"] for date in dates]},
            {"key": "closed", "label": "Closed API", "values": [grouped[date]["closed"] for date in dates]},
            {"key": "unknown", "label": "Verification needed / Other", "values": [grouped[date]["unknown"] for date in dates]},
        ],
    }


def build_payload() -> dict[str, Any]:
    existing_payload = load_existing_payload()
    model_names = build_model_name_map()
    charts = {}
    for key, config in CHART_ENDPOINTS.items():
        raw = fetch_json(str(config["endpoint"]))
        charts[key] = normalize_chart_payload(raw, model_names, config)

    leaderboards = {}
    for view in LEADERBOARD_VIEWS:
        data = fetch_json(f"{RANKINGS_API_BASE}/models", {"view": view}).get("data", [])
        rows = [normalize_leaderboard_row(row, index + 1, model_names) for index, row in enumerate(data)]
        rows.sort(key=lambda row: row["tokens"], reverse=True)
        for index, row in enumerate(rows, start=1):
            row["rank"] = index
        leaderboards[view] = rows[:100]

    latest_chart_dates = [chart["dates"][-1] for chart in charts.values() if chart.get("dates")]
    latest_leaderboard_dates = [
        row["date"]
        for rows in leaderboards.values()
        for row in rows[:1]
        if row.get("date")
    ]
    return {
        "updatedAt": max(latest_chart_dates + latest_leaderboard_dates) if latest_chart_dates or latest_leaderboard_dates else "",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": {
            "name": "OpenRouter Rankings",
            "url": "https://openrouter.ai/rankings",
            "apiBase": f"https://openrouter.ai{RANKINGS_API_BASE}",
            "cadence": "daily",
        },
        "defaultLeaderboard": "week",
        "leaderboardViews": [
            {"key": "day", "label": "Today"},
            {"key": "week", "label": "This Week"},
            {"key": "month", "label": "This Month"},
        ],
        "charts": charts,
        "dailyUsage": build_daily_usage_payload(existing_payload.get("dailyUsage")),
        "leaderboards": leaderboards,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.openrouterRankingsData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH} with OpenRouter data updated through {payload.get('updatedAt')}")


if __name__ == "__main__":
    main()

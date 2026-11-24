from __future__ import annotations

import json
import re
from datetime import UTC, date, datetime
from math import isfinite
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "token-price-index-data.js"
PORTAL_URL = "https://portal.silicondata.com/token-index-chart"
PORTAL_SEGMENT_URL = "https://portal.silicondata.com/token-indexes-chart"
PRODUCT_URL = "https://www.silicondata.com/products/silicon-index/llm-token-expenditure-index"
METHODOLOGY_URL = "https://docs.silicondata.com/api-reference/token_index_api"

INDICES = {
    "overall": ("llm-token", "expenditure", "SDLLMTK", "LLM Token Expenditure Index", "전체"),
    "closed": ("proprietary-llm", "closed_expenditure", "SDLLMCS", "Closed Model Token Index", "Closed"),
    "open": ("open-llm", "open_expenditure", "SDLLMOS", "Open Model Token Index", "Open"),
}


def fetch_html(url: str) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urlopen(request, timeout=35) as response:
        return response.read().decode("utf-8", errors="replace")


def official_point(raw_date: str, raw_value: object) -> dict | None:
    try:
        point_date = date.fromisoformat(raw_date)
        value = float(raw_value)
    except (TypeError, ValueError, OverflowError):
        return None
    if point_date.isoformat() != raw_date or not isfinite(value) or value < 0 or isinstance(raw_value, bool):
        return None
    return {"date": raw_date, "value": round(value, 4), "quality": "official-public"}


def decode_public_chart_page(html: str) -> str:
    decoder = json.JSONDecoder()
    chunks = []
    # The public charts arrive as JSON strings inside the server-rendered page.
    for match in re.finditer(r"self\.__next_f\.push\(\s*", html):
        try:
            frame, _ = decoder.raw_decode(html, match.end())
        except json.JSONDecodeError:
            continue
        if isinstance(frame, list) and len(frame) == 2 and frame[0] == 1 and isinstance(frame[1], str):
            chunks.append(frame[1])

    return "".join(chunks)


def parse_public_product_points(html: str) -> dict[str, list[dict]]:
    flight = decode_public_chart_page(html)
    decoder = json.JSONDecoder()
    series = {}
    for match in re.finditer(r'"charts"\s*:\s*(?=\{)', flight):
        try:
            charts, _ = decoder.raw_decode(flight, match.end())
        except json.JSONDecodeError:
            continue
        for key, (slug, token, *_) in INDICES.items():
            chart = charts.get(slug)
            if not isinstance(chart, dict) or chart.get("key") != token or not isinstance(chart.get("points"), list):
                continue
            points = [
                point for row in chart["points"] if isinstance(row, dict)
                if (point := official_point(row.get("date"), row.get("price"))) is not None
            ]
            if points:
                series[key] = merge_points(series.get(key, []), points)
    if not series:
        raise RuntimeError("Silicon Data public product page had no usable token charts")
    return series


def parse_public_portal_points(html: str, token: str = "expenditure") -> list[dict]:
    flight = decode_public_chart_page(html)
    decoder = json.JSONDecoder()
    for match in re.finditer(r'"data"\s*:\s*(?=\{)', flight):
        try:
            data, _ = decoder.raw_decode(flight, match.end())
        except json.JSONDecodeError:
            continue
        if data.get("token") != token or not isinstance(data.get("indexes"), dict):
            continue
        points = [
            point for day, value in data["indexes"].items()
            if (point := official_point(day, value)) is not None
        ]
        if points:
            return sorted(points, key=lambda point: point["date"])
    raise RuntimeError(f"Silicon Data public portal had no usable observations for {token}")


def load_existing_payload() -> dict:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.tokenPriceIndexData\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        return {}
    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}
    if payload.get("source", {}).get("provider") != "Silicon Data":
        return {}
    return payload


def merge_points(existing: list[dict], fresh: list[dict]) -> list[dict]:
    by_date = {str(point["date"]): point for point in existing if point.get("date")}
    by_date.update({str(point["date"]): point for point in fresh if point.get("date")})
    return [by_date[key] for key in sorted(by_date)]


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current / previous - 1) * 100, 2)


def collect_public_points() -> dict[str, list[dict]]:
    fresh = {}
    for key, (_, token, *_) in INDICES.items():
        url = PORTAL_URL if key == "overall" else f"{PORTAL_SEGMENT_URL}?{urlencode({'token': token})}"
        try:
            fresh[key] = parse_public_portal_points(fetch_html(url), token)
        except (OSError, RuntimeError) as exc:
            print(f"::warning::Silicon Data {key} portal: {exc}")
    try:
        product = parse_public_product_points(fetch_html(PRODUCT_URL))
        for key, points in product.items():
            fresh[key] = merge_points(points, fresh.get(key, []))
    except (OSError, RuntimeError) as exc:
        print(f"::warning::Silicon Data product page: {exc}")
    if not fresh:
        raise RuntimeError("Silicon Data public sources failed; leaving the published file unchanged")
    for key in INDICES.keys() - fresh.keys():
        print(f"::warning::No fresh Silicon Data {key} data; keeping saved observations")
    return fresh


def build_payload(previous: dict, fresh: dict[str, list[dict]]) -> dict:
    series = {
        key: merge_points(
            [p for p in previous.get("series", {}).get(key, []) if p.get("quality") == "official-public"],
            fresh.get(key, []),
        )
        for key in INDICES
    }
    overall_history = series["overall"]
    if not overall_history:
        raise RuntimeError("No official overall token index observations available")
    latest = overall_history[-1]
    prior = overall_history[-2] if len(overall_history) > 1 else None
    first_public = overall_history[0]

    by_date = {key: {p["date"]: p["value"] for p in points} for key, points in series.items()}
    common = by_date["overall"].keys() & by_date["closed"].keys() & by_date["open"].keys()
    comparison_date = max(common, default=None)
    comparison_values = [
        {"key": key, "ticker": ticker, "label": label, "value": by_date[key][comparison_date]}
        for key, (_, _, ticker, _, label) in INDICES.items()
    ] if comparison_date else []
    open_value = by_date["open"].get(comparison_date)
    premium = round(by_date["closed"][comparison_date] / open_value, 2) if open_value else None

    return {
        "updatedAt": latest["date"],
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": {
            "provider": "Silicon Data",
            "label": "Silicon Data LLM Token Expenditure Index",
            "portalUrl": PORTAL_URL,
            "productUrl": PRODUCT_URL,
            "methodologyUrl": METHODOLOGY_URL,
            "cadence": "일간 · Silicon Data 공식 공개 관측값 누적",
        },
        "latest": {
            **{
                key: {"ticker": ticker, "label": label, **series[key][-1]}
                for key, (_, _, ticker, label, _) in INDICES.items() if series[key]
            },
            "dailyChangePct": pct_change(latest["value"], prior["value"]) if prior else None,
            "publicWindowChangePct": pct_change(latest["value"], first_public["value"]),
            "closedOpenPremium": premium,
        },
        "series": series,
        "comparison": {
            "date": comparison_date,
            "values": comparison_values,
        },
        "methodology": {
            "unit": "USD per 1 million tokens",
            "aggregation": "모델별 추론 사용량과 시장 지출 비중으로 가중한 혼합 가격",
            "normalization": "입력·출력 토큰 구성, Context 길이, Batching 방식과 서비스 안정성을 정규화",
            "coverage": "Frontier API, Open-weight 플랫폼, 전용 인스턴스와 Self-hosted 기준 배포",
            "interpretation": "상승은 프리미엄 모델 사용 집중 또는 공급자의 가격 결정력 강화, 하락은 저가 모델 확산과 추론 효율 개선을 시사",
            "publicDataLimit": "공개 페이지에서 확인 가능한 최근 일별 관측치만 수집·누적하며, 공개 구간 이전의 값은 추정하지 않습니다.",
        },
    }


def main() -> None:
    previous = load_existing_payload()
    payload = build_payload(previous, collect_public_points())
    if previous and {**payload, "generatedAt": previous.get("generatedAt")} == previous:
        print(f"No new token index observations (comparison through {payload['comparison']['date']})")
        return
    OUTPUT_PATH.write_text(
        "window.tokenPriceIndexData = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Updated {OUTPUT_PATH.relative_to(ROOT)} through {payload['updatedAt']} "
        f"(common comparison through {payload['comparison']['date']}; "
        + ", ".join(f"{key}={len(points)}" for key, points in payload["series"].items()) + ")"
    )


if __name__ == "__main__":
    main()

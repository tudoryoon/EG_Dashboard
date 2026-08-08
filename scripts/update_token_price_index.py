from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "token-price-index-data.js"
PORTAL_URL = "https://portal.silicondata.com/token-index-chart"
PRODUCT_URL = "https://www.silicondata.com/products/silicon-index/llm-token-expenditure-index"
METHODOLOGY_URL = "https://docs.silicondata.com/api-reference/token_index_api"

# Silicon Data's public chart supplied in August 2026 showed these sub-index
# levels. The overall value matches the official 2026-08-03 portal observation,
# which anchors the reference date. Full sub-index history requires a license.
PUBLIC_SUBINDEX_REFERENCE = {
    "date": "2026-08-03",
    "overall": 1.29,
    "closed": 3.07,
    "open": 0.66,
}


def fetch_portal_html() -> str:
    request = Request(
        PORTAL_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urlopen(request, timeout=35) as response:
        return response.read().decode("utf-8", errors="replace")


def parse_public_portal_points(html: str) -> list[dict]:
    data_match = re.search(
        r'\\"data\\":\{\\"token\\":\\"expenditure\\".*?'
        r'\\"indexes\\":\{(?P<indexes>.*?)\},\\"index_name\\"',
        html,
        re.S,
    )
    if not data_match:
        raise RuntimeError("Silicon Data public token index payload was not found")

    points = []
    for point_date, raw_value in re.findall(
        r'\\"(\d{4}-\d{2}-\d{2})\\":\\"(-?[\d.]+)\\"',
        data_match.group("indexes"),
    ):
        value = float(raw_value)
        if value < 0:
            continue
        points.append({"date": point_date, "value": round(value, 4), "quality": "official-public"})

    if not points:
        raise RuntimeError("Silicon Data public token index payload had no usable observations")
    return sorted(points, key=lambda point: point["date"])


def load_existing_official_history() -> list[dict]:
    if not OUTPUT_PATH.exists():
        return []
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.tokenPriceIndexData\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        return []
    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return []
    if payload.get("source", {}).get("provider") != "Silicon Data":
        return []
    return [
        point
        for point in payload.get("series", {}).get("overall", [])
        if point.get("quality") == "official-public"
    ]


def merge_points(existing: list[dict], fresh: list[dict]) -> list[dict]:
    by_date = {str(point["date"]): point for point in existing if point.get("date")}
    by_date.update({str(point["date"]): point for point in fresh if point.get("date")})
    return [by_date[key] for key in sorted(by_date)]


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current / previous - 1) * 100, 2)


def build_payload() -> dict:
    fresh_points = parse_public_portal_points(fetch_portal_html())
    overall_history = merge_points(load_existing_official_history(), fresh_points)
    latest = overall_history[-1]
    prior = overall_history[-2] if len(overall_history) > 1 else latest
    first_public = overall_history[0]

    closed_value = PUBLIC_SUBINDEX_REFERENCE["closed"]
    open_value = PUBLIC_SUBINDEX_REFERENCE["open"]
    return {
        "updatedAt": latest["date"],
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": {
            "provider": "Silicon Data",
            "label": "Silicon Data LLM Token Expenditure Index",
            "portalUrl": PORTAL_URL,
            "productUrl": PRODUCT_URL,
            "methodologyUrl": METHODOLOGY_URL,
            "cadence": "일간 · 공개 포털 관측값을 EG Dashboard에 매일 누적",
        },
        "latest": {
            "overall": {
                "ticker": "SDLLMTK",
                "label": "LLM Token Expenditure Index",
                "value": latest["value"],
                "date": latest["date"],
                "quality": "official-public",
            },
            "closed": {
                "ticker": "SDLLMCS",
                "label": "Closed Model Token Index",
                "value": closed_value,
                "date": PUBLIC_SUBINDEX_REFERENCE["date"],
                "quality": "public-chart-reference",
            },
            "open": {
                "ticker": "SDLLMOS",
                "label": "Open Model Token Index",
                "value": open_value,
                "date": PUBLIC_SUBINDEX_REFERENCE["date"],
                "quality": "public-chart-reference",
            },
            "dailyChangePct": pct_change(latest["value"], prior["value"]),
            "publicWindowChangePct": pct_change(latest["value"], first_public["value"]),
            "closedOpenPremium": round(closed_value / open_value, 2),
        },
        "series": {
            "overall": overall_history,
            "closed": [
                {
                    "date": PUBLIC_SUBINDEX_REFERENCE["date"],
                    "value": closed_value,
                    "quality": "public-chart-reference",
                }
            ],
            "open": [
                {
                    "date": PUBLIC_SUBINDEX_REFERENCE["date"],
                    "value": open_value,
                    "quality": "public-chart-reference",
                }
            ],
        },
        "comparison": {
            "date": PUBLIC_SUBINDEX_REFERENCE["date"],
            "values": [
                {"key": "overall", "ticker": "SDLLMTK", "label": "전체", "value": PUBLIC_SUBINDEX_REFERENCE["overall"]},
                {"key": "closed", "ticker": "SDLLMCS", "label": "Closed", "value": closed_value},
                {"key": "open", "ticker": "SDLLMOS", "label": "Open", "value": open_value},
            ],
        },
        "methodology": {
            "unit": "USD per 1 million tokens",
            "aggregation": "모델별 추론 사용량과 시장 지출 비중으로 가중한 혼합 가격",
            "normalization": "입력·출력 토큰 구성, Context 길이, Batching 방식과 서비스 안정성을 정규화",
            "coverage": "Frontier API, Open-weight 플랫폼, 전용 인스턴스와 Self-hosted 기준 배포",
            "interpretation": "상승은 프리미엄 모델 사용 집중 또는 공급자의 가격 결정력 강화, 하락은 저가 모델 확산과 추론 효율 개선을 시사",
            "publicDataLimit": "공개 포털은 SDLLMTK의 최근 관측치만 제공합니다. 전체 히스토리와 Closed/Open 일간 시계열은 Silicon Data 구독이 필요합니다.",
            "subindexReference": "Closed/Open 최신값은 2026-08 공개 차트의 표기값이며, 기준일은 SDLLMTK $1.29와 공식 2026-08-03 값의 일치로 정렬한 추정입니다.",
        },
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.tokenPriceIndexData = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Updated {OUTPUT_PATH.relative_to(ROOT)} through {payload['updatedAt']} "
        f"with {len(payload['series']['overall'])} official observations"
    )


if __name__ == "__main__":
    main()

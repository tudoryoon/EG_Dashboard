from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "token-price-index-data.js"
BASE_URL = "https://thebetaindex.com"
ENDPOINTS = {
    "index": f"{BASE_URL}/data/index.json",
    "history": f"{BASE_URL}/data/history.json",
    "lwci_history": f"{BASE_URL}/data/lwci-history.json",
}


def fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "EG-Dashboard/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def build_payload() -> dict:
    current = fetch_json(ENDPOINTS["index"])
    history = fetch_json(ENDPOINTS["history"])
    lwci_history = fetch_json(ENDPOINTS["lwci_history"])

    return {
        "updatedAt": current.get("as_of", ""),
        "generatedAt": current.get("manifest", {}).get("computed_at")
        or datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": {
            "label": "The Beta Index",
            "url": BASE_URL,
            "methodologyUrl": f"{BASE_URL}/methodology/",
            "dataUrl": f"{BASE_URL}/data/",
            "cadence": "Weekly · Monday 13:00 UTC after validation",
        },
        "methodology": {
            "version": current.get("methodology_version", ""),
            "basePeriod": current.get("base_period", ""),
            "baseValue": current.get("base_value", 100),
            "aggregation": current.get("aggregation", ""),
            "inputWeight": current.get("token_mix", {}).get("input", 0.8),
            "outputWeight": current.get("token_mix", {}).get("output", 0.2),
            "note": "공개 PAYG 정가 기반이며 캐시·약정 할인·실제 기업 계약가는 반영하지 않습니다.",
        },
        "latest": {
            "value": current.get("value"),
            "dollarAnchor": current.get("dollar_anchor_usd_per_mtok"),
            "wowPct": current.get("delta_wow_pct"),
            "sinceBasePct": current.get("delta_since_base_pct"),
            "status": current.get("status", ""),
        },
        "history": history.get("points", []),
        "lwciHistory": lwci_history.get("points", []),
        "tiers": current.get("tier_prices", []),
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.tokenPriceIndexData = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Updated {OUTPUT_PATH.relative_to(ROOT)} through {payload['updatedAt']}")


if __name__ == "__main__":
    main()

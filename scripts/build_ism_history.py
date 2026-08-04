from __future__ import annotations

import base64
import json
import re
import zlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


START_DATE = "1990-01-01"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "ism-history.json"
PAGE_URL = "https://tradingeconomics.com/united-states/business-confidence"
CHART_BASE_URL = "https://d3ii0wo49og5mi.cloudfront.net/economics"
SERIES_SYMBOLS = {
    "manufacturing_pmi": "NAPMPMI",
    "manufacturing_new_orders": "USAIMNO",
    "manufacturing_production": "USAIMPROD",
    "manufacturing_employment": "USAIME",
    "manufacturing_prices": "USAIMP",
    "services_pmi": "UNITEDSTANONMANPMI",
    "services_business_activity": "USAINMBA",
    "services_new_orders": "USAINMNO",
    "services_employment": "USAINME",
    "services_prices": "USAINMP",
}
SERIES_START_MONTHS = {
    "manufacturing_pmi": "1990-01",
    "manufacturing_new_orders": "1990-01",
    "manufacturing_production": "1990-01",
    "manufacturing_employment": "1990-01",
    "manufacturing_prices": "2003-01",
    "services_pmi": "1997-07",
    "services_business_activity": "1997-07",
    "services_new_orders": "1997-07",
    "services_employment": "1997-07",
    "services_prices": "1997-07",
}


def decode_chart_payload(encoded: str, key: str) -> Any:
    raw = base64.b64decode(encoded)
    key_bytes = key.encode("utf-8")
    deobfuscated = bytes(value ^ key_bytes[index % len(key_bytes)] for index, value in enumerate(raw))
    return json.loads(zlib.decompress(deobfuscated, wbits=31))


def read_chart_credentials(session: requests.Session) -> tuple[str, str]:
    response = session.get(PAGE_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    response.raise_for_status()
    token_match = re.search(r"TEChartsToken\s*=\s*['\"]([^'\"]+)['\"]", response.text)
    key_match = re.search(r"TEObfuscationkey\s*=\s*['\"]([^'\"]+)['\"]", response.text)
    if not token_match or not key_match:
        raise RuntimeError("Trading Economics chart credentials were not found")
    return token_match.group(1), key_match.group(1)


def fetch_series(
    session: requests.Session,
    symbol: str,
    token: str,
    key: str,
    expected_start_month: str,
) -> dict[str, float]:
    response = session.get(
        f"{CHART_BASE_URL}/{symbol.lower()}",
        params={"d1": START_DATE},
        headers={"User-Agent": "Mozilla/5.0", "x-api-key": token},
        timeout=30,
    )
    response.raise_for_status()
    encoded = response.json()
    decoded = decode_chart_payload(encoded, key)
    rows = decoded[0]["series"][0]["serie"]["data"]
    values = {
        str(row[3])[:7]: float(row[0])
        for row in rows
        if len(row) >= 4 and row[0] is not None and str(row[3])[:7] >= START_DATE[:7]
    }
    if not values or min(values) != expected_start_month:
        raise RuntimeError(f"{symbol} history does not begin at {expected_start_month}")
    return values


def main() -> None:
    session = requests.Session()
    session.trust_env = False
    token, key = read_chart_credentials(session)
    series = {
        series_key: fetch_series(session, symbol, token, key, SERIES_START_MONTHS[series_key])
        for series_key, symbol in SERIES_SYMBOLS.items()
    }
    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "startMonth": START_DATE[:7],
        "sourceLabel": "Trading Economics NAPM/ISM historical chart archive",
        "sourceUrl": PAGE_URL,
        "note": "NAPM/ISM historical baseline from 1990. Services history begins at its actual July 1997 launch, and manufacturing Prices Paid begins in January 2003 in the public archive. Recent months are overwritten by official ISM monthly reports.",
        "series": series,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(series)} ISM series")


if __name__ == "__main__":
    main()

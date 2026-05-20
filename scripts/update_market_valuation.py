from __future__ import annotations

import io
import json
import re
from pathlib import Path

import pandas as pd
import requests
import urllib3


START_DATE = "1981-01-01"
SHILLER_PAGE_URL = "https://shillerdata.com/"
YALE_FALLBACK_URL = "http://www.econ.yale.edu/~shiller/data/ie_data.xls"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-valuation-data.js"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def discover_shiller_download_url() -> str:
    response = requests.get(SHILLER_PAGE_URL, headers=HEADERS, timeout=30)
    response.raise_for_status()
    match = re.search(r'href="(?P<href>[^"]*ie_data\.xls[^"]*)"', response.text)
    if not match:
        return YALE_FALLBACK_URL
    href = match.group("href").replace("&amp;", "&")
    if href.startswith("//"):
        return f"https:{href}"
    if href.startswith("/"):
        return f"https://shillerdata.com{href}"
    return href


def fetch_excel_bytes(url: str) -> bytes:
    try:
        response = requests.get(url, headers=HEADERS, timeout=60)
        response.raise_for_status()
        return response.content
    except requests.exceptions.SSLError:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        response = requests.get(url, headers=HEADERS, timeout=60, verify=False)
        response.raise_for_status()
        return response.content


def shiller_date_to_iso(value: object) -> str | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not pd.notna(numeric):
        return None
    year = int(numeric)
    month = int(round((numeric - year) * 100))
    if month < 1 or month > 12:
        return None
    return f"{year:04d}-{month:02d}-01"


def clean_number(value: object) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not pd.notna(numeric):
        return None
    return round(numeric, 4)


def build_payload() -> dict[str, object]:
    source_url = discover_shiller_download_url()
    excel_bytes = fetch_excel_bytes(source_url)
    frame = pd.read_excel(io.BytesIO(excel_bytes), sheet_name="Data", header=7)

    rows: list[dict[str, float | str]] = []
    for _, row in frame.iterrows():
        date = shiller_date_to_iso(row.get("Date"))
        if not date or date < START_DATE:
            continue
        cape = clean_number(row.get("CAPE"))
        tr_cape = clean_number(row.get("TR CAPE"))
        sp500 = clean_number(row.get("P"))
        real_price = clean_number(row.get("Price"))
        if cape is None and tr_cape is None and sp500 is None:
            continue
        rows.append(
            {
                "date": date,
                "cape": cape,
                "trCape": tr_cape,
                "sp500": sp500,
                "realPrice": real_price,
            }
        )

    dates = [row["date"] for row in rows]
    payload = {
        "updatedAt": dates[-1] if dates else "",
        "startDate": START_DATE,
        "defaultRange": "max",
        "source": {
            "name": "Robert Shiller / Yale Irrational Exuberance data",
            "url": source_url,
            "page": SHILLER_PAGE_URL,
            "frequency": "Monthly",
        },
        "ranges": [
            {"key": "1m", "label": "1M"},
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "1y", "label": "1Y"},
            {"key": "3y", "label": "3Y"},
            {"key": "5y", "label": "5Y"},
            {"key": "max", "label": "Max"},
        ],
        "series": {
            "cape": {
                "label": "Shiller CAPE",
                "color": "#b42318",
                "axis": "left",
                "formatter": "number1",
                "dates": dates,
                "values": [row["cape"] for row in rows],
            },
            "trCape": {
                "label": "Total Return CAPE",
                "color": "#7c3aed",
                "axis": "left",
                "formatter": "number1",
                "dates": dates,
                "values": [row["trCape"] for row in rows],
            },
            "sp500": {
                "label": "S&P 500 Monthly Avg",
                "color": "#111827",
                "axis": "right",
                "formatter": "index",
                "normalize": True,
                "dates": dates,
                "values": [row["sp500"] for row in rows],
            },
            "realPrice": {
                "label": "Real S&P 500 Price",
                "color": "#2563eb",
                "axis": "right",
                "formatter": "index",
                "normalize": True,
                "dates": dates,
                "values": [row["realPrice"] for row in rows],
            },
        },
    }
    return payload


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.marketValuationData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Updated through {payload['updatedAt']}")


if __name__ == "__main__":
    main()

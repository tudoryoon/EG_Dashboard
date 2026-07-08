#!/usr/bin/env python3
"""Build Study tab datasets.

Domestic Korea prices are fetched from Naver Finance. US series reuse local
dashboard data where available and fall back to daily market data for MU.
"""

from __future__ import annotations

import ast
import json
import math
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import requests
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
START_DATE = "2025-01-01"

NAVER_PRICE_URL = "https://api.finance.naver.com/siseJson.naver"
NAVER_REALTIME_URL = "https://polling.finance.naver.com/api/realtime"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Referer": "https://finance.naver.com/",
}

KOREA_SYMBOLS = {
    "samsung": {"naver": "005930", "label": "Samsung Electronics", "ticker": "005930 KS"},
    "skHynix": {"naver": "000660", "label": "SK Hynix", "ticker": "000660 KS"},
}


def load_window_json(path: Path, variable_name: str) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    pattern = rf"window\.{re.escape(variable_name)}\s*=\s*(.*?);\s*$"
    match = re.search(pattern, text, flags=re.S)
    if not match:
        raise ValueError(f"Cannot find window.{variable_name} assignment in {path}")
    return json.loads(match.group(1))


def fetch_naver_prices(symbol: str, start: str, end: str) -> pd.Series:
    response = requests.get(
        NAVER_PRICE_URL,
        params={
            "symbol": symbol,
            "requestType": 1,
            "startTime": start.replace("-", ""),
            "endTime": end.replace("-", ""),
            "timeframe": "day",
        },
        headers=HEADERS,
        timeout=30,
    )
    response.raise_for_status()
    rows = ast.literal_eval(response.text.strip())
    if len(rows) <= 1:
        raise ValueError(f"Naver returned no price rows for {symbol}")

    records = []
    for row in rows[1:]:
        if not row or len(row) < 5:
            continue
        day = datetime.strptime(str(row[0]), "%Y%m%d").date().isoformat()
        close = float(row[4])
        if math.isfinite(close):
            records.append((day, close))
    if not records:
        raise ValueError(f"No valid Naver closes for {symbol}")
    return pd.Series(dict(records), dtype="float64").sort_index()


def fetch_naver_listed_shares(symbol: str) -> int:
    response = requests.get(
        NAVER_REALTIME_URL,
        params={"query": f"SERVICE_ITEM:{symbol}"},
        headers=HEADERS,
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    areas = payload.get("result", {}).get("areas", [])
    for area in areas:
        for item in area.get("datas", []):
            shares = item.get("countOfListedStock")
            if shares:
                return int(shares)
    raise ValueError(f"Naver realtime returned no listed share count for {symbol}")


def yf_close_series(symbol: str, start: str) -> pd.Series:
    data = yf.download(symbol, start=start, auto_adjust=False, progress=False, threads=False)
    if data.empty:
        raise ValueError(f"yfinance returned no rows for {symbol}")
    close = data["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    close.index = pd.to_datetime(close.index).date.astype(str)
    return close.astype("float64").sort_index()


def extract_us_shares(market_rs: dict[str, Any], symbol: str) -> float:
    normalized = symbol.upper()
    for row in market_rs.get("rows", []):
        row_symbol = str(row.get("symbol") or row.get("ticker") or "").upper().replace(" US", "")
        if row_symbol == normalized:
            shares = row.get("sharesOutstanding")
            if shares and math.isfinite(float(shares)):
                return float(shares)
    raise ValueError(f"Could not find sharesOutstanding for {symbol} in market-rs-data.js")


def extract_nvda_prices(m7_price: dict[str, Any]) -> pd.Series:
    nvda = m7_price.get("items", {}).get("nvda")
    if not nvda:
        raise ValueError("m7-price-data.js has no nvda item")
    return pd.Series(dict(zip(nvda.get("dates", []), nvda.get("values", []))), dtype="float64").sort_index()


def align_forward(series: pd.Series, dates: list[str]) -> pd.Series:
    return series.reindex(dates).ffill()


def pct_change(first: float | None, latest: float | None) -> float | None:
    if not first or not latest or not math.isfinite(first) or not math.isfinite(latest):
        return None
    return round((latest / first - 1) * 100, 2)


def finite_or_none(value: float | int | None, digits: int = 3) -> float | None:
    if value is None or not math.isfinite(float(value)):
        return None
    return round(float(value), digits)


def build_study_data() -> dict[str, Any]:
    today = date.today().isoformat()
    end_date = today

    m7_price = load_window_json(DATA_DIR / "m7-price-data.js", "m7PriceData")
    market_rs = load_window_json(DATA_DIR / "market-rs-data.js", "marketRsData")

    krw_usd = yf_close_series("KRW=X", START_DATE)
    mu_prices = yf_close_series("MU", START_DATE)
    nvda_prices = extract_nvda_prices(m7_price)

    nvda_shares = extract_us_shares(market_rs, "NVDA")
    mu_shares = extract_us_shares(market_rs, "MU")

    korea_prices: dict[str, pd.Series] = {}
    korea_shares: dict[str, int] = {}
    for key, meta in KOREA_SYMBOLS.items():
        korea_prices[key] = fetch_naver_prices(meta["naver"], START_DATE, end_date)
        korea_shares[key] = fetch_naver_listed_shares(meta["naver"])

    all_dates = sorted(
        {
            *[d for d in krw_usd.index if d >= START_DATE],
            *[d for d in nvda_prices.index if d >= START_DATE],
            *[d for d in mu_prices.index if d >= START_DATE],
            *[d for series in korea_prices.values() for d in series.index if d >= START_DATE],
        }
    )
    if not all_dates:
        raise ValueError("No dates available for Study dataset")

    fx = align_forward(krw_usd, all_dates)
    samsung_close = align_forward(korea_prices["samsung"], all_dates)
    hynix_close = align_forward(korea_prices["skHynix"], all_dates)
    mu_close = align_forward(mu_prices, all_dates)
    nvda_close = align_forward(nvda_prices, all_dates)

    samsung_cap = samsung_close * korea_shares["samsung"] / fx
    hynix_cap = hynix_close * korea_shares["skHynix"] / fx
    mu_cap = mu_close * mu_shares
    nvda_cap = nvda_close * nvda_shares
    basket_cap = samsung_cap + hynix_cap + mu_cap
    ratio = basket_cap / nvda_cap
    spread = basket_cap - nvda_cap

    valid_mask = basket_cap.notna() & nvda_cap.notna()
    selected_dates = [d for d in all_dates if bool(valid_mask.get(d, False))]
    if not selected_dates:
        raise ValueError("No valid aligned market-cap dates")

    def values(series: pd.Series, digits: int = 3, scale: float = 1_000_000_000_000) -> list[float | None]:
        return [finite_or_none(series.get(d) / scale if pd.notna(series.get(d)) else None, digits) for d in selected_dates]

    latest_date = selected_dates[-1]
    first_date = selected_dates[0]

    latest = {
        "date": latest_date,
        "memoryBasketT": finite_or_none(basket_cap.get(latest_date) / 1_000_000_000_000, 3),
        "nvdaT": finite_or_none(nvda_cap.get(latest_date) / 1_000_000_000_000, 3),
        "spreadT": finite_or_none(spread.get(latest_date) / 1_000_000_000_000, 3),
        "ratio": finite_or_none(ratio.get(latest_date), 3),
        "memoryBasketChangePct": pct_change(basket_cap.get(first_date), basket_cap.get(latest_date)),
        "nvdaChangePct": pct_change(nvda_cap.get(first_date), nvda_cap.get(latest_date)),
    }

    return {
        "updatedAt": latest_date,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "startDate": START_DATE,
        "defaultRange": "max",
        "ranges": [
            {"key": "ytd", "label": "YTD"},
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "1y", "label": "1Y"},
            {"key": "max", "label": "Max"},
        ],
        "source": {
            "koreaPrices": "Naver Finance siseJson daily close",
            "koreaShares": "Naver Finance realtime countOfListedStock",
            "nvdaPrice": "Existing data/m7-price-data.js",
            "usShares": "Existing data/market-rs-data.js sharesOutstanding",
            "muPrice": "Yahoo Finance daily close via yfinance because local RS history does not cover 2025-01",
            "fx": "Yahoo Finance KRW=X daily close",
            "unit": "USD trillions",
        },
        "dashboards": {
            "memoryVsNvda": {
                "title": "Samsung + SK Hynix + Micron vs NVIDIA Market Cap",
                "subtitle": "Market cap in USD trillions, from 2025-01-01.",
                "dates": selected_dates,
                "latest": latest,
                "series": {
                    "memoryBasket": {
                        "label": "Samsung + SK Hynix + Micron",
                        "values": values(basket_cap),
                        "color": "#111827",
                    },
                    "nvda": {
                        "label": "NVIDIA",
                        "values": values(nvda_cap),
                        "color": "#16a34a",
                    },
                    "samsung": {
                        "label": "Samsung Electronics",
                        "values": values(samsung_cap),
                        "color": "#2563eb",
                    },
                    "skHynix": {
                        "label": "SK Hynix",
                        "values": values(hynix_cap),
                        "color": "#f97316",
                    },
                    "micron": {
                        "label": "Micron",
                        "values": values(mu_cap),
                        "color": "#dc2626",
                    },
                    "ratio": {
                        "label": "Basket / NVIDIA",
                        "values": values(ratio, digits=3, scale=1),
                        "color": "#6b7280",
                    },
                },
            }
        },
    }


def main() -> None:
    payload = build_study_data()
    output = DATA_DIR / "study-data.js"
    output.write_text(
        "window.studyData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    latest = payload["dashboards"]["memoryVsNvda"]["latest"]
    print(
        f"Wrote {output} ({payload['updatedAt']}) | "
        f"Basket ${latest['memoryBasketT']}T vs NVDA ${latest['nvdaT']}T"
    )


if __name__ == "__main__":
    main()

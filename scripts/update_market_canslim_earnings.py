from __future__ import annotations

import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "market-canslim-earnings-data.js"
BRIEFING_DATA_PATH = ROOT / "data" / "market-briefing-data.js"
MARKET_RS_DATA_PATH = ROOT / "data" / "market-rs-data.js"
FALLBACK_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"]
MAX_WORKERS = 8


def clean_number(value: object, digits: int = 4) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numeric):
        return None
    return round(numeric, digits)


def clean_date(value: object) -> str | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    try:
        return pd.Timestamp(value).date().isoformat()
    except Exception:
        return None


def load_existing_profiles() -> dict[str, object]:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.marketCanslimEarningsData = "
    if text.startswith(prefix):
        text = text[len(prefix) :]
    if text.endswith(";"):
        text = text[:-1]
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return {}
    profiles = payload.get("profiles")
    return profiles if isinstance(profiles, dict) else {}


def parse_js_payload(path: Path, variable_name: str) -> dict[str, object]:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8").strip()
    prefix = f"window.{variable_name} = "
    if text.startswith(prefix):
        text = text[len(prefix) :]
    if text.endswith(";"):
        text = text[:-1]
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def load_daily_briefing_tickers() -> list[str]:
    payload = parse_js_payload(BRIEFING_DATA_PATH, "marketBriefingData")
    tickers: list[str] = []
    seen: set[str] = set()
    for sector in payload.get("sectorPanels", []):
        if not isinstance(sector, dict):
            continue
        for item in sector.get("items", []):
            if not isinstance(item, dict):
                continue
            ticker = str(item.get("ticker") or "").strip()
            if not ticker or ticker in seen:
                continue
            seen.add(ticker)
            tickers.append(ticker)
    return tickers or FALLBACK_TICKERS


def load_market_rs_universe_tickers(membership_key: str) -> list[str]:
    payload = parse_js_payload(MARKET_RS_DATA_PATH, "marketRsData")
    tickers: list[str] = []
    seen: set[str] = set()
    for row in payload.get("rows", []):
        if not isinstance(row, dict):
            continue
        memberships = row.get("memberships")
        if not isinstance(memberships, dict) or not memberships.get(membership_key):
            continue
        ticker = str(row.get("ticker") or "").strip()
        if not ticker or ticker in seen:
            continue
        seen.add(ticker)
        tickers.append(ticker)
    return tickers


def merge_ticker_lists(*ticker_lists: list[str]) -> list[str]:
    tickers: list[str] = []
    seen: set[str] = set()
    for ticker_list in ticker_lists:
        for ticker in ticker_list:
            normalized = str(ticker or "").strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            tickers.append(normalized)
    return tickers


def build_ticker_payload(ticker: str) -> dict[str, object]:
    symbol = ticker
    yf_ticker = yf.Ticker(symbol)
    try:
        earnings_dates = yf_ticker.earnings_dates
    except Exception:
        earnings_dates = None
    try:
        earnings_history = yf_ticker.earnings_history
    except Exception:
        earnings_history = None

    if earnings_dates is None or earnings_dates.empty:
        return {"ticker": ticker, "sourceTicker": symbol, "quarters": []}

    reported = earnings_dates.copy()
    reported = reported[pd.notna(reported.get("Reported EPS"))]
    reported = reported.sort_index().tail(4)

    periods: list[str | None] = []
    if earnings_history is not None and not earnings_history.empty:
        periods = [clean_date(index) for index in earnings_history.sort_index().tail(len(reported)).index]

    quarters: list[dict[str, object]] = []
    for idx, (_, row) in enumerate(reported.iterrows()):
        estimate = clean_number(row.get("EPS Estimate"), 4)
        actual = clean_number(row.get("Reported EPS"), 4)
        surprise_pct = clean_number(row.get("Surprise(%)"), 2)
        surprise_value = clean_number(actual - estimate, 4) if actual is not None and estimate is not None else None
        quarters.append(
            {
                "period": periods[idx] if idx < len(periods) else None,
                "releaseDate": clean_date(row.name),
                "eps": {
                    "estimate": estimate,
                    "actual": actual,
                    "surpriseValue": surprise_value,
                    "surprisePct": surprise_pct,
                },
            }
        )

    return {"ticker": ticker, "sourceTicker": symbol, "quarters": quarters}


def main() -> None:
    briefing_tickers = load_daily_briefing_tickers()
    nasdaq100_tickers = load_market_rs_universe_tickers("nasdaq100")
    sp500_tickers = load_market_rs_universe_tickers("sp500")
    russell2000_tickers = load_market_rs_universe_tickers("russell2000")
    tickers = merge_ticker_lists(briefing_tickers, nasdaq100_tickers, sp500_tickers, russell2000_tickers) or FALLBACK_TICKERS
    existing_profiles = load_existing_profiles()
    profiles: dict[str, object] = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(build_ticker_payload, ticker): ticker for ticker in tickers}
        for future in as_completed(futures):
            ticker = futures[future]
            try:
                profile = future.result()
            except Exception as exc:
                profile = {"ticker": ticker, "sourceTicker": ticker, "quarters": [], "error": str(exc)}
            if not profile.get("quarters") and ticker in existing_profiles:
                profile = dict(existing_profiles[ticker])
                profile["fallback"] = True
            profiles[ticker] = profile
    profiles = {ticker: profiles[ticker] for ticker in tickers if ticker in profiles}
    covered_count = sum(1 for profile in profiles.values() if profile.get("quarters"))
    payload = {
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "scope": {
            "universe": "Daily Briefing sector map + NASDAQ 100 + S&P 500 + Russell 2000",
            "source": "Yahoo Finance via yfinance earnings_dates",
            "tickerCount": len(tickers),
            "coveredCount": covered_count,
            "sources": {
                "dailyBriefing": len(briefing_tickers),
                "nasdaq100": len(nasdaq100_tickers),
                "sp500": len(sp500_tickers),
                "russell2000": len(russell2000_tickers),
            },
            "basis": "Recent 4 reported quarters. EPS estimate, reported EPS, EPS beat/shock value, and surprise percentage only.",
        },
        "profiles": profiles,
    }
    OUTPUT_PATH.write_text(
        "window.marketCanslimEarningsData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Tickers: {len(tickers)} / EPS profiles with data: {covered_count}")
    print(
        "Sources: "
        f"Daily Briefing {len(briefing_tickers)} / "
        f"NASDAQ 100 {len(nasdaq100_tickers)} / "
        f"S&P 500 {len(sp500_tickers)} / "
        f"Russell 2000 {len(russell2000_tickers)}"
    )


if __name__ == "__main__":
    main()

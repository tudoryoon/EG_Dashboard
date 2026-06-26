from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "market-canslim-earnings-data.js"
TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"]


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
                "revenue": {
                    "estimate": None,
                    "actual": None,
                    "surpriseValue": None,
                    "surprisePct": None,
                    "status": "pending",
                },
                "operatingIncome": {
                    "estimate": None,
                    "actual": None,
                    "surpriseValue": None,
                    "surprisePct": None,
                    "status": "pending",
                },
            }
        )

    return {"ticker": ticker, "sourceTicker": symbol, "quarters": quarters}


def main() -> None:
    existing_profiles = load_existing_profiles()
    profiles: dict[str, object] = {}
    for ticker in TICKERS:
        profile = build_ticker_payload(ticker)
        if not profile.get("quarters") and ticker in existing_profiles:
            profile = existing_profiles[ticker]
            profile["fallback"] = True
        profiles[ticker] = profile
    payload = {
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "scope": {
            "universe": "M7 prototype",
            "source": "Yahoo Finance via yfinance earnings_dates",
            "basis": "Recent 4 reported quarters. EPS estimate, reported EPS, and surprise percentage are populated. Revenue and operating-income consensus fields are reserved until a stable free source is connected.",
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


if __name__ == "__main__":
    main()

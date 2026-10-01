from __future__ import annotations

import argparse
import gzip
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
RS_PATH = ROOT / "data" / "market-rs-data.js"
OUTPUT_PATH = ROOT / "data" / "market-breadth-data.js"
WARMUP_PATH = ROOT / "data" / "market-breadth-warmup.json.gz"
WINDOW = 252
START = "2025-01-01"
yf.set_tz_cache_location(str(ROOT / ".yfinance-cache"))


def load_rs() -> dict:
    text = RS_PATH.read_text(encoding="utf-8").strip()
    return json.loads(text.removeprefix("window.marketRsData = ").rstrip(";"))


def load_warmup() -> dict:
    if WARMUP_PATH.exists():
        return json.loads(gzip.decompress(WARMUP_PATH.read_bytes()))
    return {"dates": [], "prices": {}, "unavailable": {}}


def save_warmup(cache: dict) -> None:
    raw = json.dumps(cache, separators=(",", ":"), sort_keys=True).encode()
    WARMUP_PATH.write_bytes(gzip.compress(raw, mtime=0))


def get_close(frame: pd.DataFrame, ticker: str) -> pd.Series:
    if frame.empty:
        return pd.Series(dtype=float)
    try:
        part = frame[ticker] if isinstance(frame.columns, pd.MultiIndex) else frame
        close = part["Close"].dropna()
    except KeyError:
        return pd.Series(dtype=float)
    close.index = pd.to_datetime(close.index).tz_localize(None)
    return close.loc[(close > 0) & np.isfinite(close)]


def backfill_warmup(source: dict, cache: dict, *, full: bool = False) -> dict:
    rows = [row for row in source["rows"] if not row.get("isIndex")]
    dates = source["historyDates"]
    missing = []
    for row in rows:
        ticker = row["ticker"]
        if ticker in cache["prices"]:
            continue
        previous_failure = cache["unavailable"].get(ticker, "")
        if not full and previous_failure:
            age = (datetime.now(timezone.utc).date() - pd.Timestamp(previous_failure).date()).days
            if age < 7:
                continue
        history = source["histories"].get(ticker, {}).get("price", [])
        first = next((dates[i] for i, value in enumerate(history) if value is not None), None)
        # A later listing cannot have enough pre-2025 history for the first chart date.
        if first and first > dates[0]:
            continue
        missing.append(ticker)
    if not full:
        missing = missing[:30]
    if not missing and cache["dates"]:
        return cache
    today = datetime.now(timezone.utc).date().isoformat()
    for offset in range(0, max(1, len(missing)), 80):
        batch = missing[offset:offset + 80]
        symbols = batch + (["^GSPC"] if not cache["dates"] else [])
        if not symbols:
            continue
        frame = yf.download(symbols, start="2024-01-01", end="2025-01-01", auto_adjust=False,
                            progress=False, threads=8, group_by="ticker", timeout=20)
        if not cache["dates"]:
            benchmark = get_close(frame, "^GSPC")
            if len(benchmark) < 251:
                raise RuntimeError("Insufficient 2024 benchmark sessions for Breadth")
            cache["dates"] = [day.strftime("%Y-%m-%d") for day in benchmark.index]
        index = pd.to_datetime(cache["dates"])
        for ticker in batch:
            close = get_close(frame, ticker)
            if close.empty:
                cache["unavailable"][ticker] = today
                continue
            aligned = close.reindex(index)
            cache["prices"][ticker] = [None if pd.isna(value) else round(float(value), 2) for value in aligned]
            cache["unavailable"].pop(ticker, None)
        save_warmup(cache)
        print(f"Breadth warmup {min(offset + len(batch), len(missing))}/{len(missing)}; cached {len(cache['prices'])}", flush=True)
    return cache


def build_breadth(source: dict, cache: dict) -> dict:
    dates = source["historyDates"]
    warm_dates = cache["dates"]
    high_count = np.zeros(len(dates), dtype=int)
    low_count = np.zeros(len(dates), dtype=int)
    eligible_count = np.zeros(len(dates), dtype=int)
    rows = [row for row in source["rows"] if not row.get("isIndex")]
    for row in rows:
        ticker = row["ticker"]
        current = source["histories"].get(ticker, {}).get("price", [])
        if len(current) != len(dates):
            raise ValueError(f"Breadth price history length mismatch: {ticker}")
        prior = cache["prices"].get(ticker, [None] * len(warm_dates))
        if len(prior) != len(warm_dates):
            raise ValueError(f"Breadth warmup history length mismatch: {ticker}")
        prices = pd.Series(prior + current, dtype=float)
        valid = prices.where((prices > 0) & np.isfinite(prices))
        rolling = valid.rolling(WINDOW, min_periods=WINDOW)
        high = rolling.max().iloc[len(warm_dates):].to_numpy()
        low = rolling.min().iloc[len(warm_dates):].to_numpy()
        close = valid.iloc[len(warm_dates):].to_numpy()
        eligible = np.isfinite(high) & np.isfinite(low) & np.isfinite(close)
        eligible_count += eligible
        high_count += eligible & (close >= high - 1e-9)
        low_count += eligible & (close <= low + 1e-9)
    selected = [i for i, day in enumerate(dates) if day >= START]
    if not selected:
        raise ValueError("No Breadth dates since 2025")
    if eligible_count[selected[0]] < len(rows) * .8:
        raise ValueError(f"Insufficient 2024 warmup coverage: {eligible_count[selected[0]]}/{len(rows)}")
    return {
        "updatedAt": source["updatedAt"], "startDate": START, "window": WINDOW,
        "universeCount": len(rows), "universeBasis": "current-rs-all", "priceBasis": "close",
        "dates": [dates[i] for i in selected],
        "series": {"newHigh": high_count[selected].tolist(), "newLow": low_count[selected].tolist(),
                   "eligible": eligible_count[selected].tolist()},
        "source": {"label": "EG RS ALL closing prices / Yahoo Finance 2024 warmup",
                   "input": "data/market-rs-data.js", "warmupInput": "data/market-breadth-warmup.json.gz"},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily 52-week closing-price highs/lows from the RS ALL universe")
    parser.add_argument("--backfill", action="store_true", help="Backfill all missing 2024 symbols; daily runs cap downloads at 30")
    args = parser.parse_args()
    source = load_rs()
    cache = backfill_warmup(source, load_warmup(), full=args.backfill)
    payload = build_breadth(source, cache)
    OUTPUT_PATH.write_text("window.marketBreadthData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8", newline="\n")
    print(f"Breadth {payload['dates'][0]} to {payload['updatedAt']}: highs {payload['series']['newHigh'][-1]}, lows {payload['series']['newLow'][-1]}, eligible {payload['series']['eligible'][-1]}", flush=True)


if __name__ == "__main__":
    main()

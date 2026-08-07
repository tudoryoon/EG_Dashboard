from __future__ import annotations

from bisect import bisect_right
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

import yfinance as yf


START_DATE = "2017-01-01"
SYMBOLS = [
    {"key": "aapl", "symbol": "AAPL", "label": "AAPL", "color": "#6b7280", "isIndex": False},
    {"key": "msft", "symbol": "MSFT", "label": "MSFT", "color": "#2563eb", "isIndex": False},
    {"key": "googl", "symbol": "GOOGL", "label": "GOOGL", "color": "#db4437", "isIndex": False},
    {"key": "amzn", "symbol": "AMZN", "label": "AMZN", "color": "#f59e0b", "isIndex": False},
    {"key": "meta", "symbol": "META", "label": "META", "color": "#0ea5e9", "isIndex": False},
    {"key": "nvda", "symbol": "NVDA", "label": "NVDA", "color": "#16a34a", "isIndex": False},
    {"key": "tsla", "symbol": "TSLA", "label": "TSLA", "color": "#dc2626", "isIndex": False},
]


def yahoo_chart_url(symbol: str) -> str:
    encoded = quote(symbol, safe="")
    period2 = int(datetime.now(timezone.utc).timestamp())
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1=1483228800&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request) as response:  # nosec B310 - fixed public Yahoo Finance endpoint
        return json.loads(response.read().decode("utf-8"))


def fetch_shares_history(symbol: str) -> list[tuple[str, float]]:
    shares = yf.Ticker(symbol).get_shares_full(start=START_DATE)
    if shares is None or shares.empty:
        raise RuntimeError(f"No shares-outstanding history returned for {symbol}")

    points: list[tuple[str, float]] = []
    for timestamp, value in shares.items():
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(numeric) or numeric <= 0:
            continue
        points.append((timestamp.date().isoformat(), numeric))
    if not points:
        raise RuntimeError(f"No valid shares-outstanding history returned for {symbol}")
    return sorted(points)


def parse_split_events(result: dict[str, object]) -> list[tuple[str, float]]:
    events = ((result.get("events") or {}).get("splits") or {}).values()
    splits: list[tuple[str, float]] = []
    for event in events:
        numerator = event.get("numerator")
        denominator = event.get("denominator")
        try:
            ratio = float(numerator) / float(denominator)
        except (TypeError, ValueError, ZeroDivisionError):
            ratio_text = str(event.get("splitRatio") or "")
            try:
                left, right = ratio_text.split(":", 1)
                ratio = float(left) / float(right)
            except (TypeError, ValueError, ZeroDivisionError):
                continue
        timestamp = event.get("date")
        if not timestamp or not math.isfinite(ratio) or ratio <= 0:
            continue
        splits.append((datetime.fromtimestamp(int(timestamp), tz=timezone.utc).strftime("%Y-%m-%d"), ratio))
    return sorted(splits)


def normalize_shares_history(
    shares_history: list[tuple[str, float]], splits: list[tuple[str, float]]
) -> list[tuple[str, float]]:
    grouped: dict[str, list[float]] = {}
    for day, shares in shares_history:
        future_split_factor = math.prod(ratio for split_day, ratio in splits if split_day > day)
        grouped.setdefault(day, []).append(shares * future_split_factor)

    normalized: list[tuple[str, float]] = []
    previous: float | None = None
    for day in sorted(grouped):
        candidates = grouped[day]
        if previous is None:
            selected = sorted(candidates)[len(candidates) // 2]
        else:
            selected = min(candidates, key=lambda value: abs(math.log(value / previous)))
            ratio = selected / previous
            if ratio < 0.7 or ratio > 1.3:
                selected = previous
        normalized.append((day, selected))
        previous = selected
    return normalized


def build_market_caps(
    dates: list[str], raw_closes: list[float], shares_history: list[tuple[str, float]]
) -> list[float | None]:
    share_dates = [day for day, _ in shares_history]
    share_values = [value for _, value in shares_history]
    market_caps: list[float | None] = []

    for day, close in zip(dates, raw_closes):
        share_index = bisect_right(share_dates, day) - 1
        if share_index < 0:
            share_index = 0
        shares = share_values[share_index]
        market_caps.append(round(close * shares / 1_000_000_000, 4))
    return market_caps


def build_item(meta: dict[str, object]) -> dict[str, object]:
    payload = fetch_json(yahoo_chart_url(str(meta["symbol"])))
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = (result.get("indicators") or {}).get("quote") or [{}]
    adjclose_data = (result.get("indicators") or {}).get("adjclose") or [{}]
    closes = adjclose_data[0].get("adjclose") or quote_data[0].get("close") or []
    quote_closes = quote_data[0].get("close") or []

    dates: list[str] = []
    values: list[float] = []
    raw_values: list[float] = []
    for index, timestamp in enumerate(timestamps):
        close = closes[index] if index < len(closes) else None
        raw_close = quote_closes[index] if index < len(quote_closes) else close
        if close is None:
            continue
        if raw_close is None:
            raw_close = close
        dates.append(datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d"))
        values.append(round(float(close), 4))
        raw_values.append(round(float(raw_close), 4))

    filtered = [(day, value, raw_value) for day, value, raw_value in zip(dates, values, raw_values) if day >= START_DATE]
    filtered_dates = [day for day, _, _ in filtered]
    filtered_raw_values = [raw_value for _, _, raw_value in filtered]
    splits = parse_split_events(result)
    shares_history = normalize_shares_history(fetch_shares_history(str(meta["symbol"])), splits)
    market_caps = build_market_caps(filtered_dates, filtered_raw_values, shares_history)
    return {
        "label": meta["label"],
        "symbol": meta["symbol"],
        "color": meta["color"],
        "isIndex": meta["isIndex"],
        "dates": filtered_dates,
        "values": [value for _, value, _ in filtered],
        "marketCaps": market_caps,
        "marketCapUnit": "USD billions",
    }


def main() -> None:
    items = {meta["key"]: build_item(meta) for meta in SYMBOLS}
    latest_dates = [item["dates"][-1] for item in items.values() if item["dates"]]
    payload = {
        "updatedAt": max(latest_dates) if latest_dates else "",
        "startDate": START_DATE,
        "defaultRange": "3y",
        "ranges": [
            {"key": "1m", "label": "1M"},
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "ytd", "label": "YTD"},
            {"key": "1y", "label": "1Y"},
            {"key": "3y", "label": "3Y"},
            {"key": "5y", "label": "5Y"},
            {"key": "max", "label": "Max"},
        ],
        "items": items,
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "m7-price-data.js"
    output_path.write_text(
        "window.m7PriceData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from datetime import datetime, time as datetime_time, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


START_DATE = "1965-01-01"
SYMBOLS = [
    {"key": "sp500", "symbol": "^GSPC", "label": "S&P 500", "color": "#6b7280", "isIndex": True},
    {"key": "nasdaq", "symbol": "^IXIC", "label": "NASDAQ Composite", "color": "#2563eb", "isIndex": True},
    {"key": "nasdaq100", "symbol": "^NDX", "label": "NASDAQ 100", "color": "#111827", "isIndex": True},
    {"key": "dowjones", "symbol": "^DJI", "label": "Dow Jones", "color": "#4b5563", "isIndex": True},
    {"key": "russell2000", "symbol": "^RUT", "label": "Russell 2000", "color": "#9ca3af", "isIndex": True},
    {"key": "sox", "symbol": "^SOX", "label": "SOX", "color": "#dc2626", "isIndex": True},
    {"key": "smh", "symbol": "SMH", "label": "SMH", "color": "#dc2626", "isIndex": False},
]


def yahoo_chart_url(symbol: str) -> str:
    encoded = quote(symbol, safe="")
    period2 = int(datetime.now(timezone.utc).timestamp())
    period1 = int(datetime.fromisoformat(f"{START_DATE}T00:00:00+00:00").timestamp())
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1={period1}&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request) as response:  # nosec B310 - fixed public Yahoo Finance endpoint
        return json.loads(response.read().decode("utf-8"))


def exclude_incomplete_session(
    rows: list[tuple[str, float, float, float, float]],
) -> list[tuple[str, float, float, float, float]]:
    if not rows:
        return rows
    now_new_york = datetime.now(ZoneInfo("America/New_York"))
    if now_new_york.weekday() >= 5 or now_new_york.time() >= datetime_time(16, 10):
        return rows
    current_day = now_new_york.date().isoformat()
    return [row for row in rows if row[0] < current_day]


def load_existing_updated_at(output_path: Path) -> str | None:
    if not output_path.exists():
        return None
    try:
        text = output_path.read_text(encoding="utf-8").strip()
        prefix = "window.marketPriceData = "
        if text.startswith(prefix):
            text = text[len(prefix) :]
        value = json.loads(text.rstrip(";")).get("updatedAt")
        return str(value) if value else None
    except Exception:
        return None


def build_item(meta: dict[str, object]) -> dict[str, object]:
    payload = fetch_json(yahoo_chart_url(str(meta["symbol"])))
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = (result.get("indicators") or {}).get("quote") or [{}]
    adjclose_data = (result.get("indicators") or {}).get("adjclose") or [{}]
    quote = quote_data[0] or {}
    raw_closes = quote.get("close") or []
    raw_highs = quote.get("high") or []
    raw_lows = quote.get("low") or []
    adj_closes = adjclose_data[0].get("adjclose") or []

    dates: list[str] = []
    values: list[float] = []
    highs: list[float] = []
    lows: list[float] = []
    closes: list[float] = []
    for index, timestamp in enumerate(timestamps):
        raw_close = raw_closes[index] if index < len(raw_closes) else None
        raw_high = raw_highs[index] if index < len(raw_highs) else None
        raw_low = raw_lows[index] if index < len(raw_lows) else None
        adj_close = adj_closes[index] if index < len(adj_closes) else None
        close = adj_close if adj_close is not None else raw_close
        if close is None or raw_high is None or raw_low is None:
            continue
        adjustment = 1.0
        if raw_close not in (None, 0) and adj_close is not None:
            adjustment = float(adj_close) / float(raw_close)
        dates.append((datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=timestamp)).strftime("%Y-%m-%d"))
        values.append(round(float(close), 4))
        highs.append(round(float(raw_high) * adjustment, 4))
        lows.append(round(float(raw_low) * adjustment, 4))
        closes.append(round(float(close), 4))

    filtered = exclude_incomplete_session([
        (day, value, high, low, close)
        for day, value, high, low, close in zip(dates, values, highs, lows, closes)
        if day >= START_DATE
    ])
    return {
        "label": meta["label"],
        "symbol": meta["symbol"],
        "color": meta["color"],
        "isIndex": meta["isIndex"],
        "dates": [day for day, *_ in filtered],
        "values": [value for _, value, *_ in filtered],
        "highs": [high for _, _, high, _, _ in filtered],
        "lows": [low for _, _, _, low, _ in filtered],
        "closes": [close for _, _, _, _, close in filtered],
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

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-price-data.js"
    existing_updated_at = load_existing_updated_at(output_path)
    candidate_updated_at = str(payload.get("updatedAt") or "")
    if existing_updated_at and candidate_updated_at and candidate_updated_at < existing_updated_at:
        print(
            "Skipped market price write because the provider regressed "
            f"from {existing_updated_at} to {candidate_updated_at}.",
            flush=True,
        )
        return
    output_path.write_text(
        "window.marketPriceData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()

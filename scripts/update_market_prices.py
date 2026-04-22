from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


START_DATE = "2017-01-01"
SYMBOLS = [
    {"key": "sp500", "symbol": "SPY", "label": "S&P 500", "color": "#6b7280", "isIndex": True},
    {"key": "nasdaq100", "symbol": "QQQ", "label": "NASDAQ 100", "color": "#111827", "isIndex": True},
    {"key": "dowjones", "symbol": "DIA", "label": "Dow Jones", "color": "#4b5563", "isIndex": True},
    {"key": "russell2000", "symbol": "IWM", "label": "Russell 2000", "color": "#9ca3af", "isIndex": True},
    {"key": "m7etf", "symbol": "MAGS", "label": "M7 Index ETF", "color": "#2563eb", "isIndex": False},
    {"key": "smh", "symbol": "SMH", "label": "SMH", "color": "#dc2626", "isIndex": False},
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


def build_item(meta: dict[str, object]) -> dict[str, object]:
    payload = fetch_json(yahoo_chart_url(str(meta["symbol"])))
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = (result.get("indicators") or {}).get("quote") or [{}]
    adjclose_data = (result.get("indicators") or {}).get("adjclose") or [{}]
    closes = adjclose_data[0].get("adjclose") or quote_data[0].get("close") or []

    dates: list[str] = []
    values: list[float] = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        dates.append(datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d"))
        values.append(round(float(close), 4))

    filtered = [(day, value) for day, value in zip(dates, values) if day >= START_DATE]
    return {
        "label": meta["label"],
        "symbol": meta["symbol"],
        "color": meta["color"],
        "isIndex": meta["isIndex"],
        "dates": [day for day, _ in filtered],
        "values": [value for _, value in filtered],
    }


def main() -> None:
    items = {meta["key"]: build_item(meta) for meta in SYMBOLS}
    latest_dates = [item["dates"][-1] for item in items.values() if item["dates"]]
    payload = {
        "updatedAt": max(latest_dates) if latest_dates else "",
        "startDate": START_DATE,
        "defaultRange": "max",
        "ranges": [
            {"key": "1m", "label": "1M"},
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "1y", "label": "1Y"},
            {"key": "3y", "label": "3Y"},
            {"key": "5y", "label": "5Y"},
            {"key": "max", "label": "Max"},
        ],
        "items": items,
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-price-data.js"
    output_path.write_text(
        "window.marketPriceData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()

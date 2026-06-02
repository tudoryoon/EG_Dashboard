from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


START_DATE = "2003-01-01"
LOOKBACK_SESSIONS = 252
SYMBOLS = {
    "capWeighted": {"symbol": "SPY", "label": "S&P 500 Cap Weighted ETF"},
    "equalWeighted": {"symbol": "RSP", "label": "S&P 500 Equal Weight ETF"},
}
RANGES = [
    {"key": "1y", "label": "1Y"},
    {"key": "3y", "label": "3Y"},
    {"key": "5y", "label": "5Y"},
    {"key": "10y", "label": "10Y"},
    {"key": "max", "label": "Max"},
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
    with urlopen(request, timeout=30) as response:  # nosec B310 - fixed public Yahoo Finance endpoint
        return json.loads(response.read().decode("utf-8"))


def build_price_item(symbol: str) -> dict[str, list]:
    payload = fetch_json(yahoo_chart_url(symbol))
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
        day = (datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=timestamp)).strftime("%Y-%m-%d")
        if day < START_DATE:
            continue
        dates.append(day)
        values.append(float(close))
    return {"dates": dates, "values": values}


def pct_change(values: list[float], index: int, lookback: int) -> float | None:
    if index < lookback:
        return None
    previous = values[index - lookback]
    current = values[index]
    if previous == 0:
        return None
    return ((current / previous) - 1) * 100


def main() -> None:
    cap_item = build_price_item(SYMBOLS["capWeighted"]["symbol"])
    equal_item = build_price_item(SYMBOLS["equalWeighted"]["symbol"])
    cap_by_date = dict(zip(cap_item["dates"], cap_item["values"]))
    equal_by_date = dict(zip(equal_item["dates"], equal_item["values"]))
    common_dates = sorted(set(cap_by_date) & set(equal_by_date))
    cap_values = [cap_by_date[day] for day in common_dates]
    equal_values = [equal_by_date[day] for day in common_dates]

    dates: list[str] = []
    spread_values: list[float] = []
    cap_returns: list[float] = []
    equal_returns: list[float] = []
    for index, day in enumerate(common_dates):
        cap_return = pct_change(cap_values, index, LOOKBACK_SESSIONS)
        equal_return = pct_change(equal_values, index, LOOKBACK_SESSIONS)
        if cap_return is None or equal_return is None:
            continue
        dates.append(day)
        cap_returns.append(round(cap_return, 2))
        equal_returns.append(round(equal_return, 2))
        spread_values.append(round(equal_return - cap_return, 2))

    latest_spread = spread_values[-1] if spread_values else None
    latest_state = (
        "Expansion"
        if latest_spread is not None and latest_spread >= 0
        else "Narrowing"
        if latest_spread is not None and latest_spread > -10
        else "Strong Narrowing"
    )

    payload = {
        "updatedAt": dates[-1] if dates else "",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "startDate": dates[0] if dates else START_DATE,
        "defaultRange": "3y",
        "ranges": RANGES,
        "source": {
            "name": "Yahoo Finance adjusted close data",
            "symbols": {
                "capWeighted": SYMBOLS["capWeighted"],
                "equalWeighted": SYMBOLS["equalWeighted"],
            },
            "note": "Free proxy: RSP 52-week total-return proxy minus SPY 52-week total-return proxy. Negative values mean cap-weighted S&P 500 is outperforming equal-weight S&P 500.",
        },
        "panels": {
            "sp500EqualWeightSpread52w": {
                "key": "sp500EqualWeightSpread52w",
                "label": "S&P 500 52W Breadth Spread",
                "subtitle": "Equal-weight 52W return minus cap-weight 52W return",
                "unit": "percentagePoint",
                "dates": dates,
                "values": spread_values,
                "capWeightedReturns": cap_returns,
                "equalWeightedReturns": equal_returns,
                "latest": latest_spread,
                "latestState": latest_state,
                "thresholds": [
                    {"value": 0, "label": "Expansion"},
                    {"value": -5, "label": "Watch"},
                    {"value": -10, "label": "Narrowing"},
                ],
            }
        },
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-breadth-data.js"
    output_path.write_text(
        "window.marketBreadthData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()

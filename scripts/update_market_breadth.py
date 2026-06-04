from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


START_DATE = "2003-01-01"
LOOKBACK_SESSIONS = 252
PROXIES = {
    "sp500": {
        "label": "S&P 500",
        "description": "RSP equal-weight ETF minus SPY cap-weight ETF",
        "capWeighted": {"symbol": "SPY", "label": "SPY"},
        "equalWeighted": {"symbol": "RSP", "label": "RSP"},
        "color": "#2563eb",
    },
    "nasdaq100": {
        "label": "NASDAQ 100",
        "description": "QQEW equal-weight ETF minus QQQ cap-weight ETF",
        "capWeighted": {"symbol": "QQQ", "label": "QQQ"},
        "equalWeighted": {"symbol": "QQEW", "label": "QQEW"},
        "color": "#7c3aed",
    },
    "dow30": {
        "label": "Dow 30",
        "description": "EDOW equal-weight Dow 30 ETF minus DIA Dow Jones Industrial Average ETF",
        "capWeighted": {"symbol": "DIA", "label": "DIA"},
        "equalWeighted": {"symbol": "EDOW", "label": "EDOW"},
        "color": "#6b7280",
    },
    "russell2000": {
        "label": "Russell 2000",
        "description": "FNDA fundamental-weighted small-cap ETF minus IWM Russell 2000 ETF proxy",
        "capWeighted": {"symbol": "IWM", "label": "IWM"},
        "equalWeighted": {"symbol": "FNDA", "label": "FNDA"},
        "color": "#059669",
    },
    "semiconductors": {
        "label": "SOX / Semis",
        "description": "XSD equal-weight semiconductor ETF minus SOXX semiconductor ETF",
        "capWeighted": {"symbol": "SOXX", "label": "SOXX"},
        "equalWeighted": {"symbol": "XSD", "label": "XSD"},
        "color": "#dc2626",
    },
}
RANGES = [
    {"key": "1m", "label": "1M"},
    {"key": "3m", "label": "3M"},
    {"key": "6m", "label": "6M"},
    {"key": "ytd", "label": "YTD"},
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


def classify_spread(value: float | None) -> str:
    if value is None:
        return "-"
    if value >= 0:
        return "Expansion"
    if value <= -10:
        return "Strong Narrowing"
    return "Narrowing"


def build_spread_series(config: dict[str, object]) -> dict[str, object]:
    cap_symbol = config["capWeighted"]["symbol"]  # type: ignore[index]
    equal_symbol = config["equalWeighted"]["symbol"]  # type: ignore[index]
    cap_item = build_price_item(str(cap_symbol))
    equal_item = build_price_item(str(equal_symbol))
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
    return {
        "label": config["label"],
        "description": config["description"],
        "color": config["color"],
        "capWeighted": config["capWeighted"],
        "equalWeighted": config["equalWeighted"],
        "dates": dates,
        "values": spread_values,
        "capWeightedReturns": cap_returns,
        "equalWeightedReturns": equal_returns,
        "latest": latest_spread,
        "latestState": classify_spread(latest_spread),
        "startDate": dates[0] if dates else START_DATE,
        "updatedAt": dates[-1] if dates else "",
    }


def main() -> None:
    series = {key: build_spread_series(config) for key, config in PROXIES.items()}
    updated_dates = [item["updatedAt"] for item in series.values() if item.get("updatedAt")]
    start_dates = [item["startDate"] for item in series.values() if item.get("startDate")]
    sp500 = series["sp500"]

    panel = {
        "key": "breadthSpread52w",
        "label": "52W Breadth / Concentration Spread",
        "subtitle": "NASDAQ100, S&P500, Dow30, Russell2000, SOX equal-weight proxy 52W return minus representative benchmark ETF 52W return",
        "unit": "percentagePoint",
        "series": series,
        "thresholds": [
            {"value": 0, "label": "Expansion"},
            {"value": -5, "label": "Watch"},
            {"value": -10, "label": "Narrowing"},
        ],
    }

    payload = {
        "updatedAt": max(updated_dates) if updated_dates else "",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "startDate": min(start_dates) if start_dates else START_DATE,
        "defaultRange": "3y",
        "ranges": RANGES,
        "source": {
            "name": "Yahoo Finance adjusted close data",
            "proxies": {
                key: {
                    "label": value["label"],
                    "equalWeighted": value["equalWeighted"],
                    "capWeighted": value["capWeighted"],
                    "description": value["description"],
                }
                for key, value in PROXIES.items()
            },
            "note": (
                "Free proxy: equal-weight ETF 52-week return minus representative cap-weight or benchmark ETF "
                "52-week return. Positive means broader participation; negative means concentration in larger names."
            ),
        },
        "panels": {
            "breadthSpread52w": panel,
            "sp500EqualWeightSpread52w": {
                "key": "sp500EqualWeightSpread52w",
                "label": "S&P 500 52W Breadth Spread",
                "subtitle": "RSP 52W return minus SPY 52W return",
                "unit": "percentagePoint",
                **sp500,
                "thresholds": panel["thresholds"],
            },
        },
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-breadth-data.js"
    output_path.write_text(
        "window.marketBreadthData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {output_path}")
    for key, item in series.items():
        print(f"{key}: {item['updatedAt']} {item['latest']}")


if __name__ == "__main__":
    main()

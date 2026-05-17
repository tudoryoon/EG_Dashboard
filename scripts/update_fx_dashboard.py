from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


DATA_PATH = Path("data/market-macro-data.js")
FX_START_DATE = "1971-01-01"
YAHOO_PERIOD1 = int(datetime.strptime(FX_START_DATE, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())

FX_YAHOO_SYMBOLS = {
    "dxy": "DX-Y.NYB",
    "jpy_usd": "JPY=X",
    "krw_usd": "KRW=X",
    "chf_usd": "CHF=X",
    "cny_usd": "CNY=X",
    "gbp_usd": "GBPUSD=X",
    "eur_usd": "EURUSD=X",
}


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    last_error: Exception | None = None
    for _ in range(3):
        try:
            with urlopen(request, timeout=60) as response:  # nosec B310 - fixed public endpoint
                return response.read().decode("utf-8")
        except Exception as error:  # pragma: no cover - network variability
            last_error = error
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def yahoo_chart_url(symbol: str) -> str:
    period2 = int(datetime.now(timezone.utc).timestamp())
    encoded = quote(symbol, safe="")
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1={YAHOO_PERIOD1}&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def parse_yahoo_series(symbol: str) -> tuple[list[str], list[float]]:
    payload = json.loads(fetch_text(yahoo_chart_url(symbol)))
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = (result.get("indicators") or {}).get("quote") or [{}]
    adjclose_data = (result.get("indicators") or {}).get("adjclose") or [{}]
    closes = adjclose_data[0].get("adjclose") or quote_data[0].get("close") or []

    by_date: dict[str, float] = {}
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        date_key = (datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=timestamp)).strftime("%Y-%m-%d")
        if date_key < FX_START_DATE:
            continue
        by_date[date_key] = round(float(close), 4)

    dates = sorted(by_date)
    return dates, [by_date[date] for date in dates]


def load_payload() -> dict:
    raw = DATA_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.marketMacroData = "
    if not raw.startswith(prefix):
        raise ValueError(f"Unexpected data wrapper in {DATA_PATH}")
    return json.loads(raw[len(prefix) :].rstrip(";"))


def merge_series(existing: dict, dates: list[str], values: list[float]) -> dict:
    merged = {
        date: value
        for date, value in zip(existing.get("dates", []), existing.get("values", []))
        if date >= FX_START_DATE
    }
    merged.update(dict(zip(dates, values)))
    ordered_dates = sorted(merged)
    return {
        **existing,
        "dates": ordered_dates,
        "values": [merged[date] for date in ordered_dates],
    }


def write_payload(payload: dict) -> None:
    text = "window.marketMacroData = "
    text += json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    text += ";\n"
    DATA_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    payload = load_payload()
    fx_panel = payload["panels"]["fx_dashboard"]
    fx_panel["source"] = "Yahoo Finance daily FX / FRED historical fallback"
    fx_panel["subtitle"] = (
        "Dollar Index plus major USD exchange-rate series from 1971-01-01 where available. "
        "Yahoo Finance is used for the latest daily FX updates; existing historical observations are preserved."
    )

    latest_dates: list[str] = []
    for key, symbol in FX_YAHOO_SYMBOLS.items():
        dates, values = parse_yahoo_series(symbol)
        if not dates:
            raise RuntimeError(f"No Yahoo FX observations returned for {key} ({symbol})")
        fx_panel["series"][key] = merge_series(fx_panel["series"][key], dates, values)
        latest_dates.append(fx_panel["series"][key]["dates"][-1])
        print(f"{key}: {fx_panel['series'][key]['dates'][-1]} {fx_panel['series'][key]['values'][-1]}")

    payload["updatedAt"] = max([payload.get("updatedAt", "")] + latest_dates)
    write_payload(payload)
    print(f"Updated FX dashboard through {max(latest_dates)}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


DATA_PATH = Path("data/market-macro-data.js")
START_DATE = "1965-01-01"
FOOD_START_DATE = "2001-01-01"

YAHOO_SERIES = {
    ("energy", "wti"): ("CL=F", START_DATE),
    ("energy", "brent"): ("BZ=F", START_DATE),
    ("natural_gas", "lng_jkm"): ("JKM=F", START_DATE),
    ("metals", "gold"): ("GC=F", START_DATE),
    ("metals", "silver"): ("SI=F", START_DATE),
    ("metals", "copper"): ("HG=F", START_DATE),
    ("strategic", "iron_ore"): ("TIO=F", START_DATE),
    ("food", "corn"): ("ZC=F", FOOD_START_DATE),
    ("food", "soybeans"): ("ZS=F", FOOD_START_DATE),
    ("food", "wheat_hrw"): ("KE=F", FOOD_START_DATE),
    ("food", "wheat_srw"): ("ZW=F", FOOD_START_DATE),
    ("food", "sugar"): ("SB=F", FOOD_START_DATE),
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


def yahoo_chart_url(symbol: str, start_date: str) -> str:
    period1 = int(datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())
    period2 = int(datetime.now(timezone.utc).timestamp())
    encoded = quote(symbol, safe="")
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1={period1}&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def parse_yahoo_series(symbol: str, start_date: str) -> tuple[list[str], list[float]]:
    payload = json.loads(fetch_text(yahoo_chart_url(symbol, start_date)))
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
        if date_key < start_date:
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


def merge_series(existing: dict, dates: list[str], values: list[float], start_date: str) -> dict:
    merged = {
        date: value
        for date, value in zip(existing.get("dates", []), existing.get("values", []))
        if date >= start_date
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
    latest_dates: list[str] = []

    for (panel_key, series_key), (symbol, start_date) in YAHOO_SERIES.items():
        dates, values = parse_yahoo_series(symbol, start_date)
        if not dates:
            raise RuntimeError(f"No Yahoo observations returned for {panel_key}.{series_key} ({symbol})")
        series = payload["panels"][panel_key]["series"][series_key]
        payload["panels"][panel_key]["series"][series_key] = merge_series(series, dates, values, start_date)
        updated_series = payload["panels"][panel_key]["series"][series_key]
        latest_dates.append(updated_series["dates"][-1])
        print(f"{panel_key}.{series_key}: {updated_series['dates'][-1]} {updated_series['values'][-1]}")

    payload["updatedAt"] = max([payload.get("updatedAt", "")] + latest_dates)
    write_payload(payload)
    print(f"Updated commodity dashboards through {max(latest_dates)}")


if __name__ == "__main__":
    main()

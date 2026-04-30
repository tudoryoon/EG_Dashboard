from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
import requests
import yfinance as yf


WIKI_HEADERS = {"User-Agent": "Mozilla/5.0"}
PRICE_PERIOD = "3y"
BENCHMARK_SYMBOL = "^GSPC"
HISTORY_POINTS = 252
LOOKBACKS = {
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "12m": 252,
}
UNIVERSES = {
    "sp500": {
        "label": "S&P 500",
        "url": "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
        "table_index": 0,
        "ticker_col": "Symbol",
        "name_col": "Security",
    },
    "nasdaq100": {
        "label": "NASDAQ 100",
        "url": "https://en.wikipedia.org/wiki/Nasdaq-100",
        "table_index": 5,
        "ticker_col": "Ticker",
        "name_col": "Company",
    },
    "dowjones": {
        "label": "Dow Jones",
        "url": "https://en.wikipedia.org/wiki/Dow_Jones_Industrial_Average",
        "table_index": 1,
        "ticker_col": "Symbol",
        "name_col": "Company",
    },
}
COLOR_BY_UNIVERSE = {
    "all": "#111827",
    "sp500": "#4b5563",
    "nasdaq100": "#2563eb",
    "dowjones": "#8b5cf6",
}
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-rs-data.js"


def normalize_ticker(raw: object) -> str:
    return str(raw).strip().upper().replace(".", "-")


def fetch_html(url: str) -> str:
    response = requests.get(url, headers=WIKI_HEADERS, timeout=30)
    response.raise_for_status()
    return response.text


def read_wiki_table(url: str, table_index: int) -> pd.DataFrame:
    html = fetch_html(url)
    tables = pd.read_html(StringIO(html))
    return tables[table_index]


def fetch_universe_frame() -> pd.DataFrame:
    merged: dict[str, dict[str, object]] = {}
    for key, meta in UNIVERSES.items():
        table = read_wiki_table(str(meta["url"]), int(meta["table_index"]))
        ticker_col = str(meta["ticker_col"])
        name_col = str(meta["name_col"])
        for _, row in table.iterrows():
            ticker = normalize_ticker(row.get(ticker_col, ""))
            if ticker in {"", "NAN"}:
                continue
            item = merged.setdefault(
                ticker,
                {
                    "ticker": ticker,
                    "name": str(row.get(name_col, ticker)).strip(),
                    "member_sp500": False,
                    "member_nasdaq100": False,
                    "member_dowjones": False,
                },
            )
            item["name"] = str(row.get(name_col, item["name"])).strip()
            item[f"member_{key}"] = True
    return pd.DataFrame(merged.values()).sort_values("ticker").reset_index(drop=True)


def download_batch(symbols: list[str]) -> dict[str, pd.Series]:
    history = yf.download(
        tickers=symbols,
        period=PRICE_PERIOD,
        auto_adjust=True,
        progress=False,
        threads=True,
        group_by="ticker",
    )
    if history.empty:
        return {}

    series_map: dict[str, pd.Series] = {}
    multi = isinstance(history.columns, pd.MultiIndex)
    for symbol in symbols:
        try:
            close = history[symbol]["Close"] if multi else history["Close"]
        except KeyError:
            continue
        close = close.dropna()
        if close.empty:
            continue
        series_map[symbol] = close.rename(symbol)
    return series_map


def fetch_price_frame(symbols: list[str], batch_size: int = 80) -> pd.DataFrame:
    series_map: dict[str, pd.Series] = {}
    for start in range(0, len(symbols), batch_size):
        batch = symbols[start : start + batch_size]
        series_map.update(download_batch(batch))
    if not series_map:
        raise RuntimeError("No price data downloaded for RS universe.")
    return pd.concat(series_map.values(), axis=1).sort_index()


def load_existing_rows() -> dict[str, dict[str, object]]:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    payload = json.loads(re.sub(r"^window\.marketRsData = |;\s*$", "", text))
    return {row["ticker"]: row for row in payload.get("rows", [])}


def fetch_shares_outstanding_for_symbol(symbol: str) -> tuple[str, int | None]:
    try:
        info = yf.Ticker(symbol).get_info()
        shares = info.get("sharesOutstanding") or info.get("impliedSharesOutstanding")
        if shares and float(shares) > 0:
            return symbol, int(float(shares))
    except Exception:
        return symbol, None
    return symbol, None


def build_shares_cache(symbols: list[str], existing_rows: dict[str, dict[str, object]]) -> dict[str, int | None]:
    cache = {
        symbol: int(existing_rows[symbol]["sharesOutstanding"])
        for symbol in symbols
        if symbol in existing_rows and existing_rows[symbol].get("sharesOutstanding")
    }
    missing = [symbol for symbol in symbols if symbol not in cache]
    if not missing:
        return cache

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(fetch_shares_outstanding_for_symbol, symbol): symbol for symbol in missing}
        for future in as_completed(futures):
            symbol, shares = future.result()
            cache[symbol] = shares
    return cache


def percentile_to_rating(frame: pd.DataFrame) -> pd.DataFrame:
    valid_counts = frame.notna().sum(axis=1)
    ranks = frame.rank(axis=1, method="min", ascending=False)
    denominator = (valid_counts - 1).replace(0, 1)
    rating = 99 - (ranks.sub(1, axis=0)).mul(98).div(denominator, axis=0)
    rating = rating.where(frame.notna())
    single_name_mask = valid_counts <= 1
    if single_name_mask.any():
        rating.loc[single_name_mask] = frame.loc[single_name_mask].notna().astype(float) * 99
    return rating.round().clip(lower=1, upper=99)


def build_rs_raw(close_frame: pd.DataFrame) -> pd.DataFrame:
    r3 = close_frame.div(close_frame.shift(LOOKBACKS["3m"])).sub(1)
    r6_bucket = close_frame.shift(LOOKBACKS["3m"]).div(close_frame.shift(LOOKBACKS["6m"])).sub(1)
    r9_bucket = close_frame.shift(LOOKBACKS["6m"]).div(close_frame.shift(189)).sub(1)
    r12_bucket = close_frame.shift(189).div(close_frame.shift(LOOKBACKS["12m"])).sub(1)
    return 0.4 * r3 + 0.2 * r6_bucket + 0.2 * r9_bucket + 0.2 * r12_bucket


def compute_return(series: pd.Series, periods: int) -> float | None:
    if len(series) <= periods:
        return None
    current = series.iloc[-1]
    base = series.iloc[-(periods + 1)]
    if not math.isfinite(current) or not math.isfinite(base) or base == 0:
        return None
    return round((float(current / base) - 1) * 100, 2)


def normalize_line(series: pd.Series) -> list[float | None]:
    first_valid = series.dropna()
    if first_valid.empty:
        return [None for _ in series]
    base = float(first_valid.iloc[0])
    values: list[float | None] = []
    for value in series:
        if value is None or not math.isfinite(value) or base == 0:
            values.append(None)
        else:
            values.append(round(float(value / base) * 100, 2))
    return values


def serialize_price_line(series: pd.Series) -> list[float | None]:
    values: list[float | None] = []
    for value in series:
        if value is None or not math.isfinite(value):
            values.append(None)
        else:
            values.append(round(float(value), 2))
    return values


def build_payload(universe: pd.DataFrame, close_frame: pd.DataFrame, shares_cache: dict[str, int | None]) -> dict[str, object]:
    benchmark = close_frame[BENCHMARK_SYMBOL].dropna()
    stock_close = close_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    rs_raw = build_rs_raw(stock_close)
    rs_rating_all = percentile_to_rating(rs_raw)

    rs_ratings_by_universe = {"all": rs_rating_all}
    for key in UNIVERSES:
        tickers = universe.loc[universe[f"member_{key}"], "ticker"].tolist()
        if not tickers:
            continue
        subset_raw = rs_raw[tickers]
        rs_ratings_by_universe[key] = percentile_to_rating(subset_raw)

    latest_date = rs_rating_all.dropna(how="all").index.max()
    if pd.isna(latest_date):
        raise RuntimeError("Unable to compute an RS rating date for the active universe.")

    latest_loc = rs_rating_all.index.get_loc(latest_date)
    history_start_loc = max(0, latest_loc - HISTORY_POINTS + 1)
    history_dates = [date.strftime("%Y-%m-%d") for date in rs_rating_all.index[history_start_loc : latest_loc + 1]]
    history_rating_all = rs_rating_all.iloc[history_start_loc : latest_loc + 1]

    benchmark_history = benchmark.reindex(history_rating_all.index)
    rows = []
    histories: dict[str, dict[str, object]] = {}

    for _, member in universe.iterrows():
        ticker = str(member["ticker"])
        if ticker not in stock_close.columns:
            continue
        latest_rating = rs_rating_all.at[latest_date, ticker] if ticker in rs_rating_all.columns else None
        if latest_rating is None or pd.isna(latest_rating):
            continue

        price_series = stock_close[ticker].dropna()
        if len(price_series) <= LOOKBACKS["12m"]:
            continue

        current_price = float(price_series.reindex([latest_date]).iloc[0])
        window = stock_close[ticker].reindex(history_rating_all.index)
        rs_line = window.div(benchmark_history)
        shares_outstanding = shares_cache.get(ticker)
        market_cap = None
        if shares_outstanding and shares_outstanding > 0:
            market_cap = round(float(current_price) * int(shares_outstanding))
        rs_line_window = rs_line.dropna().tail(HISTORY_POINTS)
        rs_new_high = False
        if not rs_line_window.empty:
            latest_rs_line = float(rs_line_window.iloc[-1])
            trailing_high = float(rs_line_window.max())
            rs_new_high = latest_rs_line >= trailing_high - 1e-9

        row = {
            "ticker": ticker,
            "name": str(member["name"]),
            "price": round(current_price, 2),
            "marketCap": market_cap,
            "sharesOutstanding": shares_outstanding,
            "rsRatingAll": int(latest_rating),
            "rsRatingSp500": nullable_int(rs_ratings_by_universe.get("sp500", pd.DataFrame()).get(ticker, pd.Series(dtype=float)).get(latest_date)),
            "rsRatingNasdaq100": nullable_int(rs_ratings_by_universe.get("nasdaq100", pd.DataFrame()).get(ticker, pd.Series(dtype=float)).get(latest_date)),
            "rsRatingDowjones": nullable_int(rs_ratings_by_universe.get("dowjones", pd.DataFrame()).get(ticker, pd.Series(dtype=float)).get(latest_date)),
            "returns": {
                "1m": compute_return(price_series, LOOKBACKS["1m"]),
                "3m": compute_return(price_series, LOOKBACKS["3m"]),
                "6m": compute_return(price_series, LOOKBACKS["6m"]),
                "12m": compute_return(price_series, LOOKBACKS["12m"]),
            },
            "distanceTo52wHighPct": compute_52w_gap(price_series),
            "rsNewHigh": rs_new_high,
            "memberships": {
                "sp500": bool(member["member_sp500"]),
                "nasdaq100": bool(member["member_nasdaq100"]),
                "dowjones": bool(member["member_dowjones"]),
            },
        }
        rows.append(row)
        histories[ticker] = {
            "rsRating": [
                None if pd.isna(value) else int(value)
                for value in history_rating_all[ticker].tolist()
            ],
            "rsLine": normalize_line(rs_line),
            "price": serialize_price_line(window),
        }

    rows.sort(key=lambda item: (-int(item["rsRatingAll"]), item["ticker"]))
    return {
        "updatedAt": latest_date.strftime("%Y-%m-%d"),
        "benchmark": {"symbol": BENCHMARK_SYMBOL, "label": "S&P 500"},
        "historyDates": history_dates,
        "historyRanges": [
            {"key": "1m", "label": "1M"},
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "1y", "label": "1Y"},
            {"key": "max", "label": "Max"},
        ],
        "universes": {
            "all": {"label": "All", "color": COLOR_BY_UNIVERSE["all"]},
            "sp500": {"label": "S&P 500", "color": COLOR_BY_UNIVERSE["sp500"]},
            "nasdaq100": {"label": "NASDAQ 100", "color": COLOR_BY_UNIVERSE["nasdaq100"]},
            "dowjones": {"label": "Dow Jones", "color": COLOR_BY_UNIVERSE["dowjones"]},
        },
        "scoring": {
            "label": "IBD-style RS Rating",
            "description": "12M split into four 3M buckets with a 40/20/20/20 weighting, ranked daily into a 1-99 percentile score.",
        },
        "rows": rows,
        "histories": histories,
    }


def compute_52w_gap(series: pd.Series) -> float | None:
    if len(series) < LOOKBACKS["12m"]:
        return None
    recent = series.tail(LOOKBACKS["12m"])
    high = recent.max()
    current = recent.iloc[-1]
    if not math.isfinite(high) or not math.isfinite(current) or high == 0:
        return None
    return round((float(high - current) / float(high)) * 100, 2)


def nullable_int(value: object) -> int | None:
    if value is None or pd.isna(value):
        return None
    return int(value)


def main() -> None:
    universe = fetch_universe_frame()
    symbols = sorted(universe["ticker"].tolist())
    close_frame = fetch_price_frame(symbols + [BENCHMARK_SYMBOL])
    existing_rows = load_existing_rows()
    shares_cache = build_shares_cache(symbols, existing_rows)
    payload = build_payload(universe, close_frame, shares_cache)

    OUTPUT_PATH.write_text(
        "window.marketRsData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Rows: {len(payload['rows'])}")
    print(f"As of: {payload['updatedAt']}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import math
import os
import re
import time
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
MAX_SHARES_FETCH = int(os.getenv("MARKET_RS_MAX_SHARES_FETCH", "25"))
RS_SMOOTH_WINDOW = 126
RS_BLEND_BASE_WEIGHT = 0.85
RS_BLEND_20D_WEIGHT = 0.10
RS_BLEND_10D_WEIGHT = 0.05
LOOKBACKS = {
    "10d": 10,
    "20d": 20,
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
    "russell2000": {
        "label": "Russell 2000",
        "url": "https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/1467271812596.ajax?fileType=csv&fileName=IWM_holdings&dataType=fund",
        "ticker_col": "Ticker",
        "name_col": "Name",
        "source": "csv",
    },
}
COLOR_BY_UNIVERSE = {
    "all": "#111827",
    "sp500": "#4b5563",
    "nasdaq100": "#2563eb",
    "dowjones": "#8b5cf6",
    "russell2000": "#0f766e",
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


def read_ishares_holdings_csv(url: str) -> pd.DataFrame:
    response = requests.get(url, headers=WIKI_HEADERS, timeout=30)
    response.raise_for_status()
    text = response.text.lstrip("\ufeff")
    lines = text.splitlines()
    header_index = next((index for index, line in enumerate(lines) if line.startswith("Ticker,")), None)
    if header_index is None:
        raise RuntimeError("Unable to locate IWM holdings CSV header.")
    payload = "\n".join(lines[header_index:])
    frame = pd.read_csv(StringIO(payload))
    return frame[frame["Asset Class"].fillna("").eq("Equity")].copy()


def fetch_universe_frame() -> pd.DataFrame:
    merged: dict[str, dict[str, object]] = {}
    for key, meta in UNIVERSES.items():
        if meta.get("source") == "csv":
            table = read_ishares_holdings_csv(str(meta["url"]))
        else:
            table = read_wiki_table(str(meta["url"]), int(meta["table_index"]))
        ticker_col = str(meta["ticker_col"])
        name_col = str(meta["name_col"])
        for _, row in table.iterrows():
            ticker = normalize_ticker(row.get(ticker_col, ""))
            if ticker in {"", "NAN", "-"}:
                continue
            item = merged.setdefault(
                ticker,
                {
                    "ticker": ticker,
                    "name": str(row.get(name_col, ticker)).strip(),
                    "member_sp500": False,
                    "member_nasdaq100": False,
                    "member_dowjones": False,
                    "member_russell2000": False,
                },
            )
            item["name"] = str(row.get(name_col, item["name"])).strip()
            item[f"member_{key}"] = True
    return pd.DataFrame(merged.values()).sort_values("ticker").reset_index(drop=True)


def download_batch(symbols: list[str]) -> tuple[dict[str, pd.Series], dict[str, pd.Series]]:
    history = yf.download(
        tickers=symbols,
        period=PRICE_PERIOD,
        auto_adjust=False,
        progress=False,
        threads=False,
        group_by="ticker",
    )
    if history.empty:
        return {}, {}

    raw_close_map: dict[str, pd.Series] = {}
    adjusted_close_map: dict[str, pd.Series] = {}
    multi = isinstance(history.columns, pd.MultiIndex)
    for symbol in symbols:
        try:
            symbol_frame = history[symbol] if multi else history
        except KeyError:
            continue
        raw_close = symbol_frame.get("Close")
        adjusted_close = symbol_frame.get("Adj Close", raw_close)
        if raw_close is None or adjusted_close is None:
            continue
        raw_close = raw_close.dropna()
        adjusted_close = adjusted_close.dropna()
        if raw_close.empty or adjusted_close.empty:
            continue
        raw_close_map[symbol] = raw_close.rename(symbol)
        adjusted_close_map[symbol] = adjusted_close.rename(symbol)
    missing = [symbol for symbol in symbols if symbol not in raw_close_map or symbol not in adjusted_close_map]
    for symbol in missing:
        for attempt in range(2):
            try:
                single = yf.download(
                    tickers=symbol,
                    period=PRICE_PERIOD,
                    auto_adjust=False,
                    progress=False,
                    threads=False,
                )
                if single.empty or "Close" not in single.columns:
                    time.sleep(0.35)
                    continue
                raw_close = single["Close"].dropna()
                adjusted_close = single["Adj Close"].dropna() if "Adj Close" in single.columns else raw_close
                if raw_close.empty or adjusted_close.empty:
                    time.sleep(0.35)
                    continue
                raw_close_map[symbol] = raw_close.rename(symbol)
                adjusted_close_map[symbol] = adjusted_close.rename(symbol)
                break
            except Exception:
                time.sleep(0.35)
    return raw_close_map, adjusted_close_map


def fetch_price_frames(symbols: list[str], batch_size: int = 30) -> tuple[pd.DataFrame, pd.DataFrame]:
    raw_close_map: dict[str, pd.Series] = {}
    adjusted_close_map: dict[str, pd.Series] = {}
    for start in range(0, len(symbols), batch_size):
        batch = symbols[start : start + batch_size]
        batch_raw_close_map, batch_adjusted_close_map = download_batch(batch)
        raw_close_map.update(batch_raw_close_map)
        adjusted_close_map.update(batch_adjusted_close_map)
        time.sleep(0.2)
    if not raw_close_map or not adjusted_close_map:
        raise RuntimeError("No price data downloaded for RS universe.")
    raw_close_frame = pd.concat(raw_close_map.values(), axis=1).sort_index()
    adjusted_close_frame = pd.concat(adjusted_close_map.values(), axis=1).sort_index()
    return raw_close_frame, adjusted_close_frame


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
    cache: dict[str, int | None] = {}
    for symbol in symbols:
        if symbol not in existing_rows:
            continue
        row = existing_rows[symbol]
        shares = row.get("sharesOutstanding")
        if shares:
            try:
                numeric = int(float(shares))
                if numeric > 0:
                    cache[symbol] = numeric
                    continue
            except Exception:
                pass

        # Fallback: infer shares from the last known market cap / price so daily market-cap
        # refresh can keep running even if Yahoo blocks quote fundamentals.
        market_cap = row.get("marketCap")
        price = row.get("price")
        try:
            if market_cap and price and float(price) > 0 and float(market_cap) > 0:
                inferred = int(round(float(market_cap) / float(price)))
                if inferred > 0:
                    cache[symbol] = inferred
        except Exception:
            continue

    missing = [symbol for symbol in symbols if symbol not in cache][:MAX_SHARES_FETCH]
    if not missing:
        return cache

    with ThreadPoolExecutor(max_workers=4) as executor:
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


def smooth_rating_frame(frame: pd.DataFrame, window: int = RS_SMOOTH_WINDOW) -> pd.DataFrame:
    smoothed = frame.rolling(window, min_periods=1).mean()
    return percentile_to_rating(smoothed)


def build_recent_return_rating(close_frame: pd.DataFrame, periods: int) -> pd.DataFrame:
    return percentile_to_rating(close_frame.div(close_frame.shift(periods)).sub(1))


def blend_rating_frames(base: pd.DataFrame, recent_20d: pd.DataFrame, recent_10d: pd.DataFrame) -> pd.DataFrame:
    composite = (
        RS_BLEND_BASE_WEIGHT * base.astype(float)
        + RS_BLEND_20D_WEIGHT * recent_20d.astype(float)
        + RS_BLEND_10D_WEIGHT * recent_10d.astype(float)
    )
    return percentile_to_rating(composite)


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


def build_payload(
    universe: pd.DataFrame,
    raw_close_frame: pd.DataFrame,
    adjusted_close_frame: pd.DataFrame,
    shares_cache: dict[str, int | None],
) -> dict[str, object]:
    benchmark = adjusted_close_frame[BENCHMARK_SYMBOL].dropna()
    stock_adjusted_close = adjusted_close_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    stock_raw_close = raw_close_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    rs_raw = build_rs_raw(stock_adjusted_close)
    rs_rating_all_raw = percentile_to_rating(rs_raw)
    rs_rating_all_smooth = smooth_rating_frame(rs_rating_all_raw)
    rs_recent_20d_all = build_recent_return_rating(stock_adjusted_close, LOOKBACKS["20d"])
    rs_recent_10d_all = build_recent_return_rating(stock_adjusted_close, LOOKBACKS["10d"])
    rs_rating_all = blend_rating_frames(rs_rating_all_smooth, rs_recent_20d_all, rs_recent_10d_all)

    rs_ratings_by_universe = {"all": rs_rating_all}
    for key in UNIVERSES:
        tickers = [
            ticker
            for ticker in universe.loc[universe[f"member_{key}"], "ticker"].tolist()
            if ticker in rs_raw.columns
        ]
        if not tickers:
            continue
        subset_raw = rs_raw[tickers]
        subset_rating_raw = percentile_to_rating(subset_raw)
        subset_rating_smooth = smooth_rating_frame(subset_rating_raw)
        subset_close = stock_adjusted_close[tickers]
        subset_recent_20d = build_recent_return_rating(subset_close, LOOKBACKS["20d"])
        subset_recent_10d = build_recent_return_rating(subset_close, LOOKBACKS["10d"])
        rs_ratings_by_universe[key] = blend_rating_frames(subset_rating_smooth, subset_recent_20d, subset_recent_10d)

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
        if ticker not in stock_adjusted_close.columns or ticker not in stock_raw_close.columns:
            continue
        latest_rating = rs_rating_all.at[latest_date, ticker] if ticker in rs_rating_all.columns else None
        if latest_rating is None or pd.isna(latest_rating):
            continue

        performance_series = stock_adjusted_close[ticker].dropna()
        raw_price_series = stock_raw_close[ticker].dropna()
        if len(performance_series) <= LOOKBACKS["12m"]:
            continue

        current_price = float(raw_price_series.reindex([latest_date]).iloc[0])
        if not math.isfinite(current_price) or current_price <= 0:
            continue
        raw_price_window = stock_raw_close[ticker].reindex(history_rating_all.index)
        adjusted_window = stock_adjusted_close[ticker].reindex(history_rating_all.index)
        rs_line = adjusted_window.div(benchmark_history)
        shares_outstanding = shares_cache.get(ticker)
        if shares_outstanding is not None and not isinstance(shares_outstanding, int):
            try:
                if math.isfinite(float(shares_outstanding)) and float(shares_outstanding) > 0:
                    shares_outstanding = int(float(shares_outstanding))
                else:
                    shares_outstanding = None
            except Exception:
                shares_outstanding = None
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
            "rsRatingRussell2000": nullable_int(rs_ratings_by_universe.get("russell2000", pd.DataFrame()).get(ticker, pd.Series(dtype=float)).get(latest_date)),
            "returns": {
                "1m": compute_return(performance_series, LOOKBACKS["1m"]),
                "3m": compute_return(performance_series, LOOKBACKS["3m"]),
                "6m": compute_return(performance_series, LOOKBACKS["6m"]),
                "12m": compute_return(performance_series, LOOKBACKS["12m"]),
            },
            "distanceTo52wHighPct": compute_52w_gap(performance_series),
            "rsNewHigh": rs_new_high,
            "memberships": {
                "sp500": bool(member["member_sp500"]),
                "nasdaq100": bool(member["member_nasdaq100"]),
                "dowjones": bool(member["member_dowjones"]),
                "russell2000": bool(member["member_russell2000"]),
            },
        }
        rows.append(row)
        histories[ticker] = {
            "rsRating": [
                None if pd.isna(value) else int(value)
                for value in history_rating_all[ticker].tolist()
            ],
            "rsLine": normalize_line(rs_line),
            "price": serialize_price_line(raw_price_window),
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
            "russell2000": {"label": "Russell 2000", "color": COLOR_BY_UNIVERSE["russell2000"]},
        },
        "scoring": {
            "label": "IBD-style RS Rating",
            "description": "12M split into four 3M buckets with a 40/20/20/20 weighting, smoothed over 126 trading days, then blended with 20D and 10D momentum before the final daily 1-99 percentile ranking.",
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
    raw_close_frame, adjusted_close_frame = fetch_price_frames(symbols + [BENCHMARK_SYMBOL])
    existing_rows = load_existing_rows()
    shares_cache = build_shares_cache(symbols, existing_rows)
    payload = build_payload(universe, raw_close_frame, adjusted_close_frame, shares_cache)

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

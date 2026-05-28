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
MIN_MARKET_CAP_USD = 200_000_000
MAX_SHARES_FETCH = int(os.getenv("MARKET_RS_MAX_SHARES_FETCH", "25"))
BATCH_SIZE = int(os.getenv("MARKET_RS_BATCH_SIZE", "15"))
BATCH_SLEEP = float(os.getenv("MARKET_RS_BATCH_SLEEP", "0.6"))
RETRY_SLEEP = float(os.getenv("MARKET_RS_RETRY_SLEEP", "1.0"))
RETRY_ATTEMPTS = int(os.getenv("MARKET_RS_RETRY_ATTEMPTS", "4"))
LOOKBACKS = {
    "1w": 5,
    "10d": 10,
    "20d": 20,
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "9m": 189,
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
RS_WEIGHTS = {"1m": 0.20, "3m": 0.40, "6m": 0.20, "12m": 0.20}
ATR_WINDOW = 21
EXTENSION_ANCHORS = {
    "ema21": {
        "label": "21 EMA",
        "kind": "ema",
        "period": 21,
        # The article gives 1 sigma = 1.45x ATR and 3 sigma = 4.17x ATR for 21 EMA.
        # 2 sigma is linearly interpolated so the UI can show a complete 1/2/3 sigma ladder.
        "sigma_thresholds": {1: 1.45, 2: 2.81, 3: 4.17},
    },
    "sma50": {
        "label": "50 SMA",
        "kind": "sma",
        "period": 50,
        "sigma_thresholds": {1: 2.50, 2: 5.00, 3: 7.50},
    },
}
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-rs-data.js"
SYMBOL_ALIASES = {
    "CRDA": "CRD-A",
    "GEFB": "GEF-B",
    "MOGA": "MOG-A",
}
TERMINAL_SKIP_TICKERS = {
    "ADRO",
    "AKE",
    "GTXI",
    "INH",
    "P5N994",
    "PDLI",
    "SBT",
    "THRD",
}
MANUAL_UNIVERSE_MEMBERS = [
    {
        "ticker": "NBIS",
        "name": "Nebius Group N.V.",
        "member_sp500": False,
        "member_nasdaq100": False,
        "member_dowjones": False,
        "member_russell2000": False,
    },
    {
        "ticker": "CBRS",
        "name": "Cerebras Systems, Inc.",
        "member_sp500": False,
        "member_nasdaq100": False,
        "member_dowjones": False,
        "member_russell2000": False,
    },
]
MANUAL_SHARES_OUTSTANDING = {
    "NBIS": 253_898_194,
}


def normalize_ticker(raw: object) -> str:
    ticker = str(raw).strip().upper().replace(".", "-")
    return SYMBOL_ALIASES.get(ticker, ticker)


def is_terminal_symbol(symbol: str) -> bool:
    return normalize_ticker(symbol) in TERMINAL_SKIP_TICKERS


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
        fallback = read_existing_universe("russell2000")
        if not fallback.empty:
            print("Unable to locate IWM holdings CSV header; using existing Russell 2000 membership snapshot.")
            return fallback
        raise RuntimeError("Unable to locate IWM holdings CSV header.")
    payload = "\n".join(lines[header_index:])
    frame = pd.read_csv(StringIO(payload))
    return frame[frame["Asset Class"].fillna("").eq("Equity")].copy()


def load_existing_payload() -> dict:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.marketRsData = "
    if text.startswith(prefix):
        text = text[len(prefix):]
    if text.endswith(";"):
        text = text[:-1]
    try:
        return json.loads(text)
    except Exception:
        return {}


def read_existing_universe(universe_key: str) -> pd.DataFrame:
    rows = []
    for row in load_existing_payload().get("rows", []):
        memberships = row.get("memberships") or {}
        if not memberships.get(universe_key):
            continue
        ticker = normalize_ticker(row.get("ticker"))
        if not ticker or is_terminal_symbol(ticker):
            continue
        rows.append(
            {
                "Ticker": ticker,
                "Name": row.get("name") or ticker,
                "Asset Class": "Equity",
            }
        )
    if not rows:
        return pd.DataFrame(columns=["Ticker", "Name", "Asset Class"])
    return pd.DataFrame(rows).drop_duplicates(subset=["Ticker"])


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
            if ticker in {"", "NAN", "-"} or is_terminal_symbol(ticker):
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
    for manual_member in MANUAL_UNIVERSE_MEMBERS:
        ticker = normalize_ticker(manual_member["ticker"])
        if not ticker or is_terminal_symbol(ticker):
            continue
        item = merged.setdefault(
            ticker,
            {
                "ticker": ticker,
                "name": str(manual_member.get("name") or ticker).strip(),
                "member_sp500": False,
                "member_nasdaq100": False,
                "member_dowjones": False,
                "member_russell2000": False,
            },
        )
        item["name"] = str(manual_member.get("name") or item["name"]).strip()
        for universe_key in UNIVERSES:
            member_key = f"member_{universe_key}"
            item[member_key] = bool(manual_member.get(member_key, item[member_key]))
    return pd.DataFrame(merged.values()).sort_values("ticker").reset_index(drop=True)


def download_batch(symbols: list[str]) -> tuple[dict[str, pd.Series], dict[str, pd.Series], dict[str, pd.Series], dict[str, pd.Series]]:
    symbols = [symbol for symbol in symbols if not is_terminal_symbol(symbol)]
    if not symbols:
        return {}, {}, {}, {}
    history = yf.download(
        tickers=symbols,
        period=PRICE_PERIOD,
        auto_adjust=False,
        progress=False,
        threads=False,
        group_by="ticker",
    )
    if history.empty:
        return {}, {}, {}, {}

    raw_close_map: dict[str, pd.Series] = {}
    adjusted_close_map: dict[str, pd.Series] = {}
    high_map: dict[str, pd.Series] = {}
    low_map: dict[str, pd.Series] = {}
    multi = isinstance(history.columns, pd.MultiIndex)
    for symbol in symbols:
        try:
            symbol_frame = history[symbol] if multi else history
        except KeyError:
            continue
        raw_close = symbol_frame.get("Close")
        adjusted_close = symbol_frame.get("Adj Close", raw_close)
        high = symbol_frame.get("High")
        low = symbol_frame.get("Low")
        if raw_close is None or adjusted_close is None or high is None or low is None:
            continue
        raw_close = raw_close.dropna()
        adjusted_close = adjusted_close.dropna()
        high = high.dropna()
        low = low.dropna()
        if raw_close.empty or adjusted_close.empty or high.empty or low.empty:
            continue
        raw_close_map[symbol] = raw_close.rename(symbol)
        adjusted_close_map[symbol] = adjusted_close.rename(symbol)
        high_map[symbol] = high.rename(symbol)
        low_map[symbol] = low.rename(symbol)
    missing = [
        symbol
        for symbol in symbols
        if symbol not in raw_close_map or symbol not in adjusted_close_map or symbol not in high_map or symbol not in low_map
    ]
    for symbol in missing:
        if is_terminal_symbol(symbol):
            continue
        for attempt in range(RETRY_ATTEMPTS):
            try:
                single = yf.download(
                    tickers=symbol,
                    period=PRICE_PERIOD,
                    auto_adjust=False,
                    progress=False,
                    threads=False,
                )
                if single.empty or "Close" not in single.columns or "High" not in single.columns or "Low" not in single.columns:
                    time.sleep(RETRY_SLEEP)
                    continue
                raw_close = single["Close"].dropna()
                adjusted_close = single["Adj Close"].dropna() if "Adj Close" in single.columns else raw_close
                high = single["High"].dropna()
                low = single["Low"].dropna()
                if raw_close.empty or adjusted_close.empty or high.empty or low.empty:
                    time.sleep(RETRY_SLEEP)
                    continue
                raw_close_map[symbol] = raw_close.rename(symbol)
                adjusted_close_map[symbol] = adjusted_close.rename(symbol)
                high_map[symbol] = high.rename(symbol)
                low_map[symbol] = low.rename(symbol)
                break
            except Exception:
                time.sleep(RETRY_SLEEP)
    return raw_close_map, adjusted_close_map, high_map, low_map


def fetch_price_frames(symbols: list[str], batch_size: int = BATCH_SIZE) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    raw_close_map: dict[str, pd.Series] = {}
    adjusted_close_map: dict[str, pd.Series] = {}
    high_map: dict[str, pd.Series] = {}
    low_map: dict[str, pd.Series] = {}
    for start in range(0, len(symbols), batch_size):
        batch = symbols[start : start + batch_size]
        batch_raw_close_map, batch_adjusted_close_map, batch_high_map, batch_low_map = download_batch(batch)
        raw_close_map.update(batch_raw_close_map)
        adjusted_close_map.update(batch_adjusted_close_map)
        high_map.update(batch_high_map)
        low_map.update(batch_low_map)
        time.sleep(BATCH_SLEEP)
    if not raw_close_map or not adjusted_close_map or not high_map or not low_map:
        raise RuntimeError("No price data downloaded for RS universe.")
    raw_close_frame = pd.concat(raw_close_map.values(), axis=1).sort_index()
    adjusted_close_frame = pd.concat(adjusted_close_map.values(), axis=1).sort_index()
    high_frame = pd.concat(high_map.values(), axis=1).sort_index()
    low_frame = pd.concat(low_map.values(), axis=1).sort_index()
    return raw_close_frame, adjusted_close_frame, high_frame, low_frame


def load_existing_rows() -> dict[str, dict[str, object]]:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    payload = json.loads(re.sub(r"^window\.marketRsData = |;\s*$", "", text))
    return {row["ticker"]: row for row in payload.get("rows", [])}


def normalize_positive_int(value: object) -> int | None:
    try:
        numeric = float(value)
    except Exception:
        return None
    if not math.isfinite(numeric) or numeric <= 0:
        return None
    return int(numeric)


def fetch_shares_outstanding_for_symbol(symbol: str) -> tuple[str, int | None]:
    try:
        ticker = yf.Ticker(symbol)
        fast_info = getattr(ticker, "fast_info", {}) or {}
        shares = normalize_positive_int(fast_info.get("shares"))
        if shares:
            return symbol, shares

        info = ticker.get_info()
        shares = normalize_positive_int(
            info.get("sharesOutstanding") or info.get("impliedSharesOutstanding")
        )
        if shares:
            return symbol, shares
    except Exception:
        return symbol, None
    return symbol, None


def build_shares_cache(symbols: list[str], existing_rows: dict[str, dict[str, object]]) -> dict[str, int | None]:
    cache: dict[str, int | None] = {}
    for symbol in symbols:
        manual_shares = MANUAL_SHARES_OUTSTANDING.get(symbol)
        if manual_shares:
            cache[symbol] = manual_shares
    for symbol in symbols:
        if symbol in cache:
            continue
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
    ranks = frame.rank(axis=1, method="average", ascending=False)
    denominator = (valid_counts - 1).replace(0, 1)
    rating = 99 - (ranks.sub(1, axis=0)).mul(98).div(denominator, axis=0)
    rating = rating.where(frame.notna())
    single_name_mask = valid_counts <= 1
    if single_name_mask.any():
        rating.loc[single_name_mask] = frame.loc[single_name_mask].notna().astype(float) * 99
    return rating.round().clip(lower=1, upper=99)


def cross_sectional_percentile(frame: pd.DataFrame) -> pd.DataFrame:
    valid_counts = frame.notna().sum(axis=1)
    ranks = frame.rank(axis=1, method="average", ascending=True)
    denominator = (valid_counts - 1).replace(0, 1)
    percentile = ranks.sub(1, axis=0).div(denominator, axis=0)
    percentile = percentile.where(frame.notna())
    single_name_mask = valid_counts <= 1
    if single_name_mask.any():
        percentile.loc[single_name_mask] = frame.loc[single_name_mask].notna().astype(float)
    return percentile.clip(lower=0, upper=1)


def weighted_rs_rating(period_ratings: dict[str, pd.DataFrame]) -> pd.DataFrame:
    first = next(iter(period_ratings.values()))
    weighted_sum = pd.DataFrame(0.0, index=first.index, columns=first.columns)
    weight_sum = pd.DataFrame(0.0, index=first.index, columns=first.columns)

    for period_key, weight in RS_WEIGHTS.items():
        component = period_ratings[period_key]
        weighted_sum = weighted_sum.add(component.fillna(0).mul(weight), fill_value=0)
        weight_sum = weight_sum.add(component.notna().astype(float).mul(weight), fill_value=0)

    return weighted_sum.div(weight_sum.where(weight_sum > 0)).round().clip(lower=1, upper=99)


def build_period_rs_ratings(close_frame: pd.DataFrame) -> dict[str, pd.DataFrame]:
    return {
        "1m": percentile_to_rating(close_frame.div(close_frame.shift(LOOKBACKS["1m"])).sub(1)),
        "3m": percentile_to_rating(close_frame.div(close_frame.shift(LOOKBACKS["3m"])).sub(1)),
        "6m": percentile_to_rating(close_frame.div(close_frame.shift(LOOKBACKS["6m"])).sub(1)),
        "12m": percentile_to_rating(close_frame.div(close_frame.shift(LOOKBACKS["12m"])).sub(1)),
    }


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


def compute_rating_new_high(series: pd.Series, window: int = LOOKBACKS["12m"]) -> bool:
    recent = series.dropna().tail(window)
    if recent.empty:
        return False
    latest = float(recent.iloc[-1])
    trailing_high = float(recent.max())
    return latest >= trailing_high - 1e-9


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
    high_frame: pd.DataFrame,
    low_frame: pd.DataFrame,
    shares_cache: dict[str, int | None],
) -> dict[str, object]:
    benchmark = adjusted_close_frame[BENCHMARK_SYMBOL].dropna()
    stock_adjusted_close = adjusted_close_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    stock_raw_close = raw_close_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    stock_high = high_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    stock_low = low_frame.drop(columns=[BENCHMARK_SYMBOL], errors="ignore")
    market_caps: dict[str, int] = {}
    eligible_tickers: list[str] = []
    for _, member in universe.iterrows():
        ticker = str(member["ticker"])
        shares_outstanding = shares_cache.get(ticker)
        if not shares_outstanding or ticker not in stock_raw_close.columns:
            continue
        raw_prices = stock_raw_close[ticker].dropna()
        if raw_prices.empty:
            continue
        latest_price = float(raw_prices.iloc[-1])
        if not math.isfinite(latest_price) or latest_price <= 0:
            continue
        market_cap = round(latest_price * int(shares_outstanding))
        if market_cap <= MIN_MARKET_CAP_USD:
            continue
        market_caps[ticker] = market_cap
        eligible_tickers.append(ticker)

    universe = universe[universe["ticker"].isin(eligible_tickers)].copy().reset_index(drop=True)
    stock_adjusted_close = stock_adjusted_close[[ticker for ticker in eligible_tickers if ticker in stock_adjusted_close.columns]]
    stock_raw_close = stock_raw_close[[ticker for ticker in eligible_tickers if ticker in stock_raw_close.columns]]
    stock_high = stock_high[[ticker for ticker in eligible_tickers if ticker in stock_high.columns]]
    stock_low = stock_low[[ticker for ticker in eligible_tickers if ticker in stock_low.columns]]
    if stock_adjusted_close.empty or stock_raw_close.empty:
        raise RuntimeError("No RS universe members passed the market-cap filter.")

    period_rs_ratings_all = build_period_rs_ratings(stock_adjusted_close)
    rs_rating_all = weighted_rs_rating(period_rs_ratings_all)

    rs_ratings_by_universe = {"all": rs_rating_all}
    for key in UNIVERSES:
        tickers = [
            ticker
            for ticker in universe.loc[universe[f"member_{key}"], "ticker"].tolist()
            if ticker in stock_adjusted_close.columns
        ]
        if not tickers:
            continue
        subset_period_ratings = build_period_rs_ratings(stock_adjusted_close[tickers])
        rs_ratings_by_universe[key] = weighted_rs_rating(subset_period_ratings)

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
        market_cap = market_caps.get(ticker)
        if market_cap is None or market_cap <= MIN_MARKET_CAP_USD:
            continue
        rs_rating_sp500_frame = rs_ratings_by_universe.get("sp500", pd.DataFrame())
        rs_rating_nasdaq100_frame = rs_ratings_by_universe.get("nasdaq100", pd.DataFrame())
        rs_rating_dowjones_frame = rs_ratings_by_universe.get("dowjones", pd.DataFrame())
        rs_rating_russell2000_frame = rs_ratings_by_universe.get("russell2000", pd.DataFrame())

        history_all_series = rs_rating_all[ticker] if ticker in rs_rating_all.columns else pd.Series(dtype=float)
        history_sp500_series = (
            rs_rating_sp500_frame[ticker] if ticker in rs_rating_sp500_frame.columns else pd.Series(dtype=float)
        )
        history_nasdaq100_series = (
            rs_rating_nasdaq100_frame[ticker] if ticker in rs_rating_nasdaq100_frame.columns else pd.Series(dtype=float)
        )
        history_dowjones_series = (
            rs_rating_dowjones_frame[ticker] if ticker in rs_rating_dowjones_frame.columns else pd.Series(dtype=float)
        )
        history_russell2000_series = (
            rs_rating_russell2000_frame[ticker] if ticker in rs_rating_russell2000_frame.columns else pd.Series(dtype=float)
        )

        rs_new_high_all = compute_rating_new_high(history_all_series)
        rs_new_high_sp500 = compute_rating_new_high(history_sp500_series)
        rs_new_high_nasdaq100 = compute_rating_new_high(history_nasdaq100_series)
        rs_new_high_dowjones = compute_rating_new_high(history_dowjones_series)
        rs_new_high_russell2000 = compute_rating_new_high(history_russell2000_series)

        ticker_high_series = stock_high[ticker] if ticker in stock_high.columns else pd.Series(dtype=float)
        ticker_low_series = stock_low[ticker] if ticker in stock_low.columns else pd.Series(dtype=float)
        ticker_raw_close_series = stock_raw_close[ticker] if ticker in stock_raw_close.columns else pd.Series(dtype=float)
        ticker_atr_series = compute_atr_series(ticker_high_series, ticker_low_series, ticker_raw_close_series)

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
            "rsPeriods": {
                "1m": nullable_int(period_rs_ratings_all["1m"].get(ticker, pd.Series(dtype=float)).get(latest_date)),
                "3m": nullable_int(period_rs_ratings_all["3m"].get(ticker, pd.Series(dtype=float)).get(latest_date)),
                "6m": nullable_int(period_rs_ratings_all["6m"].get(ticker, pd.Series(dtype=float)).get(latest_date)),
                "12m": nullable_int(period_rs_ratings_all["12m"].get(ticker, pd.Series(dtype=float)).get(latest_date)),
            },
            "returns": {
                "1m": compute_return(performance_series, LOOKBACKS["1m"]),
                "3m": compute_return(performance_series, LOOKBACKS["3m"]),
                "6m": compute_return(performance_series, LOOKBACKS["6m"]),
                "12m": compute_return(performance_series, LOOKBACKS["12m"]),
            },
            "atr21Pct": compute_atr_pct(
                ticker_high_series,
                ticker_low_series,
                ticker_raw_close_series,
            ),
            "extension": compute_extension_metrics(ticker_raw_close_series, ticker_atr_series),
            "distanceTo52wHighPct": compute_52w_gap(performance_series),
            "rsNewHigh": rs_new_high_all,
            "rsNewHighAll": rs_new_high_all,
            "rsNewHighSp500": rs_new_high_sp500,
            "rsNewHighNasdaq100": rs_new_high_nasdaq100,
            "rsNewHighDowjones": rs_new_high_dowjones,
            "rsNewHighRussell2000": rs_new_high_russell2000,
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
            "rsRatingAll": [
                None if pd.isna(value) else int(value)
                for value in history_rating_all[ticker].tolist()
            ],
            "rsRatingSp500": [
                None if pd.isna(value) else int(value)
                for value in history_sp500_series.reindex(history_rating_all.index).tolist()
            ],
            "rsRatingNasdaq100": [
                None if pd.isna(value) else int(value)
                for value in history_nasdaq100_series.reindex(history_rating_all.index).tolist()
            ],
            "rsRatingDowjones": [
                None if pd.isna(value) else int(value)
                for value in history_dowjones_series.reindex(history_rating_all.index).tolist()
            ],
            "rsRatingRussell2000": [
                None if pd.isna(value) else int(value)
                for value in history_russell2000_series.reindex(history_rating_all.index).tolist()
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
            {"key": "ytd", "label": "YTD"},
            {"key": "1y", "label": "1Y"},
            {"key": "3y", "label": "3Y"},
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
            "label": "StockEasy-style RS Rating",
            "description": "Weighted average of period RS ranks using RS_1M 20%, RS_3M 40%, RS_6M 20%, and RS_12M 20%. Each period RS is a daily 1-99 percentile rank. Names with market cap at or below $200M are excluded.",
            "minMarketCapUsd": MIN_MARKET_CAP_USD,
            "weights": RS_WEIGHTS,
            "atr": "ATR% = 21-day average of each day's true range divided by that day's close.",
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


def compute_atr_series(high_series: pd.Series, low_series: pd.Series, close_series: pd.Series, window: int = ATR_WINDOW) -> pd.Series:
    frame = pd.concat(
        {
            "high": high_series,
            "low": low_series,
            "close": close_series,
        },
        axis=1,
    ).dropna()
    if len(frame) < window + 1:
        return pd.Series(dtype=float)
    previous_close = frame["close"].shift(1)
    true_range = pd.concat(
        [
            frame["high"] - frame["low"],
            (frame["high"] - previous_close).abs(),
            (frame["low"] - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return true_range.rolling(window).mean().dropna()


def compute_atr_pct_series(high_series: pd.Series, low_series: pd.Series, close_series: pd.Series, window: int = ATR_WINDOW) -> pd.Series:
    frame = pd.concat(
        {
            "high": high_series,
            "low": low_series,
            "close": close_series,
        },
        axis=1,
    ).dropna()
    if len(frame) < window + 1:
        return pd.Series(dtype=float)
    previous_close = frame["close"].shift(1)
    true_range = pd.concat(
        [
            frame["high"] - frame["low"],
            (frame["high"] - previous_close).abs(),
            (frame["low"] - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    true_range_pct = (true_range / frame["close"]) * 100
    return true_range_pct.rolling(window).mean().dropna()


def compute_atr_pct(high_series: pd.Series, low_series: pd.Series, close_series: pd.Series, window: int = ATR_WINDOW) -> float | None:
    frame = pd.concat(
        {
            "high": high_series,
            "low": low_series,
            "close": close_series,
        },
        axis=1,
    ).dropna()
    if len(frame) < window + 1:
        return None
    atr_series = compute_atr_pct_series(frame["high"], frame["low"], frame["close"], window)
    if atr_series.empty:
        return None
    atr_pct = atr_series.iloc[-1]
    if not math.isfinite(float(atr_pct)):
        return None
    return round(float(atr_pct), 2)


def interpolate_sigma(abs_multiple: float, thresholds: dict[int, float]) -> float:
    if abs_multiple <= 0:
        return 0.0
    ordered = sorted((int(key), float(value)) for key, value in thresholds.items())
    previous_sigma = 0
    previous_value = 0.0
    for sigma, threshold in ordered:
        if abs_multiple <= threshold:
            if threshold <= previous_value:
                return float(sigma)
            ratio = (abs_multiple - previous_value) / (threshold - previous_value)
            return previous_sigma + ratio * (sigma - previous_sigma)
        previous_sigma = sigma
        previous_value = threshold
    top_sigma, top_value = ordered[-1]
    base_step = top_value / top_sigma if top_sigma else top_value
    if base_step <= 0:
        return float(top_sigma)
    return top_sigma + ((abs_multiple - top_value) / base_step)


def classify_extension(abs_sigma: float | None) -> str:
    if abs_sigma is None:
        return "na"
    if abs_sigma >= 3:
        return "extreme"
    if abs_sigma >= 2:
        return "stretched"
    if abs_sigma >= 1:
        return "watch"
    return "normal"


def compute_extension_metrics(close_series: pd.Series, atr_series: pd.Series) -> dict[str, dict[str, object]]:
    metrics: dict[str, dict[str, object]] = {}
    close = close_series.dropna()
    if close.empty or atr_series.empty:
        return metrics
    current_price = float(close.iloc[-1])
    aligned_atr = atr_series.reindex(close.index).dropna()
    if aligned_atr.empty:
        return metrics
    latest_atr = float(aligned_atr.iloc[-1])
    if not math.isfinite(current_price) or current_price <= 0 or not math.isfinite(latest_atr) or latest_atr <= 0:
        return metrics
    for key, meta in EXTENSION_ANCHORS.items():
        period = int(meta["period"])
        if len(close) < period:
            continue
        if meta["kind"] == "ema":
            anchor_series = close.ewm(span=period, adjust=False).mean()
        else:
            anchor_series = close.rolling(period).mean()
        anchor = float(anchor_series.dropna().iloc[-1])
        if not math.isfinite(anchor) or anchor <= 0:
            continue
        atr_multiple = (current_price - anchor) / latest_atr
        deviation_pct = ((current_price / anchor) - 1) * 100
        abs_sigma = interpolate_sigma(abs(float(atr_multiple)), dict(meta["sigma_thresholds"]))
        metrics[key] = {
            "label": meta["label"],
            "anchor": round(anchor, 2),
            "price": round(current_price, 2),
            "atr": round(latest_atr, 2),
            "deviationPct": round(float(deviation_pct), 2),
            "atrMultiple": round(float(atr_multiple), 2),
            "absAtrMultiple": round(abs(float(atr_multiple)), 2),
            "sigma": round(abs_sigma, 2),
            "signedSigma": round(abs_sigma if atr_multiple >= 0 else -abs_sigma, 2),
            "zone": classify_extension(abs_sigma),
            "direction": "above" if atr_multiple >= 0 else "below",
            "sigmaThresholds": {str(level): value for level, value in meta["sigma_thresholds"].items()},
        }
    return metrics


def nullable_int(value: object) -> int | None:
    if value is None or pd.isna(value):
        return None
    return int(value)


def main() -> None:
    universe = fetch_universe_frame()
    symbols = sorted(symbol for symbol in universe["ticker"].tolist() if not is_terminal_symbol(str(symbol)))
    raw_close_frame, adjusted_close_frame, high_frame, low_frame = fetch_price_frames(symbols + [BENCHMARK_SYMBOL])
    existing_rows = load_existing_rows()
    shares_cache = build_shares_cache(symbols, existing_rows)
    payload = build_payload(universe, raw_close_frame, adjusted_close_frame, high_frame, low_frame, shares_cache)

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

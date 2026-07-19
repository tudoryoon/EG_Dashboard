from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import yfinance as yf

import update_market_rs as rs


ROOT = Path(__file__).resolve().parents[1]
RS_DATA_PATH = ROOT / "data" / "market-rs-data.js"
TREND_SCRIPT_PATH = ROOT / "scripts" / "update_market_trend_score.py"
MARKET_PRICE_DATA_PATH = ROOT / "data" / "market-price-data.js"
INDEX_PATH = ROOT / "index.html"
MANUAL_CONFIG_PATH = ROOT / "data" / "market-rs-manual-tickers.json"


def clean_ticker(raw: str) -> str:
    value = raw.strip().upper()
    value = re.sub(r"\s+(US|EQUITY)$", "", value)
    value = value.replace(".", "-")
    return rs.normalize_ticker(value)


def load_js_payload(path: Path, global_name: str) -> dict:
    text = path.read_text(encoding="utf-8").strip()
    text = re.sub(rf"^window\.{re.escape(global_name)}\s*=\s*", "", text)
    text = re.sub(r";\s*$", "", text)
    return json.loads(text)


def write_js_payload(path: Path, global_name: str, payload: dict) -> None:
    path.write_text(
        f"window.{global_name} = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def load_manual_config() -> dict:
    if not MANUAL_CONFIG_PATH.exists():
        return {"members": []}
    try:
        payload = json.loads(MANUAL_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        payload = {}
    members = payload.get("members")
    if not isinstance(members, list):
        payload["members"] = []
    return payload


def save_manual_config(payload: dict) -> None:
    MANUAL_CONFIG_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def manual_members_by_ticker() -> dict[str, dict]:
    output: dict[str, dict] = {}
    for member in rs.get_manual_universe_members():
        ticker = clean_ticker(str(member.get("ticker") or ""))
        if ticker:
            output[ticker] = member
    return output


def manual_shares_by_ticker() -> dict[str, int]:
    return {clean_ticker(ticker): shares for ticker, shares in rs.get_manual_shares_outstanding().items()}


def normalize_positive_int(value: object) -> int | None:
    try:
        numeric = float(value)
    except Exception:
        return None
    if not math.isfinite(numeric) or numeric <= 0:
        return None
    return int(numeric)


def fetch_ticker_meta(ticker: str) -> tuple[str, int | None]:
    name = ticker
    shares = manual_shares_by_ticker().get(ticker)
    try:
        quote = yf.Ticker(ticker)
        fast_info = getattr(quote, "fast_info", {}) or {}
        shares = shares or normalize_positive_int(fast_info.get("shares"))
        info = quote.get_info()
        name = str(info.get("longName") or info.get("shortName") or info.get("quoteType") or ticker)
        shares = shares or normalize_positive_int(
            info.get("sharesOutstanding") or info.get("impliedSharesOutstanding")
        )
    except Exception:
        pass
    return name, shares


def download_ohlcv(ticker: str) -> pd.DataFrame:
    frame = yf.download(
        tickers=ticker,
        period=rs.PRICE_PERIOD,
        auto_adjust=False,
        progress=False,
        threads=False,
    )
    if frame.empty:
        raise RuntimeError(f"No price data downloaded for {ticker}.")
    if isinstance(frame.columns, pd.MultiIndex):
        frame = frame.xs(ticker, level=-1, axis=1)
    rename = {
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Adj Close": "adjClose",
        "Volume": "volume",
    }
    frame = frame.rename(columns=rename)
    required = ["open", "high", "low", "close", "volume"]
    if not all(column in frame.columns for column in required):
        raise RuntimeError(f"Incomplete OHLCV data for {ticker}.")
    if "adjClose" not in frame.columns:
        frame["adjClose"] = frame["close"]
    frame.index = pd.to_datetime(frame.index).tz_localize(None)
    return frame[["open", "high", "low", "close", "adjClose", "volume"]]


def value_at_or_before(series: pd.Series, at_date: pd.Timestamp) -> float | None:
    aligned = series.sort_index().reindex(series.index.union(pd.Index([at_date]))).sort_index().ffill(limit=1)
    if at_date not in aligned.index:
        return None
    value = aligned.loc[at_date]
    if value is None or not math.isfinite(float(value)):
        return None
    return float(value)


def compute_period_return_at(series: pd.Series, at_date: pd.Timestamp, periods: int) -> float | None:
    aligned = series.sort_index().reindex(series.index.union(pd.Index([at_date]))).sort_index().ffill(limit=1)
    values = aligned.loc[:at_date].dropna()
    if len(values) <= periods:
        return None
    current = float(values.iloc[-1])
    base = float(values.iloc[-(periods + 1)])
    if not math.isfinite(current) or not math.isfinite(base) or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def rating_series_from_values(values: dict[str, float | None], ascending: bool = False) -> dict[str, int | None]:
    series = pd.Series(values, dtype="float64")
    frame = pd.DataFrame([series], index=[pd.Timestamp("2000-01-01")])
    rating = rs.percentile_to_rating(frame if not ascending else -frame).iloc[0]
    return {
        ticker: None if pd.isna(value) else int(value)
        for ticker, value in rating.to_dict().items()
    }


def recompute_latest_rs(rows: list[dict], new_rows: list[dict]) -> None:
    combined = rows + new_rows
    ratings_by_period: dict[str, dict[str, int | None]] = {}
    display_periods = ["1w", "2w", *rs.RS_WEIGHTS]
    for period_key in display_periods:
        values = {
            row["ticker"]: (row.get("returns") or {}).get(period_key)
            for row in combined
            if row.get("ticker")
        }
        ratings_by_period[period_key] = rating_series_from_values(values)

    for row in combined:
        ticker = row.get("ticker")
        if not ticker:
            continue
        period_output = row.setdefault("rsPeriods", {})
        for period_key in display_periods:
            period_output[period_key] = ratings_by_period[period_key].get(ticker)
        weighted_sum = 0.0
        weight_sum = 0.0
        for period_key, weight in rs.RS_WEIGHTS.items():
            rating = ratings_by_period[period_key].get(ticker)
            if rating is not None:
                weighted_sum += rating * weight
                weight_sum += weight
        if weight_sum > 0:
            row["rsRatingAll"] = int(round(weighted_sum / weight_sum))


def build_price_frame_from_histories(payload: dict, new_prices: dict[str, pd.Series]) -> pd.DataFrame:
    dates = pd.to_datetime(payload.get("historyDates", []))
    index = pd.Index(dates, name="date")
    series_by_ticker: dict[str, pd.Series] = {}
    histories = payload.get("histories", {})
    for ticker, history in histories.items():
        prices = history.get("price") or []
        if len(prices) == len(dates):
            series_by_ticker[ticker] = pd.Series(prices, index=index, dtype="float64")
    for ticker, series in new_prices.items():
        series_by_ticker[ticker] = series.reindex(index).ffill(limit=1)
    return pd.DataFrame(series_by_ticker, index=index)


def compute_history_rating(
    payload: dict,
    ticker: str,
    new_price_series: pd.Series,
    latest_rating: int | None,
) -> list[int | None]:
    price_frame = build_price_frame_from_histories(payload, {ticker: new_price_series})
    period_ratings: dict[str, pd.DataFrame] = {}
    for period_key in ["1m", "3m", "6m"]:
        periods = rs.LOOKBACKS[period_key]
        if len(price_frame) <= periods:
            continue
        period_ratings[period_key] = rs.percentile_to_rating(price_frame.div(price_frame.shift(periods)).sub(1))
    if not period_ratings:
        values = [None for _ in payload.get("historyDates", [])]
    else:
        weights = {key: rs.RS_WEIGHTS[key] for key in period_ratings}
        first = next(iter(period_ratings.values()))
        weighted_sum = pd.DataFrame(0.0, index=first.index, columns=first.columns)
        weight_sum = pd.DataFrame(0.0, index=first.index, columns=first.columns)
        for period_key, component in period_ratings.items():
            weight = weights[period_key]
            weighted_sum = weighted_sum.add(component.fillna(0).mul(weight), fill_value=0)
            weight_sum = weight_sum.add(component.notna().astype(float).mul(weight), fill_value=0)
        weighted = weighted_sum.div(weight_sum.where(weight_sum > 0)).round().clip(lower=1, upper=99)
        series = weighted[ticker] if ticker in weighted.columns else pd.Series(index=price_frame.index, dtype=float)
        values = [None if pd.isna(value) else int(value) for value in series.tolist()]
    if values and latest_rating is not None:
        values[-1] = latest_rating
    return values


def load_sp500_benchmark(history_dates: list[str]) -> pd.Series:
    payload = load_js_payload(MARKET_PRICE_DATA_PATH, "marketPriceData")
    item = payload.get("items", {}).get("sp500", {})
    series = pd.Series(
        item.get("values", []),
        index=pd.Index(pd.to_datetime(item.get("dates", [])), name="date"),
        dtype="float64",
    )
    return series.reindex(pd.to_datetime(history_dates)).ffill()


def list_from_series(series: pd.Series, digits: int = 2) -> list[float | int | None]:
    output: list[float | int | None] = []
    for value in series.tolist():
        try:
            numeric = float(value)
        except Exception:
            output.append(None)
            continue
        if not math.isfinite(numeric):
            output.append(None)
        elif digits == 0:
            output.append(int(round(numeric)))
        else:
            output.append(round(numeric, digits))
    return output


def build_new_row_and_history(payload: dict, ticker: str, frame: pd.DataFrame, name: str, shares: int) -> tuple[dict, dict]:
    latest_date = pd.Timestamp(payload["updatedAt"])
    history_dates = payload.get("historyDates", [])
    history_index = pd.Index(pd.to_datetime(history_dates), name="date")

    close = frame["close"].sort_index().reindex(frame.index.union(pd.Index([latest_date]))).sort_index().ffill(limit=1)
    adj_close = frame["adjClose"].sort_index().reindex(frame.index.union(pd.Index([latest_date]))).sort_index().ffill(limit=1)
    current_price = value_at_or_before(close, latest_date)
    if current_price is None:
        raise RuntimeError(f"No current price available for {ticker}.")
    market_cap = round(current_price * shares)
    if market_cap <= rs.MIN_MARKET_CAP_USD:
        raise RuntimeError(f"{ticker} market cap is below the RS minimum.")

    high = frame["high"].dropna()
    low = frame["low"].dropna()
    raw_close = close.dropna()
    atr_pct_series = rs.compute_atr_pct_series(high, low, raw_close)
    atr_series = rs.compute_atr_series(high, low, raw_close)
    returns = {
        period_key: compute_period_return_at(adj_close, latest_date, periods)
        for period_key, periods in rs.LOOKBACKS.items()
        if period_key in {"1w", "2w", "1m", "3m", "6m", "12m"}
    }
    price_history = close.reindex(history_index).ffill(limit=1)
    latest_rating = None
    row = {
        "ticker": ticker,
        "name": name,
        "price": round(current_price, 2),
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "rsRatingAll": None,
        "rsRatingSp500": None,
        "rsRatingNasdaq100": None,
        "rsRatingDowjones": None,
        "rsRatingRussell2000": None,
        "rsPeriods": {"1w": None, "2w": None, "1m": None, "3m": None, "6m": None, "12m": None},
        "returns": returns,
        "atr21Pct": rs.compute_atr_pct(high, low, raw_close),
        "extension": rs.compute_extension_metrics(raw_close, atr_series, atr_pct_series),
        "distanceTo52wHighPct": rs.compute_52w_gap(adj_close.dropna()),
        "rsNewHigh": False,
        "rsNewHighAll": False,
        "rsNewHighSp500": False,
        "rsNewHighNasdaq100": False,
        "rsNewHighDowjones": False,
        "rsNewHighRussell2000": False,
        "rsNewHigh1yAll": False,
        "rsNewHigh1ySp500": False,
        "rsNewHigh1yNasdaq100": False,
        "rsNewHigh1yDowjones": False,
        "rsNewHigh1yRussell2000": False,
        "rsNewHigh3mAll": False,
        "rsNewHigh3mSp500": False,
        "rsNewHigh3mNasdaq100": False,
        "rsNewHigh3mDowjones": False,
        "rsNewHigh3mRussell2000": False,
        "priceNewHigh": rs.compute_price_new_high(raw_close, rs.LOOKBACKS["12m"]),
        "priceNewHigh1y": rs.compute_price_new_high(raw_close, rs.LOOKBACKS["12m"]),
        "priceNewHigh3m": rs.compute_price_new_high(raw_close, rs.LOOKBACKS["3m"]),
        "memberships": {"sp500": False, "nasdaq100": False, "dowjones": False, "russell2000": False},
    }

    benchmark = load_sp500_benchmark(history_dates)
    rs_line = price_history.div(benchmark)
    history = {
        "rsRating": [],
        "rsRatingAll": [],
        "rsRatingSp500": [None for _ in history_dates],
        "rsRatingNasdaq100": [None for _ in history_dates],
        "rsRatingDowjones": [None for _ in history_dates],
        "rsRatingRussell2000": [None for _ in history_dates],
        "rsLine": rs.normalize_line(rs_line),
        "price": list_from_series(price_history, 2),
        "open": list_from_series(frame["open"].reindex(history_index), 2),
        "high": list_from_series(frame["high"].reindex(history_index), 2),
        "low": list_from_series(frame["low"].reindex(history_index), 2),
        "volume": list_from_series(frame["volume"].reindex(history_index), 0),
    }
    row["_historyPriceSeries"] = price_history
    row["_history"] = history
    row["_latestRatingRef"] = latest_rating
    return row, history


def update_new_high_flags(row: dict, history: dict) -> None:
    rating_series = pd.Series(history.get("rsRatingAll") or [], dtype="float64")
    one_year = rs.compute_rating_new_high(rating_series, rs.LOOKBACKS["12m"])
    three_month = rs.compute_rating_new_high(rating_series, rs.LOOKBACKS["3m"])
    row["rsNewHigh"] = one_year
    row["rsNewHighAll"] = one_year
    row["rsNewHigh1yAll"] = one_year
    row["rsNewHigh3mAll"] = three_month


def upsert_manual_config(ticker: str, name: str, shares: int | None) -> None:
    payload = load_manual_config()
    members = payload.setdefault("members", [])
    existing = None
    for member in members:
        if isinstance(member, dict) and clean_ticker(str(member.get("ticker") or "")) == ticker:
            existing = member
            break
    if existing is None:
        existing = {
            "ticker": ticker,
            "name": name,
            "memberships": {"sp500": False, "nasdaq100": False, "dowjones": False, "russell2000": False},
        }
        members.append(existing)
    existing["name"] = existing.get("name") or name
    if shares:
        existing["sharesOutstanding"] = shares
    members.sort(key=lambda item: str(item.get("ticker", "")))
    save_manual_config(payload)


def bump_script_versions() -> None:
    text = INDEX_PATH.read_text(encoding="utf-8")
    today = date.today().strftime("%Y%m%d")

    def bump(match: re.Match[str]) -> str:
        prefix, base, suffix = match.group(1), match.group(2), match.group(3)
        version_base = today
        next_suffix = 1
        if base == today and suffix:
            next_suffix = int(suffix) + 1
        elif base == today:
            next_suffix = 2
        return f"{prefix}{version_base}-{next_suffix}"

    text = re.sub(r"(\./data/market-rs-data\.js\?v=)(\d{8})(?:-(\d+))?", bump, text)
    text = re.sub(r"(\./data/market-trend-score-data\.js\?v=)(\d{8})(?:-(\d+))?", bump, text)
    INDEX_PATH.write_text(text, encoding="utf-8", newline="\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fast-add manual tickers to Market RS and Trend Score data.")
    parser.add_argument("tickers", nargs="+", help="Tickers to add, e.g. NVT or 'NVT US'.")
    parser.add_argument("--dry-run", action="store_true", help="Download and calculate but do not write files.")
    parser.add_argument("--skip-trend", action="store_true", help="Only update RS data.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    tickers = []
    for raw in args.tickers:
        ticker = clean_ticker(raw)
        if ticker and ticker not in tickers:
            tickers.append(ticker)
    if not tickers:
        raise SystemExit("No tickers provided.")

    payload = load_js_payload(RS_DATA_PATH, "marketRsData")
    existing_rows = payload.get("rows", [])
    rows_by_ticker = {row.get("ticker"): row for row in existing_rows if row.get("ticker")}
    new_rows: list[dict] = []
    new_histories: dict[str, dict] = {}

    for ticker in tickers:
        name, shares = fetch_ticker_meta(ticker)
        if shares is None:
            raise RuntimeError(f"Unable to fetch shares outstanding for {ticker}. Use manual config first.")
        if not args.dry_run:
            upsert_manual_config(ticker, name, shares)
        frame = download_ohlcv(ticker)
        row, history = build_new_row_and_history(payload, ticker, frame, name, shares)
        if ticker in rows_by_ticker:
            existing_rows = [existing for existing in existing_rows if existing.get("ticker") != ticker]
            payload.setdefault("histories", {}).pop(ticker, None)
            print(f"{ticker}: refreshed existing RS row from {len(frame)} downloaded rows.")
        else:
            print(f"{ticker}: downloaded {len(frame)} rows; market cap ${row['marketCap']:,}.")
        new_rows.append(row)
        new_histories[ticker] = history

    if not new_rows:
        if not args.dry_run and not args.skip_trend:
            subprocess.run([sys.executable, str(TREND_SCRIPT_PATH)], cwd=ROOT, check=True)
            bump_script_versions()
            print("Trend Score data regenerated from current RS data.")
        print("No new RS rows were needed.")
        return

    recompute_latest_rs(existing_rows, new_rows)

    for row in new_rows:
        ticker = row["ticker"]
        history = new_histories[ticker]
        latest_rating = row.get("rsRatingAll")
        history_rating = compute_history_rating(payload, ticker, row.pop("_historyPriceSeries"), latest_rating)
        history["rsRating"] = history_rating
        history["rsRatingAll"] = history_rating
        update_new_high_flags(row, history)
        row.pop("_history", None)
        row.pop("_latestRatingRef", None)

    payload["rows"] = sorted(existing_rows + new_rows, key=lambda item: (-int(item.get("rsRatingAll") or 0), item.get("ticker") or ""))
    payload.setdefault("histories", {}).update(new_histories)

    if args.dry_run:
        for row in new_rows:
            print(
                f"{row['ticker']}: RS {row.get('rsRatingAll')} "
                f"periods {row.get('rsPeriods')} ATR {row.get('atr21Pct')}"
            )
        return

    write_js_payload(RS_DATA_PATH, "marketRsData", payload)
    if not args.skip_trend:
        subprocess.run([sys.executable, str(TREND_SCRIPT_PATH)], cwd=ROOT, check=True)
    bump_script_versions()
    for row in new_rows:
        print(
            f"{row['ticker']}: added RS {row.get('rsRatingAll')} "
            f"Trend Score will be available in market-trend-score-data.js."
        )


if __name__ == "__main__":
    main()

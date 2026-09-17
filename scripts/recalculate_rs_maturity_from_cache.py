from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

import update_market_rs as rs


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "market-rs-data.js"


def load_payload() -> dict:
    text = DATA_PATH.read_text(encoding="utf-8").strip()
    return json.loads(re.sub(r"^window\.marketRsData\s*=\s*|;\s*$", "", text))


def cached_price_frame(payload: dict) -> pd.DataFrame:
    dates = pd.Index(pd.to_datetime(payload.get("historyDates") or []), name="Date")
    rows_by_ticker = {
        row.get("ticker"): row
        for row in payload.get("rows") or []
        if row.get("ticker") and not row.get("isIndex")
    }
    series_map: dict[str, pd.Series] = {}
    for ticker, history in (payload.get("histories") or {}).items():
        if ticker not in rows_by_ticker:
            continue
        values = history.get("price") or []
        if len(values) != len(dates):
            continue
        series_map[ticker] = pd.Series(values, index=dates, dtype="float64")
    return pd.DataFrame(series_map, index=dates).ffill(limit=1)


def update_new_high_flags(row: dict, rating_values: list[int | None]) -> None:
    rating_series = pd.Series(rating_values, dtype="float64")
    one_year = rs.compute_rating_new_high(rating_series, rs.LOOKBACKS["12m"])
    three_month = rs.compute_rating_new_high(rating_series, rs.LOOKBACKS["3m"])
    row["rsNewHigh"] = one_year
    row["rsNewHighAll"] = one_year
    row["rsNewHigh1yAll"] = one_year
    row["rsNewHigh3mAll"] = three_month


def main() -> None:
    payload = load_payload()
    close_frame = cached_price_frame(payload)
    if close_frame.empty:
        raise RuntimeError("Cached RS price history is empty.")

    period_ratings = rs.build_period_rs_ratings(close_frame)
    limited_history = rs.identify_limited_history_tickers(close_frame)
    provisional = rs.rs_provisional_status(period_ratings, limited_history)
    ramped_ratings = rs.weighted_rs_rating(period_ratings, limited_history)

    histories = payload.get("histories") or {}
    mature_snapshots = {
        ticker: list((histories.get(ticker) or {}).get("rsRatingAll") or [])
        for ticker in close_frame.columns
        if not bool(limited_history.get(ticker, False))
    }
    updated_tickers: list[str] = []
    for row in payload.get("rows") or []:
        ticker = row.get("ticker")
        if ticker not in close_frame.columns or row.get("isIndex"):
            continue
        history_sessions = int(close_frame[ticker].count())
        row["historySessions"] = history_sessions
        row["rsProvisional"] = bool(provisional.get(ticker, False))
        if not bool(limited_history.get(ticker, False)):
            continue

        series = ramped_ratings[ticker].reindex(close_frame.index)
        values = [None if pd.isna(value) else int(value) for value in series.tolist()]
        history = histories.get(ticker)
        if not history:
            continue
        history["rsRatingAll"] = values
        latest = series.dropna()
        row["rsRatingAll"] = int(latest.iloc[-1]) if not latest.empty else None
        update_new_high_flags(row, values)
        updated_tickers.append(ticker)

    for ticker, before in mature_snapshots.items():
        after = list((histories.get(ticker) or {}).get("rsRatingAll") or [])
        if before != after:
            raise RuntimeError(f"Mature RS history changed unexpectedly for {ticker}.")

    scoring = payload.setdefault("scoring", {})
    scoring["description"] = (
        "Weighted average of period RS ranks using RS_1M 20%, RS_3M 40%, RS_6M 20%, "
        "and RS_12M 20%. Each period RS is a daily 1-99 percentile rank. For newly listed "
        "names, each newly available period weight ramps in over 21 trading sessions. "
        "Names with market cap at or below $200M are excluded."
    )
    scoring["maturityRampSessions"] = rs.RS_MATURITY_RAMP_SESSIONS
    payload["rows"] = sorted(
        payload.get("rows") or [],
        key=lambda item: (-int(item.get("rsRatingAll") or 0), str(item.get("ticker") or "")),
    )
    DATA_PATH.write_text(
        "window.marketRsData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Recalculated maturity-ramped RS for {len(updated_tickers)} limited-history names: "
        + ", ".join(updated_tickers)
    )


if __name__ == "__main__":
    main()

"""Exact MSCI ACWI Net Total Return USD index, not the ACWI ETF."""

from datetime import datetime, time, timedelta
import math
from zoneinfo import ZoneInfo

from curl_cffi import requests

KEY = "acwiNtrUsd"
TICKER = "MIWD00000NUS"
LABEL = "MSCI ACWI NTR USD"
SOURCE_URL = "https://www.investing.com/indices/msci-acwi-net-usd-historical-data"
HISTORY_URL = "https://api.investing.com/api/financialdata/historical/951385"
START_DATE = "2016-01-01"


def parse_history(payload, through):
    rows = {}
    for entry in payload.get("data", []):
        day = str(entry.get("rowDateTimestamp", ""))[:10]
        parsed = datetime.strptime(day, "%Y-%m-%d").date()
        if day < START_DATE or day > through or parsed.weekday() >= 5:
            continue
        values = [float(str(entry[f"last_{field}Raw"]).replace(",", ""))
                  for field in ("open", "max", "min", "close")]
        o, h, l, c = values
        if not all(math.isfinite(v) and v > 0 for v in values) or not l <= min(o, c) <= max(o, c) <= h:
            raise ValueError(f"Invalid MSCI ACWI NTR OHLC: {day}")
        rows[day] = [round(v, 4) for v in values]
    if not rows:
        raise ValueError("No completed MSCI ACWI NTR sessions")
    dates = sorted(rows)
    return {
        "label": LABEL, "symbol": TICKER, "color": "#0d9488", "isIndex": True,
        "currency": "USD", "returnType": "Net Total Return",
        "msciIndexCode": "892400", "source": "Investing.com / MSCI ACWI Net USD",
        "sourceUrl": SOURCE_URL,
        "officialUrl": "https://www.msci.com/indexes/index/892400/msci-acwi-index",
        "dates": dates, "values": [rows[d][3] for d in dates],
        **{key: [rows[d][i] for d in dates]
           for i, key in enumerate(("opens", "highs", "lows", "closes"))},
    }


def latest_completed_date(now=None):
    now = (now or datetime.now(ZoneInfo("America/New_York"))).astimezone(ZoneInfo("America/New_York"))
    # Match the RS collector's close buffer. UTC midnight is 09:00 KST and
    # would incorrectly exclude the completed US session from morning runs.
    day = now.date() if now.time() >= time(16, 10) else now.date() - timedelta(days=1)
    while day.weekday() >= 5:
        day -= timedelta(days=1)
    return day.isoformat()


def fetch_item(existing=None):
    through = latest_completed_date()
    try:
        response = requests.get(HISTORY_URL, params={
            "start-date": START_DATE, "end-date": through,
            "time-frame": "Daily", "add-missing-rows": "false",
        }, headers={"domain-id": "www", "referer": SOURCE_URL},
            impersonate="chrome", timeout=45)
        response.raise_for_status()
        item = parse_history(response.json(), through)
        if len(item["dates"]) < 1000:
            raise ValueError("MSCI ACWI NTR history unexpectedly short")
        if existing and existing.get("dates"):
            if item["dates"][-1] < existing["dates"][-1] or item["dates"][0] > existing["dates"][0]:
                raise ValueError("MSCI ACWI NTR history regressed")
        return item
    except Exception as exc:
        if not existing or not existing.get("dates"):
            raise
        print(f"Retained MSCI ACWI NTR history after refresh failure: {exc}", flush=True)
        return existing


def append_rs_index(payload, item=None):
    """Rate the index against the existing universe without reranking stocks."""
    import pandas as pd
    import update_market_rs as rs
    from add_market_rs_tickers import build_new_row_and_history, list_from_series, update_new_high_flags

    if item is None:
        from update_market_prices import load_existing_item
        item = fetch_item(load_existing_item(rs.OUTPUT_PATH.parent / "market-price-data.js", KEY))
    dates = pd.to_datetime(payload["historyDates"])
    frame = pd.DataFrame({k: item[v] for k, v in {
        "open": "opens", "high": "highs", "low": "lows", "close": "closes",
        "adjClose": "closes",
    }.items()}, index=pd.to_datetime(item["dates"]))
    frame["volume"] = float("nan")
    as_of = min(payload["updatedAt"], item["dates"][-1])
    scoped = {**payload, "updatedAt": as_of}
    row, history = build_new_row_and_history(scoped, TICKER, frame, LABEL, None, is_index=True)
    row.update(isIndex=True, currency="USD", asOfDate=as_of, sourceUrl=SOURCE_URL,
               rsBasis="Existing All universe; index excluded from stock ranks")
    reference = pd.DataFrame({r["ticker"]: payload["histories"][r["ticker"]]["price"]
                              for r in payload["rows"] if not r.get("isIndex")
                              and r["ticker"] in payload["histories"]}, index=dates)
    price = frame["close"].reindex(dates)
    ratings = {}
    returns = {}
    for key, lookback in rs.LOOKBACKS.items():
        if key not in row["rsPeriods"]:
            continue
        benchmark_returns = reference.div(reference.shift(lookback)).sub(1)
        index_return = price.div(price.shift(lookback)).sub(1)
        counts = benchmark_returns.notna().sum(axis=1)
        less = benchmark_returns.lt(index_return, axis=0).sum(axis=1)
        equal = benchmark_returns.eq(index_return, axis=0).sum(axis=1)
        # Same average-rank percentile rule as RS, queried out of sample.
        ratings[key] = (1 + 98 * (less + equal / 2).div(counts.where(counts > 0))).round().clip(1, 99).where(index_return.notna())
        returns[key] = index_return * 100
    weighted = sum(ratings[k].fillna(0) * w for k, w in rs.RS_WEIGHTS.items())
    weights = sum(ratings[k].notna().astype(float) * w for k, w in rs.RS_WEIGHTS.items())
    rating = weighted.div(weights.where(weights > 0)).round().clip(1, 99)
    valid = price.loc[:as_of].dropna()
    last = valid.index[-1]
    row["rsPeriods"] = {k: None if pd.isna(s.loc[last]) else int(s.loc[last]) for k, s in ratings.items()}
    row["returns"] = {k: None if pd.isna(s.loc[last]) else round(float(s.loc[last]), 2) for k, s in returns.items()}
    row["rsRatingAll"] = None if pd.isna(rating.loc[last]) else int(rating.loc[last])
    history["rsRatingAll"] = list_from_series(rating, 0)
    # No forward-filled bars on missing index sessions.
    history["price"] = list_from_series(price)
    for k in list(row):
        if k.startswith("_"):
            row.pop(k)
    update_new_high_flags(row, history)
    payload["rows"] = [r for r in payload["rows"] if r["ticker"] != TICKER] + [row]
    payload["histories"][TICKER] = history
    return payload


def main():
    import argparse
    import json
    from pathlib import Path
    from add_market_rs_tickers import load_js_payload

    parser = argparse.ArgumentParser(description="Refresh MSCI ACWI NTR without changing other symbols")
    parser.add_argument("--rs-only", action="store_true", help="Leave the separate Index Trend file to its own workflow")
    parser.add_argument("--if-stale", action="store_true", help="Skip only when both index RS and Trend reach the RS data date")
    parser.add_argument("--trend-only", action="store_true", help="Recompute only this index's Trend from the saved RS and benchmark data")
    args = parser.parse_args()
    data = Path(__file__).resolve().parents[1] / "data"
    rs = load_js_payload(data / "market-rs-data.js", "marketRsData")
    result = load_js_payload(data / "market-trend-score-data.js", "marketTrendScoreData")
    rs_stale = rs_index_is_stale(rs)
    if args.if_stale and not rs_stale and not trend_index_is_stale(rs, result):
        print("MSCI ACWI NTR RS and Trend already reach the current RS session")
        return
    prices = load_js_payload(data / "market-price-data.js", "marketPriceData")
    refresh_rs = not args.trend_only and (rs_stale or not args.if_stale)
    if refresh_rs:
        item = fetch_item(prices["items"].get(KEY))
        prices["items"][KEY] = item
        append_rs_index(rs, item)
    refresh_trend_index(result, rs, prices)
    for filename, variable, payload in [
        ("market-price-data.js", "marketPriceData", prices),
        ("market-rs-data.js", "marketRsData", rs),
        ("market-trend-score-data.js", "marketTrendScoreData", result),
    ]:
        if filename != "market-trend-score-data.js" and not refresh_rs:
            continue
        if args.rs_only and filename == "market-price-data.js":
            continue
        # Match the compact daily collector format; only the new index changes.
        (data / filename).write_text("window." + variable + " = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8", newline="\n")
    row = next(r for r in rs["rows"] if r["ticker"] == TICKER)
    trend_row = next(r for r in result['rows']['all'] if r['ticker'] == TICKER)
    print(f"{LABEL}: RS {row['asOfDate']} = {row['price']}; RS rating {row['rsRatingAll']}")
    print(f"Trend {trend_row['asOfDate']}: {trend_row['score']}/10")
    if trend_index_is_stale(rs, result):
        print("MSCI Trend still trails RS; awaiting complete index/benchmark inputs (no fabricated prices).")


def refresh_trend_index(result, rs, prices):
    import update_market_trend_score as trend

    if result.get("historyDates") != trend.get_history_dates(rs):
        raise ValueError("RS and Trend history dates differ; refresh Trend before targeted update")
    # The index is scored using ALL's S&P 500 benchmark but never ranks stocks.
    rows, histories = trend.build_universe_payload("all", trend.UNIVERSES["all"], rs, prices, {}, {}, {TICKER})
    if not rows or TICKER not in histories:
        raise ValueError("Cannot compute MSCI Trend from the saved index and benchmark history")
    result.setdefault("rows", {}).setdefault("all", [])
    result["rows"]["all"] = [r for r in result["rows"]["all"] if r["ticker"] != TICKER] + rows
    result.setdefault("histories", {}).setdefault("all", {}).update(histories)
    return result


def trend_index_is_stale(rs, result):
    import update_market_trend_score as trend

    dates = result.get("historyDates", [])
    if not dates or dates != trend.get_history_dates(rs):
        return True
    index_row = next((r for r in rs.get("rows", []) if r.get("ticker") == TICKER), {})
    row = next((r for r in result.get("rows", {}).get("all", []) if r.get("ticker") == TICKER), {})
    scores = result.get("histories", {}).get("all", {}).get(TICKER, {}).get("score", [])
    return (str(row.get("asOfDate") or "") < str(index_row.get("asOfDate") or rs.get("updatedAt") or "")
            or row.get("price") != index_row.get("price")
            or row.get("score") is None
            or len(scores) != len(dates) or scores[-1] != row.get("score"))


def rs_index_is_stale(payload):
    row = next((r for r in payload.get("rows", []) if r.get("ticker") == TICKER), {})
    history = payload.get("histories", {}).get(TICKER, {})
    return (str(row.get("asOfDate") or "") < str(payload.get("updatedAt") or "")
            or any(not history.get(key) or history[key][-1] is None for key in ("price", "rsRatingAll")))


if __name__ == "__main__":
    main()

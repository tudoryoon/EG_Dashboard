"""Exact MSCI ACWI Net Total Return USD index, not the ACWI ETF."""

from copy import deepcopy
from datetime import datetime, time, timedelta, timezone
import math
from urllib.parse import quote
from zoneinfo import ZoneInfo

from curl_cffi import requests

KEY = "acwiNtrUsd"
TICKER = "MIWD00000NUS"
LABEL = "MSCI ACWI NTR USD"
YAHOO_SYMBOL = "^892400-USD-NETR"
SOURCE_URL = f"https://finance.yahoo.com/quote/{quote(YAHOO_SYMBOL, safe='')}/"
HISTORY_URL = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(YAHOO_SYMBOL, safe='')}"
OFFICIAL_LEVEL_URL = "https://app2.msci.com/products/service/index/indexmaster/getLevelDataForGraph"
START_DATE = "2016-01-01"
PRICE_FIELDS = ("values", "opens", "highs", "lows", "closes")


def parse_yahoo_history(payload, through):
    chart = payload.get("chart") or {}
    results = chart.get("result") or []
    if chart.get("error") or len(results) != 1:
        raise ValueError(f"Yahoo MSCI chart unavailable: {chart.get('error')}")
    result = results[0]
    meta = result.get("meta") or {}
    if (meta.get("symbol") != YAHOO_SYMBOL or meta.get("instrumentType") != "INDEX"
            or meta.get("currency") not in (None, "USD")):
        raise ValueError("Yahoo index identity does not match ACWI NETR USD")
    zone = ZoneInfo(meta.get("exchangeTimezoneName") or "America/New_York")
    quote_time = meta.get("regularMarketTime")
    quote_day = datetime.fromtimestamp(quote_time, zone).date() if quote_time else None
    timestamps = result.get("timestamp") or []
    quotes = (result.get("indicators") or {}).get("quote") or []
    if len(quotes) != 1:
        raise ValueError("Yahoo MSCI chart has no daily quotes")
    values = quotes[0]
    rows = {}
    snapshots = {}
    for i, stamp in enumerate(timestamps):
        observed = datetime.fromtimestamp(stamp, zone)
        day = observed.date().isoformat()
        parsed = observed.date()
        if day < START_DATE or day > through or parsed.weekday() >= 5:
            continue
        def field(key):
            series = values.get(key) or []
            value = series[i] if i < len(series) else None
            return None if value is None else float(value)
        c = field("close")
        if c is None:
            continue
        if not math.isfinite(c) or c <= 0:
            raise ValueError(f"Invalid Yahoo MSCI close: {day}")
        # Yahoo currently exposes a rolling latest quote, not a finalized EOD
        # candle. Its UTC timestamp can fall on the next calendar day in Korea.
        is_snapshot = parsed == quote_day
        if is_snapshot:
            if datetime.fromtimestamp(quote_time, zone).time() < time(16):
                continue
            o = h = l = None
            snapshots[day] = datetime.fromtimestamp(quote_time, timezone.utc).isoformat()
        else:
            o, h, l = (field(key) for key in ("open", "high", "low"))
            if any(v is None for v in (o, h, l)):
                o = h = l = None
            elif (not all(math.isfinite(v) and v > 0 for v in (o, h, l))
                  or not l <= min(o, c) <= max(o, c) <= h):
                raise ValueError(f"Invalid Yahoo MSCI OHLC: {day}")
        rows[day] = [None if v is None else round(v, 4) for v in (o, h, l, c)]
    if not rows:
        raise ValueError("No completed-session Yahoo MSCI observations")
    dates = sorted(rows)
    return {
        "label": LABEL, "symbol": TICKER, "color": "#0d9488", "isIndex": True,
        "currency": "USD", "returnType": "Net Total Return",
        "msciIndexCode": "892400", "providerSymbol": YAHOO_SYMBOL,
        "source": "Yahoo Finance / MSCI ACWI NETR USD",
        "sourceUrl": SOURCE_URL,
        "officialUrl": "https://www.msci.com/indexes/index/892400/msci-acwi-index",
        "snapshotDates": snapshots,
        "priceStatus": "provider_snapshot" if dates[-1] in snapshots else "provider_daily",
        "quoteAsOf": snapshots.get(dates[-1]),
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


def official_eod_close(day):
    """Read the dated MSCI ACWI NETR USD final level, not a rolling quote."""
    response = requests.get(OFFICIAL_LEVEL_URL, params={
        "currency_symbol": "USD", "index_variant": "NETR",
        "start_date": day.replace("-", ""), "end_date": day.replace("-", ""),
        "data_frequency": "DAILY", "index_codes": "892400",
    }, impersonate="chrome", timeout=30)
    response.raise_for_status()
    payload = response.json()
    if (str(payload.get("msci_index_code")) != "892400"
            or payload.get("index_variant_type") != "NETR"
            or payload.get("ISO_currency_symbol") != "USD"):
        raise ValueError("MSCI official index identity does not match ACWI NETR USD")
    levels = payload.get("indexes", {}).get("INDEX_LEVELS", [])
    matching = [row.get("level_eod") for row in levels
                if str(row.get("calc_date")) == day.replace("-", "")]
    if len(matching) != 1:
        raise ValueError(f"MSCI official NETR USD EOD is not available for {day}")
    level = float(matching[0])
    if not math.isfinite(level) or level <= 0:
        raise ValueError(f"Invalid MSCI official NETR USD EOD for {day}")
    return level


def certify_latest_eod(item):
    """Keep Yahoo history, but publish the exact MSCI final close only."""
    day = item["dates"][-1]
    level = official_eod_close(day)
    item["values"][-1] = item["closes"][-1] = round(level, 4)
    for key in ("opens", "highs", "lows"):
        item[key][-1] = None  # MSCI EOD supplies no verifiable candle.
    item.setdefault("officialEodOverrides", {})[day] = level
    item.get("snapshotDates", {}).pop(day, None)
    item["priceStatus"] = "official_eod"
    item["officialEodDate"] = day
    item["quoteAsOf"] = None
    item["closeOnly"] = True
    item["source"] = "MSCI official NETR USD EOD closes; Yahoo Finance prior history"
    item["sourceUrl"] = item["officialUrl"]
    return item


def merge_history(existing, incoming):
    """Retain the saved archive when Yahoo supplies only its latest quote."""
    if not existing or not existing.get("dates"):
        return incoming
    if incoming["dates"][-1] < existing["dates"][-1]:
        raise ValueError("Yahoo MSCI observation regressed")
    rows = {}
    for item in (existing, incoming):
        for i, day in enumerate(item["dates"]):
            rows[day] = [item.get(key, [])[i] if i < len(item.get(key, [])) else None
                         for key in PRICE_FIELDS]
    # Already verified EOD corrections remain authoritative in the saved archive.
    overrides = existing.get("officialEodOverrides") or {}
    for day, value in overrides.items():
        if day in rows:
            rows[day] = [round(value, 4), None, None, None, round(value, 4)]
    item = {**deepcopy(existing), **incoming}
    item.pop("closeOnly", None)
    item["historicalSource"] = existing.get("historicalSource") or existing.get("source")
    item["snapshotDates"] = {**existing.get("snapshotDates", {}), **incoming["snapshotDates"]}
    for day in incoming["dates"]:
        if day not in incoming["snapshotDates"] or day in overrides:
            item["snapshotDates"].pop(day, None)
    item["dates"] = sorted(rows)
    for i, key in enumerate(PRICE_FIELDS):
        item[key] = [rows[day][i] for day in item["dates"]]
    latest = item["dates"][-1]
    item["priceStatus"] = "provider_snapshot" if latest in item["snapshotDates"] else "provider_daily"
    item["quoteAsOf"] = item["snapshotDates"].get(latest)
    return item


def fetch_item(existing=None):
    through = latest_completed_date()
    try:
        response = requests.get(HISTORY_URL, params={
            "range": "5d", "interval": "1d", "includePrePost": "false",
        }, impersonate="chrome", timeout=30)
        response.raise_for_status()
        item = certify_latest_eod(merge_history(existing, parse_yahoo_history(response.json(), through)))
        item["refreshedAt"] = datetime.now(timezone.utc).isoformat()
        return item
    except Exception as exc:
        if (not existing or not existing.get("dates")
                or (existing["dates"][-1] == through
                    and existing.get("priceStatus") != "official_eod"
                    and through not in (existing.get("officialEodOverrides") or {}))):
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
        # RS-only workflows must use the already published, certified price.
        item = load_existing_item(rs.OUTPUT_PATH.parent / "market-price-data.js", KEY)
    dates = pd.to_datetime(payload["historyDates"])
    frame = pd.DataFrame({k: item[v] for k, v in {
        "open": "opens", "high": "highs", "low": "lows", "close": "closes",
        "adjClose": "closes",
    }.items()}, index=pd.to_datetime(item["dates"]))
    frame["volume"] = float("nan")
    as_of = min(payload["updatedAt"], item["dates"][-1])
    scoped = {**payload, "updatedAt": as_of}
    row, history = build_new_row_and_history(scoped, TICKER, frame, LABEL, None, is_index=True)
    row.update(isIndex=True, currency="USD", asOfDate=as_of,
               sourceUrl=item.get("sourceUrl", SOURCE_URL),
               providerSymbol=item.get("providerSymbol"), priceStatus=item.get("priceStatus"),
               quoteAsOf=item.get("quoteAsOf"),
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
    prices = load_js_payload(data / "market-price-data.js", "marketPriceData")
    current_item = prices["items"].get(KEY) or {}
    needs_eod = (not current_item.get("dates")
                 or current_item.get("priceStatus") != "official_eod"
                 or current_item.get("officialEodDate") != current_item["dates"][-1])
    if args.rs_only:
        needs_eod = False  # A separate price workflow owns this file.
    rs_stale = rs_index_is_stale(rs)
    if args.if_stale and not rs_stale and not trend_index_is_stale(rs, result) and not needs_eod:
        print("MSCI ACWI NTR RS and Trend already reach the current RS session")
        return
    refresh_rs = not args.trend_only and (rs_stale or needs_eod or not args.if_stale)
    if refresh_rs:
        item = current_item if args.rs_only else fetch_item(current_item)
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

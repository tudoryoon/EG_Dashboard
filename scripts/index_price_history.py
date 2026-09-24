from __future__ import annotations

import math
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from curl_cffi import requests as curl_requests


NASDAQ_INDICES = {"^IXIC": "COMP", "^NDX": "NDX", "^SOX": "SOX"}
INVESTING_INDICES = {"^GSPC": "166", "^DJI": "169", "^RUT": "170"}
INDEX_SYMBOLS = (*NASDAQ_INDICES, *INVESTING_INDICES)
OHLC = ["open", "high", "low", "close"]


def valid_ohlc(row) -> bool:
    try:
        o, h, l, c = (float(row[key]) for key in OHLC)
        return all(math.isfinite(v) and v > 0 for v in (o, h, l, c)) and l <= min(o, c) <= max(o, c) <= h
    except (KeyError, TypeError, ValueError):
        return False


def item_to_frame(item: dict) -> pd.DataFrame:
    dates = item.get("dates", [])
    return pd.DataFrame({
        field: item.get(key, [None] * len(dates))
        for field, key in zip(OHLC, ("opens", "highs", "lows", "values"))
    }, index=pd.to_datetime(dates))


def apply_frame_to_item(item: dict, frame: pd.DataFrame) -> dict:
    return {
        **item,
        "dates": frame.index.strftime("%Y-%m-%d").tolist(),
        **{key: frame[field].round(4).tolist() for field, key in zip(OHLC, ("opens", "highs", "lows", "values"))},
        "closes": frame["close"].round(4).tolist(),
    }


def parse_index_rows(entries: list[dict], nasdaq: bool) -> pd.DataFrame:
    rows = {}
    for entry in entries:
        try:
            day = pd.to_datetime(entry["date"], format="%m/%d/%Y") if nasdaq else pd.Timestamp(entry["rowDateTimestamp"][:10])
            fields = OHLC if nasdaq else ["last_openRaw", "last_maxRaw", "last_minRaw", "last_closeRaw"]
            row = {key: float(str(entry[field]).replace(",", "").replace("$", "")) for key, field in zip(OHLC, fields)}
            if day.weekday() < 5 and valid_ohlc(row):
                rows[day] = row
        except (KeyError, TypeError, ValueError):
            continue
    return pd.DataFrame.from_dict(rows, orient="index", columns=OHLC).sort_index()


def fetch_recent_index_ohlc(symbol: str, start: str, end: str) -> pd.DataFrame:
    if symbol in NASDAQ_INDICES:
        response = requests.get(
            f"https://api.nasdaq.com/api/quote/{NASDAQ_INDICES[symbol]}/historical",
            params={"assetclass": "index", "fromdate": start, "todate": end, "limit": 100},
            headers={"User-Agent": "Mozilla/5.0"}, timeout=25,
        )
        response.raise_for_status()
        entries = ((response.json().get("data") or {}).get("tradesTable") or {}).get("rows") or []
        frame = parse_index_rows(entries, nasdaq=True)
    else:
        response = curl_requests.get(
            f"https://api.investing.com/api/financialdata/historical/{INVESTING_INDICES[symbol]}",
            params={"start-date": start, "end-date": end, "time-frame": "Daily", "add-missing-rows": "false"},
            headers={"domain-id": "www", "accept": "application/json", "referer": "https://www.investing.com/"},
            impersonate="chrome", timeout=25,
        )
        response.raise_for_status()
        frame = parse_index_rows(response.json().get("data") or [], nasdaq=False)
    if frame.empty:
        raise ValueError(f"No actual index OHLC returned for {symbol}")
    return frame.loc[start:end]


def repair_recent_index_frames(frames: dict[str, pd.DataFrame], reference_dates=(), cached_frames=None, now=None) -> dict[str, pd.DataFrame]:
    """Use actual index bars, never ETF-implied prices, in both dashboard updaters."""
    now = now or datetime.now(ZoneInfo("America/New_York"))
    last_day = now.date() if now.time() >= time(16, 10) else now.date() - timedelta(days=1)
    end = pd.Timestamp(last_day)
    start = end - pd.Timedelta(days=35)
    result = {}
    sessions = {pd.Timestamp(day).normalize() for day in reference_dates if pd.Timestamp(day).normalize() <= end}
    for symbol in INDEX_SYMBOLS:
        frame = frames.get(symbol, pd.DataFrame(columns=OHLC)).copy()
        frame.index = pd.to_datetime(frame.index)
        cached = (cached_frames or {}).get(symbol)
        if cached is not None and not cached.empty:
            frame = frame.combine_first(cached)
        frame = frame.loc[frame.index <= end].sort_index()
        if not frame.empty:
            frame = frame[(frame.index < start) | frame.apply(valid_ohlc, axis=1)]
        try:
            actual = fetch_recent_index_ohlc(symbol, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
            actual = actual.loc[(actual.index >= start) & (actual.index <= end)]
            missing = actual.index.difference(frame.index)
            frame = actual.combine_first(frame).sort_index()
            if len(missing):
                print(f"Restored actual {symbol} bars: {', '.join(missing.strftime('%Y-%m-%d'))}", flush=True)
        except Exception as exc:
            print(f"Index cross-check unavailable for {symbol}: {exc}", flush=True)
        sessions.update(frame.index)
        result[symbol] = frame

    recent_sessions = pd.DatetimeIndex(sorted(day for day in sessions if start <= day <= end))[-10:]
    if len(recent_sessions) < 2:
        raise RuntimeError("Insufficient completed index sessions; previous output retained")
    for symbol, frame in result.items():
        missing = recent_sessions.difference(frame.index)
        if len(missing):
            raise RuntimeError(f"Unresolved {symbol} index sessions: {missing.strftime('%Y-%m-%d').tolist()}; refusing multi-day 1D returns")
    return result

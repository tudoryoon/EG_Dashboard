"""Refresh one completed exchange session. Never replace a newer/partial snapshot."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
import time
from urllib.parse import quote

from curl_cffi import requests
import numpy as np
import pandas as pd
import pandas_market_calendars as mcal

from market_regime import BENCHMARKS, calculate

ROOT = Path(__file__).resolve().parents[1]
CAL = {"us": "NYSE", "usq": "NYSE"}
FLOOR = {"us": 480, "usq": 95}
OHLC = ["Open", "High", "Low", "Close", "Volume"]


def completed(market, now=None):
    now = pd.Timestamp(now or datetime.now(timezone.utc))
    schedule = mcal.get_calendar(CAL[market]).schedule(start_date=(now - pd.Timedelta(days=20)).date(),
                                                        end_date=(now + pd.Timedelta(days=1)).date())
    return schedule[schedule.market_close + pd.Timedelta(minutes=10) <= now].index[-1].date().isoformat()


def fetch(url, **kwargs):
    for attempt in range(3):
        try:
            r = requests.get(url, impersonate="chrome",
                                 timeout=20, **kwargs)
            r.raise_for_status()
            return r
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1 + attempt * 2)


def universe(market):
    if market == "usq":
        data = json.loads((ROOT / "data/market-rs-nasdaq100-snapshot.json").read_text(encoding="utf8"))
        return {r["Ticker"]: {} for r in data["rows"]}
    data = (ROOT / "data/market-rs-data.js").read_text(encoding="utf8")
    rows = json.loads(data.split("=", 1)[1].strip().removesuffix(";"))["rows"]
    return {r["ticker"]: {} for r in rows if r["memberships"].get("sp500")}


def prices(ticker, start, end):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + quote(ticker.replace(".", "-"), safe="")
    data = fetch(url, params={"period1": int(pd.Timestamp(start, tz="UTC").timestamp()) - 86400,
                              "period2": int(pd.Timestamp(end, tz="UTC").timestamp()) + 86400,
                              "interval": "1d", "includePrePost": "false"}).json()["chart"]["result"][0]
    ix = pd.to_datetime(data["timestamp"], unit="s", utc=True).tz_convert(data["meta"]["exchangeTimezoneName"])
    frame = pd.DataFrame(data["indicators"]["quote"][0], index=ix.normalize().tz_localize(None))
    frame = frame.rename(columns=str.title)[OHLC]
    frame = frame.apply(pd.to_numeric, errors="coerce").dropna(subset=["High", "Low", "Close"])
    frame = frame[(frame.Close > 0) & (frame.Low > 0) & (frame.High >= frame.Low)]
    return frame[~frame.index.duplicated(keep="last")].sort_index().loc[start:end]


def cached_prices(ticker, end, cache):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / (re.sub(r"[^A-Za-z0-9.-]", "_", ticker) + ".csv.gz")
    start = (pd.Timestamp(end) - pd.DateOffset(years=4)).date().isoformat()
    old = pd.read_csv(path, index_col=0, parse_dates=True).loc[start:end] if path.exists() else None
    if old is not None and len(old) and old.index[-1] == pd.Timestamp(end):
        return old
    since = start if old is None or old.empty else max(start, (old.index[-1] - timedelta(days=12)).date().isoformat())
    new = prices(ticker, since, end)
    if old is not None and not old.empty:
        overlap = new.index.intersection(old.index)
        if len(overlap) and not np.allclose(old.loc[overlap, "Close"], new.loc[overlap, "Close"], rtol=.0001):
            new = prices(ticker, start, end)
        else:
            new = pd.concat([old, new])
            new = new[~new.index.duplicated(keep="last")].sort_index()
    if not new.empty:
        new.to_csv(path, compression="gzip")
    return new


def merge(old, new):
    if new["asof"] <= old["asof"]:
        return old
    history = old["history"] + [r for r in new["history"] if r["date"] > old["asof"]]
    new["history"] = history[-252:]
    return new


def update(market, folder, cache, force=False):
    path = folder / (market + ".json")
    old = json.loads(path.read_text(encoding="utf8"))
    end = completed(market)
    if end <= old["asof"] and not force:
        print(f"{market}: {old['asof']} already covers latest completed session {end}")
        return
    info = universe(market)
    if len(info) < FLOOR[market]:
        raise ValueError(f"Too few members: {len(info)}")
    bench = BENCHMARKS
    def get(t):
        try:
            return t, cached_prices(t, end, cache)
        except Exception as e:
            print(f"{t}: {type(e).__name__}: {str(e)[:130]}", flush=True)
            return t, None
    with ThreadPoolExecutor(max_workers=6) as pool:
        frames = {t: f for t, f in pool.map(get, dict.fromkeys([*bench, *info]))
                  if f is not None and not f.empty and f.index[-1] == pd.Timestamp(end)}
    if not all(t in frames for t in bench) or sum(t in frames for t in info) < .95 * len(info):
        raise ValueError(f"Incomplete {end}: {len(frames)} price series for {len(info)} members plus benchmarks")
    result = calculate(frames, list(info), end, market=market)
    latest = result["latest"]
    if latest["n_breadth"] < .9 * len(info) or any(latest[f"s{i}"] is None for i in [1, 2, 3, 5, 7]):
        raise ValueError(f"Invalid breadth/sector sample {end}")
    result = merge(old, result)
    if result is not old:
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n", encoding="utf8")
        tmp.replace(path)
    print(f"{market}: validated {end}, {latest['n_breadth']}/{len(info)} breadth; published as of {result['asof']}")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("market", choices=list(CAL))
    p.add_argument("--output-dir", type=Path, default=ROOT / "study/market-scorecard")
    p.add_argument("--cache-dir", type=Path, default=ROOT / ".cache/scorecard")
    p.add_argument("--force", action="store_true", help="Recalculate even when current; never overwrite the same session")
    p.add_argument("--check", action="store_true", help="Print only due/current for CI")
    a = p.parse_args()
    if a.check:
        old = json.loads((a.output_dir / (a.market + ".json")).read_text(encoding="utf8"))
        print("due" if completed(a.market) > old["asof"] else "current")
    else:
        update(a.market, a.output_dir, a.cache_dir, a.force)

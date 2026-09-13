"""Refresh only the US scorecard; KR/CN source snapshots remain untouched."""
import argparse
import gzip
import hashlib
import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

from market_regime import BENCHMARKS, VERSION, calculate, resolve_session

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "study" / "market-regime"
CACHE = ROOT / ".market-regime-cache"
FIELDS = ["Close", "High", "Low", "Volume"]


def read_assignment(path, prefix):
    text = path.read_text(encoding="utf-8").strip()
    if not text.startswith(prefix) or not text.endswith(";"):
        raise ValueError(f"Invalid data file: {path}")
    return json.loads(text[len(prefix):-1])


def universe(session):
    rs = read_assignment(ROOT / "data" / "market-rs-data.js", "window.marketRsData = ")
    if (pd.Timestamp(session) - pd.Timestamp(rs["updatedAt"])).days > 14:
        raise ValueError("S&P 500 membership snapshot is over 14 days old")
    members = sorted({r["ticker"].replace(".", "-") for r in rs["rows"] if r.get("memberships", {}).get("sp500")})
    if not 450 <= len(members) <= 520:
        raise ValueError(f"Unexpected S&P 500 membership count: {len(members)}")
    return members, rs["updatedAt"]


def load_cache():
    path = CACHE / "prices.json.gz"
    if not path.exists():
        return {}
    try:
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            payload = json.load(handle)
        if payload.get("version") != VERSION:
            return {}
        return {ticker: pd.DataFrame(value["values"], columns=FIELDS, index=pd.to_datetime(value["dates"]))
                for ticker, value in payload["frames"].items()}
    except (OSError, ValueError, KeyError):
        print("Ignoring invalid cache; collecting a full history", flush=True)
        return {}


def save_cache(frames):
    CACHE.mkdir(exist_ok=True)
    payload = {"version": VERSION, "frames": {
        ticker: {"dates": frame.index.strftime("%Y-%m-%d").tolist(), "values": frame[FIELDS].to_numpy().tolist()}
        for ticker, frame in frames.items()
    }}
    temp = CACHE / "prices.tmp.gz"
    with gzip.open(temp, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"), allow_nan=False)
    temp.replace(CACHE / "prices.json.gz")


def normalize_frame(raw, session):
    if raw.empty or not all(column in raw for column in FIELDS):
        return pd.DataFrame(columns=FIELDS)
    frame = raw[FIELDS].apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan).dropna()
    index = pd.to_datetime(frame.index)
    if index.tz is not None:
        index = index.tz_convert("America/New_York").tz_localize(None)
    frame.index = index.normalize()
    frame = frame[~frame.index.duplicated(keep="last")].sort_index()
    return frame[(frame.index <= pd.Timestamp(session)) & (frame.Close > 0) & (frame.Low > 0)
                 & (frame.High >= frame.Low) & (frame.High >= frame.Close) & (frame.Low <= frame.Close) & (frame.Volume > 0)]


def download(tickers, start, session):
    raw = yf.download(tickers, start=start, end=(pd.Timestamp(session) + pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
                      auto_adjust=False, actions=True, progress=False, threads=4, group_by="ticker", timeout=30)
    frames, splits = {}, set()
    for ticker in tickers:
        try:
            part = raw[ticker] if isinstance(raw.columns, pd.MultiIndex) else raw
        except KeyError:
            continue
        frame = normalize_frame(part, session)
        if not frame.empty:
            frames[ticker] = frame
        if "Stock Splits" in part and part["Stock Splits"].fillna(0).ne(0).any():
            splits.add(ticker)
    return frames, splits


def collect(members, session, refresh=False):
    CACHE.mkdir(exist_ok=True)
    yf.set_tz_cache_location(str(CACHE / "yfinance"))
    stored = load_cache()
    start = (pd.Timestamp(session) - pd.DateOffset(years=4)).strftime("%Y-%m-%d")
    tickers = sorted(set(members + BENCHMARKS))
    groups = {}
    for ticker in tickers:
        old = stored.get(ticker)
        # Weekly full history refresh catches provider adjustments; splits also force one.
        full = refresh or pd.Timestamp(session).weekday() == 0 or old is None or old.empty
        if not full:
            full = (pd.Timestamp(session) - old.index.max()).days > 14
        since = start if full else max(start, (old.index.max() - pd.Timedelta(days=10)).strftime("%Y-%m-%d"))
        groups.setdefault(since, []).append(ticker)
    for since, symbols in groups.items():
        for offset in range(0, len(symbols), 30):
            batch = symbols[offset:offset + 30]
            print(f"Collecting {offset + 1}-{min(offset + 30, len(symbols))}/{len(symbols)} since {since}", flush=True)
            for attempt in range(3):
                try:
                    fetched, splits = download(batch, since, session)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(5 * (attempt + 1))
            for ticker in batch:
                fresh = fetched.get(ticker)
                needs_full = since != start and ticker in splits
                if fresh is None or fresh.empty or fresh.index.max() < pd.Timestamp(session) or needs_full:
                    for attempt in range(2):
                        time.sleep(2 * (attempt + 1))
                        try:
                            retry, _ = download([ticker], start if needs_full else since, session)
                            fresh = retry.get(ticker, fresh)
                        except Exception as error:
                            print(f"Retry {ticker}: {type(error).__name__}", flush=True)
                        if fresh is not None and not fresh.empty and fresh.index.max() == pd.Timestamp(session):
                            break
                if fresh is None or fresh.empty:
                    continue
                old = stored.get(ticker)
                merged = fresh if since == start or needs_full or old is None else pd.concat([old, fresh])
                stored[ticker] = normalize_frame(merged, session).loc[start:]
            time.sleep(.5)
    frames = {ticker: stored[ticker] for ticker in tickers if ticker in stored}
    # Preserve successful downloads for a later retry even if coverage is insufficient.
    save_cache(frames)
    fresh = [ticker for ticker in members if ticker in frames and not frames[ticker].empty and frames[ticker].index.max() == pd.Timestamp(session)]
    if len(fresh) < max(450, int(np.ceil(.98 * len(members)))):
        missing = sorted(set(members) - set(fresh))
        raise ValueError(f"Incomplete session {session}: {len(fresh)}/{len(members)} fresh constituents; missing {missing}")
    for ticker in BENCHMARKS:
        if ticker not in frames or frames[ticker].empty or frames[ticker].index.max() != pd.Timestamp(session):
            raise ValueError(f"Stale or missing benchmark: {ticker}")
    return frames, sorted(set(members) - set(fresh))


def validate(market, members):
    if market["asof"] != market["latest"]["date"] or market["history"][-1]["date"] != market["asof"]:
        raise ValueError("Inconsistent output dates")
    if len(market["history"]) != 252:
        raise ValueError("Expected 252 display sessions")
    latest = market["latest"]
    if latest["n_breadth"] < .95 * len(members):
        raise ValueError("Insufficient breadth moving-average coverage")
    for row in market["history"]:
        for j in range(1, 8):
            value = row[f"s{j}"]
            if value is not None and (not np.isfinite(value) or not 0 <= value <= 10):
                raise ValueError(f"Invalid score: {row['date']} s{j}")
    if any(latest[f"s{j}"] is None for j in (1, 2, 3, 5, 7)):
        raise ValueError("Required latest indicators are missing")


def publish(market, members_date, missing, output=APP):
    payload = read_assignment(APP / "snapshot.js", "const DATA=")
    if market["asof"] < payload["us"]["asof"]:
        raise ValueError("Refusing to regress the published session")
    payload["us"] = market
    metadata = json.loads((APP / "provenance.json").read_text(encoding="utf-8"))
    metadata.update({"mode": "us-daily-with-frozen-kr-cn", "automaticRefresh": True,
                     "snapshotSha256": hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
                     "note": "US independently recalculated from the displayed methodology; KR/CN remain original unverified snapshots."})
    metadata["markets"]["us"] = {"asOf": market["asof"], "generatedAt": market["generated_at"],
        "historyRows": len(market["history"]), "universeCount": market["n_universe"], "automaticRefresh": True,
        "methodologyVersion": VERSION, "membershipAsOf": members_date, "missingLatestTickers": missing,
        "source": "Yahoo Finance via yfinance; split-adjusted OHLC and volume, dividends not reinvested",
        "schedule": "05:05 KST Tue-Sat, NYSE holidays skipped; wait until session close + 5 minutes"}
    output.mkdir(parents=True, exist_ok=True)
    for name, content in (("snapshot.js", "const DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + ";\n"),
                          ("provenance.json", json.dumps(metadata, ensure_ascii=False, indent=2, allow_nan=False) + "\n")):
        target = output / name
        temp = target.with_suffix(target.suffix + ".tmp")
        temp.write_text(content, encoding="utf-8")
        temp.replace(target)
    html = (APP / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'(?<=snapshot\.js\?v=)[^"\s]+', metadata["snapshotSha256"][:12], html)
    (output / "index.html").write_text(html, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scheduled", action="store_true")
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--output", type=Path, default=APP)
    args = parser.parse_args()
    session = resolve_session(scheduled=args.scheduled)
    if not session:
        print("No eligible US session (weekend or NYSE holiday)", flush=True)
        return
    if session["waitSeconds"]:
        if not args.wait or session["waitSeconds"] > 75 * 60:
            raise ValueError("Target session is not closed yet; no intraday publication")
        print(f"Waiting {session['waitSeconds']} seconds for regular close + 5 min ({session['date']})", flush=True)
        time.sleep(session["waitSeconds"])
    old = read_assignment(APP / "snapshot.js", "const DATA=")["us"]
    if not args.force and old.get("mode") == VERSION and old["asof"] >= session["date"]:
        print(f"Already current: {old['asof']}", flush=True)
        return
    members, members_date = universe(session["date"])
    frames, missing = collect(members, session["date"], args.full)
    market = calculate(frames, members, session["date"])
    validate(market, members)
    publish(market, members_date, missing, args.output)
    print(json.dumps({"asOf": market["asof"], "members": len(members), "missing": missing,
                      "scores": {f"s{i}": market["latest"][f"s{i}"] for i in range(1, 8)}}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

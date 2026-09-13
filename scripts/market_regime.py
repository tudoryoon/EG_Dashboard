"""US scorecard calculations, using completed sessions and no future observations."""
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import pandas_market_calendars as mcal

VERSION = "eg-us-regime-v1"
SECTORS = {
    "XLK": "정보기술", "XLF": "금융", "XLE": "에너지", "XLV": "헬스케어",
    "XLI": "산업재", "XLY": "경기소비재", "XLP": "필수소비재", "XLU": "유틸리티",
    "XLB": "소재", "XLRE": "부동산", "XLC": "통신서비스",
}
BENCHMARKS = ["SPY", "QQQ", *SECTORS]


def resolve_session(now=None, scheduled=False):
    now = now or datetime.now(timezone.utc)
    korea = now.astimezone(ZoneInfo("Asia/Seoul"))
    calendar = mcal.get_calendar("NYSE")
    if scheduled:
        morning = korea.date()
        if korea.time() < time(5, 5):
            morning -= timedelta(days=1)
        if morning.weekday() in (0, 6):
            return None
        target = morning - timedelta(days=1)
        schedule = calendar.schedule(start_date=target, end_date=target)
    else:
        schedule = calendar.schedule(start_date=korea.date() - timedelta(days=14), end_date=korea.date())
        schedule = schedule[schedule.market_close + pd.Timedelta(minutes=5) <= pd.Timestamp(now)]
    if schedule.empty:
        return None
    row = schedule.iloc[-1]
    ready = row.market_close.to_pydatetime() + timedelta(minutes=5)
    return {"date": schedule.index[-1].date().isoformat(), "readyAt": ready.isoformat(),
            "waitSeconds": max(0, int(np.ceil((ready - now).total_seconds())))}


def number(value, digits=2):
    return round(float(value), digits) if value is not None and np.isfinite(value) else None


def wilder_rsi(close, period=5):
    """Seed Wilder smoothing with the first simple mean; reset across missing bars."""
    result = np.full(len(close), np.nan)
    values = close.to_numpy(dtype=float)
    gain = loss = None
    changes = []
    for i in range(1, len(values)):
        if not np.isfinite(values[i - 1:i + 1]).all():
            gain = loss = None
            changes = []
            continue
        delta = values[i] - values[i - 1]
        if gain is None:
            changes.append(delta)
            if len(changes) < period:
                continue
            gain = np.mean(np.maximum(changes, 0))
            loss = np.mean(np.maximum(-np.array(changes), 0))
        else:
            gain = (gain * (period - 1) + max(delta, 0)) / period
            loss = (loss * (period - 1) + max(-delta, 0)) / period
        result[i] = 50 if gain == loss == 0 else (100 if loss == 0 else 100 - 100 / (1 + gain / loss))
    return pd.Series(result, index=close.index)


def swing_structure(high, low, i):
    # A pivot is usable only after its five right-hand bars have closed.
    start = max(0, i - 119)
    tops, bottoms = [], []
    for j in range(start + 5, i - 4):
        h, l = high[j - 5:j + 6], low[j - 5:j + 6]
        if np.isfinite(h).all() and h[5] > np.max(np.delete(h, 5)):
            tops.append(h[5])
        if np.isfinite(l).all() and l[5] < np.min(np.delete(l, 5)):
            bottoms.append(l[5])
    return .5 * int(len(tops) >= 2 and tops[-1] > tops[-2]) + .5 * int(len(bottoms) >= 2 and bottoms[-1] > bottoms[-2])


def deduplicate(signals, cooldown=5):
    out = signals.copy().fillna(False).astype(bool)
    for column in out:
        last = -cooldown
        for i in np.flatnonzero(out[column].to_numpy()):
            if i - last < cooldown:
                out.iat[i, out.columns.get_loc(column)] = False
            else:
                last = i
    return out


def matured_events(close, signals):
    # The return lives on the exit date, never the signal date (no look-ahead).
    returns = (close / close.shift(5) - 1) * 100
    valid_window = close.notna().rolling(6).sum().eq(6)
    return returns.where(signals.shift(5, fill_value=False) & valid_window)


def event_score(events, i):
    def sample(window):
        values = events.iloc[max(0, i - window + 1):i + 1].to_numpy().ravel()
        return values[np.isfinite(values)]
    window, values = 21, sample(21)
    if len(values) < 20:
        window, values = 63, sample(63)
    if len(values) < 8:
        return None
    hit, average = float(np.mean(values > 0)), float(np.mean(values))
    score = .6 * hit * 10 + .4 * np.clip(5 + 2 * average, 0, 10)
    return {"score": number(score), "hit": number(hit * 100, 1),
            "avg_ret": number(average), "n": len(values), "window": window}


def regime(close, ma20, ma50, ma200, rising50, rising200, breadth):
    if close > ma20 > ma50 > ma200 and rising50 and rising200 and breadth >= 5:
        return "Power Trend"
    if close > ma200 and ma50 > ma200:
        return "Uptrend"
    if close < ma20 < ma50 < ma200:
        return "Severe Downtrend"
    if close < ma200 and ma50 < ma200:
        return "Downtrend"
    return "Neutral"


def quadrant(s4, s6):
    if s4 is None or s6 is None:
        return "표본 부족"
    if s4 >= 5:
        return "양방향 우호" if s6 >= 5 else "돌파 추격 우위"
    return "눌림목 매수 우위" if s6 >= 5 else "관망 / 포지션 축소"


def calculate(frames, members, session, generated_at=None):
    dates = mcal.get_calendar("NYSE").valid_days(
        start_date=min(frame.index.min() for frame in frames.values()), end_date=session
    ).tz_localize(None)
    close = pd.DataFrame({ticker: frame.Close.reindex(dates) for ticker, frame in frames.items()}, index=dates)
    high = pd.DataFrame({ticker: frame.High.reindex(dates) for ticker, frame in frames.items()}, index=dates)
    low = pd.DataFrame({ticker: frame.Low.reindex(dates) for ticker, frame in frames.items()}, index=dates)
    volume = pd.DataFrame({ticker: frame.Volume.reindex(dates) for ticker, frame in frames.items()}, index=dates)
    averages = {n: close.rolling(n, min_periods=n).mean() for n in (5, 10, 20, 50, 200)}
    if len(dates) < 500:
        raise ValueError("Insufficient warm-up / display history")
    for ticker in BENCHMARKS:
        if ticker not in close or close[ticker].iloc[-252:].isna().any() or not np.isfinite(averages[200][ticker].iloc[-1]):
            raise ValueError(f"Missing benchmark history: {ticker}")
    stocks = [ticker for ticker in members if ticker in close]
    c = close[stocks]
    # Do not count missing prices or unavailable moving averages as bearish votes.
    valid20 = c.notna() & averages[20][stocks].notna()
    valid50 = c.notna() & averages[50][stocks].notna()
    a20 = (c.gt(averages[20][stocks]) & valid20).sum(axis=1) / valid20.sum(axis=1).replace(0, np.nan) * 100
    a50 = (c.gt(averages[50][stocks]) & valid50).sum(axis=1) / valid50.sum(axis=1).replace(0, np.nan) * 100
    breadth = (a20 + a50) / 20
    breakout = c.gt(high[stocks].rolling(50).max().shift(1)) & volume[stocks].gt(volume[stocks].rolling(50).mean().shift(1) * 1.5)
    rsi = c.apply(wilder_rsi)
    pullback = averages[50][stocks].gt(averages[200][stocks]) & c.gt(averages[200][stocks]) & rsi.lt(30)
    e4 = matured_events(c, deduplicate(breakout))
    e6 = matured_events(c, deduplicate(pullback))

    relative = close[list(SECTORS)].pct_change(5, fill_method=None).sub(close.SPY.pct_change(5, fill_method=None), axis=0) * 100
    ranks = relative.rank(axis=1, method="average")
    dispersion = relative.std(axis=1, ddof=0)
    reference = dispersion.expanding(min_periods=20).median()
    rho, keep, carry = [], [], []
    for i in range(len(dates)):
        if i < 10 or relative.iloc[i].isna().any() or relative.iloc[i - 5].isna().any():
            rho.append(np.nan); keep.append(0); carry.append(np.nan)
            continue
        left, right = ranks.iloc[i].to_numpy(), ranks.iloc[i - 5].to_numpy()
        correlation = np.corrcoef(left, right)[0, 1] if np.std(left) > 0 and np.std(right) > 0 else 0
        rho.append(float(correlation))
        previous = relative.iloc[i - 5].sort_values(ascending=False, kind="stable")
        current = relative.iloc[i].sort_values(ascending=False, kind="stable")
        keep.append(len(set(current.index[:3]) & set(previous.index[:3])))
        carry.append(float(relative.iloc[i][previous.index[:2]].mean()))
    rho = pd.Series(rho, index=dates)
    carry = pd.Series(carry, index=dates)
    shrink = (dispersion / reference).clip(0, 1).fillna(0)
    rotation = (5 + (((1 - rho) * 5) - 5) * shrink).rolling(3).mean()
    z = carry / dispersion.replace(0, np.nan)
    z = z.mask((dispersion == 0) & (carry == 0), 0)
    carry_score = (5 + 5 * z.rolling(21).mean()).clip(0, 10)
    carry_avg = carry.rolling(21).mean()
    carry_hit = carry.gt(0).astype(float).where(carry.notna()).rolling(21).mean() * 100

    history = []
    for i in range(221, len(dates)):
        d1, d2 = {}, {}
        for ticker in ("SPY", "QQQ"):
            price = close[ticker].iloc[i]
            ma = {n: averages[n][ticker].iloc[i] for n in averages}
            checks1 = {
                "종가>200DMA": bool(price > ma[200]), "종가>50DMA": bool(price > ma[50]),
                "50DMA>200DMA": bool(ma[50] > ma[200]),
                "50DMA 상승": bool(ma[50] > averages[50][ticker].iloc[i - 5]),
                "HH/HL 구조": swing_structure(high[ticker].to_numpy(), low[ticker].to_numpy(), i),
            }
            checks2 = {"종가>5DMA": bool(price > ma[5]), "종가>10DMA": bool(price > ma[10]),
                       "종가>20DMA": bool(price > ma[20]), "5DMA>10DMA": bool(ma[5] > ma[10]),
                       "10DMA>20DMA": bool(ma[10] > ma[20])}
            d1[ticker] = {"score": sum(checks1.values()), "checks": checks1}
            d2[ticker] = {"score": sum(checks2.values()), "checks": checks2}
        events4, events6 = event_score(e4, i), event_score(e6, i)
        row = {"date": dates[i].date().isoformat(), "s1": sum(x["score"] for x in d1.values()),
               "s2": sum(x["score"] for x in d2.values()), "s3": number(breadth.iloc[i]),
               "s4": events4["score"] if events4 else None, "s5": number(rotation.iloc[i]),
               "s6": events6["score"] if events6 else None, "s7": number(carry_score.iloc[i]),
               "a20": number(a20.iloc[i], 1), "a50": number(a50.iloc[i], 1),
               "n_breadth": int(valid50.iloc[i].sum()), "spy": number(close.SPY.iloc[i]),
               "qqq": number(close.QQQ.iloc[i]), "disp": number(dispersion.iloc[i]),
               "carry_avg": number(carry_avg.iloc[i]), "carry_hit": number(carry_hit.iloc[i], 1),
               "rho": number(rho.iloc[i], 3), "top3_keep": keep[i],
               "top3": [SECTORS[t] for t in relative.iloc[i].nlargest(3).index],
               "d1": d1, "d2": d2, "e4": events4, "e6": events6}
        row["regime"] = regime(close.SPY.iloc[i], averages[20].SPY.iloc[i], averages[50].SPY.iloc[i],
                               averages[200].SPY.iloc[i], averages[50].SPY.iloc[i] > averages[50].SPY.iloc[i - 5],
                               averages[200].SPY.iloc[i] > averages[200].SPY.iloc[i - 21], breadth.iloc[i])
        row["choppy"] = row["s5"] is not None and row["s5"] >= 6
        row["quad"] = quadrant(row["s4"], row["s6"])
        history.append(row)
    # Trailing ranks include only observations known on that date, including ties.
    for j in range(1, 8):
        scores = pd.Series([r[f"s{j}"] for r in history], dtype=float)
        percentiles = scores.rolling(500, min_periods=60).rank(pct=True) * 100
        for i, row in enumerate(history):
            row[f"p{j}"] = number(percentiles.iloc[i], 1)
    display = history[-252:]
    latest = dict(display[-1])
    for row in display[:-1]:
        for key in ("d1", "d2", "e4", "e6", "top3", "top3_keep", "rho"):
            row.pop(key, None)
    now = generated_at or datetime.now(timezone.utc)
    return {"asof": session, "quality": "EG 독립 재산출 · 완료된 정규장", "mode": VERSION,
            "generated_at": now.astimezone(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d %H:%M KST"),
            "n_universe": len(members), "n_tickers": len(stocks), "pct_base_days": 500,
            "censor_note": "최근 5거래일 신호는 아직 평가하지 않음", "latest": latest, "history": display,
            "sector_rel": {SECTORS[t]: number(relative[t].iloc[-1]) for t in SECTORS}}

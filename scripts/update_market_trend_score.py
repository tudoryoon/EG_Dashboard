from __future__ import annotations

import json
import math
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RS_DATA_PATH = ROOT / "data" / "market-rs-data.js"
MARKET_PRICE_DATA_PATH = ROOT / "data" / "market-price-data.js"
OUTPUT_PATH = ROOT / "data" / "market-trend-score-data.js"
HISTORY_POINTS = 252

UNIVERSES = {
    "nasdaq100": {
        "label": "NASDAQ 100",
        "membership": "nasdaq100",
        "history_key": "rsRatingNasdaq100",
        "benchmark_key": "nasdaq100",
        "color": "#16a34a",
    },
    "sp500": {
        "label": "S&P 500",
        "membership": "sp500",
        "history_key": "rsRatingSp500",
        "benchmark_key": "sp500",
        "color": "#15803d",
    },
}

POSITION_BY_SCORE = {
    10: 3.0,
    9: 3.0,
    8: 2.0,
    7: 2.0,
    6: 1.0,
    5: 0.5,
    4: -0.5,
    3: -1.0,
    2: -2.0,
    1: -2.5,
    0: -3.0,
}


def load_market_rs_payload() -> dict:
    text = RS_DATA_PATH.read_text(encoding="utf-8").strip()
    text = re.sub(r"^window\.marketRsData\s*=\s*", "", text)
    text = re.sub(r";\s*$", "", text)
    return json.loads(text)


def load_market_price_payload() -> dict:
    text = MARKET_PRICE_DATA_PATH.read_text(encoding="utf-8").strip()
    text = re.sub(r"^window\.marketPriceData\s*=\s*", "", text)
    text = re.sub(r";\s*$", "", text)
    return json.loads(text)


def number_or_none(value: object) -> float | None:
    try:
        numeric = float(value)
    except Exception:
        return None
    if not math.isfinite(numeric):
        return None
    return numeric


def nullable_round(value: object, digits: int = 2) -> float | None:
    numeric = number_or_none(value)
    if numeric is None:
        return None
    return round(numeric, digits)


def nullable_int(value: object) -> int | None:
    numeric = number_or_none(value)
    if numeric is None:
        return None
    return int(round(numeric))


def serialize_series(series: pd.Series, digits: int = 2) -> list[float | int | None]:
    values = []
    for value in series.tolist():
        numeric = number_or_none(value)
        values.append(None if numeric is None else round(numeric, digits))
    return values


def as_numeric_series(values: list[object], dates: list[str]) -> pd.Series:
    series = pd.Series(values, index=pd.Index(pd.to_datetime(dates), name="date"), dtype="float64")
    return series.replace([math.inf, -math.inf], pd.NA)


def score_label(score: int | None) -> str:
    if score is None:
        return "-"
    if score >= 9:
        return "★ 초강세"
    if score >= 5:
        return "▲ 비중확대"
    if score >= 3:
        return "▼ 비중축소"
    return "✖ 리스크"


def trend_state(score: int | None, price: float | None, sma20: float | None, sma50: float | None) -> str:
    if score is None:
        return "-"
    if price is not None and sma50 is not None and price < sma50:
        return "50DMA 하회"
    if price is not None and sma20 is not None and price < sma20:
        return "20DMA 하회"
    if score >= 9:
        return "A. Normal Leader"
    if score >= 5:
        return "B. Constructive"
    if score >= 3:
        return "C. Weakening"
    return "D. Breakdown Risk"


def classify_trend_state(
    score: int | None,
    price: float | None,
    sma20: float | None,
    sma50: float | None,
    climax_score: int | None,
    extended_count: int,
) -> str:
    if climax_score is not None and climax_score >= 7:
        return "C. Climax Risk"
    if (climax_score is not None and climax_score >= 4) or extended_count >= 2:
        return "B. Extended (TRIM 20~30%)"
    return trend_state(score, price, sma20, sma50)


def position_for_score(score: int | None) -> float | None:
    if score is None:
        return None
    return POSITION_BY_SCORE.get(max(0, min(10, score)))


def build_score_frame(price: pd.Series, relative: pd.Series) -> pd.DataFrame:
    price = price.astype("float64")
    relative = relative.astype("float64")
    frame = pd.DataFrame({"price": price, "relative": relative})
    frame["sma20"] = frame["price"].rolling(20).mean()
    frame["sma50"] = frame["price"].rolling(50).mean()
    frame["sma200"] = frame["price"].rolling(200).mean()
    frame["rs20"] = frame["relative"].rolling(20).mean()
    frame["rs50"] = frame["relative"].rolling(50).mean()
    frame["rs200"] = frame["relative"].rolling(200).mean()

    absolute_conditions = [
        frame["price"] > frame["sma200"],
        frame["sma50"] > frame["sma200"],
        frame["price"] > frame["sma50"],
        frame["sma50"] > frame["sma50"].shift(5),
    ]
    relative_conditions = [
        frame["relative"] > frame["rs200"],
        frame["rs50"] > frame["rs200"],
        frame["relative"] > frame["rs50"],
        frame["rs50"] > frame["rs50"].shift(5),
    ]
    momentum_conditions = [
        frame["price"] > frame["sma20"],
        frame["relative"] > frame["rs20"],
    ]

    frame["absoluteScore"] = sum(condition.astype("float64") for condition in absolute_conditions)
    frame["relativeScore"] = sum(condition.astype("float64") for condition in relative_conditions)
    frame["momentumScore"] = sum(condition.astype("float64") for condition in momentum_conditions)
    ready = frame[["sma200", "rs200"]].notna().all(axis=1)
    frame["score"] = (frame["absoluteScore"] + frame["relativeScore"] + frame["momentumScore"]).where(ready)
    frame["deviation20Pct"] = ((frame["price"] / frame["sma20"]) - 1) * 100
    frame["deviation50Pct"] = ((frame["price"] / frame["sma50"]) - 1) * 100
    frame["deviation200Pct"] = ((frame["price"] / frame["sma200"]) - 1) * 100
    frame["rankScore"] = (
        frame["score"] * 10000
        + frame["relativeScore"] * 700
        + frame["absoluteScore"] * 500
        + frame["momentumScore"] * 250
        + frame["relative"].fillna(0) * 4
        + frame["deviation50Pct"].fillna(0)
    ).where(ready)
    return frame


def up_streak(series: pd.Series) -> int:
    values = series.dropna()
    if len(values) < 2:
        return 0
    streak = 0
    changes = values.diff().dropna()
    for value in reversed(changes.tolist()):
        if value > 0:
            streak += 1
        else:
            break
    return streak


def compute_climax_row(frame: pd.DataFrame, atr_pct: float | None) -> dict[str, object]:
    price = frame["price"].dropna()
    if len(price) < 31:
        return {"score": None, "flags": [], "extendedFlags": [], "extendedCount": 0}

    current_price = float(price.iloc[-1])
    score = 0
    flags: list[str] = []
    extended_flags: list[str] = []

    return_15d = (current_price / float(price.iloc[-16]) - 1) * 100 if len(price) >= 16 and price.iloc[-16] else None
    return_10d = (current_price / float(price.iloc[-11]) - 1) * 100 if len(price) >= 11 and price.iloc[-11] else None
    if return_15d is not None and return_15d >= 25:
        score += 2
        flags.append("3주 +25%")
    if return_10d is not None and return_10d >= 20:
        score += 1
        flags.append("10일 +20%")

    daily_range_proxy = price.pct_change().abs() * 100
    atr_proxy = daily_range_proxy.rolling(21).mean()
    atr_proxy_avg_30 = atr_proxy.rolling(30).mean()
    latest_atr_proxy = number_or_none(atr_proxy.iloc[-1])
    avg_atr_proxy = number_or_none(atr_proxy_avg_30.iloc[-1])
    if latest_atr_proxy is not None and avg_atr_proxy is not None and latest_atr_proxy >= avg_atr_proxy * 1.5:
        score += 2
        flags.append("ATR확장")
        extended_flags.append("ATR확장")

    latest = frame.iloc[-1]
    deviation20 = number_or_none(latest.get("deviation20Pct"))
    if deviation20 is not None and deviation20 >= 20:
        score += 1
        flags.append("21DMA+20%")
        extended_flags.append(f"21DMA+{deviation20:.0f}%")
    if up_streak(price) >= 8:
        extended_flags.append("8일연속상승")

    fresh_breakout = False
    if len(frame) >= 21:
        previous_gap = number_or_none(frame["deviation50Pct"].iloc[-21])
        current_gap = number_or_none(frame["deviation50Pct"].iloc[-1])
        fresh_breakout = (
            previous_gap is not None
            and current_gap is not None
            and previous_gap < 8
            and current_gap > 12
        )

    # The source workbook also scores volume, gap-up, reversal, stalling, and shellac
    # signals. The dashboard data currently stores close-based history, so those
    # OHLCV-only triggers are intentionally left out until the RS feed carries OHLCV.
    return {
        "score": min(score, 10),
        "flags": flags,
        "extendedFlags": extended_flags,
        "extendedCount": len(extended_flags),
        "freshBreakout": fresh_breakout,
        "return15dPct": nullable_round(return_15d),
        "return10dPct": nullable_round(return_10d),
        "atrProxyPct": nullable_round(latest_atr_proxy),
        "atrProxyAvg30Pct": nullable_round(avg_atr_proxy),
        "source": "close_proxy",
    }


def compute_climax_history(frame: pd.DataFrame) -> pd.Series:
    price = frame["price"].dropna()
    if price.empty:
        return pd.Series(index=frame.index, dtype="float64")
    return_15d = ((price / price.shift(15)) - 1) * 100
    return_10d = ((price / price.shift(10)) - 1) * 100
    daily_range_proxy = price.pct_change().abs() * 100
    atr_proxy = daily_range_proxy.rolling(21).mean()
    atr_proxy_avg_30 = atr_proxy.rolling(30).mean()
    deviation20 = frame["deviation20Pct"].reindex(price.index)
    score = pd.Series(0.0, index=price.index)
    score = score.add((return_15d >= 25).astype("float64") * 2, fill_value=0)
    score = score.add((return_10d >= 20).astype("float64"), fill_value=0)
    score = score.add((atr_proxy >= atr_proxy_avg_30 * 1.5).astype("float64") * 2, fill_value=0)
    score = score.add((deviation20 >= 20).astype("float64"), fill_value=0)
    ready = price.index.to_series().map(lambda date: price.index.get_loc(date) >= 30)
    score = score.where(ready)
    return score.reindex(frame.index)


def rank_scores(score_frame: pd.DataFrame) -> pd.DataFrame:
    ranks = score_frame.rank(axis=1, method="min", ascending=False, na_option="bottom")
    valid = score_frame.notna()
    return ranks.where(valid)


def latest_valid_index(series: pd.Series) -> pd.Timestamp | None:
    valid = series.dropna()
    if valid.empty:
        return None
    return valid.index[-1]


def build_benchmark_series(market_price_payload: dict, benchmark_key: str) -> pd.Series:
    item = market_price_payload.get("items", {}).get(benchmark_key, {})
    return pd.Series(
        item.get("values", []),
        index=pd.Index(pd.to_datetime(item.get("dates", [])), name="date"),
        dtype="float64",
    ).replace([math.inf, -math.inf], pd.NA)


def build_universe_payload(
    universe_key: str,
    meta: dict,
    source: dict,
    market_price_payload: dict,
) -> tuple[list[dict], dict[str, dict]]:
    rows_by_ticker = {row.get("ticker"): row for row in source.get("rows", []) if row.get("ticker")}
    dates = source.get("historyDates", [])[-HISTORY_POINTS:]
    histories = source.get("histories", {})
    benchmark = build_benchmark_series(market_price_payload, str(meta["benchmark_key"]))
    members: list[tuple[str, dict, dict, pd.DataFrame]] = []

    for ticker, row in rows_by_ticker.items():
        if not row.get("memberships", {}).get(meta["membership"]):
            continue
        history = histories.get(ticker)
        if not history:
            continue
        price_values = (history.get("price") or [])[-len(dates):]
        rating_values = (history.get(meta["history_key"]) or [])[-len(dates):]
        if len(price_values) != len(dates) or len(rating_values) != len(dates):
            continue
        price = as_numeric_series(price_values, dates)
        benchmark_window = benchmark.reindex(price.index)
        relative = price.div(benchmark_window)
        if relative.dropna().empty:
            continue
        frame = build_score_frame(price, relative)
        frame["rsRating"] = as_numeric_series(rating_values, dates)
        if frame["score"].dropna().empty:
            continue
        members.append((ticker, row, history, frame))

    if not members:
        return [], {}

    score_matrix = pd.concat({ticker: frame["rankScore"] for ticker, _, _, frame in members}, axis=1)
    rank_matrix = rank_scores(score_matrix)

    rows = []
    output_histories: dict[str, dict] = {}
    for ticker, row, _, frame in members:
        valid_at = latest_valid_index(frame["score"])
        if valid_at is None:
            continue
        latest = frame.loc[valid_at]
        valid_scores = frame["score"].dropna()
        previous_score = valid_scores.iloc[-2] if len(valid_scores) >= 2 else None
        latest_rank = rank_matrix.at[valid_at, ticker] if ticker in rank_matrix.columns else None
        rank_series = rank_matrix[ticker].dropna() if ticker in rank_matrix.columns else pd.Series(dtype="float64")
        previous_rank = rank_series.iloc[-2] if len(rank_series) >= 2 else None
        score_value = nullable_int(latest.get("score"))
        climax = compute_climax_row(frame.loc[:valid_at], number_or_none(row.get("atr21Pct")))
        climax_score = nullable_int(climax.get("score"))
        state = classify_trend_state(
            score_value,
            number_or_none(latest.get("price")),
            number_or_none(latest.get("sma20")),
            number_or_none(latest.get("sma50")),
            climax_score,
            int(climax.get("extendedCount") or 0),
        )
        if climax.get("freshBreakout") and state.startswith("B."):
            state = "A. Normal Leader (8주 Hold)"
        rank_value = nullable_int(latest_rank)
        atr_pct = number_or_none(row.get("atr21Pct"))
        deviation20 = number_or_none(latest.get("deviation20Pct"))
        deviation50 = number_or_none(latest.get("deviation50Pct"))
        deviation200 = number_or_none(latest.get("deviation200Pct"))
        rows.append(
            {
                "ticker": ticker,
                "name": row.get("name") or ticker,
                "marketCap": row.get("marketCap"),
                "price": nullable_round(latest.get("price")),
                "rank": rank_value,
                "rankChange": None
                if rank_value is None or previous_rank is None
                else int(round(float(previous_rank) - float(rank_value))),
                "score": score_value,
                "scoreChange": None
                if score_value is None or previous_score is None
                else int(round(float(score_value) - float(previous_score))),
                "absoluteScore": nullable_int(latest.get("absoluteScore")),
                "relativeScore": nullable_int(latest.get("relativeScore")),
                "momentumScore": nullable_int(latest.get("momentumScore")),
                "rsRating": nullable_int(latest.get("rsRating")),
                "rsLine": nullable_round(latest.get("relative"), 6),
                "sma20": nullable_round(latest.get("sma20")),
                "sma50": nullable_round(latest.get("sma50")),
                "sma200": nullable_round(latest.get("sma200")),
                "deviation20Pct": nullable_round(deviation20),
                "deviation50Pct": nullable_round(deviation50),
                "deviation200Pct": nullable_round(deviation200),
                "atr21Pct": nullable_round(atr_pct),
                "atrExt20": nullable_round(deviation20 / atr_pct) if atr_pct and deviation20 is not None else None,
                "atrExt50": nullable_round(deviation50 / atr_pct) if atr_pct and deviation50 is not None else None,
                "atrExt200": nullable_round(deviation200 / atr_pct) if atr_pct and deviation200 is not None else None,
                "baseWeightPct": position_for_score(score_value),
                "climaxScore": climax_score,
                "climaxFlags": climax.get("flags") or [],
                "extendedFlags": climax.get("extendedFlags") or [],
                "climaxSource": climax.get("source"),
                "zone": score_label(score_value),
                "state": state,
            }
        )
        climax_history = compute_climax_history(frame)
        output_histories[ticker] = {
            "score": serialize_series(frame["score"], 0),
            "rank": serialize_series(rank_matrix[ticker] if ticker in rank_matrix.columns else pd.Series(index=frame.index), 0),
            "climaxScore": serialize_series(climax_history, 0),
            "price": serialize_series(frame["price"], 2),
            "relative": serialize_series(frame["relative"], 6),
            "rsRating": serialize_series(frame["rsRating"], 0),
        }

    rows.sort(key=lambda item: (item["rank"] is None, item["rank"] or 9999, item["ticker"]))
    return rows, output_histories


def build_payload() -> dict:
    source = load_market_rs_payload()
    market_price_payload = load_market_price_payload()
    dates = source.get("historyDates", [])[-HISTORY_POINTS:]
    rows_by_universe = {}
    histories_by_universe = {}
    for universe_key, meta in UNIVERSES.items():
        rows, histories = build_universe_payload(universe_key, meta, source, market_price_payload)
        rows_by_universe[universe_key] = rows
        histories_by_universe[universe_key] = histories

    return {
        "updatedAt": source.get("updatedAt", ""),
        "source": {
            "label": "Market RS price and universe RS rating history",
            "input": "data/market-rs-data.js",
            "benchmarkInput": "data/market-price-data.js",
        },
        "historyDates": dates,
        "ranges": [
            {"key": "1m", "label": "1M"},
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "ytd", "label": "YTD"},
            {"key": "1y", "label": "1Y"},
        ],
        "universes": UNIVERSES,
        "scoring": {
            "label": "Trend Score",
            "description": "Price trend 4 points, benchmark-relative RS line trend 4 points, and short-term momentum 2 points. NASDAQ100 uses the NASDAQ100 index as benchmark and S&P500 uses the S&P500 index.",
            "absolute": [
                "Price > 200DMA",
                "50DMA > 200DMA",
                "Price > 50DMA",
                "50DMA rising versus 5 sessions ago",
            ],
            "relative": [
                "Universe RS rating > RS 200DMA",
                "RS 50DMA > RS 200DMA",
                "Universe RS rating > RS 50DMA",
                "RS 50DMA rising versus 5 sessions ago",
            ],
            "momentum": ["Price > 20DMA", "Universe RS rating > RS 20DMA"],
            "climax": [
                "15-session return >= +25% adds 2",
                "10-session return >= +20% adds 1",
                "ATR expansion proxy >= 30-session average x1.5 adds 2",
                "20DMA extension >= +20% adds 1",
                "OHLCV-only gap, reversal, stalling, shellac triggers are not scored until OHLCV is stored in the RS feed.",
            ],
            "positionByScore": POSITION_BY_SCORE,
        },
        "rows": rows_by_universe,
        "histories": histories_by_universe,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.marketTrendScoreData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

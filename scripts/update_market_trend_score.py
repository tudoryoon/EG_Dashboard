from __future__ import annotations

import json
import math
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RS_DATA_PATH = ROOT / "data" / "market-rs-data.js"
OUTPUT_PATH = ROOT / "data" / "market-trend-score-data.js"
HISTORY_POINTS = 252

UNIVERSES = {
    "nasdaq100": {
        "label": "NASDAQ 100",
        "membership": "nasdaq100",
        "history_key": "rsRatingNasdaq100",
        "color": "#16a34a",
    },
    "sp500": {
        "label": "S&P 500",
        "membership": "sp500",
        "history_key": "rsRatingSp500",
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


def rank_scores(score_frame: pd.DataFrame) -> pd.DataFrame:
    ranks = score_frame.rank(axis=1, method="min", ascending=False, na_option="bottom")
    valid = score_frame.notna()
    return ranks.where(valid)


def latest_valid_index(series: pd.Series) -> pd.Timestamp | None:
    valid = series.dropna()
    if valid.empty:
        return None
    return valid.index[-1]


def build_universe_payload(universe_key: str, meta: dict, source: dict) -> tuple[list[dict], dict[str, dict]]:
    rows_by_ticker = {row.get("ticker"): row for row in source.get("rows", []) if row.get("ticker")}
    dates = source.get("historyDates", [])[-HISTORY_POINTS:]
    histories = source.get("histories", {})
    members: list[tuple[str, dict, dict, pd.DataFrame]] = []

    for ticker, row in rows_by_ticker.items():
        if not row.get("memberships", {}).get(meta["membership"]):
            continue
        history = histories.get(ticker)
        if not history:
            continue
        price_values = (history.get("price") or [])[-len(dates):]
        relative_values = (history.get(meta["history_key"]) or [])[-len(dates):]
        if len(price_values) != len(dates) or len(relative_values) != len(dates):
            continue
        price = as_numeric_series(price_values, dates)
        relative = as_numeric_series(relative_values, dates)
        frame = build_score_frame(price, relative)
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
                "rsRating": nullable_int(latest.get("relative")),
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
                "zone": score_label(score_value),
                "state": trend_state(
                    score_value,
                    number_or_none(latest.get("price")),
                    number_or_none(latest.get("sma20")),
                    number_or_none(latest.get("sma50")),
                ),
            }
        )
        output_histories[ticker] = {
            "score": serialize_series(frame["score"], 0),
            "rank": serialize_series(rank_matrix[ticker] if ticker in rank_matrix.columns else pd.Series(index=frame.index), 0),
            "price": serialize_series(frame["price"], 2),
            "relative": serialize_series(frame["relative"], 0),
        }

    rows.sort(key=lambda item: (item["rank"] is None, item["rank"] or 9999, item["ticker"]))
    return rows, output_histories


def build_payload() -> dict:
    source = load_market_rs_payload()
    dates = source.get("historyDates", [])[-HISTORY_POINTS:]
    rows_by_universe = {}
    histories_by_universe = {}
    for universe_key, meta in UNIVERSES.items():
        rows, histories = build_universe_payload(universe_key, meta, source)
        rows_by_universe[universe_key] = rows
        histories_by_universe[universe_key] = histories

    return {
        "updatedAt": source.get("updatedAt", ""),
        "source": {
            "label": "Market RS price and universe RS rating history",
            "input": "data/market-rs-data.js",
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
            "description": "Price trend 4 points, universe-relative RS trend 4 points, and short-term momentum 2 points. The relative leg uses the selected universe RS rating line so NASDAQ100 and S&P500 are ranked in their own peer group.",
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

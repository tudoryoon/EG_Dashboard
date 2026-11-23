from __future__ import annotations

import json
import math
from datetime import UTC, datetime, timedelta
from pathlib import Path
from statistics import mean, pstdev

import pandas as pd
import pandas_market_calendars as mcal
import yfinance as yf


OUTPUT = Path(__file__).resolve().parents[1] / "data" / "study-asset-returns-data.js"
PERIODS = (1, 3, 6, 9, 12)
ASSETS = {
    "원자재": (("USO", "WTI 원유"), ("SOYB", "대두"), ("CPER", "구리"), ("CORN", "옥수수"),
             ("IAU", "금"), ("SLV", "은"), ("URA", "우라늄")),
    "미국 섹터": (("XLV", "헬스케어"), ("XLE", "에너지"), ("XLP", "필수소비재"), ("XLF", "금융"),
                ("XLB", "소재"), ("XLK", "IT"), ("SOXX", "반도체"), ("IYR", "부동산 (리츠)"),
                ("XLY", "경기소비재"), ("XLU", "유틸리티"), ("XLI", "산업재")),
    "대안": (("DBMF", "매니지드 퓨처스"),),
    "통화": (("UUP", "달러 인덱스"), ("FXY", "엔화"), ("FXE", "유로")),
    "채권": (("SHY", "미국채 1~3년"), ("EBND", "신흥국 현지통화채"), ("HYG", "미국 하이일드"),
            ("IEF", "미국채 7~10년"), ("TLT", "미국채 20년 이상")),
    "미국 주식": (("SPY", "S&P 500"), ("MAGS", "매그니피센트 7"), ("QQQ", "나스닥 100"),
                ("IWM", "러셀 2000 (소형주)"), ("ARKK", "ARK 혁신기업")),
    "국가": (("INDA", "인도"), ("EWY", "한국"), ("MCHI", "중국"), ("KWEB", "중국 인터넷"),
            ("CQQQ", "중국 기술주")),
    "크립토": (("IBIT", "비트코인"),),
}
UNIVERSE = [(ticker, name, group) for group, items in ASSETS.items() for ticker, name in items]


def rank_session(closes: pd.DataFrame, sessions: pd.DatetimeIndex, end: pd.Timestamp) -> list[dict]:
    bases = [sessions.asof(end - pd.DateOffset(months=months)) for months in PERIODS]
    required = closes.reindex(index=[end, *bases], columns=[ticker for ticker, _, _ in UNIVERSE])
    invalid = [ticker for ticker in required if not all(math.isfinite(v) and v > 0 for v in required[ticker])]
    if invalid:
        raise ValueError(f"{end.date()}: missing valid prices for {', '.join(invalid)}")

    returns = required.iloc[1:].rdiv(required.iloc[0], axis="columns").sub(1).mul(100)
    means = [mean(row) for row in returns.to_numpy()]
    deviations = [pstdev(row) for row in returns.to_numpy()]
    rows = []
    for ticker, name, group in UNIVERSE:
        values = returns[ticker].tolist()
        score = mean((value - avg) / dev if dev else 0.0 for value, avg, dev in zip(values, means, deviations))
        rows.append({
            "ticker": ticker, "name": name, "group": group, "score": score,
            "returns": {f"{months}M": round(value, 4) for months, value in zip(PERIODS, values)},
        })
    rows.sort(key=lambda row: (-row["score"], row["ticker"]))
    for rank, row in enumerate(rows, 1):
        row.update(rank=rank, score=round(row["score"], 4))
    return rows


def build_snapshot(closes: pd.DataFrame, sessions: pd.DatetimeIndex, now: datetime) -> dict:
    prior, end = sessions[-2:]
    previous_ranks = {row["ticker"]: row["rank"] for row in rank_session(closes, sessions, prior)}
    rows = rank_session(closes, sessions, end)
    for row in rows:
        row["rankChange"] = previous_ranks[row["ticker"]] - row["rank"]
    return {
        "asOfDate": end.date().isoformat(), "previousDate": prior.date().isoformat(),
        "generatedAt": now.isoformat(timespec="seconds"),
        "periods": [f"{months}M" for months in PERIODS], "rows": rows,
    }


def main() -> None:
    now = datetime.now(UTC)
    start = (now - timedelta(days=420)).date()
    schedule = mcal.get_calendar("NYSE").schedule(start_date=start, end_date=now.date())
    sessions = schedule.index[schedule["market_close"] + pd.Timedelta(minutes=10) <= now]
    data = yf.download(
        [ticker for ticker, _, _ in UNIVERSE], start=start.isoformat(),
        end=(sessions[-1] + pd.Timedelta(days=1)).date().isoformat(),
        auto_adjust=False, progress=False, threads=8, timeout=20,
    )
    payload = build_snapshot(data["Adj Close"], sessions, now)
    if OUTPUT.exists():
        published = json.loads(OUTPUT.read_text(encoding="utf-8").split("=", 1)[1].strip().removesuffix(";"))
        if published["asOfDate"] > payload["asOfDate"]:
            raise ValueError("Refusing to overwrite a newer asset-returns snapshot")
    OUTPUT.write_text(
        "window.studyAssetReturnsData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8", newline="\n",
    )
    print(f"Updated {len(payload['rows'])} assets through {payload['asOfDate']}; prior session {payload['previousDate']}")


if __name__ == "__main__":
    main()

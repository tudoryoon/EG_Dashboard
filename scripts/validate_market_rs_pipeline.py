from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_payload(relative_path: str, variable_name: str) -> dict:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8").strip()
    prefix = f"window.{variable_name} = "
    if not text.startswith(prefix):
        raise RuntimeError(f"Unexpected JS prefix in {relative_path}.")
    return json.loads(text[len(prefix) :].rstrip(";"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> None:
    rs = load_payload("data/market-rs-data.js", "marketRsData")
    trend = load_payload("data/market-trend-score-data.js", "marketTrendScoreData")
    financials = load_payload("data/market-rs-financials-data.js", "marketRsFinancialsData")
    earnings = load_payload("data/market-canslim-earnings-data.js", "marketCanslimEarningsData")

    rs_rows = rs.get("rows") or []
    rs_by_ticker = {row.get("ticker"): row for row in rs_rows if row.get("ticker")}
    history_dates = rs.get("historyDates") or []
    require(len(rs_rows) >= 2_000, f"RS universe is unexpectedly small: {len(rs_rows)}")
    require(bool(history_dates), "RS history dates are empty.")
    require(rs.get("updatedAt") == history_dates[-1], "RS updatedAt and latest history date differ.")

    membership_counts = {
        key: sum(1 for row in rs_rows if (row.get("memberships") or {}).get(key))
        for key in ("sp500", "nasdaq100", "dowjones", "russell2000")
    }
    require(membership_counts["sp500"] >= 450, f"S&P 500 membership is too small: {membership_counts['sp500']}")
    require(membership_counts["nasdaq100"] >= 90, f"NASDAQ 100 membership is too small: {membership_counts['nasdaq100']}")
    require(membership_counts["dowjones"] >= 25, f"Dow membership is too small: {membership_counts['dowjones']}")
    require(membership_counts["russell2000"] >= 1_500, f"Russell 2000 membership is too small: {membership_counts['russell2000']}")
    for ticker in ("NVDA", "ASML", "QQQ", "QQQE", "SPY"):
        require(ticker in rs_by_ticker, f"Required RS ticker is missing: {ticker}")

    trend_rows = trend.get("rows") or {}
    require(trend.get("updatedAt") == rs.get("updatedAt"), "Trend Score and RS dates differ.")
    require(len(trend_rows.get("all") or []) == len(rs_rows), "Trend Score all-universe count differs from RS.")
    require(len(trend_rows.get("nasdaq100") or []) >= 90, "Trend Score NASDAQ 100 universe is too small.")
    trend_all = {row.get("ticker") for row in trend_rows.get("all") or []}
    for ticker in ("NVDA", "ASML", "QQQ", "QQQE", "SPY"):
        require(ticker in trend_all, f"Required Trend Score ticker is missing: {ticker}")

    financial_counts = (financials.get("scope") or {}).get("counts") or {}
    require(financial_counts.get("sp500", 0) >= 450, "CANSLIM financial S&P 500 coverage is too small.")
    require(financial_counts.get("nasdaq100", 0) >= 90, "CANSLIM financial NASDAQ 100 coverage is too small.")
    require(financial_counts.get("covered", 0) >= 450, "CANSLIM financial profile coverage is too small.")

    earnings_scope = earnings.get("scope") or {}
    earnings_sources = earnings_scope.get("sources") or {}
    require(len(earnings.get("profiles") or {}) >= 2_000, "CANSLIM EPS profile universe is too small.")
    require(earnings_sources.get("nasdaq100", 0) >= 90, "CANSLIM EPS NASDAQ 100 source count is too small.")
    require(earnings_scope.get("coveredCount", 0) >= 450, "CANSLIM EPS covered count is too small.")

    print(
        "Validated market RS pipeline: "
        f"date={rs.get('updatedAt')} rows={len(rs_rows)} memberships={membership_counts} "
        f"financialCovered={financial_counts.get('covered')} epsCovered={earnings_scope.get('coveredCount')}"
    )


if __name__ == "__main__":
    main()

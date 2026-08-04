from __future__ import annotations

import json
import re
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
    briefing = load_payload("data/market-briefing-data.js", "marketBriefingData")

    rs_rows = rs.get("rows") or []
    rs_by_ticker = {row.get("ticker"): row for row in rs_rows if row.get("ticker")}
    history_dates = rs.get("historyDates") or []
    require(len(rs_rows) >= 2_000, f"RS universe is unexpectedly small: {len(rs_rows)}")
    require(bool(history_dates), "RS history dates are empty.")
    require(len(history_dates) >= 740, f"RS history is shorter than the intended 3Y window: {len(history_dates)}")
    require(rs.get("updatedAt") == history_dates[-1], "RS updatedAt and latest history date differ.")
    rs_histories = rs.get("histories") or {}
    require(len(rs_histories) == len(rs_rows), "RS history count differs from the RS row count.")
    for ticker, history in rs_histories.items():
        for history_key in ("price", "open", "high", "low", "volume", "rsRatingAll"):
            require(
                len(history.get(history_key) or []) == len(history_dates),
                f"RS {history_key} length differs from historyDates for {ticker}.",
            )

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
    require(financial_counts.get("dailyBriefing", 0) >= 190, "CANSLIM Daily Briefing target coverage is too small.")
    require(financial_counts.get("dailyBriefingCovered", 0) >= 185, "CANSLIM Daily Briefing financial coverage is too small.")
    require(financial_counts.get("dailyBriefingPending", 99) <= 10, "Too many Daily Briefing CANSLIM profiles are pending.")

    briefing_tickers = {
        str(item.get("ticker") or "").upper()
        for sector in briefing.get("sectorPanels") or []
        for item in sector.get("items") or []
        if item.get("ticker")
        and str(item.get("ticker")).upper() != "DRAM"
        and "." not in str(item.get("ticker"))
    }
    financial_profiles = financials.get("financials") or {}
    require(len(briefing_tickers) >= 190, "Daily Briefing ticker extraction is unexpectedly small.")
    adjusted_briefing_count = 0
    for ticker in briefing_tickers:
        profile = financial_profiles.get(ticker) or {}
        quarters = profile.get("quarters") or []
        if int(profile.get("adjustedRows") or 0) > 0:
            adjusted_briefing_count += 1
        period_keys = [str(row.get("periodKey") or "") for row in quarters]
        period_ends = [str(row.get("periodEnd") or "") for row in quarters if row.get("periodEnd")]
        require(len(period_keys) == len(set(period_keys)), f"Duplicate CANSLIM quarters found for {ticker}.")
        require(len(period_ends) == len(set(period_ends)), f"Duplicate CANSLIM period-end dates found for {ticker}.")
        require(period_ends == sorted(period_ends, reverse=True), f"CANSLIM period-end dates are not descending for {ticker}.")
        by_period = {str(row.get("periodKey") or ""): row for row in quarters}
        for row in quarters:
            period_match = re.match(r"^FY(\d{4})Q[1-4]$", str(row.get("periodKey") or ""))
            end_match = re.match(r"^(\d{4})-", str(row.get("periodEnd") or ""))
            if period_match and end_match:
                require(
                    abs(int(period_match.group(1)) - int(end_match.group(1))) <= 1,
                    f"CANSLIM fiscal period/end-date mismatch for {ticker} {row.get('periodKey')}.",
                )
            if row.get("periodStart") and row.get("periodEnd"):
                require(
                    str(row.get("periodStart")) <= str(row.get("periodEnd")),
                    f"CANSLIM period start is after period end for {ticker} {row.get('periodKey')}.",
                )
            metric_sources = row.get("metricSources") or {}
            for metric in ("ocf", "fcf"):
                require(
                    not str(metric_sources.get(metric) or "").startswith("IR earnings release"),
                    f"Unsafe automatic IR override found for {ticker} {row.get('periodKey')} {metric}.",
                )
            eps_source = str(metric_sources.get("epsDiluted") or "")
            if eps_source.startswith("IR earnings release"):
                require(
                    "Non-GAAP" in eps_source and isinstance(row.get("epsDiluted"), (int, float)),
                    f"Unqualified IR EPS override found for {ticker} {row.get('periodKey')}.",
                )
                require(abs(float(row["epsDiluted"])) <= 10, f"Implausible IR EPS override found for {ticker} {row.get('periodKey')}.")
                reported_eps = row.get("reportedEpsDiluted")
                if isinstance(reported_eps, (int, float)) and reported_eps > 0:
                    require(
                        not (
                            row["epsDiluted"] - reported_eps > 1.5
                            and row["epsDiluted"] > reported_eps * 2.5
                        ),
                        f"IR EPS override resembles annual guidance for {ticker} {row.get('periodKey')}.",
                    )
            if any("Curated adjusted bridge" in str(source) for source in metric_sources.values()):
                require(
                    isinstance(row.get("curatedAdjustment"), dict) and row["curatedAdjustment"].get("source"),
                    f"Curated adjustment lacks provenance for {ticker} {row.get('periodKey')}.",
                )

        fiscal_years = {
            match.group(1)
            for period in by_period
            if (match := re.match(r"^FY(\d{4})Q[1-4]$", period))
        }
        for fiscal_year in fiscal_years:
            values = [
                (by_period.get(f"FY{fiscal_year}Q{quarter}") or {}).get("revenue")
                for quarter in (1, 2, 3, 4)
            ]
            if not all(isinstance(value, (int, float)) and value > 0 for value in values):
                continue
            first_three = values[:3]
            first_three_average = sum(first_three) / 3
            annual_looking_q4 = (
                values[3] > sum(first_three)
                and values[3] / first_three_average > 2.8
                and max(first_three) / min(first_three) < 2
            )
            require(not annual_looking_q4, f"Annual-looking Q4 revenue remains for {ticker} FY{fiscal_year}.")

    require(adjusted_briefing_count >= 60, "Too few Daily Briefing companies retain verified adjusted financial rows.")
    require(financial_counts.get("curatedAdjustedCompanies", 0) >= 5, "Curated one-off adjustment coverage regressed.")

    apple_rows = (financial_profiles.get("AAPL") or {}).get("quarters") or []
    apple_latest = next((row for row in apple_rows if row.get("periodEnd") == "2026-06-27"), None)
    require(apple_latest is not None, "AAPL FY26 Q3 row is missing.")
    require(apple_latest.get("grossMarginPct") == 48.1, "AAPL tariff-refund gross-margin bridge is missing.")
    require(apple_latest.get("reportedGrossMarginPct") == 50.1, "AAPL reported gross margin was not preserved.")

    nvidia_rows = (financial_profiles.get("NVDA") or {}).get("quarters") or []
    nvidia_april_2026 = next((row for row in nvidia_rows if row.get("periodEnd") == "2026-04-26"), None)
    require(nvidia_april_2026 is not None, "NVIDIA April 2026 quarter is missing.")
    require(nvidia_april_2026.get("periodKey") == "FY2027Q1", "NVIDIA fiscal-year alignment regressed.")

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

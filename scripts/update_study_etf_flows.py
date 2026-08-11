#!/usr/bin/env python3
"""Build the Study ETF price and primary-market fund-flow dataset.

Daily flow is calculated directly from issuer data:
    (shares outstanding[t] - shares outstanding[t-1]) * NAV[t]

SOXX and EWY use the official iShares fund-download Historical worksheet.
DRAM and MAGS use Roundhill's official daily NAV files plus dated holdings
snapshots, which include SharesOutstanding for every fund account.
"""

from __future__ import annotations

import csv
import io
import json
import math
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import requests
import yfinance as yf
from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "study-etf-flow-data.js"
START_DATE = date(2025, 7, 21)
ROUNDHILL_RECHECK_DAYS = 10
MAX_WORKERS = 10

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}

ISHARES_DOWNLOAD_URL = (
    "https://www.blackrock.com/varnish-api/blk-one01-product-data/product-data/api/v1/"
    "get-fund-document?appType=PRODUCT_PAGE&appSubType=ISHARES&targetSite=us-ishares&"
    "locale=en_US&portfolioId={portfolio_id}&component=fundDownload&userType=individual"
)
ROUNDHILL_NAV_URL = (
    "https://www.roundhillinvestments.com/assets/data/"
    "FilepointRoundhill.40RU.RU_{file_ticker}_Daily.csv"
)
ROUNDHILL_HOLDINGS_URL = (
    "https://www.roundhillinvestments.com/assets/data/"
    "FilepointRoundhill.40RU.RU_Holdings_{stamp}.csv"
)
ROUNDHILL_DAILY_URL = (
    "https://www.roundhillinvestments.com/assets/data/"
    "FilepointRoundhill.40RU.RU_DailyNAV.csv"
)

ETF_META = {
    "SOXX": {
        "name": "iShares Semiconductor ETF",
        "theme": "반도체",
        "issuer": "iShares",
        "color": "#1f5f73",
        "portfolioId": "239705",
        "pageUrl": "https://www.ishares.com/us/products/239705/ishares-semiconductor-etf",
    },
    "DRAM": {
        "name": "Roundhill Memory ETF",
        "theme": "메모리",
        "issuer": "Roundhill",
        "color": "#0f766e",
        "fileTicker": "DRAM",
    },
    "MAGS": {
        "name": "Roundhill Magnificent Seven ETF",
        "theme": "M7 빅테크",
        "issuer": "Roundhill",
        "color": "#315f85",
        "fileTicker": "BIGT",
    },
    "EWY": {
        "name": "iShares MSCI South Korea ETF",
        "theme": "한국",
        "issuer": "iShares",
        "color": "#375a9e",
        "portfolioId": "239681",
        "pageUrl": "https://www.ishares.com/us/products/239681/ishares-msci-south-korea-etf",
    },
}


def request_bytes(url: str, timeout: int = 60, attempts: int = 3) -> bytes:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            response = requests.get(url, headers=HEADERS, timeout=timeout)
            response.raise_for_status()
            if not response.content:
                raise RuntimeError(f"Empty response from {url}")
            return response.content
        except (requests.RequestException, RuntimeError) as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url} after {attempts} attempts: {last_error}")


def request_text(url: str, timeout: int = 60) -> str:
    content = request_bytes(url, timeout=timeout)
    return content.decode("utf-8-sig", errors="replace")


def finite(value: Any) -> float | None:
    try:
        numeric = float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return None
    return numeric if math.isfinite(numeric) else None


def load_existing() -> dict[str, Any]:
    if not DATA_PATH.exists():
        return {}
    text = DATA_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.studyEtfFlowData\s*=\s*(.*);\s*$", text, flags=re.S)
    if not match:
        return {}
    return json.loads(match.group(1))


def fetch_ishares_history(portfolio_id: str) -> dict[str, dict[str, float]]:
    content = request_bytes(ISHARES_DOWNLOAD_URL.format(portfolio_id=portfolio_id))
    root = etree.fromstring(content, etree.XMLParser(recover=True))
    namespace = "{urn:schemas-microsoft-com:office:spreadsheet}"
    worksheet = next(
        item
        for item in root.findall(namespace + "Worksheet")
        if item.get(namespace + "Name") == "Historical"
    )
    rows = worksheet.findall(f".//{namespace}Table/{namespace}Row")
    result: dict[str, dict[str, float]] = {}
    for row in rows[1:]:
        values = [node.text for node in row.findall(f"{namespace}Cell/{namespace}Data")]
        if len(values) < 4:
            continue
        try:
            day = datetime.strptime(values[0], "%b %d, %Y").date()
        except (TypeError, ValueError):
            continue
        if day < START_DATE:
            continue
        nav = finite(values[1])
        shares = finite(values[3])
        if nav is None or shares is None:
            continue
        result[day.isoformat()] = {"nav": nav, "shares": shares}
    return result


def fetch_yahoo_prices(symbol: str, start: date) -> dict[str, float]:
    cache_dir = ROOT / "output" / "yfinance-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(cache_dir))
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            frame = yf.download(
                symbol,
                start=start.isoformat(),
                end=(date.today() + timedelta(days=2)).isoformat(),
                auto_adjust=False,
                progress=False,
                threads=False,
            )
            if frame.empty:
                raise RuntimeError(f"Yahoo Finance returned no price rows for {symbol}")
            close = frame["Close"]
            if isinstance(close, pd.DataFrame):
                close = close.iloc[:, 0]
            return {
                index.date().isoformat(): float(value)
                for index, value in close.items()
                if pd.notna(value)
            }
        except Exception as error:
            last_error = error
            if attempt + 1 < 3:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch Yahoo Finance prices for {symbol}: {last_error}")


def existing_item_history(existing: dict[str, Any], ticker: str) -> dict[str, dict[str, float]]:
    item = existing.get("items", {}).get(ticker, {})
    dates = item.get("dates", [])
    prices = item.get("prices", [])
    navs = item.get("navs", [])
    shares = item.get("sharesOutstanding", [])
    aums = item.get("aumM", [])
    history: dict[str, dict[str, float]] = {}
    for index, day_text in enumerate(dates):
        nav = finite(navs[index] if index < len(navs) else None)
        share_count = finite(shares[index] if index < len(shares) else None)
        if nav is None or share_count is None:
            continue
        price = finite(prices[index] if index < len(prices) else None)
        aum_m = finite(aums[index] if index < len(aums) else None)
        history[str(day_text)] = {
            "nav": nav,
            "price": price if price is not None else nav,
            "shares": share_count,
            "aum": aum_m * 1_000_000 if aum_m is not None else share_count * nav,
        }
    return history


def fetch_roundhill_nav_history(file_ticker: str) -> dict[str, dict[str, float]]:
    text = request_text(ROUNDHILL_NAV_URL.format(file_ticker=file_ticker))
    if not text.lstrip().startswith("Fund Name,Fund Ticker"):
        raise RuntimeError(f"Roundhill returned a non-CSV response for {file_ticker}")
    result: dict[str, dict[str, float]] = {}
    for row in csv.DictReader(io.StringIO(text)):
        try:
            day = datetime.strptime(row.get("Rate Date", ""), "%m/%d/%Y").date()
        except ValueError:
            continue
        if day < START_DATE:
            continue
        nav = finite(row.get("NAV"))
        price = finite(row.get("Market Price"))
        if nav is None:
            continue
        result[day.isoformat()] = {"nav": nav, "price": price if price is not None else nav}
    return result


def fetch_roundhill_current() -> dict[str, dict[str, float]]:
    text = request_text(ROUNDHILL_DAILY_URL)
    result: dict[str, dict[str, float]] = {}
    for row in csv.DictReader(io.StringIO(text)):
        ticker = str(row.get("Fund Ticker") or "").upper()
        if ticker not in {"DRAM", "MAGS"}:
            continue
        try:
            day = datetime.strptime(row.get("Rate Date", ""), "%m/%d/%Y").date().isoformat()
        except ValueError:
            continue
        result[ticker] = {
            "date": day,
            "nav": finite(row.get("NAV")),
            "price": finite(row.get("Market Price")),
            "shares": finite(row.get("Shares Outstanding")),
            "aum": finite(row.get("Net Assets")),
        }
    return result


def fetch_roundhill_holdings_day(day_text: str) -> tuple[str, dict[str, float]]:
    day = datetime.strptime(day_text, "%Y-%m-%d").date()
    url = ROUNDHILL_HOLDINGS_URL.format(stamp=day.strftime("%m%d%Y"))
    try:
        text = request_text(url, timeout=45)
    except requests.RequestException:
        return day_text, {}
    if not text.lstrip().startswith("Date,Account,StockTicker"):
        return day_text, {}
    shares: dict[str, float] = {}
    for row in csv.DictReader(io.StringIO(text)):
        account = str(row.get("Account") or "").upper()
        if account not in {"DRAM", "MAGS"} or account in shares:
            continue
        value = finite(row.get("SharesOutstanding"))
        if value is not None:
            shares[account] = value
    return day_text, shares


def existing_roundhill_shares(existing: dict[str, Any]) -> dict[str, dict[str, float]]:
    result = {"DRAM": {}, "MAGS": {}}
    for ticker in result:
        item = existing.get("items", {}).get(ticker, {})
        dates = item.get("dates", [])
        shares = item.get("sharesOutstanding", [])
        for day_text, value in zip(dates, shares):
            numeric = finite(value)
            if numeric is not None:
                result[ticker][day_text] = numeric
    return result


def fetch_roundhill_shares(
    histories: dict[str, dict[str, dict[str, float]]], existing: dict[str, Any]
) -> dict[str, dict[str, float]]:
    cached = existing_roundhill_shares(existing)
    all_dates = sorted({day for history in histories.values() for day in history})
    if not all_dates:
        return cached

    newest_cached = max(
        (day for ticker_cache in cached.values() for day in ticker_cache),
        default="",
    )
    if newest_cached:
        refresh_from = (
            datetime.strptime(newest_cached, "%Y-%m-%d").date()
            - timedelta(days=ROUNDHILL_RECHECK_DAYS)
        ).isoformat()
        request_dates = [day for day in all_dates if day >= refresh_from]
    else:
        request_dates = all_dates

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(fetch_roundhill_holdings_day, day): day for day in request_dates}
        for future in as_completed(futures):
            day_text, values = future.result()
            for ticker, shares in values.items():
                cached[ticker][day_text] = shares
    return cached


def build_item(
    ticker: str,
    history: dict[str, dict[str, float]],
    shares_by_date: dict[str, float] | None = None,
) -> dict[str, Any]:
    dates = sorted(history)
    rows: list[dict[str, float | str]] = []
    last_shares: float | None = None
    cumulative = 0.0
    for day_text in dates:
        values = history[day_text]
        shares = finite(values.get("shares"))
        if shares is None and shares_by_date is not None:
            shares = finite(shares_by_date.get(day_text))
        if shares is None:
            continue
        nav = finite(values.get("nav"))
        price = finite(values.get("price"))
        if nav is None:
            continue
        if price is None:
            price = nav
        daily_flow = 0.0 if last_shares is None else (shares - last_shares) * nav / 1_000_000
        aum = finite(values.get("aum"))
        if aum is None:
            aum = shares * nav
        cumulative += daily_flow
        rows.append(
            {
                "date": day_text,
                "nav": round(nav, 6),
                "price": round(price, 6),
                "shares": round(shares),
                "aumM": round(aum / 1_000_000, 3),
                "dailyFlowM": round(daily_flow, 3),
                "cumulativeFlowM": round(cumulative, 3),
            }
        )
        last_shares = shares

    if not rows:
        raise RuntimeError(f"No complete NAV/shares rows for {ticker}")
    latest = rows[-1]
    meta = ETF_META[ticker]
    return {
        "ticker": ticker,
        "name": meta["name"],
        "theme": meta["theme"],
        "issuer": meta["issuer"],
        "color": meta["color"],
        "dates": [row["date"] for row in rows],
        "prices": [row["price"] for row in rows],
        "navs": [row["nav"] for row in rows],
        "sharesOutstanding": [row["shares"] for row in rows],
        "aumM": [row["aumM"] for row in rows],
        "dailyFlowM": [row["dailyFlowM"] for row in rows],
        "cumulativeFlowM": [row["cumulativeFlowM"] for row in rows],
        "latest": {
            "date": latest["date"],
            "price": latest["price"],
            "nav": latest["nav"],
            "sharesOutstanding": latest["shares"],
            "aumM": latest["aumM"],
            "dailyFlowM": latest["dailyFlowM"],
            "cumulativeFlowM": latest["cumulativeFlowM"],
        },
    }


def build_payload() -> dict[str, Any]:
    existing = load_existing()
    source_failures: list[str] = []
    live_sources = 0
    ishares_histories: dict[str, dict[str, dict[str, float]]] = {}
    for ticker, meta in ETF_META.items():
        portfolio_id = meta.get("portfolioId")
        if not portfolio_id:
            continue
        try:
            history = fetch_ishares_history(str(portfolio_id))
            live_sources += 1
        except Exception as error:
            history = existing_item_history(existing, ticker)
            if not history:
                raise
            source_failures.append(f"{ticker} iShares: {error}")
            print(f"Warning: preserving existing {ticker} issuer history: {error}")
        try:
            prices = fetch_yahoo_prices(ticker, START_DATE)
        except Exception as error:
            prices = {
                day_text: values["price"]
                for day_text, values in existing_item_history(existing, ticker).items()
            }
            source_failures.append(f"{ticker} Yahoo: {error}")
            print(f"Warning: preserving existing {ticker} market prices: {error}")
        for day_text, values in history.items():
            values["price"] = prices.get(day_text, values["nav"])
        ishares_histories[ticker] = history

    roundhill_histories: dict[str, dict[str, dict[str, float]]] = {}
    for ticker in ("DRAM", "MAGS"):
        try:
            roundhill_histories[ticker] = fetch_roundhill_nav_history(ETF_META[ticker]["fileTicker"])
            live_sources += 1
        except Exception as error:
            history = existing_item_history(existing, ticker)
            if not history:
                raise
            roundhill_histories[ticker] = history
            source_failures.append(f"{ticker} Roundhill history: {error}")
            print(f"Warning: preserving existing {ticker} issuer history: {error}")
    try:
        current = fetch_roundhill_current()
    except Exception as error:
        current = {}
        source_failures.append(f"Roundhill current: {error}")
        print(f"Warning: preserving existing Roundhill current data: {error}")
    if live_sources == 0:
        raise RuntimeError("All ETF issuer sources failed; refusing to publish an unverified refresh")
    for ticker, values in current.items():
        day_text = str(values.get("date") or "")
        if not day_text:
            continue
        roundhill_histories.setdefault(ticker, {})[day_text] = {
            "nav": finite(values.get("nav")),
            "price": finite(values.get("price")),
            "aum": finite(values.get("aum")),
        }

    roundhill_shares = fetch_roundhill_shares(roundhill_histories, existing)
    for ticker, values in current.items():
        day_text = str(values.get("date") or "")
        shares = finite(values.get("shares"))
        if day_text and shares is not None:
            roundhill_shares.setdefault(ticker, {})[day_text] = shares

    items = {
        "SOXX": build_item("SOXX", ishares_histories["SOXX"]),
        "DRAM": build_item("DRAM", roundhill_histories["DRAM"], roundhill_shares["DRAM"]),
        "MAGS": build_item("MAGS", roundhill_histories["MAGS"], roundhill_shares["MAGS"]),
        "EWY": build_item("EWY", ishares_histories["EWY"]),
    }
    common_dates = set(items["SOXX"]["dates"])
    for item in items.values():
        common_dates.intersection_update(item["dates"])
    if not common_dates:
        raise RuntimeError("No common comparison date across ETF datasets")
    comparison_date = max(common_dates)
    updated_at = max(item["latest"]["date"] for item in items.values())
    return {
        "updatedAt": updated_at,
        "comparisonDate": comparison_date,
        "sourceDates": {ticker: item["latest"]["date"] for ticker, item in items.items()},
        "sourceWarnings": source_failures,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "startDate": START_DATE.isoformat(),
        "defaultRange": "ytd",
        "ranges": [
            {"key": "3m", "label": "3M"},
            {"key": "6m", "label": "6M"},
            {"key": "ytd", "label": "YTD"},
            {"key": "1y", "label": "1Y"},
            {"key": "max", "label": "MAX"},
        ],
        "methodology": {
            "dailyFlow": "(Shares Outstanding[t] - Shares Outstanding[t-1]) × NAV[t]",
            "cumulativeFlow": "Selected-period cumulative sum of daily primary-market flow",
            "unit": "USD millions",
            "note": "Total shares outstanding is not accumulated. Only the daily net change in shares is valued at that day's NAV.",
        },
        "sources": [
            {
                "label": "iShares SOXX official fund data",
                "url": ETF_META["SOXX"]["pageUrl"],
                "detail": "Historical NAV and Shares Outstanding; market price uses Yahoo Finance close.",
            },
            {
                "label": "Roundhill DRAM official fund data",
                "url": "https://www.roundhillinvestments.com/etf/dram/",
                "detail": "Daily NAV/market price and dated holdings SharesOutstanding for DRAM.",
            },
            {
                "label": "Roundhill MAGS official fund data",
                "url": "https://www.roundhillinvestments.com/etf/mags/",
                "detail": "Daily NAV/market price and dated holdings SharesOutstanding for MAGS.",
            },
            {
                "label": "iShares EWY official fund data",
                "url": ETF_META["EWY"]["pageUrl"],
                "detail": "Historical NAV and Shares Outstanding; market price uses Yahoo Finance close.",
            },
        ],
        "items": items,
    }


def main() -> None:
    payload = build_payload()
    existing = load_existing()
    if existing:
        previous = {key: value for key, value in existing.items() if key != "generatedAt"}
        current = {key: value for key, value in payload.items() if key != "generatedAt"}
        if previous == current:
            print(f"No Study ETF flow changes ({payload['updatedAt']})")
            return
    DATA_PATH.write_text(
        "window.studyEtfFlowData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    summary = ", ".join(
        f"{ticker} {len(item['dates'])} rows / {item['latest']['cumulativeFlowM']:+,.1f}M"
        for ticker, item in payload["items"].items()
    )
    print(f"Wrote {DATA_PATH} ({payload['updatedAt']}) | {summary}")


if __name__ == "__main__":
    main()

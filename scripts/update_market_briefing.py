from __future__ import annotations

import json
import math
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote_plus
from xml.etree import ElementTree as ET

import pandas as pd
import requests
import yfinance as yf


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-briefing-data.js"
USER_AGENT = {"User-Agent": "Mozilla/5.0"}
PRICE_PERIOD = "10d"
BENCHMARK_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT"]
USD_PER_KRW_SYMBOL = "KRW=X"

SECTOR_GROUPS = [
    {
        "key": "m7",
        "label": "M7 빅테크",
        "items": [
            {"ticker": "NVDA", "label": "NVDA US", "name": "NVIDIA", "query": "NVIDIA stock"},
            {"ticker": "GOOGL", "label": "GOOGL US", "name": "Alphabet", "query": "Alphabet stock"},
            {"ticker": "AAPL", "label": "AAPL US", "name": "Apple", "query": "Apple stock"},
            {"ticker": "MSFT", "label": "MSFT US", "name": "Microsoft", "query": "Microsoft stock"},
            {"ticker": "AMZN", "label": "AMZN US", "name": "Amazon", "query": "Amazon stock"},
            {"ticker": "META", "label": "META US", "name": "Meta", "query": "Meta stock"},
            {"ticker": "TSLA", "label": "TSLA US", "name": "Tesla", "query": "Tesla stock"},
        ],
    },
    {
        "key": "semi",
        "label": "반도체",
        "items": [
            {"ticker": "AVGO", "label": "AVGO US", "name": "Broadcom", "query": "Broadcom stock"},
            {"ticker": "TSM", "label": "TSM US", "name": "TSMC ADR", "query": "TSMC stock"},
            {"ticker": "005930.KS", "label": "삼성전자 KR", "name": "Samsung Electronics", "query": "삼성전자 주가"},
            {"ticker": "000660.KS", "label": "SK하이닉스 KR", "name": "SK hynix", "query": "SK하이닉스 주가"},
            {"ticker": "MU", "label": "MU US", "name": "Micron", "query": "Micron stock"},
            {"ticker": "SNDK", "label": "SNDK US", "name": "Sandisk", "query": "Sandisk stock"},
            {"ticker": "WDC", "label": "WDC US", "name": "Western Digital", "query": "Western Digital stock"},
            {"ticker": "STX", "label": "STX US", "name": "Seagate", "query": "Seagate stock"},
            {"ticker": "ASML", "label": "ASML US", "name": "ASML", "query": "ASML stock"},
            {"ticker": "AMAT", "label": "AMAT US", "name": "Applied Materials", "query": "Applied Materials stock"},
            {"ticker": "LRCX", "label": "LRCX US", "name": "Lam Research", "query": "Lam Research stock"},
            {"ticker": "KLAC", "label": "KLAC US", "name": "KLA", "query": "KLA stock"},
            {"ticker": "TER", "label": "TER US", "name": "Teradyne", "query": "Teradyne stock"},
            {"ticker": "INTC", "label": "INTC US", "name": "Intel", "query": "Intel stock"},
            {"ticker": "AMD", "label": "AMD US", "name": "AMD", "query": "AMD stock"},
            {"ticker": "MRVL", "label": "MRVL US", "name": "Marvell", "query": "Marvell stock"},
        ],
    },
    {
        "key": "power_semi",
        "label": "전력 반도체",
        "items": [
            {"ticker": "ADI", "label": "ADI US", "name": "Analog Devices", "query": "Analog Devices stock"},
            {"ticker": "TXN", "label": "TXN US", "name": "Texas Instruments", "query": "Texas Instruments stock"},
            {"ticker": "NXPI", "label": "NXPI US", "name": "NXP", "query": "NXP stock"},
            {"ticker": "ON", "label": "ON US", "name": "ON Semiconductor", "query": "ON Semiconductor stock"},
            {"ticker": "STM", "label": "STM US", "name": "STMicroelectronics", "query": "STMicroelectronics stock"},
            {"ticker": "NVTS", "label": "NVTS US", "name": "Navitas", "query": "Navitas Semiconductor stock"},
        ],
    },
    {
        "key": "design_ip",
        "label": "반도체 설계/IP",
        "items": [
            {"ticker": "ARM", "label": "ARM US", "name": "Arm", "query": "Arm Holdings stock"},
            {"ticker": "QCOM", "label": "QCOM US", "name": "Qualcomm", "query": "Qualcomm stock"},
            {"ticker": "SNPS", "label": "SNPS US", "name": "Synopsys", "query": "Synopsys stock"},
            {"ticker": "CDNS", "label": "CDNS US", "name": "Cadence", "query": "Cadence Design Systems stock"},
        ],
    },
    {
        "key": "oem",
        "label": "PC/서버 OEM",
        "items": [
            {"ticker": "HPE", "label": "HPE US", "name": "HPE", "query": "HPE stock"},
            {"ticker": "DELL", "label": "DELL US", "name": "Dell", "query": "Dell stock"},
            {"ticker": "SMCI", "label": "SMCI US", "name": "Super Micro", "query": "Super Micro stock"},
        ],
    },
    {
        "key": "neo_cloud",
        "label": "네오클라우드",
        "items": [
            {"ticker": "ORCL", "label": "ORCL US", "name": "Oracle", "query": "Oracle stock"},
            {"ticker": "CRWV", "label": "CRWV US", "name": "CoreWeave", "query": "CoreWeave stock"},
            {"ticker": "NBIS", "label": "NBIS US", "name": "Nebius", "query": "Nebius stock"},
            {"ticker": "IREN", "label": "IREN US", "name": "Iris Energy", "query": "Iris Energy stock"},
            {"ticker": "APLD", "label": "APLD US", "name": "Applied Digital", "query": "Applied Digital stock"},
            {"ticker": "GLXY", "label": "GLXY US", "name": "Galaxy Digital", "query": "Galaxy Digital stock"},
        ],
    },
    {
        "key": "crypto",
        "label": "크립토",
        "items": [
            {"ticker": "COIN", "label": "COIN US", "name": "Coinbase", "query": "Coinbase stock"},
            {"ticker": "CRCL", "label": "CRCL US", "name": "Circle", "query": "Circle stock"},
            {"ticker": "MSTR", "label": "MSTR US", "name": "MicroStrategy", "query": "MicroStrategy stock"},
            {"ticker": "BMNR", "label": "BMNR US", "name": "BitMine", "query": "BitMine stock"},
        ],
    },
    {
        "key": "sw_platform",
        "label": "S/W Platform",
        "items": [
            {"ticker": "PLTR", "label": "PLTR US", "name": "Palantir", "query": "Palantir stock"},
            {"ticker": "IBM", "label": "IBM US", "name": "IBM", "query": "IBM stock"},
            {"ticker": "APP", "label": "APP US", "name": "AppLovin", "query": "AppLovin stock"},
            {"ticker": "HOOD", "label": "HOOD US", "name": "Robinhood", "query": "Robinhood stock"},
            {"ticker": "RDDT", "label": "RDDT US", "name": "Reddit", "query": "Reddit stock"},
            {"ticker": "SHOP", "label": "SHOP US", "name": "Shopify", "query": "Shopify stock"},
            {"ticker": "MDB", "label": "MDB US", "name": "MongoDB", "query": "MongoDB stock"},
        ],
    },
    {
        "key": "legacy_software",
        "label": "Traditional S/W",
        "items": [
            {"ticker": "CRM", "label": "CRM US", "name": "Salesforce", "query": "Salesforce stock"},
            {"ticker": "NOW", "label": "NOW US", "name": "ServiceNow", "query": "ServiceNow stock"},
            {"ticker": "SNOW", "label": "SNOW US", "name": "Snowflake", "query": "Snowflake stock"},
        ],
    },
    {
        "key": "cybersecurity",
        "label": "Cybersecurity",
        "items": [
            {"ticker": "NET", "label": "NET US", "name": "Cloudflare", "query": "Cloudflare stock"},
            {"ticker": "CRWD", "label": "CRWD US", "name": "CrowdStrike", "query": "CrowdStrike stock"},
            {"ticker": "PANW", "label": "PANW US", "name": "Palo Alto Networks", "query": "Palo Alto Networks stock"},
            {"ticker": "ZS", "label": "ZS US", "name": "Zscaler", "query": "Zscaler stock"},
        ],
    },
    {
        "key": "entertainment",
        "label": "Entertainment",
        "items": [
            {"ticker": "NFLX", "label": "NFLX US", "name": "Netflix", "query": "Netflix stock"},
            {"ticker": "SPOT", "label": "SPOT US", "name": "Spotify", "query": "Spotify stock"},
            {"ticker": "DIS", "label": "DIS US", "name": "Disney", "query": "Disney stock"},
            {"ticker": "WBD", "label": "WBD US", "name": "Warner Bros. Discovery", "query": "Warner Bros Discovery stock"},
            {"ticker": "U", "label": "U US", "name": "Unity", "query": "Unity Software stock"},
            {"ticker": "RBLX", "label": "RBLX US", "name": "Roblox", "query": "Roblox stock"},
        ],
    },
    {
        "key": "telecom_infra",
        "label": "Telecom Infra",
        "items": [
            {"ticker": "T", "label": "T US", "name": "AT&T", "query": "AT&T stock"},
            {"ticker": "CSCO", "label": "CSCO US", "name": "Cisco", "query": "Cisco stock"},
            {"ticker": "LITE", "label": "LITE US", "name": "Lumentum", "query": "Lumentum stock"},
            {"ticker": "COHR", "label": "COHR US", "name": "Coherent", "query": "Coherent stock"},
            {"ticker": "CIEN", "label": "CIEN US", "name": "Ciena", "query": "Ciena stock"},
            {"ticker": "GLW", "label": "GLW US", "name": "Corning", "query": "Corning stock"},
            {"ticker": "AAOI", "label": "AAOI US", "name": "Applied Optoelectronics", "query": "Applied Optoelectronics stock"},
            {"ticker": "APH", "label": "APH US", "name": "Amphenol", "query": "Amphenol stock"},
            {"ticker": "ANET", "label": "ANET US", "name": "Arista Networks", "query": "Arista Networks stock"},
            {"ticker": "CRDO", "label": "CRDO US", "name": "Credo", "query": "Credo Technology stock"},
            {"ticker": "CLS", "label": "CLS US", "name": "Celestica", "query": "Celestica stock"},
            {"ticker": "ALAB", "label": "ALAB US", "name": "Astera Labs", "query": "Astera Labs stock"},
            {"ticker": "AXTI", "label": "AXTI US", "name": "AXT", "query": "AXT Inc stock"},
        ],
    },
    {
        "key": "datacenter_infra",
        "label": "Data Center Infra",
        "items": [
            {"ticker": "VRT", "label": "VRT US", "name": "Vertiv", "query": "Vertiv stock"},
            {"ticker": "FIX", "label": "FIX US", "name": "Comfort Systems", "query": "Comfort Systems stock"},
            {"ticker": "PWR", "label": "PWR US", "name": "Quanta Services", "query": "Quanta Services stock"},
        ],
    },
    {
        "key": "quantum",
        "label": "Quantum",
        "items": [
            {"ticker": "IONQ", "label": "IONQ US", "name": "IonQ", "query": "IonQ stock"},
            {"ticker": "RGTI", "label": "RGTI US", "name": "Rigetti", "query": "Rigetti stock"},
            {"ticker": "QBTS", "label": "QBTS US", "name": "D-Wave Quantum", "query": "D-Wave Quantum stock"},
        ],
    },
    {
        "key": "staples",
        "label": "Staples",
        "items": [
            {"ticker": "WMT", "label": "WMT US", "name": "Walmart", "query": "Walmart stock"},
            {"ticker": "COST", "label": "COST US", "name": "Costco", "query": "Costco stock"},
            {"ticker": "PG", "label": "PG US", "name": "Procter & Gamble", "query": "Procter & Gamble stock"},
            {"ticker": "KO", "label": "KO US", "name": "Coca-Cola", "query": "Coca-Cola stock"},
            {"ticker": "MNST", "label": "MNST US", "name": "Monster Beverage", "query": "Monster Beverage stock"},
        ],
    },
    {
        "key": "discretionary",
        "label": "Discretionary",
        "items": [
            {"ticker": "HD", "label": "HD US", "name": "Home Depot", "query": "Home Depot stock"},
            {"ticker": "SBUX", "label": "SBUX US", "name": "Starbucks", "query": "Starbucks stock"},
            {"ticker": "MCD", "label": "MCD US", "name": "McDonald's", "query": "McDonald's stock"},
            {"ticker": "NKE", "label": "NKE US", "name": "Nike", "query": "Nike stock"},
            {"ticker": "ULTA", "label": "ULTA US", "name": "Ulta Beauty", "query": "Ulta Beauty stock"},
            {"ticker": "ELF", "label": "ELF US", "name": "e.l.f. Beauty", "query": "e.l.f. Beauty stock"},
            {"ticker": "DASH", "label": "DASH US", "name": "DoorDash", "query": "DoorDash stock"},
            {"ticker": "DECK", "label": "DECK US", "name": "Deckers", "query": "Deckers stock"},
        ],
    },
    {
        "key": "defense",
        "label": "Defense",
        "items": [
            {"ticker": "RTX", "label": "RTX US", "name": "RTX", "query": "RTX stock"},
            {"ticker": "LMT", "label": "LMT US", "name": "Lockheed Martin", "query": "Lockheed Martin stock"},
            {"ticker": "LHX", "label": "LHX US", "name": "L3Harris", "query": "L3Harris stock"},
            {"ticker": "NOC", "label": "NOC US", "name": "Northrop Grumman", "query": "Northrop Grumman stock"},
            {"ticker": "GD", "label": "GD US", "name": "General Dynamics", "query": "General Dynamics stock"},
            {"ticker": "HII", "label": "HII US", "name": "Huntington Ingalls", "query": "Huntington Ingalls stock"},
            {"ticker": "KTOS", "label": "KTOS US", "name": "Kratos", "query": "Kratos Defense stock"},
            {"ticker": "KRMN", "label": "KRMN US", "name": "Karman", "query": "Karman stock"},
        ],
    },
]

MAJOR_NEWS_QUERIES = [
    {"key": "market", "label": "US Market", "query": "US stock market when:1d"},
    {"key": "fed", "label": "Fed", "query": "Federal Reserve stocks when:3d"},
    {"key": "rates", "label": "Rates", "query": "Treasury yields stocks when:2d"},
    {"key": "oil", "label": "Oil", "query": "oil prices stocks when:2d"},
    {"key": "semis", "label": "AI / Semis", "query": "semiconductor stocks AI when:2d"},
]


def normalize_number(value: object) -> float | None:
    try:
        numeric = float(value)
    except Exception:
        return None
    if not math.isfinite(numeric):
        return None
    return numeric


def rss_url(query: str) -> str:
    return f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"


def parse_google_news_feed(query: str, limit: int = 5) -> list[dict[str, str]]:
    response = requests.get(rss_url(query), timeout=20, headers=USER_AGENT)
    response.raise_for_status()
    root = ET.fromstring(response.text)
    items = []
    for item in root.findall(".//item")[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        source = (item.findtext("source") or "").strip()
        published = (item.findtext("pubDate") or "").strip()
        published_iso = ""
        if published:
            try:
                published_iso = parsedate_to_datetime(published).astimezone(timezone.utc).isoformat()
            except Exception:
                published_iso = published
        items.append(
            {
                "title": title,
                "link": link,
                "source": source,
                "publishedAt": published_iso,
            }
        )
    return items


def unique_items(items: list[dict[str, str]], limit: int) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    output: list[dict[str, str]] = []
    for item in items:
        key = (item.get("title", ""), item.get("source", ""))
        if key in seen:
            continue
        seen.add(key)
        output.append(item)
        if len(output) >= limit:
            break
    return output


def fetch_price_frame(symbols: list[str]) -> pd.DataFrame:
    history = yf.download(
        tickers=symbols,
        period=PRICE_PERIOD,
        auto_adjust=False,
        progress=False,
        threads=False,
        group_by="ticker",
    )
    if history.empty:
        raise RuntimeError("No market briefing price data downloaded.")

    close_map: dict[str, pd.Series] = {}
    multi = isinstance(history.columns, pd.MultiIndex)
    for symbol in symbols:
        try:
            frame = history[symbol] if multi else history
        except KeyError:
            continue
        close = frame.get("Close")
        if close is None:
            continue
        close = close.dropna()
        if len(close) >= 2:
            close_map[symbol] = close.rename(symbol)
    return pd.concat(close_map.values(), axis=1).sort_index() if close_map else pd.DataFrame()


def fetch_meta(symbol: str) -> dict[str, float | None]:
    market_cap = None
    shares = None
    try:
        ticker = yf.Ticker(symbol)
        fast_info = getattr(ticker, "fast_info", {}) or {}
        market_cap = normalize_number(fast_info.get("market_cap"))
        shares = normalize_number(fast_info.get("shares"))
        if market_cap is None or shares is None:
            info = ticker.get_info()
            market_cap = market_cap or normalize_number(info.get("marketCap"))
            shares = shares or normalize_number(info.get("sharesOutstanding") or info.get("impliedSharesOutstanding"))
    except Exception:
        pass
    return {"marketCap": market_cap, "sharesOutstanding": shares}


def color_for_change(change_pct: float | None) -> str:
    if change_pct is None:
        return "#f1f1ed"
    clamped = max(-8.0, min(8.0, change_pct))
    intensity = abs(clamped) / 8.0
    if clamped >= 0:
        base = (22, 163, 74)
        bg = (236, 253, 245)
    else:
        base = (220, 38, 38)
        bg = (254, 242, 242)
    r = round(bg[0] + (base[0] - bg[0]) * intensity)
    g = round(bg[1] + (base[1] - bg[1]) * intensity)
    b = round(bg[2] + (base[2] - bg[2]) * intensity)
    return f"#{r:02x}{g:02x}{b:02x}"


def tile_class_for_rank(rank: int) -> str:
    if rank == 0:
        return "xl"
    if rank <= 2:
        return "lg"
    if rank <= 5:
        return "md"
    return "sm"


def build_company_snapshots() -> tuple[list[dict[str, object]], dict[str, dict[str, object]], str]:
    companies = [item | {"sectorKey": sector["key"], "sectorLabel": sector["label"]} for sector in SECTOR_GROUPS for item in sector["items"]]
    symbols = sorted({company["ticker"] for company in companies} | set(BENCHMARK_SYMBOLS) | {USD_PER_KRW_SYMBOL})
    close_frame = fetch_price_frame(symbols)
    latest_date = close_frame.index.max().strftime("%Y-%m-%d")

    fx_usd_per_krw = None
    if USD_PER_KRW_SYMBOL in close_frame.columns:
        fx_values = close_frame[USD_PER_KRW_SYMBOL].dropna()
        if not fx_values.empty:
            fx_usd_per_krw = float(fx_values.iloc[-1])

    meta_by_symbol: dict[str, dict[str, float | None]] = {}
    for company in companies:
        meta_by_symbol[company["ticker"]] = fetch_meta(company["ticker"])
        time.sleep(0.05)

    by_ticker: dict[str, dict[str, object]] = {}
    snapshots: list[dict[str, object]] = []
    for company in companies:
        symbol = company["ticker"]
        series = close_frame[symbol].dropna() if symbol in close_frame.columns else pd.Series(dtype=float)
        price = previous_close = day_change_pct = None
        if len(series) >= 2:
            price = float(series.iloc[-1])
            previous_close = float(series.iloc[-2])
            if previous_close:
                day_change_pct = round((price / previous_close - 1) * 100, 2)
        meta = meta_by_symbol.get(symbol, {})
        market_cap = normalize_number(meta.get("marketCap"))
        market_cap_usd = market_cap
        if symbol.endswith(".KS") and market_cap and fx_usd_per_krw:
            market_cap_usd = market_cap / fx_usd_per_krw
        snapshot = {
            **company,
            "currency": "KRW" if symbol.endswith(".KS") else "USD",
            "price": round(price, 2) if price is not None else None,
            "previousClose": round(previous_close, 2) if previous_close is not None else None,
            "dayChangePct": day_change_pct,
            "marketCap": round(market_cap) if market_cap is not None else None,
            "marketCapUsd": round(market_cap_usd) if market_cap_usd is not None else None,
            "mapColor": color_for_change(day_change_pct),
        }
        snapshots.append(snapshot)
        by_ticker[symbol] = snapshot
    return snapshots, by_ticker, latest_date


def build_sector_panels(snapshots: list[dict[str, object]]) -> list[dict[str, object]]:
    panels = []
    for sector in SECTOR_GROUPS:
        items = [item for item in snapshots if item["sectorKey"] == sector["key"]]
        items.sort(key=lambda item: (item.get("marketCapUsd") or 0), reverse=True)
        for index, item in enumerate(items):
            item["tileClass"] = tile_class_for_rank(index)
        panels.append({"key": sector["key"], "label": sector["label"], "items": items})
    return panels


def build_major_news() -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for query_meta in MAJOR_NEWS_QUERIES:
        try:
            stories = parse_google_news_feed(query_meta["query"], limit=3)
        except Exception:
            continue
        if not stories:
            continue
        story = stories[0]
        items.append(
            {
                "bucket": query_meta["label"],
                "title": story["title"],
                "source": story["source"],
                "publishedAt": story["publishedAt"],
                "link": story["link"],
            }
        )
    return unique_items(items, limit=5)


def build_movers(snapshots: list[dict[str, object]]) -> list[dict[str, object]]:
    movers = [item for item in snapshots if item.get("dayChangePct") is not None]
    gainers = sorted(
        [item for item in movers if float(item["dayChangePct"]) > 0],
        key=lambda item: float(item["dayChangePct"]),
        reverse=True,
    )[:3]
    decliners = sorted(
        [item for item in movers if float(item["dayChangePct"]) < 0],
        key=lambda item: float(item["dayChangePct"]),
    )[:3]
    selected = gainers + decliners
    output = []
    for item in selected:
        catalyst = {"title": "", "source": "", "publishedAt": "", "link": ""}
        try:
            stories = parse_google_news_feed(f'{item["query"]} when:7d', limit=3)
            if stories:
                catalyst = stories[0]
        except Exception:
            pass
        output.append(
            {
                "ticker": item["ticker"],
                "label": item["label"],
                "name": item["name"],
                "sectorLabel": item["sectorLabel"],
                "price": item["price"],
                "dayChangePct": item["dayChangePct"],
                "marketCapUsd": item["marketCapUsd"],
                "direction": "up" if float(item["dayChangePct"]) >= 0 else "down",
                "headline": catalyst["title"],
                "source": catalyst["source"],
                "publishedAt": catalyst["publishedAt"],
                "link": catalyst["link"],
            }
        )
        time.sleep(0.05)
    return output


def build_payload() -> dict[str, object]:
    snapshots, _, latest_date = build_company_snapshots()
    major_news = build_major_news()
    movers = build_movers(snapshots)
    sector_panels = build_sector_panels(snapshots)
    return {
        "updatedAt": latest_date,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mapLegend": {
            "negative": "Red = daily decline",
            "positive": "Green = daily gain",
            "size": "Tile size follows market-cap rank inside each sector",
        },
        "sectorPanels": sector_panels,
        "majorNews": major_news,
        "movers": movers,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.marketBriefingData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Sectors: {len(payload['sectorPanels'])}")
    print(f"News: {len(payload['majorNews'])}")
    print(f"Movers: {len(payload['movers'])}")


if __name__ == "__main__":
    main()

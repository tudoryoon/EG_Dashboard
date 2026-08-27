from __future__ import annotations

import json
import math
import re
import time
from datetime import datetime, time as datetime_time, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from urllib.parse import quote_plus
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

import pandas as pd
import requests
import yfinance as yf

from fedwatch_data import build_fedwatch_snapshot as build_official_fedwatch_snapshot


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "market-briefing-data.js"
# Keep yfinance's SQLite cache out of the shared AppData location, which can be
# held open by another local update while this dashboard runs from OneDrive.
yf.set_tz_cache_location(str(OUTPUT_PATH.parent.parent / ".yfinance-cache"))
USER_AGENT = {"User-Agent": "Mozilla/5.0"}
PRICE_PERIOD = "2y"
ROTATION_HISTORY_POINTS = 252
MAX_DAILY_RETURN_PCT = 300.0
BENCHMARK_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT", "QQQ"]
INDEX_CARD_CONFIGS = [
    {"key": "dowjones", "label": "Dow Jones (DIA)", "symbol": "^DJI"},
    {"key": "sp500", "label": "S&P 500 (SPY)", "symbol": "^GSPC"},
    {"key": "nasdaq", "label": "NASDAQ Composite", "symbol": "^IXIC"},
    {"key": "nasdaq100", "label": "NASDAQ 100 (QQQ)", "symbol": "^NDX"},
    {"key": "sox", "label": "필라델피아 반도체 (SOX)", "symbol": "^SOX"},
    {"key": "russell2000", "label": "Russell 2000 (IWM)", "symbol": "^RUT"},
]
USD_PER_KRW_SYMBOL = "KRW=X"
ROTATION_BENCHMARK_SYMBOL = "QQQ"
FEDWATCH_SOURCE_URL = "https://www.cmegroup.com/ko/markets/interest-rates/cme-fedwatch-tool.html"
FEDWATCH_MIRROR_URL = "https://www.oanda.jp/lab-education/dictionary/fedwatchtool/"
FEDWATCH_DISPLAY_COLUMNS = ["250-275", "275-300", "300-325", "325-350", "350-375", "375-400", "400-425", "425-450", "450-475", "475-500"]
FEDWATCH_SNAPSHOT = {
    "source": "CME FedWatch",
    "sourceUrl": FEDWATCH_SOURCE_URL,
    "asOf": "2026-06-12",
    "title": "CME FedWatch Tool - Conditional Meeting Probabilities",
    "columns": FEDWATCH_DISPLAY_COLUMNS,
    "rows": [
        {"meetingDate": "2026-06-17", "probabilities": [0.0, 0.0, 0.0, 1.5, 98.5, 0.0, 0.0, 0.0, 0.0, 0.0]},
        {"meetingDate": "2026-07-29", "probabilities": [0.0, 0.0, 0.0, 1.4, 91.3, 7.4, 0.0, 0.0, 0.0, 0.0]},
        {"meetingDate": "2026-09-16", "probabilities": [0.0, 0.0, 0.0, 1.1, 75.6, 22.0, 1.3, 0.0, 0.0, 0.0]},
        {"meetingDate": "2026-10-28", "probabilities": [0.0, 0.0, 0.0, 0.9, 63.3, 30.9, 4.7, 0.2, 0.0, 0.0]},
        {"meetingDate": "2026-12-09", "probabilities": [0.0, 0.0, 0.0, 0.6, 40.2, 42.9, 14.4, 1.9, 0.1, 0.0]},
        {"meetingDate": "2027-01-27", "probabilities": [0.0, 0.0, 0.0, 3.8, 40.4, 40.6, 13.4, 1.7, 0.1, 0.0]},
        {"meetingDate": "2027-03-17", "probabilities": [2.0, 22.8, 40.5, 26.4, 7.3, 0.9, 0.0, 0.0, 0.0, 0.0]},
        {"meetingDate": "2027-04-28", "probabilities": [0.0, 0.0, 0.9, 11.1, 30.6, 34.3, 18.0, 4.5, 0.5, 0.0]},
        {"meetingDate": "2027-06-09", "probabilities": [0.0, 0.0, 0.4, 5.8, 20.5, 32.4, 26.5, 11.5, 2.6, 0.3]},
        {"meetingDate": "2027-07-28", "probabilities": [0.0, 0.0, 0.4, 5.2, 18.9, 31.1, 27.1, 13.2, 3.6, 0.5]},
        {"meetingDate": "2027-09-15", "probabilities": [0.0, 0.1, 1.3, 7.9, 21.3, 30.3, 24.4, 11.3, 3.0, 0.4]},
        {"meetingDate": "2027-10-27", "probabilities": [0.0, 0.1, 1.5, 8.2, 21.5, 30.2, 24.1, 11.1, 2.9, 0.4]},
        {"meetingDate": "2027-12-08", "probabilities": [0.0, 0.3, 2.4, 10.0, 22.7, 29.3, 22.3, 10.0, 2.6, 0.4]},
    ],
}
ROTATION_WEIGHTS = {
    "1d": 0.20,
    "1w": 0.40,
    "2w": 0.20,
    "1m": 0.20,
}
MAP_RANGE_PERIODS = {
    "1d": 1,
    "1w": 5,
    "2w": 10,
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "1y": 252,
}
MAP_RANGE_LABELS = {
    "1d": "1D",
    "1w": "1W",
    "2w": "2W",
    "1m": "1M",
    "3m": "3M",
    "6m": "6M",
    "1y": "1Y",
    "ytd": "YTD",
}

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
            {"ticker": "SPCX", "label": "SPCX US", "name": "SpaceX", "query": "Space Exploration Technologies stock"},
        ],
    },
    {
        "key": "cloud_bigtech",
        "label": "클라우드 빅테크",
        "items": [
            {"ticker": "GOOGL", "label": "GOOGL US", "name": "Alphabet", "query": "Alphabet stock"},
            {"ticker": "AMZN", "label": "AMZN US", "name": "Amazon", "query": "Amazon stock"},
            {"ticker": "MSFT", "label": "MSFT US", "name": "Microsoft", "query": "Microsoft stock"},
        ],
    },
    {
        "key": "semi_large",
        "label": "반도체(대형주)",
        "scoreTickers": ["AVGO", "TSM", "MU", "SNDK", "WDC", "STX", "ASML", "AMAT", "LRCX", "KLAC", "TER", "INTC", "AMD", "MRVL"],
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
        "key": "memory",
        "label": "메모리&스토리지",
        "scoreTickers": ["MU", "SNDK", "WDC", "STX"],
        "items": [
            {"ticker": "005930.KS", "label": "삼성전자 KR", "name": "Samsung Electronics", "query": "삼성전자 주가"},
            {"ticker": "000660.KS", "label": "SK하이닉스 KR", "name": "SK hynix", "query": "SK하이닉스 주가"},
            {"ticker": "DRAM", "label": "DRAM US", "name": "Roundhill Memory ETF", "query": "Roundhill Memory ETF stock"},
            {"ticker": "MU", "label": "MU US", "name": "Micron", "query": "Micron stock"},
            {"ticker": "SNDK", "label": "SNDK US", "name": "Sandisk", "query": "Sandisk stock"},
            {"ticker": "WDC", "label": "WDC US", "name": "Western Digital", "query": "Western Digital stock"},
            {"ticker": "STX", "label": "STX US", "name": "Seagate", "query": "Seagate stock"},
        ],
    },
    {
        "key": "cpu",
        "label": "CPU",
        "items": [
            {"ticker": "INTC", "label": "INTC US", "name": "Intel", "query": "Intel stock"},
            {"ticker": "AMD", "label": "AMD US", "name": "AMD", "query": "AMD stock"},
            {"ticker": "ARM", "label": "ARM US", "name": "Arm", "query": "Arm Holdings stock"},
        ],
    },
    {
        "key": "semi_equipment",
        "label": "반도체 장비/후공정",
        "items": [
            {"ticker": "ASML", "label": "ASML US", "name": "ASML", "query": "ASML stock"},
            {"ticker": "LRCX", "label": "LRCX US", "name": "Lam Research", "query": "Lam Research stock"},
            {"ticker": "AMAT", "label": "AMAT US", "name": "Applied Materials", "query": "Applied Materials stock"},
            {"ticker": "KLAC", "label": "KLAC US", "name": "KLA", "query": "KLA stock"},
            {"ticker": "TER", "label": "TER US", "name": "Teradyne", "query": "Teradyne stock"},
            {"ticker": "AMKR", "label": "AMKR US", "name": "Amkor Technology", "query": "Amkor Technology stock"},
            {"ticker": "ASX", "label": "ASX US", "name": "ASE Technology", "query": "ASE Technology stock"},
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
            {"ticker": "PURR", "label": "PURR US", "name": "Hyperliquid Strategies", "query": "Hyperliquid Strategies stock"},
        ],
    },
    {
        "key": "software",
        "label": "S/W & 플랫폼",
        "items": [
            {"ticker": "PLTR", "label": "PLTR US", "name": "Palantir", "query": "Palantir stock"},
            {"ticker": "IBM", "label": "IBM US", "name": "IBM", "query": "IBM stock"},
            {"ticker": "APP", "label": "APP US", "name": "AppLovin", "query": "AppLovin stock"},
            {"ticker": "DDOG", "label": "DDOG US", "name": "Datadog", "query": "Datadog stock"},
            {"ticker": "HOOD", "label": "HOOD US", "name": "Robinhood", "query": "Robinhood stock"},
            {"ticker": "RDDT", "label": "RDDT US", "name": "Reddit", "query": "Reddit stock"},
            {"ticker": "SHOP", "label": "SHOP US", "name": "Shopify", "query": "Shopify stock"},
            {"ticker": "MDB", "label": "MDB US", "name": "MongoDB", "query": "MongoDB stock"},
            {"ticker": "CRM", "label": "CRM US", "name": "Salesforce", "query": "Salesforce stock"},
            {"ticker": "NOW", "label": "NOW US", "name": "ServiceNow", "query": "ServiceNow stock"},
            {"ticker": "SNOW", "label": "SNOW US", "name": "Snowflake", "query": "Snowflake stock"},
            {"ticker": "NTAP", "label": "NTAP US", "name": "NetApp", "query": "NetApp stock"},
            {"ticker": "P", "label": "P US", "name": "Everpure", "query": "Everpure stock"},
            {"ticker": "TWLO", "label": "TWLO US", "name": "Twilio", "query": "Twilio stock"},
        ],
    },
    {
        "key": "cybersecurity",
        "label": "사이버보안",
        "items": [
            {"ticker": "NET", "label": "NET US", "name": "Cloudflare", "query": "Cloudflare stock"},
            {"ticker": "CRWD", "label": "CRWD US", "name": "CrowdStrike", "query": "CrowdStrike stock"},
            {"ticker": "PANW", "label": "PANW US", "name": "Palo Alto Networks", "query": "Palo Alto Networks stock"},
            {"ticker": "FTNT", "label": "FTNT US", "name": "Fortinet", "query": "Fortinet stock"},
            {"ticker": "ZS", "label": "ZS US", "name": "Zscaler", "query": "Zscaler stock"},
            {"ticker": "AKAM", "label": "AKAM US", "name": "Akamai Technologies", "query": "Akamai Technologies stock"},
            {"ticker": "RBRK", "label": "RBRK US", "name": "Rubrik", "query": "Rubrik stock"},
            {"ticker": "OKTA", "label": "OKTA US", "name": "Okta", "query": "Okta stock"},
        ],
    },
    {
        "key": "entertainment",
        "label": "엔터테인먼트",
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
        "label": "통신 인프라",
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
        "label": "데이터센터 인프라",
        "items": [
            {"ticker": "VRT", "label": "VRT US", "name": "Vertiv", "query": "Vertiv stock"},
            {"ticker": "NVT", "label": "NVT US", "name": "nVent Electric", "query": "nVent Electric stock"},
            {"ticker": "FIX", "label": "FIX US", "name": "Comfort Systems", "query": "Comfort Systems stock"},
            {"ticker": "PWR", "label": "PWR US", "name": "Quanta Services", "query": "Quanta Services stock"},
        ],
    },
    {
        "key": "quantum",
        "label": "양자컴퓨터",
        "items": [
            {"ticker": "IONQ", "label": "IONQ US", "name": "IonQ", "query": "IonQ stock"},
            {"ticker": "RGTI", "label": "RGTI US", "name": "Rigetti", "query": "Rigetti stock"},
            {"ticker": "QBTS", "label": "QBTS US", "name": "D-Wave Quantum", "query": "D-Wave Quantum stock"},
        ],
    },
    {
        "key": "staples",
        "label": "필수 소비재",
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
        "label": "경기 소비재",
        "items": [
            {"ticker": "TGT", "label": "TGT US", "name": "Target", "query": "Target stock"},
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
        "label": "방산",
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
    {
        "key": "space",
        "label": "우주",
        "items": [
            {"ticker": "RKLB", "label": "RKLB US", "name": "Rocket Lab", "query": "Rocket Lab stock"},
            {"ticker": "ASTS", "label": "ASTS US", "name": "AST SpaceMobile", "query": "AST SpaceMobile stock"},
            {"ticker": "SATS", "label": "SATS US", "name": "EchoStar", "query": "EchoStar stock"},
            {"ticker": "PL", "label": "PL US", "name": "Planet Labs", "query": "Planet Labs stock"},
            {"ticker": "LUNR", "label": "LUNR US", "name": "Intuitive Machines", "query": "Intuitive Machines stock"},
        ],
    },
    {
        "key": "industrials",
        "label": "산업재",
        "items": [
            {"ticker": "CAT", "label": "CAT US", "name": "Caterpillar", "query": "Caterpillar stock"},
            {"ticker": "GE", "label": "GE US", "name": "GE Aerospace", "query": "GE Aerospace stock"},
            {"ticker": "HWM", "label": "HWM US", "name": "Howmet Aerospace", "query": "Howmet Aerospace stock"},
            {"ticker": "FTAI", "label": "FTAI US", "name": "FTAI Aviation", "query": "FTAI Aviation stock"},
            {"ticker": "ATI", "label": "ATI US", "name": "ATI", "query": "ATI stock"},
            {"ticker": "CRS", "label": "CRS US", "name": "Carpenter Technology", "query": "Carpenter Technology stock"},
        ],
    },
    {
        "key": "air_transport",
        "label": "항공/운송",
        "items": [
            {"ticker": "BA", "label": "BA US", "name": "Boeing", "query": "Boeing stock"},
            {"ticker": "DAL", "label": "DAL US", "name": "Delta Air Lines", "query": "Delta Air Lines stock"},
            {"ticker": "UAL", "label": "UAL US", "name": "United Airlines", "query": "United Airlines stock"},
            {"ticker": "LUV", "label": "LUV US", "name": "Southwest Airlines", "query": "Southwest Airlines stock"},
            {"ticker": "FDX", "label": "FDX US", "name": "FedEx", "query": "FedEx stock"},
            {"ticker": "UPS", "label": "UPS US", "name": "UPS", "query": "UPS stock"},
            {"ticker": "UNP", "label": "UNP US", "name": "Union Pacific", "query": "Union Pacific stock"},
        ],
    },
    {
        "key": "robotics",
        "label": "로봇",
        "items": [
            {"ticker": "SYM", "label": "SYM US", "name": "Symbotic", "query": "Symbotic stock"},
            {"ticker": "RR", "label": "RR US", "name": "Richtech Robotics", "query": "Richtech Robotics stock"},
            {"ticker": "SERV", "label": "SERV US", "name": "Serve Robotics", "query": "Serve Robotics stock"},
        ],
    },
    {
        "key": "power",
        "label": "전력",
        "items": [
            {"ticker": "NEE", "label": "NEE US", "name": "NextEra Energy", "query": "NextEra Energy stock"},
            {"ticker": "CEG", "label": "CEG US", "name": "Constellation Energy", "query": "Constellation Energy stock"},
            {"ticker": "VST", "label": "VST US", "name": "Vistra", "query": "Vistra stock"},
            {"ticker": "TLN", "label": "TLN US", "name": "Talen Energy", "query": "Talen Energy stock"},
            {"ticker": "ETN", "label": "ETN US", "name": "Eaton", "query": "Eaton stock"},
            {"ticker": "GEV", "label": "GEV US", "name": "GE Vernova", "query": "GE Vernova stock"},
            {"ticker": "BE", "label": "BE US", "name": "Bloom Energy", "query": "Bloom Energy stock"},
            {"ticker": "FSLR", "label": "FSLR US", "name": "First Solar", "query": "First Solar stock"},
            {"ticker": "NXT", "label": "NXT US", "name": "Nextracker", "query": "Nextracker stock"},
            {"ticker": "FLNC", "label": "FLNC US", "name": "Fluence Energy", "query": "Fluence Energy stock"},
            {"ticker": "EOSE", "label": "EOSE US", "name": "Eos Energy", "query": "Eos Energy stock"},
            {"ticker": "VICR", "label": "VICR US", "name": "Vicor", "query": "Vicor stock"},
        ],
    },
    {
        "key": "nuclear_smr",
        "label": "원전, SMR",
        "items": [
            {"ticker": "CCJ", "label": "CCJ US", "name": "Cameco", "query": "Cameco stock"},
            {"ticker": "BWXT", "label": "BWXT US", "name": "BWX Technologies", "query": "BWX Technologies stock"},
            {"ticker": "LEU", "label": "LEU US", "name": "Centrus Energy", "query": "Centrus Energy stock"},
            {"ticker": "OKLO", "label": "OKLO US", "name": "Oklo", "query": "Oklo stock"},
            {"ticker": "SMR", "label": "SMR US", "name": "NuScale Power", "query": "NuScale Power stock"},
            {"ticker": "XE", "label": "XE US", "name": "Energy Fuels", "query": "Energy Fuels stock"},
        ],
    },
    {
        "key": "traditional_energy",
        "label": "전통에너지(원유, 천연가스)",
        "items": [
            {"ticker": "XOM", "label": "XOM US", "name": "Exxon Mobil", "query": "Exxon Mobil stock"},
            {"ticker": "CVX", "label": "CVX US", "name": "Chevron", "query": "Chevron stock"},
            {"ticker": "COP", "label": "COP US", "name": "ConocoPhillips", "query": "ConocoPhillips stock"},
            {"ticker": "SLB", "label": "SLB US", "name": "SLB", "query": "SLB stock"},
            {"ticker": "KMI", "label": "KMI US", "name": "Kinder Morgan", "query": "Kinder Morgan stock"},
            {"ticker": "EQT", "label": "EQT US", "name": "EQT", "query": "EQT stock"},
        ],
    },
    {
        "key": "materials",
        "label": "원자재",
        "items": [
            {"ticker": "BHP", "label": "BHP US", "name": "BHP", "query": "BHP stock"},
            {"ticker": "RIO", "label": "RIO US", "name": "Rio Tinto", "query": "Rio Tinto stock"},
            {"ticker": "FCX", "label": "FCX US", "name": "Freeport-McMoRan", "query": "Freeport-McMoRan stock"},
            {"ticker": "SCCO", "label": "SCCO US", "name": "Southern Copper", "query": "Southern Copper stock"},
            {"ticker": "B", "label": "B US", "name": "Barrick Mining", "query": "Barrick Mining stock"},
            {"ticker": "NEM", "label": "NEM US", "name": "Newmont", "query": "Newmont stock"},
            {"ticker": "AA", "label": "AA US", "name": "Alcoa", "query": "Alcoa stock"},
            {"ticker": "MP", "label": "MP US", "name": "MP Materials", "query": "MP Materials stock"},
            {"ticker": "USAR", "label": "USAR US", "name": "USA Rare Earth", "query": "USA Rare Earth stock"},
            {"ticker": "UEC", "label": "UEC US", "name": "Uranium Energy", "query": "Uranium Energy stock"},
        ],
    },
    {
        "key": "healthcare",
        "label": "헬스케어",
        "items": [
            {"ticker": "AMGN", "label": "AMGN US", "name": "Amgen", "query": "Amgen stock"},
            {"ticker": "LLY", "label": "LLY US", "name": "Eli Lilly", "query": "Eli Lilly stock"},
            {"ticker": "NVO", "label": "NVO US", "name": "Novo Nordisk", "query": "Novo Nordisk stock"},
            {"ticker": "JNJ", "label": "JNJ US", "name": "Johnson & Johnson", "query": "Johnson & Johnson stock"},
            {"ticker": "NVS", "label": "NVS US", "name": "Novartis", "query": "Novartis stock"},
            {"ticker": "ABBV", "label": "ABBV US", "name": "AbbVie", "query": "AbbVie stock"},
            {"ticker": "MRK", "label": "MRK US", "name": "Merck", "query": "Merck stock"},
            {"ticker": "UNH", "label": "UNH US", "name": "UnitedHealth", "query": "UnitedHealth stock"},
            {"ticker": "NTRA", "label": "NTRA US", "name": "Natera", "query": "Natera stock"},
            {"ticker": "ILMN", "label": "ILMN US", "name": "Illumina", "query": "Illumina stock"},
            {"ticker": "GH", "label": "GH US", "name": "Guardant Health", "query": "Guardant Health stock"},
            {"ticker": "TXG", "label": "TXG US", "name": "10x Genomics", "query": "10x Genomics stock"},
            {"ticker": "ISRG", "label": "ISRG US", "name": "Intuitive Surgical", "query": "Intuitive Surgical stock"},
            {"ticker": "CVS", "label": "CVS US", "name": "CVS Health", "query": "CVS Health stock"},
        ],
    },
    {
        "key": "financials",
        "label": "금융",
        "items": [
            {"ticker": "JPM", "label": "JPM US", "name": "JPMorgan", "query": "JPMorgan stock"},
            {"ticker": "GS", "label": "GS US", "name": "Goldman Sachs", "query": "Goldman Sachs stock"},
            {"ticker": "MS", "label": "MS US", "name": "Morgan Stanley", "query": "Morgan Stanley stock"},
            {"ticker": "C", "label": "C US", "name": "Citigroup", "query": "Citigroup stock"},
            {"ticker": "V", "label": "V US", "name": "Visa", "query": "Visa stock"},
            {"ticker": "MA", "label": "MA US", "name": "Mastercard", "query": "Mastercard stock"},
            {"ticker": "BAC", "label": "BAC US", "name": "Bank of America", "query": "Bank of America stock"},
            {"ticker": "WFC", "label": "WFC US", "name": "Wells Fargo", "query": "Wells Fargo stock"},
            {"ticker": "SCHW", "label": "SCHW US", "name": "Charles Schwab", "query": "Charles Schwab stock"},
            {"ticker": "BLK", "label": "BLK US", "name": "BlackRock", "query": "BlackRock stock"},
            {"ticker": "OWL", "label": "OWL US", "name": "Blue Owl Capital", "query": "Blue Owl stock"},
        ],
    },
    {
        "key": "autos",
        "label": "자동차",
        "items": [
            {"ticker": "GM", "label": "GM US", "name": "General Motors", "query": "General Motors stock"},
            {"ticker": "F", "label": "F US", "name": "Ford", "query": "Ford stock"},
        ],
    },
    {
        "key": "china_adr",
        "label": "중국 ADR",
        "items": [
            {"ticker": "BABA", "label": "BABA US", "name": "Alibaba", "query": "Alibaba ADR stock"},
            {"ticker": "BIDU", "label": "BIDU US", "name": "Baidu", "query": "Baidu ADR stock"},
        ],
    },
    {
        "key": "leisure",
        "label": "여행 & 레저",
        "items": [
            {"ticker": "ABNB", "label": "ABNB US", "name": "Airbnb", "query": "Airbnb stock"},
            {"ticker": "CCL", "label": "CCL US", "name": "Carnival", "query": "Carnival stock"},
            {"ticker": "RCL", "label": "RCL US", "name": "Royal Caribbean", "query": "Royal Caribbean stock"},
            {"ticker": "VIK", "label": "VIK US", "name": "Viking Holdings", "query": "Viking Holdings stock"},
            {"ticker": "LVS", "label": "LVS US", "name": "Las Vegas Sands", "query": "Las Vegas Sands stock"},
            {"ticker": "EXPE", "label": "EXPE US", "name": "Expedia", "query": "Expedia stock"},
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
        description = (item.findtext("description") or "").strip()
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
                "description": description,
                "publishedAt": published_iso,
            }
        )
    return items


def clean_text(value: str) -> str:
    text = unescape(value or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_sentences(text: str) -> list[str]:
    cleaned = clean_text(text)
    if not cleaned:
        return []
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    output: list[str] = []
    for part in parts:
        candidate = part.strip(" -")
        if len(candidate) < 40:
            continue
        output.append(candidate)
    return output


def extract_meta_description(html: str) -> str:
    patterns = [
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            return clean_text(match.group(1))
    return ""


def extract_paragraphs(html: str, limit: int = 10) -> list[str]:
    raw_paragraphs = re.findall(r"<p\b[^>]*>(.*?)</p>", html, flags=re.IGNORECASE | re.DOTALL)
    paragraphs: list[str] = []
    for raw in raw_paragraphs:
        text = clean_text(raw)
        if len(text) < 60:
            continue
        lowered = text.lower()
        if any(
            token in lowered
            for token in [
                "cookie",
                "privacy policy",
                "sign up",
                "all rights reserved",
                "advertisement",
                "newsletter",
                "subscribe",
            ]
        ):
            continue
        paragraphs.append(text)
        if len(paragraphs) >= limit:
            break
    return paragraphs


def translate_finance_phrase(text: str) -> str:
    phrase = clean_text(text)
    replacements = [
        (r"\bafter earnings\b", "실적 발표 이후"),
        (r"\bafter results\b", "실적 발표 이후"),
        (r"\bafter q1 results\b", "1분기 실적 발표 이후"),
        (r"\bafter q2 results\b", "2분기 실적 발표 이후"),
        (r"\bon weak revenue guidance\b", "약한 매출 가이던스"),
        (r"\brevenue beat\b", "매출 예상 상회"),
        (r"\bearnings beat\b", "실적 예상 상회"),
        (r"\bweak guidance\b", "약한 가이던스"),
        (r"\bincreased spending forecast\b", "지출 전망 상향"),
        (r"\brecord launch contract\b", "대형 발사 계약"),
        (r"\bhyperscaler orders\b", "하이퍼스케일러 주문"),
        (r"\bprice target\b", "목표주가"),
        (r"\bforecast\b", "전망"),
        (r"\bguidance\b", "가이던스"),
        (r"\bearnings\b", "실적"),
        (r"\brevenue\b", "매출"),
        (r"\borders\b", "주문"),
        (r"\bcontract\b", "계약"),
        (r"\bstock\b", "주가"),
        (r"\bshares\b", "주가"),
        (r"\bsoars\b", "급등"),
        (r"\bsurges\b", "급등"),
        (r"\bjumps\b", "급등"),
        (r"\bsinks\b", "급락"),
        (r"\bfalls\b", "하락"),
        (r"\bdrops\b", "하락"),
    ]
    lowered = phrase.lower()
    for pattern, replacement in replacements:
        lowered = re.sub(pattern, replacement, lowered, flags=re.IGNORECASE)
    lowered = re.sub(r"\s+", " ", lowered).strip(" .,-")
    return lowered


def extract_headline_reason(title: str, company_name: str) -> str:
    cleaned = clean_text(title)
    cleaned = re.sub(r"\s+-\s+[^-]+$", "", cleaned).strip()
    cleaned = re.sub(re.escape(company_name), "", cleaned, flags=re.IGNORECASE).strip(" ,.-:")
    lowered = cleaned.lower()
    for token in [" on ", " after ", " as ", " amid ", " following ", " over "]:
        if token in lowered:
            index = lowered.index(token)
            cleaned = cleaned[index + len(token) :].strip(" ,.-:")
            break
    translated = translate_finance_phrase(cleaned)
    return translated or clean_text(title)


def build_story_summary(stories: list[dict[str, str]], company_name: str, direction: str) -> list[str]:
    if not stories:
        return []
    primary_reason = extract_headline_reason(stories[0].get("title", ""), company_name)
    tone = "매수 심리" if direction == "up" else "매도 심리"
    lines = [f"{company_name} 주가는 {primary_reason} 재료가 직접 반영됐습니다."]

    if len(stories) >= 2:
        secondary_reason = extract_headline_reason(stories[1].get("title", ""), company_name)
        if secondary_reason and secondary_reason != primary_reason:
            lines.append(f"{secondary_reason} 이슈가 {tone}를 추가로 자극했습니다.")

    if len(lines) == 1:
        lines.append(f"관련 뉴스 흐름이 단기 {tone}를 강화한 것으로 해석됩니다.")
    return lines[:2]


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


def load_previous_market_meta() -> dict[str, dict[str, float | None]]:
    if not OUTPUT_PATH.exists():
        return {}
    try:
        text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
        text = re.sub(r"^window\.marketBriefingData\s*=\s*", "", text).rstrip(";")
        payload = json.loads(text)
    except Exception:
        return {}

    previous: dict[str, dict[str, float | None]] = {}
    for sector in payload.get("sectorPanels", []):
        for item in sector.get("items", []):
            ticker = str(item.get("ticker") or "")
            if not ticker or ticker in previous:
                continue
            previous[ticker] = {
                "price": normalize_number(item.get("price")),
                "marketCap": normalize_number(item.get("marketCap")),
                "marketCapUsd": normalize_number(item.get("marketCapUsd")),
            }
    return previous


def fetch_price_frame(symbols: list[str]) -> pd.DataFrame:
    history = yf.download(
        tickers=symbols,
        period=PRICE_PERIOD,
        auto_adjust=True,
        progress=False,
        threads=False,
        group_by="ticker",
        timeout=20,
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
        close = pd.Series(close, dtype=float).sort_index().dropna()
        close = close[~close.index.duplicated(keep="last")]
        if len(close) >= 2:
            close_map[symbol] = close.rename(symbol)
    fill_latest_chart_close_gaps(close_map)
    return pd.concat(close_map.values(), axis=1).sort_index() if close_map else pd.DataFrame()


def fetch_ohlc_frames(symbols: list[str]) -> dict[str, pd.DataFrame]:
    history = yf.download(
        tickers=symbols,
        period=PRICE_PERIOD,
        auto_adjust=True,
        progress=False,
        threads=False,
        group_by="ticker",
        timeout=20,
    )
    if history.empty:
        return {}

    frames: dict[str, pd.DataFrame] = {}
    multi = isinstance(history.columns, pd.MultiIndex)
    for symbol in symbols:
        try:
            frame = history[symbol] if multi else history
        except KeyError:
            continue
        if not {"High", "Low", "Close"}.issubset(set(frame.columns)):
            continue
        output = frame[["High", "Low", "Close"]].copy()
        output.columns = ["high", "low", "close"]
        output = output.dropna(subset=["close"]).sort_index()
        output = output[~output.index.duplicated(keep="last")]
        if len(output) >= 2:
            frames[symbol] = output.dropna(subset=["high", "low", "close"])
    for symbol, output in list(frames.items()):
        finalized_ohlc = fetch_chart_finalized_ohlc(symbol)
        if finalized_ohlc is None:
            continue
        finalized_date, finalized_high, finalized_low, finalized_close = finalized_ohlc
        if not output.empty and is_same_price_date(output.index.max(), finalized_date):
            continue
        output.loc[finalized_date, ["high", "low", "close"]] = [
            finalized_high,
            finalized_low,
            finalized_close,
        ]
        frames[symbol] = output.sort_index().dropna(subset=["high", "low", "close"])
    return frames


def fetch_chart_latest_close(symbol: str, target_date: pd.Timestamp) -> float | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote_plus(symbol)}"
    try:
        response = requests.get(
            url,
            params={"range": "5d", "interval": "1d", "includePrePost": "false", "events": "history"},
            headers=USER_AGENT,
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        result = (payload.get("chart", {}).get("result") or [None])[0]
        if not result:
            return None
        timestamps = result.get("timestamp") or []
        indicators = result.get("indicators") or {}
        quote = (indicators.get("quote") or [{}])[0]
        closes = quote.get("close") or []
        adjusted_closes = (indicators.get("adjclose") or [{}])[0].get("adjclose") or []
        meta = result.get("meta") or {}
    except Exception:
        return None

    target_day = pd.Timestamp(target_date).date()
    for index, raw_timestamp in enumerate(timestamps):
        timestamp = pd.Timestamp(datetime.fromtimestamp(raw_timestamp, timezone.utc)).date()
        if timestamp != target_day:
            continue
        value = adjusted_closes[index] if index < len(adjusted_closes) else None
        if value is None and index < len(closes):
            value = closes[index]
        if value is None and index == len(timestamps) - 1:
            value = meta.get("regularMarketPrice")
        return normalize_number(value)
    return None


def fetch_chart_finalized_ohlc(symbol: str) -> tuple[pd.Timestamp, float, float, float] | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote_plus(symbol)}"
    try:
        response = requests.get(
            url,
            params={"range": "5d", "interval": "1d", "includePrePost": "false", "events": "history"},
            headers=USER_AGENT,
            timeout=10,
        )
        response.raise_for_status()
        result = (response.json().get("chart", {}).get("result") or [None])[0]
        meta = (result or {}).get("meta") or {}
        timestamps = (result or {}).get("timestamp") or []
        quote = (((result or {}).get("indicators") or {}).get("quote") or [{}])[0]
        market_time = normalize_number(meta.get("regularMarketTime"))
        market_price = normalize_number(meta.get("regularMarketPrice"))
        if market_time is None or market_price is None or market_price <= 0:
            return None
        timezone_name = str(meta.get("exchangeTimezoneName") or "America/New_York")
        local_market_time = pd.to_datetime(int(market_time), unit="s", utc=True).tz_convert(timezone_name)
    except Exception:
        return None
    if (local_market_time.hour, local_market_time.minute) < (15, 59):
        return None
    market_date = local_market_time.tz_localize(None).normalize()
    target_day = market_date.date()
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    for index, raw_timestamp in enumerate(timestamps):
        timestamp = pd.Timestamp(datetime.fromtimestamp(raw_timestamp, timezone.utc)).date()
        if timestamp != target_day:
            continue
        high = normalize_number(highs[index] if index < len(highs) else None)
        low = normalize_number(lows[index] if index < len(lows) else None)
        if high is not None and low is not None:
            return market_date, high, low, market_price
    return None


def fetch_chart_finalized_close(symbol: str) -> tuple[pd.Timestamp, float] | None:
    finalized_ohlc = fetch_chart_finalized_ohlc(symbol)
    if finalized_ohlc is None:
        return None
    market_date, _, _, market_price = finalized_ohlc
    return market_date, market_price


def fill_latest_chart_close_gaps(close_map: dict[str, pd.Series]) -> None:
    benchmark = close_map.get(ROTATION_BENCHMARK_SYMBOL)
    if benchmark is None or benchmark.empty:
        return

    finalized_benchmark = fetch_chart_finalized_close(ROTATION_BENCHMARK_SYMBOL)
    if finalized_benchmark is not None:
        finalized_date, finalized_close = finalized_benchmark
        if not is_same_price_date(benchmark.index.max(), finalized_date):
            benchmark = pd.concat(
                [benchmark, pd.Series([finalized_close], index=[finalized_date], name=ROTATION_BENCHMARK_SYMBOL)]
            ).sort_index().dropna()
            benchmark = benchmark[~benchmark.index.duplicated(keep="last")]
            close_map[ROTATION_BENCHMARK_SYMBOL] = benchmark.rename(ROTATION_BENCHMARK_SYMBOL)

    target_date = benchmark.index.max()
    for symbol, series in list(close_map.items()):
        if series.empty or is_same_price_date(series.index.max(), target_date):
            continue
        latest_close = fetch_chart_latest_close(symbol, target_date)
        if latest_close is None:
            continue
        filled = pd.concat([series, pd.Series([latest_close], index=[target_date], name=symbol)]).sort_index().dropna()
        filled = filled[~filled.index.duplicated(keep="last")]
        close_map[symbol] = filled.rename(symbol)


def compute_recent_day_change(series: pd.Series, max_abs_return: float = MAX_DAILY_RETURN_PCT) -> tuple[float | None, float | None, float | None]:
    if len(series) < 2:
        return None, None, None

    current = normalize_number(series.iloc[-1])
    if current is None:
        return None, None, None

    previous_candidates = list(series.iloc[:-1].tail(10).iloc[::-1])
    for previous_raw in previous_candidates:
        previous = normalize_number(previous_raw)
        if previous is None or previous == 0:
            continue
        pct = (current / previous - 1) * 100
        if abs(pct) <= max_abs_return:
            return round(pct, 2), current, previous
    return None, current, normalize_number(series.iloc[-2])


def fetch_meta(symbol: str) -> dict[str, float | None]:
    market_cap = None
    shares = None
    try:
        ticker = yf.Ticker(symbol)
        fast_info = getattr(ticker, "fast_info", {}) or {}
        market_cap = normalize_number(fast_info.get("market_cap") or fast_info.get("marketCap"))
        shares = normalize_number(fast_info.get("shares"))
        if market_cap is None or shares is None:
            info = ticker.get_info()
            market_cap = market_cap or normalize_number(info.get("marketCap") or info.get("totalAssets"))
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


def compute_period_return(series: pd.Series, periods: int) -> float | None:
    if len(series) <= periods:
        return None
    current = normalize_number(series.iloc[-1])
    base = normalize_number(series.iloc[-(periods + 1)])
    if current is None or base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def compute_period_return_at(series: pd.Series, end_date: pd.Timestamp, periods: int) -> float | None:
    history = series.loc[:end_date].dropna()
    if history.empty or not is_same_price_date(history.index[-1], end_date):
        return None
    if len(history) <= periods:
        return None
    current = normalize_number(history.iloc[-1])
    base = normalize_number(history.iloc[-(periods + 1)])
    if current is None or base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def compute_ytd_return(series: pd.Series) -> float | None:
    history = series.dropna()
    if history.empty:
        return None
    current = normalize_number(history.iloc[-1])
    if current is None:
        return None
    current_year = int(history.index[-1].year)
    ytd_series = history[history.index.year == current_year]
    if ytd_series.empty:
        return None
    prior_year_series = history[history.index.year < current_year]
    # Conventional YTD return measures from the final valid close of the prior calendar year.
    base = normalize_number(prior_year_series.iloc[-1] if not prior_year_series.empty else ytd_series.iloc[0])
    if base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def is_same_price_date(left: pd.Timestamp | None, right: pd.Timestamp | None) -> bool:
    if left is None or right is None:
        return False
    return pd.Timestamp(left).date() == pd.Timestamp(right).date()


def latest_completed_market_timestamp(series: pd.Series) -> pd.Timestamp | None:
    if series.empty:
        return None
    latest = pd.Timestamp(series.index.max())
    now_new_york = datetime.now(ZoneInfo("America/New_York"))
    if (
        now_new_york.weekday() < 5
        and now_new_york.time() < datetime_time(16, 10)
        and latest.date() == now_new_york.date()
    ):
        completed = series[pd.Index(series.index).date < now_new_york.date()]
        return pd.Timestamp(completed.index.max()) if not completed.empty else None
    return latest


def load_existing_updated_at() -> str | None:
    if not OUTPUT_PATH.exists():
        return None
    try:
        text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
        text = re.sub(r"^window\.marketBriefingData\s*=\s*", "", text).rstrip(";")
        value = json.loads(text).get("updatedAt")
        return str(value) if value else None
    except Exception:
        return None


def build_company_snapshots() -> tuple[list[dict[str, object]], dict[str, dict[str, object]], str, dict[str, object], pd.DataFrame]:
    companies = [item | {"sectorKey": sector["key"], "sectorLabel": sector["label"]} for sector in SECTOR_GROUPS for item in sector["items"]]
    symbols = sorted({company["ticker"] for company in companies} | set(BENCHMARK_SYMBOLS) | {USD_PER_KRW_SYMBOL})
    close_frame = fetch_price_frame(symbols)
    benchmark_series = (
        close_frame[ROTATION_BENCHMARK_SYMBOL].dropna()
        if ROTATION_BENCHMARK_SYMBOL in close_frame.columns
        else pd.Series(dtype=float)
    )
    reference_series = benchmark_series if not benchmark_series.empty else close_frame.max(axis=1).dropna()
    latest_timestamp = latest_completed_market_timestamp(reference_series)
    if latest_timestamp is None:
        raise RuntimeError("No completed market session found for Daily Briefing.")
    latest_date = latest_timestamp.strftime("%Y-%m-%d")
    rotation_benchmark = build_rotation_benchmark(close_frame)

    fx_usd_per_krw = None
    if USD_PER_KRW_SYMBOL in close_frame.columns:
        fx_values = close_frame[USD_PER_KRW_SYMBOL].loc[:latest_timestamp].dropna()
        if not fx_values.empty:
            fx_usd_per_krw = float(fx_values.iloc[-1])

    previous_meta_by_symbol = load_previous_market_meta()

    by_ticker: dict[str, dict[str, object]] = {}
    snapshots: list[dict[str, object]] = []
    for company in companies:
        symbol = company["ticker"]
        series = close_frame[symbol].loc[:latest_timestamp].dropna() if symbol in close_frame.columns else pd.Series(dtype=float)
        price = previous_close = day_change_pct = None
        price_date = series.index.max() if not series.empty else None
        is_current_price = is_same_price_date(price_date, latest_timestamp)
        range_returns = {key: None for key in MAP_RANGE_LABELS}
        if len(series) >= 2:
            computed_day_change_pct, price, previous_close = compute_recent_day_change(series)
            day_change_pct = computed_day_change_pct if is_current_price else None
        if not series.empty and is_current_price:
            range_returns.update({key: compute_period_return(series, periods) for key, periods in MAP_RANGE_PERIODS.items()})
            range_returns["1d"] = day_change_pct
            range_returns["ytd"] = compute_ytd_return(series)
        previous_meta = previous_meta_by_symbol.get(symbol, {})
        previous_price = normalize_number(previous_meta.get("price"))
        market_cap = normalize_number(previous_meta.get("marketCap"))
        market_cap_usd = normalize_number(previous_meta.get("marketCapUsd"))
        if market_cap is None:
            meta = fetch_meta(symbol)
            market_cap = normalize_number(meta.get("marketCap"))
            if market_cap_usd is None and not symbol.endswith(".KS"):
                market_cap_usd = market_cap
        if price is not None and previous_price and previous_price > 0:
            price_ratio = price / previous_price
            if 0.5 <= price_ratio <= 2.0 and market_cap is not None:
                market_cap *= price_ratio
            if 0.5 <= price_ratio <= 2.0 and market_cap_usd is not None:
                market_cap_usd *= price_ratio
        if symbol.endswith(".KS") and market_cap and fx_usd_per_krw:
            market_cap_usd = market_cap / fx_usd_per_krw
        snapshot = {
            **company,
            "currency": "KRW" if symbol.endswith(".KS") else "USD",
            "price": round(price, 2) if price is not None else None,
            "previousClose": round(previous_close, 2) if previous_close is not None else None,
            "priceDate": price_date.strftime("%Y-%m-%d") if price_date is not None else None,
            "isStalePrice": not is_current_price,
            "dayChangePct": day_change_pct,
            "marketCap": round(market_cap) if market_cap is not None else None,
            "marketCapUsd": round(market_cap_usd) if market_cap_usd is not None else None,
            "mapColor": color_for_change(day_change_pct),
            "overviewReturns": range_returns,
            "overviewColors": {key: color_for_change(value) for key, value in range_returns.items()},
        }
        snapshots.append(snapshot)
        by_ticker[symbol] = snapshot
    return snapshots, by_ticker, latest_date, rotation_benchmark, close_frame


def build_sector_panels(snapshots: list[dict[str, object]]) -> list[dict[str, object]]:
    panels = []
    for sector in SECTOR_GROUPS:
        items = [item for item in snapshots if item["sectorKey"] == sector["key"]]
        items.sort(key=lambda item: (item.get("marketCapUsd") or 0), reverse=True)
        for index, item in enumerate(items):
            item["tileClass"] = tile_class_for_rank(index)
        panel = {"key": sector["key"], "label": sector["label"], "items": items}
        if sector.get("scoreTickers"):
            panel["scoreTickers"] = list(sector["scoreTickers"])
        panels.append(panel)
    return panels


def get_sector_scoring_items(sector: dict[str, object]) -> list[dict[str, object]]:
    items = list(sector.get("items", []))
    score_tickers = {str(ticker) for ticker in sector.get("scoreTickers", [])}
    if not score_tickers:
        return items
    return [item for item in items if str(item.get("ticker")) in score_tickers]


def safe_float(value: object) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numeric):
        return None
    return numeric


def build_rotation_benchmark(close_frame: pd.DataFrame) -> dict[str, object]:
    series = (
        close_frame[ROTATION_BENCHMARK_SYMBOL].dropna()
        if ROTATION_BENCHMARK_SYMBOL in close_frame.columns
        else pd.Series(dtype=float)
    )
    returns = {key: None for key in MAP_RANGE_LABELS}
    price = previous_close = day_change_pct = None
    if len(series) >= 2:
        day_change_pct, price, previous_close = compute_recent_day_change(series)
    if not series.empty:
        returns.update({key: compute_period_return(series, periods) for key, periods in MAP_RANGE_PERIODS.items()})
        returns["1d"] = day_change_pct
        returns["ytd"] = compute_ytd_return(series)
    return {
        "ticker": ROTATION_BENCHMARK_SYMBOL,
        "label": "NASDAQ 100 (QQQ)",
        "updatedAt": series.index.max().strftime("%Y-%m-%d") if not series.empty else None,
        "price": round(price, 2) if price is not None else None,
        "returns": returns,
    }


def compute_atr_percent_from_ohlc(frame: pd.DataFrame, period: int = 21) -> float | None:
    if frame.empty or len(frame) < period:
        return None
    high = pd.Series(frame["high"], dtype=float)
    low = pd.Series(frame["low"], dtype=float)
    close = pd.Series(frame["close"], dtype=float)
    previous_close = close.shift(1).fillna(close)
    true_range = pd.concat(
        [
            high - low,
            (high - previous_close).abs(),
            (low - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    true_range_pct = (true_range / previous_close.where(previous_close > 0)) * 100
    atr_pct = true_range_pct.rolling(period).mean().iloc[-1]
    if not math.isfinite(float(atr_pct)):
        return None
    return round(float(atr_pct), 2)


def build_index_cards() -> list[dict[str, object]]:
    symbols = [str(item["symbol"]) for item in INDEX_CARD_CONFIGS]
    frames = fetch_ohlc_frames(symbols)
    cards: list[dict[str, object]] = []
    for config in INDEX_CARD_CONFIGS:
        symbol = str(config["symbol"])
        frame = frames.get(symbol, pd.DataFrame())
        close = pd.Series(frame.get("close", pd.Series(dtype=float)), dtype=float).dropna()
        returns = {key: None for key in MAP_RANGE_LABELS}
        price = previous_close = day_change_pct = None
        if len(close) >= 2:
            day_change_pct, price, previous_close = compute_recent_day_change(close)
        if not close.empty:
            returns.update({key: compute_period_return(close, periods) for key, periods in MAP_RANGE_PERIODS.items()})
            returns["1d"] = day_change_pct
            returns["ytd"] = compute_ytd_return(close)
        cards.append(
            {
                "key": config["key"],
                "label": config["label"],
                "symbol": symbol,
                "updatedAt": close.index.max().strftime("%Y-%m-%d") if not close.empty else None,
                "price": round(price, 2) if price is not None else None,
                "previousClose": round(previous_close, 2) if previous_close is not None else None,
                "returns": returns,
                "atr21Pct": compute_atr_percent_from_ohlc(frame, 21),
            }
        )
    return cards


def compute_rotation_score(excess: dict[str, float | None]) -> float | None:
    total = 0.0
    used_weight = 0.0
    for key, weight in ROTATION_WEIGHTS.items():
        value = safe_float(excess.get(key))
        if value is None:
            continue
        total += value * weight
        used_weight += weight
    if used_weight == 0:
        return None
    return round(total / used_weight, 2)


def classify_rotation(excess: dict[str, float | None]) -> str:
    one_week = safe_float(excess.get("1w"))
    two_week = safe_float(excess.get("2w"))
    one_month = safe_float(excess.get("1m"))
    if (
        one_week is not None
        and one_week > 0
        and two_week is not None
        and two_week > 0
        and one_month is not None
        and one_month > 0
    ):
        return "Leading"
    if one_week is not None and one_week > 0:
        return "Improving"
    if one_month is not None and one_month > 0:
        return "Weakening"
    if two_week is not None and two_week > 0:
        return "Weakening"
    return "Lagging"


def item_excess_returns(item: dict[str, object], benchmark_returns: dict[str, object]) -> dict[str, float | None]:
    output: dict[str, float | None] = {}
    item_returns = item.get("overviewReturns") or {}
    for key in ROTATION_WEIGHTS:
        item_return = safe_float(item_returns.get(key) if isinstance(item_returns, dict) else None)
        benchmark_return = safe_float(benchmark_returns.get(key))
        output[key] = round(item_return - benchmark_return, 2) if item_return is not None and benchmark_return is not None else None
    return output


def compute_series_rotation_returns(
    close_frame: pd.DataFrame,
    symbol: str,
    end_date: pd.Timestamp,
) -> dict[str, float | None]:
    if symbol not in close_frame.columns:
        return {key: None for key in ROTATION_WEIGHTS}
    series = close_frame[symbol].dropna()
    output: dict[str, float | None] = {}
    for key in ROTATION_WEIGHTS:
        periods = MAP_RANGE_PERIODS.get(key)
        if periods is None:
            output[key] = None
            continue
        output[key] = compute_period_return_at(series, end_date, periods)
    return output


def build_sector_excess_returns(
    items: list[dict[str, object]],
    item_excess_by_ticker: dict[str, dict[str, float | None]],
) -> dict[str, float | None]:
    excess_by_range: dict[str, float | None] = {}
    for key in ROTATION_WEIGHTS:
        numerator = 0.0
        denominator = 0.0
        equal_weight_values = []
        for item in items:
            value = safe_float(item_excess_by_ticker.get(str(item.get("ticker")), {}).get(key))
            if value is None:
                continue
            weight = safe_float(item.get("marketCapUsd")) or 0.0
            if weight > 0:
                numerator += value * weight
                denominator += weight
            equal_weight_values.append(value)
        if denominator > 0:
            cap_weighted = numerator / denominator
            equal_weighted = sum(equal_weight_values) / len(equal_weight_values) if equal_weight_values else cap_weighted
            excess_by_range[key] = round((cap_weighted * 0.5) + (equal_weighted * 0.5), 2)
        elif equal_weight_values:
            excess_by_range[key] = round(sum(equal_weight_values) / len(equal_weight_values), 2)
        else:
            excess_by_range[key] = None
    return excess_by_range


def build_sector_returns(items: list[dict[str, object]]) -> dict[str, float | None]:
    returns_by_range: dict[str, float | None] = {}
    for key in MAP_RANGE_LABELS:
        numerator = 0.0
        denominator = 0.0
        equal_weight_values = []
        for item in items:
            item_returns = item.get("returns")
            value = safe_float(item_returns.get(key) if isinstance(item_returns, dict) else None)
            if value is None:
                continue
            weight = safe_float(item.get("marketCapUsd")) or 0.0
            if weight > 0:
                numerator += value * weight
                denominator += weight
            equal_weight_values.append(value)
        if denominator > 0:
            cap_weighted = numerator / denominator
            equal_weighted = sum(equal_weight_values) / len(equal_weight_values) if equal_weight_values else cap_weighted
            returns_by_range[key] = round((cap_weighted * 0.5) + (equal_weighted * 0.5), 2)
        elif equal_weight_values:
            returns_by_range[key] = round(sum(equal_weight_values) / len(equal_weight_values), 2)
        else:
            returns_by_range[key] = None
    return returns_by_range


def build_rotation_history(
    close_frame: pd.DataFrame,
    sector_panels: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    if ROTATION_BENCHMARK_SYMBOL not in close_frame.columns:
        return {}
    benchmark_dates = close_frame[ROTATION_BENCHMARK_SYMBOL].dropna().index
    if len(benchmark_dates) <= max(MAP_RANGE_PERIODS[key] for key in ROTATION_WEIGHTS):
        return {}
    history_dates = benchmark_dates[-ROTATION_HISTORY_POINTS:]
    history: dict[str, list[dict[str, object]]] = {str(sector["key"]): [] for sector in sector_panels}
    for end_date in history_dates:
        benchmark_returns = compute_series_rotation_returns(close_frame, ROTATION_BENCHMARK_SYMBOL, end_date)
        item_returns_by_ticker: dict[str, dict[str, float | None]] = {}
        item_excess_by_ticker: dict[str, dict[str, float | None]] = {}
        for sector in sector_panels:
            for item in get_sector_scoring_items(sector):
                ticker = str(item.get("ticker"))
                if ticker in item_returns_by_ticker:
                    continue
                item_returns = compute_series_rotation_returns(close_frame, ticker, end_date)
                item_returns_by_ticker[ticker] = item_returns
                item_excess_by_ticker[ticker] = {
                    key: round(item_return - benchmark_return, 2)
                    if item_return is not None and benchmark_return is not None
                    else None
                    for key, item_return in item_returns.items()
                    for benchmark_return in [safe_float(benchmark_returns.get(key))]
                }
        for sector in sector_panels:
            sector_key = str(sector["key"])
            items = get_sector_scoring_items(sector)
            history_items = [
                {
                    **item,
                    "returns": item_returns_by_ticker.get(str(item.get("ticker")), {}),
                }
                for item in items
            ]
            excess_by_range = build_sector_excess_returns(items, item_excess_by_ticker)
            returns_by_range = build_sector_returns(history_items)
            score = compute_rotation_score(excess_by_range)
            classification = classify_rotation(excess_by_range)
            history[sector_key].append(
                {
                    "date": end_date.strftime("%Y-%m-%d"),
                    "score": score,
                    "classification": classification,
                    "returns": returns_by_range,
                    "excessReturns": excess_by_range,
                }
            )
    return history


def build_rotation_signal(
    snapshots: list[dict[str, object]],
    sector_panels: list[dict[str, object]],
    benchmark: dict[str, object],
    close_frame: pd.DataFrame,
) -> dict[str, object]:
    benchmark_returns = benchmark.get("returns") if isinstance(benchmark.get("returns"), dict) else {}
    enriched_items = []
    for item in snapshots:
        excess = item_excess_returns(item, benchmark_returns)
        snapshot_returns = item.get("overviewReturns") or {}
        if not isinstance(snapshot_returns, dict):
            snapshot_returns = {}
        score = compute_rotation_score(excess)
        enriched_items.append(
            {
                **item,
                "returns": snapshot_returns,
                "excessReturns": excess,
                "rotationScore": score,
            }
        )

    enriched_by_ticker = {item["ticker"]: item for item in enriched_items}
    sectors = []
    for sector in sector_panels:
        score_source_items = get_sector_scoring_items(sector)
        items = [enriched_by_ticker[item["ticker"]] for item in score_source_items if item["ticker"] in enriched_by_ticker]
        item_excess_by_ticker = {str(item["ticker"]): item.get("excessReturns", {}) for item in items}
        excess_by_range = build_sector_excess_returns(items, item_excess_by_ticker)
        returns_by_range = build_sector_returns(items)
        score = compute_rotation_score(excess_by_range)
        classification = classify_rotation(excess_by_range)
        ranked_items = sorted(
            [item for item in items if item.get("rotationScore") is not None],
            key=lambda item: float(item["rotationScore"]),
            reverse=True,
        )
        top_items = ranked_items[:3]
        top_tickers = {str(item.get("ticker")) for item in top_items}
        bottom_items = [item for item in reversed(ranked_items) if str(item.get("ticker")) not in top_tickers][:3]
        sectors.append(
            {
                "key": sector["key"],
                "label": sector["label"],
                "score": score,
                "classification": classification,
                "returns": returns_by_range,
                "excessReturns": excess_by_range,
                "top": [
                    {
                        "ticker": item["ticker"],
                        "label": item["label"],
                        "name": item["name"],
                        "score": item["rotationScore"],
                        "excessReturns": item["excessReturns"],
                        "returns": item["returns"],
                    }
                    for item in top_items
                ],
                "bottom": [
                    {
                        "ticker": item["ticker"],
                        "label": item["label"],
                        "name": item["name"],
                        "score": item["rotationScore"],
                        "excessReturns": item["excessReturns"],
                        "returns": item["returns"],
                    }
                    for item in bottom_items
                ],
            }
        )

    sectors.sort(key=lambda sector: safe_float(sector.get("score")) if safe_float(sector.get("score")) is not None else -999, reverse=True)
    daily_leaders = sorted(
        [
            sector
            for sector in sectors
            if safe_float((sector.get("excessReturns") or {}).get("1d")) is not None
        ],
        key=lambda sector: float((sector.get("excessReturns") or {}).get("1d")),
        reverse=True,
    )[:8]
    daily_laggards = sorted(
        [
            sector
            for sector in sectors
            if safe_float((sector.get("excessReturns") or {}).get("1d")) is not None
        ],
        key=lambda sector: float((sector.get("excessReturns") or {}).get("1d")),
    )[:8]

    def candidate_view(item: dict[str, object]) -> dict[str, object]:
        return {
            "ticker": item["ticker"],
            "label": item["label"],
            "name": item["name"],
            "sectorLabel": item["sectorLabel"],
            "score": item["rotationScore"],
            "excessReturns": item["excessReturns"],
            "returns": item["returns"],
            "marketCapUsd": item.get("marketCapUsd"),
        }

    def unique_candidates(
        items: list[dict[str, object]],
        *,
        reverse: bool,
        limit: int = 8,
    ) -> list[dict[str, object]]:
        selected: dict[str, dict[str, object]] = {}
        for item in items:
            ticker = str(item.get("ticker") or "")
            score = safe_float(item.get("rotationScore"))
            if not ticker or score is None:
                continue
            current = selected.get(ticker)
            current_score = safe_float(current.get("rotationScore")) if current else None
            if current is None or current_score is None:
                selected[ticker] = item
                continue
            if reverse and score > current_score:
                selected[ticker] = item
            elif not reverse and score < current_score:
                selected[ticker] = item

        return sorted(
            selected.values(),
            key=lambda item: float(item["rotationScore"]),
            reverse=reverse,
        )[:limit]

    leading_sector_keys = {sector["key"] for sector in sectors if sector["classification"] in {"Leading", "Improving"}}
    weak_sector_keys = {sector["key"] for sector in sectors if sector["classification"] in {"Weakening", "Lagging"}}
    buy_watch = unique_candidates(
        [
            item
            for item in enriched_items
            if item.get("sectorKey") in leading_sector_keys
            and safe_float(item.get("rotationScore")) is not None
            and all((safe_float(item["excessReturns"].get(key)) or -999) > 0 for key in ("1d", "1w", "1m"))
        ],
        reverse=True,
    )
    early_rotation = unique_candidates(
        [
            item
            for item in enriched_items
            if safe_float(item.get("rotationScore")) is not None
            and (safe_float(item["excessReturns"].get("1d")) or -999) > 0
            and (safe_float(item["excessReturns"].get("1w")) or -999) > 0
            and (safe_float(item["excessReturns"].get("1m")) or 999) <= 0
        ],
        reverse=True,
    )
    trim_watch = unique_candidates(
        [
            item
            for item in enriched_items
            if item.get("sectorKey") in weak_sector_keys
            and safe_float(item.get("rotationScore")) is not None
            and (safe_float(item["excessReturns"].get("1d")) or 999) < 0
            and (safe_float(item["excessReturns"].get("1w")) or 999) < 0
        ],
        reverse=False,
    )

    score_tickers_by_sector = {
        str(sector.get("key") or ""): {str(item.get("ticker")) for item in get_sector_scoring_items(sector)}
        for sector in sector_panels
    }

    def sector_items_by_1d(sector: dict[str, object], *, reverse: bool) -> list[dict[str, object]]:
        sector_key = str(sector.get("key") or "")
        score_tickers = score_tickers_by_sector.get(sector_key, set())
        items = [
            item
            for item in enriched_items
            if str(item.get("sectorKey") or "") == sector_key
            and (not score_tickers or str(item.get("ticker")) in score_tickers)
            and safe_float((item.get("excessReturns") or {}).get("1d")) is not None
        ]
        return sorted(
            items,
            key=lambda item: float((item.get("excessReturns") or {}).get("1d")),
            reverse=reverse,
        )[:2]

    return {
        "benchmark": benchmark,
        "weights": [{"key": key, "label": MAP_RANGE_LABELS[key], "weight": weight} for key, weight in ROTATION_WEIGHTS.items()],
        "sectors": sectors,
        "dailyLeaders": [
            {
                "key": sector["key"],
                "label": sector["label"],
                "classification": sector["classification"],
                "score": sector["score"],
                "excessReturn1d": (sector.get("excessReturns") or {}).get("1d"),
                "return1d": (sector.get("returns") or (sector.get("excessReturns") or {})).get("1d"),
                "top": sector_items_by_1d(sector, reverse=True),
            }
            for sector in daily_leaders
        ],
        "dailyLaggards": [
            {
                "key": sector["key"],
                "label": sector["label"],
                "classification": sector["classification"],
                "score": sector["score"],
                "excessReturn1d": (sector.get("excessReturns") or {}).get("1d"),
                "return1d": (sector.get("returns") or (sector.get("excessReturns") or {})).get("1d"),
                "bottom": sector_items_by_1d(sector, reverse=False),
            }
            for sector in daily_laggards
        ],
        "history": build_rotation_history(close_frame, sector_panels),
        "candidates": {
            "buyWatch": [candidate_view(item) for item in buy_watch],
            "earlyRotation": [candidate_view(item) for item in early_rotation],
            "trimWatch": [candidate_view(item) for item in trim_watch],
        },
    }


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
        stories: list[dict[str, str]] = []
        try:
            stories = parse_google_news_feed(f'{item["query"]} when:7d', limit=3)
            if stories:
                catalyst = stories[0]
        except Exception:
            pass
        summary_lines = build_story_summary(stories, str(item["name"]), "up" if float(item["dayChangePct"]) >= 0 else "down")
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
                "summaryLines": summary_lines,
                "source": catalyst["source"],
                "publishedAt": catalyst["publishedAt"],
                "link": catalyst["link"],
            }
        )
        time.sleep(0.05)
    return output


def normalize_fedwatch_range_label(label: str) -> str:
    match = re.match(r"^\s*(\d+(?:\.\d+)?)%-\s*(\d+(?:\.\d+)?)%\s*$", str(label))
    if not match:
        return str(label)
    lower = int(round(float(match.group(1)) * 100))
    upper = int(round(float(match.group(2)) * 100))
    return f"{lower}-{upper}"


def fedwatch_column_sort_key(label: str) -> tuple[int, str]:
    match = re.match(r"^(\d+)-(\d+)$", str(label))
    if not match:
        return (10_000, str(label))
    return (int(match.group(1)), str(label))


def strip_html_tags(value: str) -> str:
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    return unescape(value).replace("\xa0", " ").strip()


def parse_percent_cell(value: object) -> float:
    text = strip_html_tags(str(value)).replace("%", "").replace(",", "").strip()
    if not text or text in {"-", "--", "–", "—", "−"}:
        return 0.0
    return round(float(text), 1)


def normalize_fedwatch_date(value: object) -> str:
    text = strip_html_tags(str(value)).strip()
    match = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", text)
    if not match:
        raise ValueError(f"unrecognized FedWatch meeting date: {text!r}")
    year, month, day = (int(part) for part in match.groups())
    return f"{year:04d}-{month:02d}-{day:02d}"


def extract_html_table_cells(row_html: str) -> list[str]:
    return [
        strip_html_tags(match.group(2))
        for match in re.finditer(r"<(t[dh])\b[^>]*>(.*?)</\1>", row_html, flags=re.IGNORECASE | re.DOTALL)
    ]


def find_fedwatch_table(html: str) -> list[list[str]]:
    for table_match in re.finditer(r"<table\b[^>]*>.*?</table>", html, flags=re.IGNORECASE | re.DOTALL):
        table_html = table_match.group(0)
        if "300-325" not in table_html or "FOMC" not in table_html:
            continue
        rows = []
        for row_match in re.finditer(r"<tr\b[^>]*>.*?</tr>", table_html, flags=re.IGNORECASE | re.DOTALL):
            cells = extract_html_table_cells(row_match.group(0))
            if cells:
                rows.append(cells)
        if len(rows) >= 2:
            return rows
    raise RuntimeError("FedWatch probability table was not found in OANDA mirror HTML")


def extract_oanda_modified_time(html: str) -> str | None:
    match = re.search(
        r'<meta\s+property=["\']article:modified_time["\']\s+content=["\']([^"\']+)["\']',
        html,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    raw_value = match.group(1).strip()
    try:
        return datetime.fromisoformat(raw_value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
    except ValueError:
        return raw_value


def build_static_fedwatch_snapshot(reason: str = "") -> dict[str, object]:
    rows = []
    for row in FEDWATCH_SNAPSHOT["rows"]:
        probabilities = [round(float(value), 1) for value in row["probabilities"]]
        max_probability = max(probabilities) if probabilities else None
        max_index = probabilities.index(max_probability) if max_probability is not None else None
        rows.append(
            {
                "meetingDate": row["meetingDate"],
                "probabilities": probabilities,
                "maxProbability": max_probability,
                "maxRange": FEDWATCH_SNAPSHOT["columns"][max_index] if max_index is not None else None,
            }
        )
    return {
        "source": FEDWATCH_SNAPSHOT["source"],
        "sourceUrl": FEDWATCH_SNAPSHOT["sourceUrl"],
        "asOf": FEDWATCH_SNAPSHOT["asOf"],
        "title": FEDWATCH_SNAPSHOT["title"],
        "columns": FEDWATCH_SNAPSHOT["columns"],
        "rows": rows,
        "isFallback": True,
        "fallbackReason": reason,
    }


def build_mirror_fedwatch_snapshot() -> dict[str, object]:
    response = requests.get(FEDWATCH_MIRROR_URL, headers=USER_AGENT, timeout=30)
    response.raise_for_status()
    table_rows = find_fedwatch_table(response.text)
    source_updated_at = extract_oanda_modified_time(response.text)
    now = datetime.now(timezone.utc)
    source_columns = [normalize_fedwatch_range_label(column) for column in table_rows[0][1:]]
    columns = sorted(set(FEDWATCH_DISPLAY_COLUMNS + source_columns), key=fedwatch_column_sort_key)
    rows = []
    for table_row in table_rows[1:]:
        if len(table_row) < 2:
            continue
        meeting_date = normalize_fedwatch_date(table_row[0])
        by_column = {}
        for column, value in zip(source_columns, table_row[1:]):
            by_column[column] = parse_percent_cell(value)
        probabilities = [by_column.get(column, 0.0) for column in columns]
        max_probability = max(probabilities) if probabilities else None
        max_index = probabilities.index(max_probability) if max_probability is not None else None
        rows.append(
            {
                "meetingDate": meeting_date,
                "probabilities": probabilities,
                "maxProbability": max_probability,
                "maxRange": columns[max_index] if max_index is not None else None,
            }
        )
    if not rows:
        raise RuntimeError("FedWatch mirror table had no meeting rows")
    return {
        "source": "CME FedWatch via OANDA mirror (delayed)",
        "sourceUrl": FEDWATCH_SOURCE_URL,
        "mirrorSourceUrl": FEDWATCH_MIRROR_URL,
        "asOf": (source_updated_at or now.isoformat())[:10],
        "sourceUpdatedAt": source_updated_at,
        "refreshedAt": now.isoformat(),
        "title": "CME FedWatch Tool - Conditional Meeting Probabilities",
        "sourceNote": "CME live-page and intraday values require CME FedWatch API access; this public mirror can lag the official CME page.",
        "columns": columns,
        "rows": rows,
        "isFallback": False,
    }


def build_fedwatch_snapshot() -> dict[str, object]:
    try:
        return build_official_fedwatch_snapshot()
    except Exception as error:
        print(f"Official FedWatch EOD update failed; preserving previous snapshot: {error}", flush=True)
        if OUTPUT_PATH.exists():
            try:
                text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
                text = re.sub(r"^window\.marketBriefingData\s*=\s*", "", text).rstrip(";")
                previous = json.loads(text).get("fedWatch")
                if isinstance(previous, dict) and previous.get("rows"):
                    return previous
            except Exception as previous_error:
                print(f"Could not preserve previous FedWatch snapshot: {previous_error}", flush=True)
        raise


def build_payload() -> dict[str, object]:
    snapshots, _, latest_date, rotation_benchmark, close_frame = build_company_snapshots()
    index_cards = build_index_cards()
    major_news = build_major_news()
    movers = build_movers(snapshots)
    sector_panels = build_sector_panels(snapshots)
    rotation_signal = build_rotation_signal(snapshots, sector_panels, rotation_benchmark, close_frame)
    return {
        "updatedAt": latest_date,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mapLegend": {
            "negative": "Red = daily decline",
            "positive": "Green = daily gain",
            "size": "Tile size follows market-cap rank inside each sector",
        },
        "mapRanges": [{"key": key, "label": label} for key, label in MAP_RANGE_LABELS.items()],
        "indexCards": index_cards,
        "sectorPanels": sector_panels,
        "rotationSignal": rotation_signal,
        "fedWatch": build_fedwatch_snapshot(),
        "majorNews": major_news,
        "movers": movers,
    }


def main() -> None:
    payload = build_payload()
    existing_updated_at = load_existing_updated_at()
    candidate_updated_at = str(payload.get("updatedAt") or "")
    if existing_updated_at and candidate_updated_at and candidate_updated_at < existing_updated_at:
        print(
            "Skipped Daily Briefing write because the provider regressed "
            f"from {existing_updated_at} to {candidate_updated_at}.",
            flush=True,
        )
        return
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

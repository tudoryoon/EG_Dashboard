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
PRICE_PERIOD = "2y"
BENCHMARK_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT"]
USD_PER_KRW_SYMBOL = "KRW=X"
MAP_RANGE_PERIODS = {
    "1d": 1,
    "1w": 5,
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "1y": 252,
}
MAP_RANGE_LABELS = {
    "1d": "1D",
    "1w": "1W",
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
        "label": "S/W 플랫폼",
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
        "label": "전통 S/W",
        "items": [
            {"ticker": "CRM", "label": "CRM US", "name": "Salesforce", "query": "Salesforce stock"},
            {"ticker": "NOW", "label": "NOW US", "name": "ServiceNow", "query": "ServiceNow stock"},
            {"ticker": "SNOW", "label": "SNOW US", "name": "Snowflake", "query": "Snowflake stock"},
        ],
    },
    {
        "key": "cybersecurity",
        "label": "사이버보안",
        "items": [
            {"ticker": "NET", "label": "NET US", "name": "Cloudflare", "query": "Cloudflare stock"},
            {"ticker": "CRWD", "label": "CRWD US", "name": "CrowdStrike", "query": "CrowdStrike stock"},
            {"ticker": "PANW", "label": "PANW US", "name": "Palo Alto Networks", "query": "Palo Alto Networks stock"},
            {"ticker": "ZS", "label": "ZS US", "name": "Zscaler", "query": "Zscaler stock"},
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
            {"ticker": "BA", "label": "BA US", "name": "Boeing", "query": "Boeing stock"},
            {"ticker": "FTAI", "label": "FTAI US", "name": "FTAI Aviation", "query": "FTAI Aviation stock"},
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
            {"ticker": "LLY", "label": "LLY US", "name": "Eli Lilly", "query": "Eli Lilly stock"},
            {"ticker": "NVO", "label": "NVO US", "name": "Novo Nordisk", "query": "Novo Nordisk stock"},
            {"ticker": "JNJ", "label": "JNJ US", "name": "Johnson & Johnson", "query": "Johnson & Johnson stock"},
            {"ticker": "NVS", "label": "NVS US", "name": "Novartis", "query": "Novartis stock"},
            {"ticker": "ABBV", "label": "ABBV US", "name": "AbbVie", "query": "AbbVie stock"},
            {"ticker": "MRK", "label": "MRK US", "name": "Merck", "query": "Merck stock"},
            {"ticker": "UNH", "label": "UNH US", "name": "UnitedHealth", "query": "UnitedHealth stock"},
            {"ticker": "NTRA", "label": "NTRA US", "name": "Natera", "query": "Natera stock"},
            {"ticker": "ISRG", "label": "ISRG US", "name": "Intuitive Surgical", "query": "Intuitive Surgical stock"},
        ],
    },
    {
        "key": "financials",
        "label": "금융주",
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
        "label": "레저",
        "items": [
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


def compute_period_return(series: pd.Series, periods: int) -> float | None:
    if len(series) <= periods:
        return None
    current = normalize_number(series.iloc[-1])
    base = normalize_number(series.iloc[-(periods + 1)])
    if current is None or base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def compute_ytd_return(series: pd.Series) -> float | None:
    if series.empty:
        return None
    current = normalize_number(series.iloc[-1])
    if current is None:
        return None
    current_year = int(series.index[-1].year)
    ytd_series = series[series.index.year == current_year]
    if ytd_series.empty:
        return None
    base = normalize_number(ytd_series.iloc[0])
    if base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


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
        range_returns = {key: None for key in MAP_RANGE_LABELS}
        if len(series) >= 2:
            price = float(series.iloc[-1])
            previous_close = float(series.iloc[-2])
            if previous_close:
                day_change_pct = round((price / previous_close - 1) * 100, 2)
        if not series.empty:
            range_returns.update({key: compute_period_return(series, periods) for key, periods in MAP_RANGE_PERIODS.items()})
            range_returns["1d"] = day_change_pct
            range_returns["ytd"] = compute_ytd_return(series)
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
            "overviewReturns": range_returns,
            "overviewColors": {key: color_for_change(value) for key, value in range_returns.items()},
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
        "mapRanges": [{"key": key, "label": label} for key, label in MAP_RANGE_LABELS.items()],
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

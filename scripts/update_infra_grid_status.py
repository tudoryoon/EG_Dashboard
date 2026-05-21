from __future__ import annotations

import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "infra-grid-status-data.js"
EIA_BASE_URL = "https://www.eia.gov/electricity/wholesale"
EIA_CURRENT_URL = f"{EIA_BASE_URL}/xls/ice_electric-{datetime.now(timezone.utc).year}.xlsx"
EIA_ARCHIVE_ZIP_URL = f"{EIA_BASE_URL}/xls/archive/ice_electric-historical.zip"
RANGES = [
    {"key": "1m", "label": "1M"},
    {"key": "3m", "label": "3M"},
    {"key": "6m", "label": "6M"},
    {"key": "ytd", "label": "YTD"},
    {"key": "1y", "label": "1Y"},
    {"key": "3y", "label": "3Y"},
    {"key": "5y", "label": "5Y"},
    {"key": "max", "label": "Max"},
]

HUBS = {
    "pjm_west": {
        "label": "PJM West",
        "region": "Northern Virginia / Mid-Atlantic proxy",
        "color": "#111827",
        "aliases": {"PJM West", "PJM WH Real Time Peak", "PJM Wh Real Time Peak", "PJM-West Real Time Peak", "PJM-Wh Real Time Peak"},
    },
    "indiana": {
        "label": "Indiana Hub",
        "region": "MISO / Midwest compute corridor",
        "color": "#7c3aed",
        "aliases": {"Indiana Hub RT Peak", "Indiana Rt Peak", "Indiana"},
    },
    "mass_hub": {
        "label": "Mass Hub",
        "region": "New England power stress",
        "color": "#0f766e",
        "aliases": {"Nepool MH DA LMP Peak", "Nepool MH Da LMP Peak", "NEPOOL Mass Hub", "NEPOOL MH DA LMP", "NEPOOL"},
    },
    "np15": {
        "label": "CAISO NP15",
        "region": "Northern California",
        "color": "#2563eb",
        "aliases": {"NP15 EZ Gen DA LMP Peak", "NP 15 EZ Gen DA LMP Peak", "NP 15 EZ Gen DA LMP Peak", "NP 15", "NP15"},
    },
    "sp15": {
        "label": "CAISO SP15",
        "region": "Southern California",
        "color": "#dc2626",
        "aliases": {"SP15 EZ Gen DA LMP Peak", "SP-15 Gen DA LMP Peak", "SP 15", "SP-15 Peak"},
    },
    "palo_verde": {
        "label": "Palo Verde",
        "region": "Arizona / Southwest",
        "color": "#f97316",
        "aliases": {"Palo Verde Peak", "Palo Verde"},
    },
    "mid_c": {
        "label": "Mid-C",
        "region": "Pacific Northwest",
        "color": "#14b8a6",
        "aliases": {"Mid C Peak", "Mid Columbia Peak"},
    },
    "ercot_north": {
        "label": "ERCOT North",
        "region": "Texas historical ICE series",
        "color": "#b45309",
        "aliases": {"ERCOT North 345KV Peak"},
    },
}


def normalize_column(name: object) -> str:
    return str(name).lower().replace("\n", "").replace(" ", "").replace("_", "")


def fetch_bytes(url: str) -> bytes:
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=90)
    response.raise_for_status()
    return response.content


def current_year_urls() -> list[str]:
    current_year = datetime.now(timezone.utc).year
    urls = []
    for year in range(2014, current_year):
        extension = "xlsx" if year >= 2017 else "xls"
        urls.append(f"{EIA_BASE_URL}/xls/archive/ice_electric-{year}final.{extension}")
    urls.append(f"{EIA_BASE_URL}/xls/ice_electric-{current_year}.xlsx")
    return urls


def read_excel_rows(content: bytes) -> pd.DataFrame:
    workbook = pd.ExcelFile(io.BytesIO(content))
    frames = []
    for sheet in workbook.sheet_names:
        try:
            frame = pd.read_excel(workbook, sheet_name=sheet)
        except Exception:
            continue
        if not frame.empty:
            frames.append(frame)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def read_eia_power_rows() -> pd.DataFrame:
    frames = []
    for url in current_year_urls():
        try:
            frames.append(clean_power_frame(read_excel_rows(fetch_bytes(url))))
        except Exception:
            continue

    try:
        archive = zipfile.ZipFile(io.BytesIO(fetch_bytes(EIA_ARCHIVE_ZIP_URL)))
        for name in archive.namelist():
            if name.lower().endswith((".xls", ".xlsx")):
                frames.append(clean_power_frame(read_excel_rows(archive.read(name))))
    except Exception:
        pass

    if not frames:
        raise RuntimeError("No EIA ICE power price files were loaded")
    return pd.concat(frames, ignore_index=True)


def clean_power_frame(raw_frame: pd.DataFrame) -> pd.DataFrame:
    columns = {normalize_column(column): column for column in raw_frame.columns}
    hub_col = columns.get("pricehub")
    date_col = columns.get("tradedate")
    price_col = columns.get("wtdavgprice$/mwh")
    volume_col = columns.get("dailyvolumemwh")
    if not hub_col or not date_col or not price_col:
        raise RuntimeError("Unexpected EIA ICE power price schema")

    frame = raw_frame[[hub_col, date_col, price_col] + ([volume_col] if volume_col else [])].copy()
    frame.columns = ["hub", "date", "price"] + (["volume"] if volume_col else [])
    frame["hub"] = frame["hub"].astype(str).str.strip()
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    frame["price"] = pd.to_numeric(frame["price"], errors="coerce")
    if "volume" in frame:
        frame["volume"] = pd.to_numeric(frame["volume"], errors="coerce")
    else:
        frame["volume"] = pd.NA
    frame = frame.dropna(subset=["date", "price"])
    frame = frame.loc[frame["price"] > -500]
    return frame


def build_hub_series(frame: pd.DataFrame) -> dict[str, dict[str, list[float] | list[str]]]:
    series = {}
    for key, config in HUBS.items():
        aliases = config["aliases"]
        hub_frame = frame.loc[frame["hub"].isin(aliases)].copy()
        if hub_frame.empty:
            continue
        daily = (
            hub_frame.groupby("date", as_index=False)
            .agg(price=("price", "mean"), volume=("volume", "sum"))
            .sort_values("date")
        )
        series[key] = {
            "dates": daily["date"].tolist(),
            "prices": [round(float(value), 2) for value in daily["price"]],
            "volumes": [round(float(value), 2) if pd.notna(value) else None for value in daily["volume"]],
        }
    return series


def rolling_spike_count(dates: list[str], values: list[float], threshold: float, window: int = 90) -> tuple[list[str], list[int]]:
    flags = [1 if float(value) >= threshold else 0 for value in values]
    counts = []
    for index in range(len(flags)):
        start = max(0, index - window + 1)
        counts.append(sum(flags[start : index + 1]))
    return dates, counts


def rolling_max(dates: list[str], values: list[float], window: int = 30) -> tuple[list[str], list[float]]:
    output = []
    for index in range(len(values)):
        start = max(0, index - window + 1)
        output.append(round(max(float(value) for value in values[start : index + 1]), 2))
    return dates, output


def series_item(key: str, dates: list[str], values: list[float] | list[int], *, name: str | None = None) -> dict[str, object]:
    config = HUBS[key]
    return {
        "name": name or config["label"],
        "color": config["color"],
        "dates": dates,
        "values": values,
    }


def latest_snapshot(key: str, dates: list[str], prices: list[float]) -> dict[str, object]:
    last_price = float(prices[-1])
    trailing = [float(value) for value in prices[-252:]]
    avg_1y = sum(trailing) / len(trailing) if trailing else last_price
    recent_90 = [float(value) for value in prices[-90:]]
    spike_days = sum(1 for value in recent_90 if value >= 100)
    return {
        "key": key,
        "label": HUBS[key]["label"],
        "region": HUBS[key]["region"],
        "date": dates[-1],
        "price": round(last_price, 2),
        "avg1y": round(avg_1y, 2),
        "premiumTo1yPct": round(((last_price / avg_1y) - 1) * 100, 1) if avg_1y else None,
        "spikeDays90": spike_days,
        "status": "stressed" if last_price >= 100 or spike_days >= 10 else "elevated" if last_price >= 60 or spike_days >= 4 else "normal",
    }


def build_payload() -> dict[str, object]:
    power_frame = read_eia_power_rows()
    hub_series = build_hub_series(power_frame)
    if not hub_series:
        raise RuntimeError("No configured EIA ICE hubs were found")

    included_keys = [key for key in HUBS if key in hub_series]
    latest_date = max(hub_series[key]["dates"][-1] for key in included_keys)
    snapshots = [
        latest_snapshot(key, hub_series[key]["dates"], hub_series[key]["prices"])
        for key in included_keys
        if hub_series[key]["dates"] and hub_series[key]["prices"]
    ]

    corridor_keys = [key for key in ["pjm_west", "indiana", "mass_hub"] if key in hub_series]
    western_keys = [key for key in ["np15", "sp15", "palo_verde", "mid_c"] if key in hub_series]
    spike_keys = [key for key in ["pjm_west", "indiana", "mass_hub", "np15", "sp15", "palo_verde", "mid_c"] if key in hub_series]

    panels = {
        "dc_corridor_prices": {
            "title": "Data Center Corridor Power Prices",
            "subtitle": "Daily ICE weighted-average peak power prices for PJM West, Indiana Hub, and Mass Hub. PJM West is the broad public proxy for the Northern Virginia / Mid-Atlantic data-center corridor.",
            "source": "EIA Wholesale Electricity / ICE",
            "mode": "raw",
            "connectGaps": True,
            "yAxisLabel": "$/MWh",
            "formatter": "dollar1",
            "series": {
                key: series_item(key, hub_series[key]["dates"], hub_series[key]["prices"])
                for key in corridor_keys
            },
        },
        "western_power_prices": {
            "title": "Western Power Price Stress",
            "subtitle": "Daily peak power prices across CAISO NP15/SP15, Palo Verde, and Mid-C for western grid pressure around AI and cloud buildouts.",
            "source": "EIA Wholesale Electricity / ICE",
            "mode": "raw",
            "connectGaps": True,
            "yAxisLabel": "$/MWh",
            "formatter": "dollar1",
            "series": {
                key: series_item(key, hub_series[key]["dates"], hub_series[key]["prices"])
                for key in western_keys
            },
        },
        "spike_days_90d": {
            "title": "Power Price Spike Days",
            "subtitle": "Rolling 90-day count of trading days with weighted-average peak power price at or above $100/MWh.",
            "source": "EIA Wholesale Electricity / ICE",
            "mode": "raw",
            "connectGaps": True,
            "yAxisLabel": "Days",
            "formatter": "number1",
            "series": {
                key: series_item(
                    key,
                    *rolling_spike_count(hub_series[key]["dates"], hub_series[key]["prices"], 100),
                    name=f"{HUBS[key]['label']} >= $100",
                )
                for key in spike_keys
            },
        },
        "rolling_30d_max": {
            "title": "30D Max Power Price",
            "subtitle": "Rolling 30-trading-day maximum peak power price. Useful for spotting recurring grid stress even when daily averages normalize.",
            "source": "EIA Wholesale Electricity / ICE",
            "mode": "raw",
            "connectGaps": True,
            "yAxisLabel": "$/MWh",
            "formatter": "dollar1",
            "series": {
                key: series_item(
                    key,
                    *rolling_max(hub_series[key]["dates"], hub_series[key]["prices"], 30),
                    name=f"{HUBS[key]['label']} 30D Max",
                )
                for key in spike_keys
            },
        },
    }

    if "ercot_north" in hub_series:
        panels["ercot_historical"] = {
            "title": "ERCOT North Historical Price",
            "subtitle": "Historical ICE ERCOT North series is included where available; EIA's current ICE file no longer carries this daily hub after 2019.",
            "source": "EIA Wholesale Electricity / ICE",
            "mode": "raw",
            "connectGaps": True,
            "yAxisLabel": "$/MWh",
            "formatter": "dollar1",
            "series": {
                "ercot_north": series_item("ercot_north", hub_series["ercot_north"]["dates"], hub_series["ercot_north"]["prices"]),
            },
        }

    return {
        "updatedAt": latest_date,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "startDate": min(hub_series[key]["dates"][0] for key in included_keys),
        "defaultRange": "3y",
        "ranges": RANGES,
        "source": {
            "name": "EIA Wholesale Electricity Market Data / ICE",
            "url": "https://www.eia.gov/electricity/wholesale/",
            "note": "Daily ICE weighted-average peak power prices republished by EIA. EIA updates these files biweekly, so the dashboard refreshes daily but new source observations arrive when EIA publishes them.",
        },
        "dashboards": [
            {"key": "dc_corridor_prices", "group": "Power Prices"},
            {"key": "western_power_prices", "group": "Power Prices"},
            {"key": "spike_days_90d", "group": "Stress"},
            {"key": "rolling_30d_max", "group": "Stress"},
            *([{"key": "ercot_historical", "group": "Historical"}] if "ercot_historical" in panels else []),
        ],
        "panels": panels,
        "snapshots": snapshots,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.infraGridData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Updated through {payload['updatedAt']}")


if __name__ == "__main__":
    main()

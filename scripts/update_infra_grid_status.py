from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd


OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "infra-grid-status-data.js"
LOOKBACK_DAYS = 2

ISO_CONFIG = [
    {"key": "caiso", "class": "CAISO", "label": "CAISO", "region": "California"},
    {
        "key": "ercot",
        "class": "Ercot",
        "label": "ERCOT",
        "region": "Texas",
        "skipReason": "ERCOT public dashboard feed returned 403 during automated fetch.",
    },
    {
        "key": "pjm",
        "class": "PJM",
        "label": "PJM",
        "region": "Mid-Atlantic / Midwest",
        "skipReason": "PJM gridstatus feed requires a PJM_API_KEY.",
    },
    {"key": "nyiso", "class": "NYISO", "label": "NYISO", "region": "New York"},
    {"key": "isone", "class": "ISONE", "label": "ISO-NE", "region": "New England"},
    {"key": "miso", "class": "MISO", "label": "MISO", "region": "Midcontinent"},
    {
        "key": "spp",
        "class": "SPP",
        "label": "SPP",
        "region": "Southwest Power Pool",
        "skipReason": "SPP portal feed is slow or intermittently unavailable in automated runs.",
    },
]

FUEL_COLORS = {
    "Natural Gas": "#2563eb",
    "Coal": "#525252",
    "Nuclear": "#7c3aed",
    "Hydro": "#0891b2",
    "Wind": "#16a34a",
    "Solar": "#f59e0b",
    "Battery": "#db2777",
    "Gas / Oil": "#9333ea",
    "Imports": "#64748b",
    "Other": "#a3a3a3",
}

FUEL_ALIASES = {
    "Gas": "Natural Gas",
    "Natural Gas": "Natural Gas",
    "Coal": "Coal",
    "Nuclear": "Nuclear",
    "Hydro": "Hydro",
    "Large Hydro": "Hydro",
    "Small Hydro": "Hydro",
    "Wind": "Wind",
    "Solar": "Solar",
    "Batteries": "Battery",
    "Battery Storage": "Battery",
    "Dual Fuel": "Gas / Oil",
    "Oil": "Gas / Oil",
    "Other Fossil Fuels": "Gas / Oil",
    "Imports": "Imports",
}

RENEWABLE_FUELS = {
    "Hydro",
    "Wind",
    "Solar",
    "Geothermal",
    "Biomass",
    "Biogas",
    "Small Hydro",
    "Large Hydro",
    "Other Renewables",
    "Landfill Gas",
    "Wood",
    "Refuse",
}


def isoformat_value(value: Any) -> str:
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return ""
    return str(value)


def latest_numeric_record(frame: pd.DataFrame, column: str) -> dict[str, Any] | None:
    if frame.empty or column not in frame.columns:
        return None
    clean = frame[pd.notna(frame[column])].copy()
    if clean.empty:
        return None
    return clean.iloc[-1].to_dict()


def fetch_with_fallback(iso: Any, method_name: str) -> pd.DataFrame:
    method = getattr(iso, method_name)
    errors: list[str] = []
    for offset in range(LOOKBACK_DAYS):
        target_date = date.today() - timedelta(days=offset)
        try:
            frame = method(target_date)
            if isinstance(frame, pd.DataFrame) and not frame.empty:
                return frame
        except Exception as exc:  # noqa: BLE001 - preserve per-ISO availability without failing the dashboard
            errors.append(f"{target_date}: {type(exc).__name__} {str(exc)[:180]}")
    raise RuntimeError("; ".join(errors) if errors else f"{method_name} returned no data")


def normalize_fuel_mix(record: dict[str, Any]) -> tuple[list[dict[str, float | str]], float | None]:
    fuel_values: dict[str, float] = {}
    renewable_total = 0.0

    for raw_name, raw_value in record.items():
        if raw_name in {"Time", "Interval Start", "Interval End"}:
            continue
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            continue
        if not pd.notna(value):
            continue

        display_name = FUEL_ALIASES.get(raw_name, "Other")
        fuel_values[display_name] = fuel_values.get(display_name, 0.0) + value
        if raw_name in RENEWABLE_FUELS or display_name in {"Hydro", "Wind", "Solar"}:
            renewable_total += max(value, 0.0)

    positive_total = sum(max(value, 0.0) for value in fuel_values.values())
    rows = []
    for label, value in sorted(fuel_values.items(), key=lambda item: max(item[1], 0.0), reverse=True):
        rows.append(
            {
                "label": label,
                "valueMw": round(value, 1),
                "sharePct": round((max(value, 0.0) / positive_total) * 100, 1) if positive_total else None,
                "color": FUEL_COLORS.get(label, FUEL_COLORS["Other"]),
            }
        )

    renewable_share = round((renewable_total / positive_total) * 100, 1) if positive_total else None
    return rows, renewable_share


def build_iso_item(gridstatus_module: Any, config: dict[str, str]) -> dict[str, Any]:
    item: dict[str, Any] = {
        "key": config["key"],
        "label": config["label"],
        "region": config["region"],
        "status": "unavailable",
        "latestLoadMw": None,
        "loadTime": "",
        "fuelTime": "",
        "fuelMix": [],
        "renewableSharePct": None,
        "topFuel": "",
        "error": "",
    }

    if config.get("skipReason"):
        item["error"] = config["skipReason"]
        return item

    try:
        iso_class = getattr(gridstatus_module, config["class"])
        iso = iso_class()
    except Exception as exc:  # noqa: BLE001
        item["error"] = f"{type(exc).__name__}: {str(exc)[:220]}"
        return item

    errors: list[str] = []

    try:
        load_frame = fetch_with_fallback(iso, "get_load")
        load_record = latest_numeric_record(load_frame, "Load")
        if load_record:
            item["latestLoadMw"] = round(float(load_record["Load"]), 1)
            item["loadTime"] = isoformat_value(load_record.get("Time") or load_record.get("Interval End"))
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Load: {type(exc).__name__} {str(exc)[:220]}")

    try:
        fuel_frame = fetch_with_fallback(iso, "get_fuel_mix")
        fuel_record = fuel_frame.iloc[-1].to_dict()
        fuel_mix, renewable_share = normalize_fuel_mix(fuel_record)
        item["fuelMix"] = fuel_mix
        item["renewableSharePct"] = renewable_share
        item["fuelTime"] = isoformat_value(fuel_record.get("Time") or fuel_record.get("Interval End"))
        item["topFuel"] = fuel_mix[0]["label"] if fuel_mix else ""
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Fuel Mix: {type(exc).__name__} {str(exc)[:220]}")

    if item["latestLoadMw"] is not None or item["fuelMix"]:
        item["status"] = "available"
    item["error"] = " | ".join(errors)
    return item


def build_payload() -> dict[str, Any]:
    import gridstatus  # Imported lazily so normal dashboard builds do not require it.

    logging.getLogger("gridstatus").setLevel(logging.WARNING)
    items = [build_iso_item(gridstatus, config) for config in ISO_CONFIG]
    return {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "name": "GridStatus open-source library / ISO public feeds",
            "url": "https://opensource.gridstatus.io/",
            "liveUrl": "https://www.gridstatus.io/live",
            "note": "Static snapshot generated for GitHub Pages; some ISO feeds may require credentials or block automated access.",
        },
        "items": items,
        "fuelColors": FUEL_COLORS,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(
        "window.infraGridData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    available = sum(1 for item in payload["items"] if item["status"] == "available")
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Available ISO snapshots: {available}/{len(payload['items'])}")


if __name__ == "__main__":
    main()

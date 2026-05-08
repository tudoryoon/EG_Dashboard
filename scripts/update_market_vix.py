from __future__ import annotations

import csv
import io
import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


START_DATE = "2018-01-01"
MAX_CURVE_CONTRACTS = 8
MONTHLY_VX_PATTERN = re.compile(r"^VX/[FGHJKMNQUVXZ]\d+$")

RANGES = [
    {"key": "1m", "label": "1M"},
    {"key": "3m", "label": "3M"},
    {"key": "6m", "label": "6M"},
    {"key": "1y", "label": "1Y"},
    {"key": "3y", "label": "3Y"},
    {"key": "5y", "label": "5Y"},
    {"key": "max", "label": "Max"},
]

VIX_FAMILY = [
    {"key": "vix", "symbol": "^VIX", "label": "VIX Spot", "color": "#111827"},
    {"key": "vix9d", "symbol": "^VIX9D", "label": "VIX 9D", "color": "#dc2626"},
    {"key": "vix3m", "symbol": "^VIX3M", "label": "VIX 3M", "color": "#2563eb"},
    {"key": "vix6m", "symbol": "^VIX6M", "label": "VIX 6M", "color": "#7c3aed"},
    {"key": "vix1y", "symbol": "^VIX1Y", "label": "VIX 1Y", "color": "#0f766e"},
]


@dataclass
class CurveContract:
    symbol: str
    expiration: str
    label: str
    price: float


@dataclass
class CurveSnapshot:
    date: str
    contracts: list[CurveContract]


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=8) as response:  # nosec B310 - fixed public endpoints
        return response.read().decode("utf-8-sig")


def fetch_json(url: str) -> dict:
    return json.loads(fetch_text(url))


def yahoo_chart_url(symbol: str) -> str:
    encoded = quote(symbol, safe="")
    period1 = int(datetime.strptime(f"{START_DATE}T00:00:00+00:00", "%Y-%m-%dT%H:%M:%S%z").timestamp())
    period2 = int(datetime.now(timezone.utc).timestamp())
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        f"?period1={period1}&period2={period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits"
    )


def cboe_settlement_csv_url(day: str) -> str:
    return f"https://www-api.cboe.com/us/futures/market_statistics/settlement/csv?dt={day}"


def parse_expiration_date(raw_date: str) -> datetime:
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw_date, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unsupported expiration format: {raw_date}")


def format_expiration_label(raw_date: str) -> str:
    parsed = parse_expiration_date(raw_date)
    return parsed.strftime("%b %Y")


def parse_vix_family_item(meta: dict[str, str]) -> dict[str, object]:
    payload = fetch_json(yahoo_chart_url(meta["symbol"]))
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote_data = (result.get("indicators") or {}).get("quote") or [{}]
    adjclose_data = (result.get("indicators") or {}).get("adjclose") or [{}]
    closes = adjclose_data[0].get("adjclose") or quote_data[0].get("close") or []

    dates: list[str] = []
    values: list[float] = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        date_key = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d")
        if date_key < START_DATE:
            continue
        dates.append(date_key)
        values.append(round(float(close), 4))

    latest = values[-1] if values else None
    previous = values[-2] if len(values) > 1 else None
    delta = round(latest - previous, 4) if latest is not None and previous is not None else None
    pct = round((delta / previous) * 100, 2) if previous not in {None, 0} and delta is not None else None

    return {
        "label": meta["label"],
        "symbol": meta["symbol"],
        "color": meta["color"],
        "dates": dates,
        "values": values,
        "latestDate": dates[-1] if dates else "",
        "latestValue": latest,
        "previousValue": previous,
        "change": delta,
        "changePct": pct,
    }


def parse_curve_for_day(day: str) -> CurveSnapshot | None:
    try:
        raw = fetch_text(cboe_settlement_csv_url(day))
    except Exception:
        return None

    reader = csv.DictReader(io.StringIO(raw))
    monthly_contracts: list[CurveContract] = []
    for row in reader:
        symbol = (row.get("Symbol") or "").strip()
        if not MONTHLY_VX_PATTERN.match(symbol):
            continue
        expiration = (row.get("Expiration Date") or "").strip()
        raw_price = (row.get("Price") or "").strip()
        if not expiration or not raw_price:
            continue
        try:
            price = round(float(raw_price), 4)
            exp_dt = parse_expiration_date(expiration)
        except ValueError:
            continue
        monthly_contracts.append(
            CurveContract(
                symbol=symbol,
                expiration=exp_dt.strftime("%Y-%m-%d"),
                label=format_expiration_label(expiration),
                price=price,
            )
        )

    if not monthly_contracts:
        return None

    monthly_contracts.sort(key=lambda item: item.expiration)
    return CurveSnapshot(date=day, contracts=monthly_contracts[:MAX_CURVE_CONTRACTS])


def fetch_latest_curves() -> list[CurveSnapshot]:
    today = datetime.now(timezone.utc).date()
    snapshots: list[CurveSnapshot] = []
    checked = 0
    current = today
    while checked < 20 and len(snapshots) < 2:
        if current.weekday() >= 5:
            current -= timedelta(days=1)
            checked += 1
            continue
        snapshot = parse_curve_for_day(current.isoformat())
        if snapshot:
            snapshots.append(snapshot)
        current -= timedelta(days=1)
        checked += 1
    snapshots.sort(key=lambda item: item.date)
    return snapshots


def load_existing_curve_history() -> list[CurveSnapshot]:
    output_path = Path(__file__).resolve().parents[1] / "data" / "market-vix-data.js"
    if not output_path.exists():
        return []
    try:
        text = output_path.read_text(encoding="utf-8").strip()
        payload = json.loads(text[len("window.marketVixData = ") : -1])
    except Exception:
        return []

    snapshots: list[CurveSnapshot] = []
    for item in payload.get("curve", {}).get("curveHistory", []) or []:
        date_key = item.get("date")
        contracts = item.get("contracts") or []
        if not date_key or not contracts:
            continue
        parsed_contracts: list[CurveContract] = []
        for contract in contracts:
            try:
                parsed_contracts.append(
                    CurveContract(
                        symbol=str(contract["symbol"]),
                        expiration=str(contract["expiration"]),
                        label=str(contract["label"]),
                        price=round(float(contract["price"]), 4),
                    )
                )
            except Exception:
                parsed_contracts = []
                break
        if parsed_contracts:
            snapshots.append(CurveSnapshot(date=date_key, contracts=parsed_contracts))
    return snapshots


def build_spot_lookup(dates: list[str], values: list[float]) -> dict[str, float]:
    return {day: value for day, value in zip(dates, values)}


def find_latest_spot_value(spot_lookup: dict[str, float], sorted_dates: list[str], target: str) -> float | None:
    latest_value = None
    for day in sorted_dates:
        if day > target:
            break
        latest_value = spot_lookup.get(day)
    return latest_value


def build_curve_payload(curves: list[CurveSnapshot], spot_item: dict[str, object]) -> dict[str, object]:
    if not curves:
        return {
            "latestDate": "",
            "previousDate": "",
            "expiries": [],
            "latestCurve": [],
            "previousCurve": [],
            "historyDates": [],
            "metrics": {},
            "regime": {"label": "No data", "m1SpotPremiumPct": None, "m2M1PremiumPct": None},
        }

    latest = curves[-1]
    previous = curves[-2] if len(curves) > 1 else curves[-1]
    previous_curve_values = [contract.price for contract in previous.contracts[: len(latest.contracts)]]
    if len(previous_curve_values) < len(latest.contracts):
        previous_curve_values.extend([None] * (len(latest.contracts) - len(previous_curve_values)))

    spot_dates = spot_item.get("dates") or []
    spot_values = spot_item.get("values") or []
    spot_lookup = build_spot_lookup(list(spot_dates), list(spot_values))

    latest_spot = find_latest_spot_value(spot_lookup, list(spot_dates), latest.date)
    latest_m1 = latest.contracts[0].price if latest.contracts else None
    latest_m2 = latest.contracts[1].price if len(latest.contracts) > 1 else None
    m1_spot_premium = round(((latest_m1 / latest_spot) - 1) * 100, 2) if latest_m1 and latest_spot else None
    m2_m1_premium = round(((latest_m2 / latest_m1) - 1) * 100, 2) if latest_m1 and latest_m2 else None

    history_dates: list[str] = []
    spot_series: list[float | None] = []
    m1_series: list[float | None] = []
    m2_series: list[float | None] = []
    premium_m1_spot: list[float | None] = []
    premium_m2_m1: list[float | None] = []

    for snapshot in curves:
        history_dates.append(snapshot.date)
        spot_value = find_latest_spot_value(spot_lookup, list(spot_dates), snapshot.date)
        m1 = snapshot.contracts[0].price if snapshot.contracts else None
        m2 = snapshot.contracts[1].price if len(snapshot.contracts) > 1 else None
        spot_series.append(spot_value)
        m1_series.append(m1)
        m2_series.append(m2)
        premium_m1_spot.append(round(((m1 / spot_value) - 1) * 100, 2) if m1 and spot_value else None)
        premium_m2_m1.append(round(((m2 / m1) - 1) * 100, 2) if m1 and m2 else None)

    regime_label = "Contango"
    if m1_spot_premium is not None and m1_spot_premium < 0:
        regime_label = "Backwardation"
    elif m1_spot_premium is not None and abs(m1_spot_premium) < 1.0:
        regime_label = "Flat"

    return {
        "latestDate": latest.date,
        "previousDate": previous.date,
        "expiries": [contract.label for contract in latest.contracts],
        "latestCurve": [contract.price for contract in latest.contracts],
        "previousCurve": previous_curve_values,
        "historyDates": history_dates,
        "metrics": {
            "spot": spot_series,
            "m1": m1_series,
            "m2": m2_series,
            "m1SpotPremiumPct": premium_m1_spot,
            "m2M1PremiumPct": premium_m2_m1,
        },
        "regime": {
            "label": regime_label,
            "m1SpotPremiumPct": m1_spot_premium,
            "m2M1PremiumPct": m2_m1_premium,
            "spot": latest_spot,
            "m1": latest_m1,
            "m2": latest_m2,
        },
        "latestContracts": [
            {
                "symbol": contract.symbol,
                "expiration": contract.expiration,
                "label": contract.label,
                "price": contract.price,
            }
            for contract in latest.contracts
        ],
        "curveHistory": [
            {
                "date": snapshot.date,
                "contracts": [
                    {
                        "symbol": contract.symbol,
                        "expiration": contract.expiration,
                        "label": contract.label,
                        "price": contract.price,
                    }
                    for contract in snapshot.contracts
                ],
            }
            for snapshot in curves
        ],
    }


def build_snapshot_cards(vix_family: dict[str, dict[str, object]], curve_payload: dict[str, object]) -> list[dict[str, object]]:
    cards = []
    for key in ("vix", "vix9d", "vix3m", "vix6m", "vix1y"):
        item = vix_family.get(key)
        if not item:
            continue
        cards.append(
            {
                "key": key,
                "label": item["label"],
                "value": item.get("latestValue"),
                "change": item.get("change"),
                "changePct": item.get("changePct"),
                "date": item.get("latestDate"),
            }
        )

    cards.append(
        {
            "key": "term-regime",
            "label": "Term Regime",
            "value": curve_payload["regime"].get("label"),
            "change": curve_payload["regime"].get("m1SpotPremiumPct"),
            "changePct": curve_payload["regime"].get("m2M1PremiumPct"),
            "date": curve_payload.get("latestDate"),
        }
    )
    return cards


def main() -> None:
    vix_family = {meta["key"]: parse_vix_family_item(meta) for meta in VIX_FAMILY}
    existing_curves = load_existing_curve_history()
    curves = fetch_latest_curves()
    curve_by_date = {snapshot.date: snapshot for snapshot in existing_curves}
    for snapshot in curves:
        curve_by_date[snapshot.date] = snapshot
    merged_curves = [curve_by_date[key] for key in sorted(curve_by_date)]
    curve_payload = build_curve_payload(merged_curves, vix_family["vix"])

    latest_dates = [item.get("latestDate") for item in vix_family.values() if item.get("latestDate")]
    if curve_payload.get("latestDate"):
        latest_dates.append(curve_payload["latestDate"])

    payload = {
        "updatedAt": max(latest_dates) if latest_dates else "",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "startDate": START_DATE,
        "defaultRange": "1y",
        "ranges": RANGES,
        "source": {
            "family": "Yahoo Finance delayed close",
            "futures": "CBOE delayed futures settlement CSV",
        },
        "family": vix_family,
        "curve": curve_payload,
        "snapshots": build_snapshot_cards(vix_family, curve_payload),
    }

    output_path = Path(__file__).resolve().parents[1] / "data" / "market-vix-data.js"
    output_path.write_text(
        "window.marketVixData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()

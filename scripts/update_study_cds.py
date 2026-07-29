from __future__ import annotations

import argparse
import csv
import io
import json
import re
import statistics
import time
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "study-cds-data.js"
LIST_URL = "https://pddata.dtcc.com/ppd/api/cumulative/SEC/CR"
DEFAULT_REFRESH_DAYS = 14
LOOKBACK_DAYS = 365
MIN_TENOR_DAYS = round(365.25 * 4.25)
MAX_TENOR_DAYS = round(365.25 * 5.75)

ISSUERS = {
    "googl": {
        "ticker": "GOOGL",
        "name": "Alphabet",
        "aliases": ("ALPHABET", "GOOGLE"),
        "color": "#2563eb",
    },
    "msft": {
        "ticker": "MSFT",
        "name": "Microsoft",
        "aliases": ("MICROSOFT",),
        "color": "#0f766e",
    },
    "nvda": {
        "ticker": "NVDA",
        "name": "NVIDIA",
        "aliases": ("NVIDIA",),
        "color": "#16a34a",
    },
    "meta": {
        "ticker": "META",
        "name": "Meta Platforms",
        "aliases": ("META PLATFORMS", "FACEBOOK"),
        "color": "#7c3aed",
    },
    "orcl": {
        "ticker": "ORCL",
        "name": "Oracle",
        "aliases": ("ORACLE",),
        "color": "#dc2626",
    },
    "amzn": {
        "ticker": "AMZN",
        "name": "Amazon",
        "aliases": ("AMAZON",),
        "color": "#d97706",
    },
}


def fetch_bytes(url: str, attempts: int = 3) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json,text/csv,application/zip,*/*",
            "User-Agent": "EG-Dashboard-DTCC-CDS/1.0",
        },
    )
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except Exception as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def fetch_file_list() -> list[dict[str, Any]]:
    payload = json.loads(fetch_bytes(LIST_URL).decode("utf-8"))
    if not isinstance(payload, list):
        raise ValueError("Unexpected DTCC file-list response")
    return payload


def parse_file_date(file_name: str) -> date | None:
    match = re.search(r"(\d{4})_(\d{2})_(\d{2})\.zip$", file_name)
    if not match:
        return None
    return date(*(int(value) for value in match.groups()))


def normalize_name(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", value.upper()).strip()


def identify_issuer(value: str) -> str | None:
    normalized = normalize_name(value)
    for key, meta in ISSUERS.items():
        if any(alias in normalized for alias in meta["aliases"]):
            return key
    return None


def parse_iso_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value[:10])
    except (TypeError, ValueError):
        return None


def parse_spread_bps(value: str, notation: str) -> float | None:
    try:
        raw = float(value)
    except (TypeError, ValueError):
        return None
    notation = str(notation or "").strip()
    if notation == "3" or abs(raw) < 1:
        bps = raw * 10_000
    elif abs(raw) < 20:
        bps = raw * 100
    else:
        bps = raw
    if not 1 <= bps <= 2_000:
        return None
    return round(bps, 3)


def parse_notional_usd(value: str) -> float | None:
    normalized = str(value or "").replace(",", "").strip()
    try:
        notional = float(normalized)
    except (TypeError, ValueError):
        return None
    if notional <= 0:
        return None
    return round(notional, 2)


def lower_row(row: dict[str, str]) -> dict[str, str]:
    return {str(key).strip().lower(): (value or "").strip() for key, value in row.items()}


def parse_dtcc_zip(entry: dict[str, Any]) -> tuple[str, dict[str, dict[str, Any]]]:
    file_name = str(entry.get("fileName") or "")
    file_date = parse_file_date(file_name)
    if not file_date:
        raise ValueError(f"Cannot parse DTCC file date: {file_name}")
    content = fetch_bytes(str(entry["fullFilePath"]))
    result = {
        key: {"spreads": [], "trades": [], "allTradeCount": 0, "directTradeCount": 0}
        for key in ISSUERS
    }
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        csv_name = next((name for name in archive.namelist() if name.lower().endswith(".csv")), None)
        if not csv_name:
            raise ValueError(f"No CSV found in {file_name}")
        with archive.open(csv_name) as raw:
            text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
            for source_row in csv.DictReader(text):
                row = lower_row(source_row)
                issuer = identify_issuer(row.get("underlying asset name", ""))
                if not issuer:
                    continue
                if row.get("action type") != "NEWT" or row.get("event type") != "TRAD":
                    continue
                if "CDS CORP SN SR" not in normalize_name(row.get("upi fisn", "")):
                    continue
                if row.get("notional currency-leg 1") != "USD":
                    continue
                execution_date = parse_iso_date(row.get("execution timestamp", ""))
                expiration_date = parse_iso_date(row.get("expiration date", ""))
                if not execution_date or not expiration_date:
                    continue
                tenor_days = (expiration_date - execution_date).days
                if not MIN_TENOR_DAYS <= tenor_days <= MAX_TENOR_DAYS:
                    continue
                result[issuer]["allTradeCount"] += 1
                spread = parse_spread_bps(
                    row.get("spread-leg 1", ""),
                    row.get("spread notation-leg 1", ""),
                )
                if spread is None:
                    continue
                result[issuer]["spreads"].append(spread)
                notional_usd = parse_notional_usd(row.get("notional amount-leg 1", ""))
                result[issuer]["trades"].append({
                    "spreadBps": spread,
                    "notionalUsd": notional_usd,
                    "isCapped": bool(notional_usd is not None and notional_usd >= 5_000_000),
                    "executedAt": row.get("execution timestamp", ""),
                })
                result[issuer]["directTradeCount"] += 1

    daily: dict[str, dict[str, Any]] = {}
    for issuer, item in result.items():
        spreads = item.pop("spreads")
        trades = item.pop("trades")
        trades.sort(key=lambda trade: str(trade.get("executedAt") or ""))
        daily[issuer] = {
            **item,
            "observedBps": round(statistics.median(spreads), 2) if spreads else None,
            "lowBps": round(min(spreads), 2) if spreads else None,
            "highBps": round(max(spreads), 2) if spreads else None,
            "trades": trades,
        }
    return file_date.isoformat(), daily


def load_existing() -> dict[str, Any]:
    if not DATA_PATH.exists():
        return {}
    text = DATA_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.studyCdsData\s*=\s*(.*);\s*$", text, flags=re.S)
    if not match:
        return {}
    return json.loads(match.group(1))


def existing_daily_map(payload: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
    dates = payload.get("dates") or []
    daily: dict[str, dict[str, dict[str, Any]]] = {}
    for issuer, item in (payload.get("items") or {}).items():
        observed = item.get("observedBps") or []
        direct_counts = item.get("directTradeCounts") or []
        all_counts = item.get("allTradeCounts") or []
        lows = item.get("lowBps") or []
        highs = item.get("highBps") or []
        trades = item.get("directTrades") or []
        for index, day_text in enumerate(dates):
            daily.setdefault(day_text, {})[issuer] = {
                "observedBps": observed[index] if index < len(observed) else None,
                "directTradeCount": direct_counts[index] if index < len(direct_counts) else 0,
                "allTradeCount": all_counts[index] if index < len(all_counts) else 0,
                "lowBps": lows[index] if index < len(lows) else None,
                "highBps": highs[index] if index < len(highs) else None,
                "trades": trades[index] if index < len(trades) else [],
            }
    return daily


def weekday_dates(start: date, end: date) -> list[str]:
    result: list[str] = []
    current = start
    while current <= end:
        if current.weekday() < 5:
            result.append(current.isoformat())
        current += timedelta(days=1)
    return result


def find_prior_value(values: list[float | None], latest_index: int, sessions: int) -> float | None:
    target = max(0, latest_index - sessions)
    for index in range(target, -1, -1):
        if values[index] is not None:
            return values[index]
    return None


def build_payload(
    daily_map: dict[str, dict[str, dict[str, Any]]],
    latest_file_date: date,
) -> dict[str, Any]:
    start_date = latest_file_date - timedelta(days=LOOKBACK_DAYS)
    dates = weekday_dates(start_date, latest_file_date)
    items: dict[str, Any] = {}

    for issuer, meta in ISSUERS.items():
        observed: list[float | None] = []
        low_values: list[float | None] = []
        high_values: list[float | None] = []
        direct_counts: list[int] = []
        all_counts: list[int] = []
        direct_trades: list[list[dict[str, Any]]] = []
        carried: list[float | None] = []
        last_value: float | None = None
        last_observed_date = ""

        for day_text in dates:
            row = daily_map.get(day_text, {}).get(issuer, {})
            value = row.get("observedBps")
            if value is not None:
                last_value = float(value)
                last_observed_date = day_text
            observed.append(value)
            low_values.append(row.get("lowBps"))
            high_values.append(row.get("highBps"))
            direct_counts.append(int(row.get("directTradeCount") or 0))
            all_counts.append(int(row.get("allTradeCount") or 0))
            direct_trades.append(row.get("trades") or [])
            carried.append(last_value)

        latest_index = len(dates) - 1
        latest_value = carried[latest_index] if latest_index >= 0 else None
        prior_1m = find_prior_value(carried, latest_index, 21) if latest_index >= 0 else None
        change_1m = None
        if latest_value is not None and prior_1m is not None:
            change_1m = round(latest_value - prior_1m, 2)
        first_observed_index = next((index for index, value in enumerate(observed) if value is not None), None)
        eligible_days = len(dates) - first_observed_index if first_observed_index is not None else 0
        observed_days = sum(value is not None for value in observed)
        stale_days = (
            (latest_file_date - date.fromisoformat(last_observed_date)).days
            if last_observed_date
            else None
        )
        items[issuer] = {
            "ticker": meta["ticker"],
            "name": meta["name"],
            "color": meta["color"],
            "values": carried,
            "observedBps": observed,
            "lowBps": low_values,
            "highBps": high_values,
            "directTradeCounts": direct_counts,
            "allTradeCounts": all_counts,
            "directTrades": direct_trades,
            "latest": {
                "bps": latest_value,
                "observedDate": last_observed_date,
                "staleDays": stale_days,
                "change1mBps": change_1m,
                "observedDays": observed_days,
                "coveragePct": round(observed_days / eligible_days * 100, 1) if eligible_days else 0,
                "directTrades1y": sum(direct_counts),
                "allTrades1y": sum(all_counts),
            },
        }

    return {
        "updatedAt": latest_file_date.isoformat(),
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "startDate": dates[0] if dates else "",
        "defaultRange": "1y",
        "ranges": [
            {"key": "3m", "label": "3M", "sessions": 63},
            {"key": "6m", "label": "6M", "sessions": 126},
            {"key": "1y", "label": "1Y", "sessions": 252},
        ],
        "source": {
            "name": "DTCC DDR SEC Public Price Dissemination",
            "url": "https://pddata.dtcc.com/ppd/secdashboard",
            "fileListUrl": LIST_URL,
            "publication": "미국 거래일 종료 후 통상 익일 00:15 UTC 전후 공개",
        },
        "methodology": {
            "title": "DTCC 5Y CDS Transaction Spread",
            "summary": "SEC에 보고된 USD 단일기업 선순위 CDS 신규 거래 중 5년 만기 직접 스프레드의 일별 중앙값입니다.",
            "filters": "Action=NEWT, Event=TRAD, CDS Corp Single Name Senior, USD, 잔존만기 4.25~5.75년",
            "carry": "직접 스프레드 거래가 없는 날은 직전 관측값을 이월하며 마지막 실거래일과 경과일을 표시합니다.",
            "limits": "딜러 종합 호가나 공식 종가가 아닙니다. 고정 쿠폰+업프런트만 보고된 거래는 가격 산출에서 제외하고 거래 건수에만 포함합니다.",
            "notionalDisclosure": "거래규모는 DTCC 공개 명목금액입니다. 단일기업 CDS는 공개값 $5M 이상이 상한 처리되므로 $5M+로 표시합니다.",
        },
        "dates": dates,
        "items": items,
    }


def write_payload(payload: dict[str, Any]) -> None:
    DATA_PATH.write_text(
        "window.studyCdsData = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Study CDS dashboard from DTCC SEC credit files.")
    parser.add_argument("--backfill", action="store_true", help="Refresh the full one-year history.")
    parser.add_argument("--refresh-days", type=int, default=DEFAULT_REFRESH_DAYS)
    parser.add_argument("--workers", type=int, default=12)
    args = parser.parse_args()

    entries = []
    for entry in fetch_file_list():
        file_date = parse_file_date(str(entry.get("fileName") or ""))
        if file_date:
            entries.append((file_date, entry))
    if not entries:
        raise RuntimeError("No DTCC SEC credit files were returned")
    entries.sort(key=lambda item: item[0])
    latest_file_date = entries[-1][0]
    full_start = latest_file_date - timedelta(days=LOOKBACK_DAYS)
    existing_payload = load_existing()
    needs_trade_backfill = bool(existing_payload) and any(
        "directTrades" not in item
        for item in (existing_payload.get("items") or {}).values()
    )
    refresh_start = (
        full_start
        if args.backfill or not DATA_PATH.exists() or needs_trade_backfill
        else latest_file_date - timedelta(days=max(1, args.refresh_days))
    )
    selected = [entry for file_date, entry in entries if refresh_start <= file_date <= latest_file_date]

    daily_map = existing_daily_map(existing_payload)
    for day_text in list(daily_map):
        if date.fromisoformat(day_text) < full_start:
            del daily_map[day_text]

    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {executor.submit(parse_dtcc_zip, entry): entry for entry in selected}
        for index, future in enumerate(as_completed(futures), start=1):
            entry = futures[future]
            try:
                day_text, daily = future.result()
                daily_map[day_text] = daily
            except Exception as error:
                failures.append(f"{entry.get('fileName')}: {error}")
            if index % 50 == 0 or index == len(selected):
                print(f"Processed {index}/{len(selected)} DTCC files")

    if failures:
        print("DTCC file failures:")
        for failure in failures[:20]:
            print(f"- {failure}")
        if len(failures) > max(3, len(selected) // 20):
            raise RuntimeError(f"Too many DTCC download failures: {len(failures)}/{len(selected)}")

    payload = build_payload(daily_map, latest_file_date)
    comparable_existing = {key: value for key, value in existing_payload.items() if key != "generatedAt"}
    comparable_payload = {key: value for key, value in payload.items() if key != "generatedAt"}
    if comparable_existing == comparable_payload and existing_payload.get("generatedAt"):
        payload["generatedAt"] = existing_payload["generatedAt"]
    write_payload(payload)
    print(f"Wrote {DATA_PATH} through {payload['updatedAt']} ({len(selected)} refreshed files)")


if __name__ == "__main__":
    main()

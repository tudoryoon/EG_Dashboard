from __future__ import annotations

import csv
import io
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
import requests

FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10,DFII10,T10YIE&cosd=2003-01-01"
ACM_URL = "https://www.newyorkfed.org/medialibrary/media/research/data_indicators/ACMTermPremium.xls"


def parse_fred_daily(text: str) -> dict:
    rows = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
    required = {"observation_date", "DGS10", "DFII10", "T10YIE"}
    if not required.issubset(rows.fieldnames or []):
        raise ValueError("FRED yield columns missing")
    fields = {"nominal": "DGS10", "real": "DFII10", "bei": "T10YIE"}
    points, source_dates, seen = {}, {}, set()
    for row in rows:
        day = date.fromisoformat(row["observation_date"]).isoformat()
        if day in seen:
            raise ValueError(f"Duplicate FRED date: {day}")
        seen.add(day)
        values = {}
        for key, column in fields.items():
            raw = row[column].strip()
            if raw in {"", ".", "NA"}:
                continue
            value = float(raw)
            if not math.isfinite(value):
                raise ValueError(f"Non-finite FRED value: {day}")
            values[key] = value
            source_dates[key] = max(day, source_dates.get(key, ""))
        # Only like-for-like observations can form a decomposition. Never forward-fill.
        if len(values) == 3:
            if abs(values["nominal"] - values["real"] - values["bei"]) > 0.025:
                raise ValueError(f"FRED yield identity mismatch: {day}")
            points[day] = values
    dates = sorted(points)
    if not dates:
        raise ValueError("No complete FRED yield observations")
    return {"updatedAt": dates[-1], "sourceDates": source_dates, "sourceUrl": FRED_URL,
            "frequency": "daily", "dates": dates,
            "series": {key: [points[day][key] for day in dates] for key in fields}}


def parse_acm_workbook(content: bytes) -> dict:
    import pandas as pd

    # The first worksheet is MONTHLY. Explicitly select the daily sheet.
    frame = pd.read_excel(io.BytesIO(content), sheet_name="ACM Daily")
    fields = {"termPremium": "ACMTP10", "expectedRate": "ACMRNY10", "modelYield": "ACMY10"}
    if not {"DATE", *fields.values()}.issubset(frame.columns):
        raise ValueError("ACM daily 10Y columns missing")
    points = {}
    for record in frame.to_dict("records"):
        if pd.isna(record["DATE"]):
            continue
        day = pd.to_datetime(record["DATE"]).date().isoformat()
        if day in points:
            raise ValueError(f"Duplicate ACM date: {day}")
        values = {key: float(record[column]) for key, column in fields.items()}
        if not all(math.isfinite(value) for value in values.values()):
            raise ValueError(f"Missing/non-finite ACM observation: {day}")
        if abs(values["termPremium"] + values["expectedRate"] - values["modelYield"]) > 0.0001:
            raise ValueError(f"ACM identity mismatch: {day}")
        points[day] = values
    dates = sorted(points)
    if not dates:
        raise ValueError("Empty ACM daily data")
    return {"updatedAt": dates[-1], "sourceUrl": ACM_URL, "model": "ACM",
            "frequency": "daily", "dates": dates,
            "series": {key: [round(points[day][key], 6) for day in dates] for key in fields}}


def validate_history(result: dict, existing: dict | None) -> None:
    if len(result["dates"]) < 1000:
        raise ValueError("Incomplete daily yield history")
    if result["updatedAt"] > datetime.now(timezone.utc).date().isoformat():
        raise ValueError("Future yield observation")
    if existing and (result["updatedAt"] < existing.get("updatedAt", "")
                     or not set(existing.get("dates", [])).issubset(result["dates"])):
        raise ValueError("Response would truncate saved yield history")


def fetch_daily_yields(existing: dict) -> dict:
    results = {}
    for key, url, parser in [
        ("dailyYieldDecomposition", FRED_URL, lambda raw: parse_fred_daily(raw.decode("utf-8-sig"))),
        ("acmTermPremium", ACM_URL, parse_acm_workbook),
    ]:
        error = None
        for _ in range(2):
            try:
                response = requests.get(url, timeout=(15, 60))
                response.raise_for_status()
                result = parser(response.content)
                validate_history(result, existing.get(key))
                results[key] = result
                break
            except Exception as exc:
                error = exc
        else:
            # Isolate providers: one outage must not discard another provider's new data.
            results[key] = existing.get(key, {})
            print(f"::warning::{key} refresh failed; retained {results[key].get('updatedAt', 'no data')}: {error}")
    return results


def main() -> None:
    from update_market_macro import read_existing_payload

    payload = read_existing_payload()
    payload.update(fetch_daily_yields(payload))
    path = Path(__file__).resolve().parents[1] / "data" / "market-macro-data.js"
    path.write_text("window.marketMacroData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8", newline="\n")
    for key in ("dailyYieldDecomposition", "acmTermPremium"):
        item = payload[key]
        print(f"{key}: {len(item.get('dates', []))} observations through {item.get('updatedAt')}")


if __name__ == "__main__":
    main()

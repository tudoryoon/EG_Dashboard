from __future__ import annotations

import csv
import io
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_URL = "https://www.federalreserve.gov/econres/notes/feds-notes/DKW_updates.csv"
METHOD_URL = "https://www.federalreserve.gov/econres/notes/feds-notes/tips-from-tips-update-and-discussions-20190521.html"
FIELDS = {
    "expectedReal": "exp.real.short.rate.10",
    "expectedInflation": "exp.inflation.10",
    "realTermPremium": "real.term.prem.10",
    "inflationRiskPremium": "inflation.risk.prem.10",
    "marketYield": "nominal.yield.raw.10",
    "modelYield": "nominal.yield.fitted.10",
}


def parse_dkw_csv(text: str) -> dict:
    # The Fed puts a quoted methodology preamble before the CSV header.
    rows = csv.reader(io.StringIO(text.lstrip("\ufeff")))
    header = next((row for row in rows if row and row[0].strip().lower() == "date"), None)
    if not header or not set(FIELDS.values()).issubset(header):
        raise ValueError("DKW 10Y columns missing")
    points = {}
    for row in rows:
        if not row or not row[0].strip():
            continue
        record = dict(zip(header, row))
        day = date.fromisoformat(record["date"]).isoformat()
        if day in points:
            raise ValueError(f"Duplicate DKW date: {day}")
        raw = [record.get(column, "") for column in FIELDS.values()]
        if any(value.strip() in {"", "NA", "N/A", "."} for value in raw):
            continue
        values = [float(value) for value in raw]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f"Non-finite DKW observation: {day}")
        if abs(sum(values[:4]) - values[5]) > 0.0001:
            raise ValueError(f"DKW component sum does not match fitted yield: {day}")
        points[day] = [round(value, 6) for value in values]
    dates = sorted(points)
    if not dates:
        raise ValueError("Empty DKW data")
    return {
        "model": "DKW",
        "sourceUrl": SOURCE_URL,
        "methodUrl": METHOD_URL,
        "frequency": "daily",
        "publicationFrequency": "monthly",
        "yieldBasis": "10-year zero-coupon",
        "units": "percent",
        "updatedAt": dates[-1],
        "dates": dates,
        "series": {key: [points[day][index] for day in dates] for index, key in enumerate(FIELDS)},
    }


def fetch_yield_decomposition(existing: dict | None = None) -> dict:
    try:
        request = Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=60) as response:
            result = parse_dkw_csv(response.read().decode("utf-8-sig"))
        if len(result["dates"]) < 1000 or result["dates"][0] != "1983-01-03":
            raise ValueError("Incomplete DKW history")
        if result["updatedAt"] > datetime.now(timezone.utc).date().isoformat():
            raise ValueError("Future DKW observation")
        if existing and (
            result["updatedAt"] < existing.get("updatedAt", "")
            or not set(existing.get("dates", [])).issubset(result["dates"])
        ):
            raise ValueError("DKW response would truncate saved history")
        return result
    except Exception as error:
        if existing and existing.get("dates"):
            print(f"::warning::DKW refresh failed; retaining data through {existing.get('updatedAt')}: {error}")
            return existing
        raise


def main() -> None:
    from update_market_macro import read_existing_payload

    payload = read_existing_payload()
    payload["yieldDecomposition"] = fetch_yield_decomposition(payload.get("yieldDecomposition"))
    path = Path(__file__).resolve().parents[1] / "data" / "market-macro-data.js"
    path.write_text("window.marketMacroData = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8", newline="\n")
    item = payload["yieldDecomposition"]
    print(f"DKW 10Y: {len(item['dates'])} observations through {item['updatedAt']}")


if __name__ == "__main__":
    main()

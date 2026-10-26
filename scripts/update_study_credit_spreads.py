"""Same-date, remaining-maturity Treasury G-spreads for fixed CUSIP bonds."""
from __future__ import annotations

import bisect
import hashlib
import math
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone

import update_study_crwv_bond as bonds

DATA_PATH = bonds.ROOT / "data/study-credit-spreads-data.js"
EXPORT = "window.studyCreditSpreadsData = "
SOURCE_URL = "https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics"
XML_URL = ("https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml"
           "?data=daily_treasury_yield_curve&field_tdr_date_value={year}")
TENORS = [(1 / 12, "BC_1MONTH"), (2 / 12, "BC_2MONTH"), (3 / 12, "BC_3MONTH"),
          (4 / 12, "BC_4MONTH"), (0.5, "BC_6MONTH"), (1, "BC_1YEAR"),
          (2, "BC_2YEAR"), (3, "BC_3YEAR"), (5, "BC_5YEAR"), (7, "BC_7YEAR"),
          (10, "BC_10YEAR"), (20, "BC_20YEAR"), (30, "BC_30YEAR")]
NS = {"a": "http://www.w3.org/2005/Atom", "d": "http://schemas.microsoft.com/ado/2007/08/dataservices",
      "m": "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"}


def parse_curve_xml(content: bytes, year: int) -> dict[str, dict[float, float]]:
    root = ET.fromstring(content)
    curves = {}
    for entry in root.findall("a:entry", NS):
        props = entry.find("a:content/m:properties", NS)
        if props is None:
            continue
        day = props.findtext("d:NEW_DATE", "", NS).split("T", 1)[0]
        if not day or date.fromisoformat(day).year != year:
            continue
        points = {}
        for tenor, field in TENORS:
            raw = props.findtext(f"d:{field}", "", NS).strip()
            if raw in {"", "N/A"}:
                continue
            value = float(raw)
            if not math.isfinite(value) or not -20 < value < 100:
                raise ValueError(f"Invalid Treasury yield {day} {field}")
            points[tenor] = value
        if len(points) < 2:
            continue
        if day in curves and curves[day] != points:
            raise ValueError(f"Conflicting Treasury observations for {day}")
        curves[day] = points
    if not curves:
        raise ValueError(f"No valid Treasury curves for {year}")
    return curves


def treasury_benchmark(day: str, maturity: str, curves: dict) -> dict:
    remaining = (date.fromisoformat(maturity) - date.fromisoformat(day)).days / 365.25
    result = {"remainingYears": round(remaining, 8), "benchmarkPct": None,
              "treasuryDate": None, "benchmarkStatus": "missing-same-date-curve"}
    points = curves.get(day)
    if not points:
        return result
    tenors = [tenor for tenor, _ in TENORS]
    if remaining <= 0 or remaining < tenors[0] or remaining > tenors[-1]:
        return {**result, "benchmarkStatus": "outside-curve-range"}
    upper_index = bisect.bisect_left(tenors, remaining)
    lower = tenors[max(0, upper_index - 1)]
    upper = tenors[upper_index]
    if abs(remaining - upper) < 1e-10:
        lower = upper
    if lower not in points or upper not in points:
        return {**result, "benchmarkStatus": "missing-bracketing-tenor"}
    weight = (remaining - lower) / (upper - lower) if upper != lower else 0.0
    benchmark = points[lower] + weight * (points[upper] - points[lower])
    return {**result, "benchmarkPct": round(benchmark, 8), "treasuryDate": day,
            "lowerTenorYears": lower, "upperTenorYears": upper,
            "lowerYieldPct": points[lower], "upperYieldPct": points[upper],
            "upperWeight": round(weight, 10), "benchmarkStatus": "matched"}


def build_payload(archives: dict, curves: dict, sources: list, checked_at: str) -> dict:
    items = {}
    for ticker, archive in archives.items():
        bond = archive["bond"]
        observations = []
        for row in archive.get("observations", []):
            if not isinstance(row.get("ytmPct"), (int, float)) or not math.isfinite(row["ytmPct"]):
                raise ValueError(f"Invalid YTM in {ticker}")
            match = treasury_benchmark(row["date"], bond["maturityDate"], curves)
            spread = round((row["ytmPct"] - match["benchmarkPct"]) * 100, 4) if match["benchmarkPct"] is not None else None
            observations.append({"date": row["date"], "ytmPct": row["ytmPct"],
                                 "pricePer100": row.get("pricePer100"), "spreadBps": spread, **match})
        matched = [row for row in observations if row["spreadBps"] is not None]
        items[ticker] = {"bond": bond, "source": archive["source"], "checkedAt": archive.get("checkedAt"),
                         "updatedAt": archive.get("updatedAt"), "observations": observations,
                         "coverage": {"matchedDays": len(matched), "bondDays": len(observations),
                                      "latestMatchedDate": matched[-1]["date"] if matched else None,
                                      "missingTreasuryDates": [row["date"] for row in observations if row["spreadBps"] is None]}}
    return {"schemaVersion": 1, "checkedAt": checked_at, "items": items,
            "treasury": {"name": "U.S. Treasury daily par yield curve", "url": SOURCE_URL,
                         "sources": sources, "latestDate": max(curves), "earliestDate": min(curves)},
            "methodology": {"measure": "Indicative G-spread (bp)",
                            "formula": "100 * (published bond YTM percent - interpolated Treasury par yield percent)",
                            "maturity": "Actual calendar days to contractual maturity / 365.25",
                            "interpolation": "Linear between adjacent published Treasury tenors; no extrapolation",
                            "dateMatch": "Exact same disclosed date only; no prior-day carry or weekend substitution",
                            "limits": "Fixed representative CUSIP, not issuer-wide or constant-5Y; not OAS or CDS. Includes option and liquidity effects. Valuation timestamps may differ."}}


def main():
    archives = {}
    for ticker, profile in bonds.PROFILES.items():
        archive = bonds.load_existing(profile["dataPath"], profile["export"])
        if not archive or archive.get("bond") != profile["bond"]:
            raise ValueError(f"Missing or mismatched bond archive: {ticker}")
        archives[ticker] = archive
    start_year = min(int(row["date"][:4]) for value in archives.values() for row in value["observations"])
    end_year = datetime.now(timezone.utc).year
    curves, sources = {}, []
    for year in range(start_year, end_year + 1):
        url = XML_URL.format(year=year)
        content = bonds.fetch_holdings(url)
        current = parse_curve_xml(content, year)
        curves.update(current)
        sources.append({"year": year, "url": url, "sha256": hashlib.sha256(content).hexdigest(),
                        "startDate": min(current), "endDate": max(current)})
    previous = bonds.load_existing(DATA_PATH, EXPORT)
    if previous and max(curves) < previous.get("treasury", {}).get("latestDate", ""):
        raise ValueError("Treasury source regressed; previous spreads preserved")
    payload = build_payload(archives, curves, sources, datetime.now(timezone.utc).isoformat(timespec="seconds"))
    bonds.write_payload(payload, DATA_PATH, EXPORT, compact=True)
    for ticker, item in payload["items"].items():
        latest = next((row for row in reversed(item["observations"]) if row["spreadBps"] is not None), {})
        print(ticker, item["coverage"], "latest spread", latest.get("spreadBps"))


if __name__ == "__main__":
    main()

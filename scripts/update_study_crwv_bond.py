"""Archive the exact July 2025 CoreWeave bond's public iShares valuation YTM.

The CSV is a latest-only disclosure. Its embedded date, never a URL parameter
or the collection date, identifies an observation. No historical backfill or
trade-level yield is implied by this series.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import re
import tempfile
import time
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/study-crwv-bond-data.js"
EXPORT = "window.studyCrwvBondData = "
SOURCE_URL = "https://www.ishares.com/us/products/239565/ishares-iboxx-high-yield-corporate-bond-etf/latest-holdings.csv"
PAGE_URL = "https://www.ishares.com/us/products/239565/ishares-iboxx-high-yield-corporate-bond-etf"
BOND = {
    "issuer": "CoreWeave", "ticker": "CRWV", "cusip": "21873SAC2",
    "isin": "US21873SAC26", "couponPct": 9.0, "currency": "USD",
    "issueDate": "2025-07-25", "maturityDate": "2031-02-01",
    "name": "CoreWeave 9.000% Senior Notes 2031 (144A)",
}


def source_date(value: str) -> str:
    return datetime.strptime(value.strip(), "%b %d, %Y").date().isoformat()


def numeric(value: str) -> float:
    result = float(value.replace(",", "").strip())
    if not math.isfinite(result):
        raise ValueError("Non-finite bond value")
    return result


def parse_holdings(content: bytes, today: date | None = None) -> dict:
    text = content.decode("utf-8-sig")
    if "<html" in text[:1000].lower() or "<!doctype" in text[:1000].lower():
        raise ValueError("Holdings endpoint returned HTML, not CSV")
    rows = list(csv.reader(io.StringIO(text)))
    date_rows = [row for row in rows if row and row[0].strip() == "Fund Holdings as of"]
    if len(date_rows) != 1 or len(date_rows[0]) != 2:
        raise ValueError("Missing or ambiguous holdings reference date")
    as_of = source_date(date_rows[0][1])
    if not BOND["issueDate"] <= as_of <= (today or datetime.now(timezone.utc).date()).isoformat():
        raise ValueError("Holdings date outside the bond's valid observation period")
    required = {"Name", "CUSIP", "ISIN", "Price", "YTM (%)", "Maturity", "Coupon (%)", "Market Currency", "Effective Date"}
    headers = [i for i, row in enumerate(rows) if required.issubset(row)]
    if len(headers) != 1:
        raise ValueError("Missing or ambiguous holdings columns")
    index = headers[0]
    header = rows[index]
    records = [dict(zip(header, row)) for row in rows[index + 1:] if len(row) == len(header)]
    matches = [record for record in records if record.get("CUSIP", "").strip() == BOND["cusip"]]
    if len(matches) != 1:
        raise ValueError("Exact CUSIP missing or duplicated; keeping previous observations")
    record = matches[0]
    if (record["ISIN"].strip() != BOND["isin"]
            or "COREWEAVE" not in record["Name"].upper()
            or record["Market Currency"].strip() != BOND["currency"]
            or source_date(record["Maturity"]) != BOND["maturityDate"]
            or source_date(record["Effective Date"]) != BOND["issueDate"]
            or abs(numeric(record["Coupon (%)"]) - BOND["couponPct"]) > 0.005):
        raise ValueError("Bond identity mismatch; refusing a different tranche")
    ytm, price = numeric(record["YTM (%)"]), numeric(record["Price"])
    if not -20 < ytm < 1000 or not 0 < price < 1000:
        raise ValueError("Implausible bond valuation")
    observation = {"date": as_of, "ytmPct": ytm, "pricePer100": price,
                   "sourceSha256": hashlib.sha256(content).hexdigest()}
    ytw = record.get("Yield to Worst (%)", "")
    if ytw not in ("", "-", "--"):
        observation["yieldToWorstPct"] = numeric(ytw)
    return observation


def load_existing(path: Path = DATA_PATH) -> dict:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    match = re.fullmatch(r"\s*window\.studyCrwvBondData\s*=\s*(\{.*\});\s*", text, re.S)
    if not match:
        raise ValueError("Cannot read existing bond archive; refusing to erase it")
    return json.loads(match[1])


def merge_observation(existing: dict, observation: dict, checked_at: str) -> dict:
    if existing and existing.get("bond") != BOND:
        raise ValueError("Existing archive belongs to a different bond")
    by_date = {item["date"]: dict(item) for item in existing.get("observations", [])}
    day = observation["date"]
    # A stale CDN response must not replace a more recent disclosed observation.
    if by_date and day < max(by_date):
        raise ValueError(f"Source regressed to {day}; retaining newer archive")
    previous = by_date.get(day, {})
    by_date[day] = {**observation, "firstCollectedAt": previous.get("firstCollectedAt", checked_at),
                    "lastCollectedAt": checked_at}
    observations = [by_date[key] for key in sorted(by_date)]
    return {
        "schemaVersion": 1, "bond": BOND, "updatedAt": observations[-1]["date"],
        "checkedAt": checked_at, "defaultRange": "1y",
        "source": {"name": "iShares HYG official holdings", "url": SOURCE_URL, "pageUrl": PAGE_URL,
                   "measure": "Published valuation YTM (%)", "historyMode": "daily-snapshots"},
        "observations": observations,
    }


def fetch_holdings() -> bytes:
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                content = response.read(5_000_001)
                if len(content) > 5_000_000:
                    raise ValueError("Unexpectedly large holdings file")
                return content
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("Holdings fetch failed")


def main() -> None:
    existing = load_existing()
    observation = parse_holdings(fetch_holdings())
    checked_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = merge_observation(existing, observation, checked_at)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=DATA_PATH.parent,
                                         suffix=".tmp", delete=False) as out:
            temporary = Path(out.name)
            out.write(EXPORT + json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + ";\n")
        temporary.replace(DATA_PATH)
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)
    print(f"CRWV {BOND['cusip']}: {observation['date']} YTM {observation['ytmPct']:.2f}%, "
          f"{len(payload['observations'])} disclosed dates (no backfill)")


if __name__ == "__main__":
    main()

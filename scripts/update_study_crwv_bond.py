"""Archive official, date-verified valuations for selected unsecured bonds.

The product-page CSV is latest-only; BlackRock's dated holdings document API
also serves historical disclosures. Both carry the same security identifiers
and published YTM. Never assign a requested date to a differently dated file.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import math
import re
import tempfile
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/study-crwv-bond-data.js"
EXPORT = "window.studyCrwvBondData = "
SOURCE_URL = "https://www.ishares.com/us/products/239565/ishares-iboxx-high-yield-corporate-bond-etf/latest-holdings.csv"
PAGE_URL = "https://www.ishares.com/us/products/239565/ishares-iboxx-high-yield-corporate-bond-etf"
HISTORY_URL = (
    "https://www.blackrock.com/varnish-api/blk-one01-product-data/product-data/api/v1/"
    "get-fund-document?appType=PRODUCT_PAGE&appSubType=ISHARES&targetSite=us-ishares&"
    "locale=en_US&portfolioId=239565&userType=individual&component=holdings&asOfDate={stamp}"
)
CACHE_DIR = ROOT / "output/crwv-bond-holdings-cache"
BOND = {
    "issuer": "CoreWeave", "ticker": "CRWV", "cusip": "21873SAC2",
    "isin": "US21873SAC26", "couponPct": 9.0, "currency": "USD",
    "issueDate": "2025-07-25", "maturityDate": "2031-02-01",
    "name": "CoreWeave 9.000% Senior Notes 2031 (144A)",
}
LQD_PAGE = "https://www.ishares.com/us/products/239566/ishares-iboxx-investment-grade-corporate-bond-etf"
PROFILES = {
    "CRWV": {"bond": BOND, "fund": "HYG", "pageUrl": PAGE_URL, "url": SOURCE_URL,
             "historyUrlTemplate": HISTORY_URL, "dataPath": DATA_PATH, "export": EXPORT,
             "startDate": "2025-07-25", "cacheDir": CACHE_DIR,
             "termsUrl": "https://www.sec.gov/Archives/edgar/data/1769628/000119312525165924/d73657d8k.htm"},
    "ORCL": {"bond": {
        "issuer": "Oracle", "ticker": "ORCL", "cusip": "68389XDX0", "isin": "US68389XDX03",
        "couponPct": 4.95, "currency": "USD", "issueDate": "2026-02-04", "maturityDate": "2031-02-04",
        "name": "Oracle 4.950% Senior Unsecured Notes 2031",
    }, "termsUrl": "https://www.sec.gov/Archives/edgar/data/1341439/000119312526033882/d44245dfwp.htm"},
    "EQIX": {"bond": {
        "issuer": "Equinix", "ticker": "EQIX", "cusip": "29444UBS4", "isin": "US29444UBS42",
        "couponPct": 2.5, "currency": "USD", "issueDate": "2021-05-17", "maturityDate": "2031-05-15",
        "name": "Equinix 2.500% Senior Unsecured Notes 2031",
    }, "termsUrl": "https://www.sec.gov/Archives/edgar/data/1101239/000110465921068051/tm2116587d1_ex4-6.htm"},
}
for _ticker in ("ORCL", "EQIX"):
    PROFILES[_ticker].update({
        "fund": "LQD", "pageUrl": LQD_PAGE, "url": LQD_PAGE + "/latest-holdings.csv",
        "historyUrlTemplate": HISTORY_URL.replace("portfolioId=239565", "portfolioId=239566"),
        "dataPath": ROOT / f"data/study-{_ticker.lower()}-bond-data.js",
        "export": f"window.study{_ticker.title()}BondData = ", "startDate": "2025-07-25",
        "cacheDir": ROOT / f"output/{_ticker.lower()}-bond-holdings-cache",
        "rawCacheDir": ROOT / "output/credit-bond-holdings-raw/239566",
    })


def profile_source(profile: dict) -> dict:
    return {"name": f"iShares {profile['fund']} official holdings", "fund": profile["fund"],
            "url": profile["url"], "pageUrl": profile["pageUrl"], "termsUrl": profile["termsUrl"],
            "historyUrlTemplate": profile["historyUrlTemplate"], "measure": "Published valuation YTM (%)",
            "historyMode": "date-verified-official-holdings"}


class HoldingsUnavailableError(ValueError):
    pass


class BondNotHeldError(ValueError):
    pass


def source_date(value: str) -> str:
    return datetime.strptime(value.strip(), "%b %d, %Y").date().isoformat()


def numeric(value: str) -> float:
    result = float(value.replace(",", "").strip())
    if not math.isfinite(result):
        raise ValueError("Non-finite bond value")
    return result


def parse_holdings(content: bytes, today: date | None = None, requested_date: str | None = None, *, bond=BOND) -> dict:
    text = content.decode("utf-8-sig")
    if "<html" in text[:1000].lower() or "<!doctype" in text[:1000].lower():
        raise ValueError("Holdings endpoint returned HTML, not CSV")
    rows = list(csv.reader(io.StringIO(text)))
    date_rows = [row for row in rows if row and row[0].strip() == "Fund Holdings as of"]
    if len(date_rows) != 1 or len(date_rows[0]) != 2:
        raise ValueError("Missing or ambiguous holdings reference date")
    if date_rows[0][1].strip() in ("", "-", "--"):
        raise HoldingsUnavailableError("No disclosure published for this date")
    as_of = source_date(date_rows[0][1])
    if requested_date and as_of != requested_date:
        raise ValueError(f"Requested {requested_date}, received {as_of}; rejecting date substitution")
    if not bond["issueDate"] <= as_of <= (today or datetime.now(timezone.utc).date()).isoformat():
        raise ValueError("Holdings date outside the bond's valid observation period")
    required = {"Name", "CUSIP", "ISIN", "Price", "YTM (%)", "Maturity", "Coupon (%)", "Market Currency", "Effective Date"}
    headers = [i for i, row in enumerate(rows) if required.issubset(row)]
    if len(headers) != 1:
        raise ValueError("Missing or ambiguous holdings columns")
    index = headers[0]
    header = rows[index]
    records = [dict(zip(header, row)) for row in rows[index + 1:] if len(row) == len(header)]
    matches = [record for record in records if record.get("CUSIP", "").strip() == bond["cusip"]]
    if not matches:
        raise BondNotHeldError("Exact CUSIP not held on this disclosed date")
    if len(matches) != 1:
        raise ValueError("Exact CUSIP duplicated; keeping previous observations")
    record = matches[0]
    identity_missing = [field for field in ("ISIN", "Effective Date") if record[field].strip() in ("", "-", "--")]
    # A unique CUSIP plus issuer, currency, coupon and maturity identifies the
    # bond even when the issuer file omits secondary metadata. Conflicting
    # nonblank identifiers still fail; missing fields remain explicitly marked.
    if (("ISIN" not in identity_missing and record["ISIN"].strip() != bond["isin"])
            or bond["issuer"].upper() not in record["Name"].upper()
            or record["Market Currency"].strip() != bond["currency"]
            or source_date(record["Maturity"]) != bond["maturityDate"]
            or ("Effective Date" not in identity_missing and source_date(record["Effective Date"]) != bond["issueDate"])
            or abs(numeric(record["Coupon (%)"]) - bond["couponPct"]) > 0.005):
        raise ValueError("Bond identity mismatch; refusing a different tranche")
    ytm, price = numeric(record["YTM (%)"]), numeric(record["Price"])
    if not -20 < ytm < 1000 or not 0 < price < 1000:
        raise ValueError("Implausible bond valuation")
    observation = {"date": as_of, "ytmPct": ytm, "pricePer100": price,
                   "sourceSha256": hashlib.sha256(content).hexdigest()}
    if identity_missing:
        observation["identityMissingFields"] = identity_missing
    ytw = record.get("Yield to Worst (%)", "")
    if ytw not in ("", "-", "--"):
        observation["yieldToWorstPct"] = numeric(ytw)
    return observation


def load_existing(path: Path = DATA_PATH, export: str = EXPORT) -> dict:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    match = re.fullmatch(r"\s*" + re.escape(export.strip()) + r"\s*(\{.*\});\s*", text, re.S)
    if not match:
        raise ValueError("Cannot read existing bond archive; refusing to erase it")
    return json.loads(match[1])


def merge_observation(existing: dict, observation: dict, checked_at: str, *, allow_historical=False, bond=BOND, source=None) -> dict:
    if existing and existing.get("bond") != bond:
        raise ValueError("Existing archive belongs to a different bond")
    by_date = {item["date"]: dict(item) for item in existing.get("observations", [])}
    day = observation["date"]
    # A stale CDN response must not replace a more recent disclosed observation.
    if by_date and day < max(by_date) and not allow_historical:
        raise ValueError(f"Source regressed to {day}; retaining newer archive")
    previous = by_date.get(day, {})
    by_date[day] = {**observation, "firstCollectedAt": previous.get("firstCollectedAt", checked_at),
                    "lastCollectedAt": checked_at}
    observations = [by_date[key] for key in sorted(by_date)]
    return {
        "schemaVersion": 2, "bond": bond, "updatedAt": observations[-1]["date"],
        "checkedAt": checked_at, "defaultRange": "3m",
        "source": source or profile_source(PROFILES["CRWV"]),
        "coverage": existing.get("coverage", {}),
        "observations": observations,
    }


class RequestPacer:
    def __init__(self, interval=1.0):
        self.interval = interval
        self.lock = threading.Lock()
        self.next_request = 0.0

    def wait(self):
        with self.lock:
            delay = max(0.0, self.next_request - time.monotonic())
            if delay:
                time.sleep(delay)
            self.next_request = time.monotonic() + self.interval


def fetch_holdings(url: str = SOURCE_URL, pacer: RequestPacer | None = None) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    for attempt in range(3):
        try:
            if pacer:
                pacer.wait()
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


def weekdays(start: date, end: date) -> list[str]:
    days = []
    while start <= end:
        if start.weekday() < 5:
            days.append(start.isoformat())
        start += timedelta(days=1)
    return days


def latest_completed_session(now: datetime) -> date:
    local = now.astimezone(ZoneInfo("America/New_York"))
    day = local.date() if local.hour >= 16 else local.date() - timedelta(days=1)
    while day.weekday() >= 5:
        day -= timedelta(days=1)
    return day


def collect_dated(day: str, pacer: RequestPacer, *, profile=None) -> tuple[str, dict | None]:
    profile = profile or {**PROFILES["CRWV"], "cacheDir": CACHE_DIR}
    bond = profile["bond"]
    cache_dir = profile["cacheDir"]
    path = cache_dir / f"{day}.json"
    url = profile["historyUrlTemplate"].format(stamp=day.replace("-", ""))
    if path.exists():
        cached = json.loads(path.read_text(encoding="utf-8"))
        item = cached.get("observation", {})
        if (cached.get("date") == day and cached.get("sourceUrl") == url and cached.get("cusip") == bond["cusip"]
                and item.get("date") == day and isinstance(item.get("ytmPct"), (float, int))
                and math.isfinite(item["ytmPct"]) and isinstance(item.get("pricePer100"), (float, int))
                and math.isfinite(item["pricePer100"]) and item["pricePer100"] > 0):
            return "ok", cached["observation"]
    # ORCL and EQIX share LQD. Reuse the dated source file instead of downloading
    # the same fund portfolio twice; never cache an unpublished/empty response.
    raw_path = profile["rawCacheDir"] / f"{day}.csv.gz" if profile.get("rawCacheDir") else None
    content = gzip.decompress(raw_path.read_bytes()) if raw_path and raw_path.exists() else fetch_holdings(url, pacer)
    if not content.strip():
        return "unpublished", None
    try:
        observation = parse_holdings(content, requested_date=day, bond=bond)
    except HoldingsUnavailableError:
        return "unpublished", None
    except BondNotHeldError:
        if raw_path and not raw_path.exists():
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_path.write_bytes(gzip.compress(content))
        return "not-held", None
    observation["sourceUrl"] = url
    if raw_path and not raw_path.exists():
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_bytes(gzip.compress(content))
    cache_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"date": day, "cusip": bond["cusip"], "sourceUrl": url,
                                "observation": observation}, allow_nan=False), encoding="utf-8")
    return "ok", observation


def write_payload(payload: dict, path=DATA_PATH, export=EXPORT) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=path.parent,
                                         suffix=".tmp", delete=False) as out:
            temporary = Path(out.name)
            out.write(export + json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + ";\n")
        temporary.replace(path)
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)


def main(backfill=False, ticker="CRWV") -> None:
    profile = PROFILES[ticker]
    bond = profile["bond"]
    existing = load_existing(profile["dataPath"], profile["export"])
    now = datetime.now(timezone.utc)
    checked_at = now.isoformat(timespec="seconds")
    payload = existing
    observations = []
    errors = []
    try:
        latest = parse_holdings(fetch_holdings(profile["url"]), bond=bond)
        latest["sourceUrl"] = profile["url"]
        observations.append(latest)
    except Exception as error:
        errors.append({"date": "latest", "error": str(error)})
    end = latest_completed_session(now)
    history_start = max(bond["issueDate"], profile["startDate"])
    start = date.fromisoformat(history_start) if backfill else max(
        date.fromisoformat(history_start), end - timedelta(days=10))
    present = {item["date"] for item in existing.get("observations", [])}
    desired = weekdays(start, end)
    failed_before = {item.get("date", "") for item in existing.get("coverage", {}).get("errors", [])}
    retry_dates = {day for day in failed_before if re.fullmatch(r"\d{4}-\d{2}-\d{2}", day)
                   and history_start <= day <= end.isoformat()}
    missing = sorted((set(desired) | retry_dates) - present)
    pacer = RequestPacer()
    unavailable = set(existing.get("coverage", {}).get("unavailableDates", []))
    not_held = set(existing.get("coverage", {}).get("notHeldDates", []))
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(collect_dated, day, pacer, profile=profile): day for day in missing}
        for count, future in enumerate(as_completed(futures), 1):
            day = futures[future]
            try:
                status, observation = future.result()
                if observation:
                    observations.append(observation)
                    unavailable.discard(day)
                    not_held.discard(day)
                elif status == "not-held":
                    not_held.add(day)
                else:
                    unavailable.add(day)
            except Exception as error:
                errors.append({"date": day, "error": str(error)})
            if count % 25 == 0 or count == len(futures):
                print(f"Dated disclosures checked {count}/{len(futures)}, verified {len(observations)}, errors {len(errors)}", flush=True)
    if not observations:
        raise RuntimeError("No verified source observations; previous archive preserved")
    # Explicit historical imports may extend the archive backwards, never move its latest date backwards.
    for observation in sorted(observations, key=lambda item: item["date"]):
        payload = merge_observation(payload, observation, checked_at, allow_historical=True,
                                    bond=bond, source=profile_source(profile))
    coverage_start = min(start.isoformat(), existing.get("coverage", {}).get("startDate", start.isoformat()))
    coverage_end = max(end.isoformat(), payload["updatedAt"])
    observed = {item["date"] for item in payload["observations"]}
    payload["coverage"] = {
        "startDate": coverage_start, "endDate": coverage_end,
        "missingWeekdays": [day for day in weekdays(date.fromisoformat(coverage_start), date.fromisoformat(coverage_end)) if day not in observed],
        "unavailableDates": sorted(unavailable - observed), "notHeldDates": sorted(not_held - observed),
        "errors": errors, "lastFullBackfillAt": checked_at if backfill else existing.get("coverage", {}).get("lastFullBackfillAt"),
    }
    write_payload(payload, profile["dataPath"], profile["export"])
    for error in errors:
        print(f"::warning::Bond disclosure {error['date']}: {error['error']}")
    last = payload["observations"][-1]
    print(f"{ticker} {bond['cusip']}: {payload['observations'][0]['date']} through {last['date']}, "
          f"{len(payload['observations'])} verified dates; latest YTM {last['ytmPct']:.2f}%")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backfill", action="store_true", help="Fetch every available weekday since the bond's issue")
    parser.add_argument("--ticker", choices=PROFILES, default="CRWV")
    args = parser.parse_args()
    main(backfill=args.backfill, ticker=args.ticker)

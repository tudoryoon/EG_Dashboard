"""One-off official inflation release-date backfill; routine updates reuse its local cache."""
from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from urllib.parse import urlencode, urljoin

from macro_release_dates import INFLATION_HISTORY_PATH, cpi_header_release_date, fetch_soup, parse_bea, parse_cpi_archive


def build_history():
    groups = {}
    cpi_url = "https://www.bls.gov/bls/news-release/cpi.htm"
    parse_cpi_archive(fetch_soup(cpi_url), groups, cpi_url)
    archive_url = "https://www.bea.gov/news/archive"
    archive = fetch_soup(archive_url)
    for option in archive.select('select[name="created_1"] option'):
        label = option.get_text(strip=True)
        if not label.isdigit() or not 1996 <= int(label) <= 2016:
            continue
        query = urlencode({"field_related_product_target_id": "All", "created_1": option["value"], "title": "Personal Income"})
        pending, seen = [f"{archive_url}?{query}"], set()
        while pending:
            page_url = pending.pop(0)
            if page_url in seen:
                continue
            seen.add(page_url)
            if len(seen) > 10:
                raise RuntimeError("Unexpected BEA archive pagination")
            page = fetch_soup(page_url)
            parse_bea(page, groups, page_url, int(label))
            pending.extend(urljoin(page_url, link["href"]) for link in page.select('a[href]')
                           if link.get_text(" ", strip=True).startswith("Next page") and "page=" in link["href"])
        print(f"BEA {label}: {len(groups.get('pce', {}))} cumulative monthly releases", flush=True)
    groups = {group: {reference: entries[reference] for reference in sorted(entries) if reference <= "2015-12"}
              for group, entries in groups.items()}
    def verify_cpi(item):
        reference, entry = item
        released = cpi_header_release_date(fetch_soup(entry["sourceUrl"]), entry["releaseDate"])
        return reference, released
    checks = {"matched": 0, "corrected": {}, "confirmedBySchedule": {}, "unparsed": []}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for reference, released in pool.map(verify_cpi, groups["cpi"].items()):
            entry = groups["cpi"][reference]
            if released is None:
                # The December 1996 report prints January 1996 instead of January 1997.
                schedule_url = "https://www.bls.gov/schedule/1997/home.htm"
                if reference == "1996-12" and entry["releaseDate"] == "1997-01-14" and re.search(
                    r"Consumer Price Index,\s+December 1996\s+Jan\.\s+14",
                    fetch_soup(schedule_url).get_text(" ", strip=True),
                ):
                    entry["sourceUrl"] = schedule_url
                    checks["confirmedBySchedule"][reference] = schedule_url
                else:
                    checks["unparsed"].append(reference)
            elif released != entry["releaseDate"]:
                checks["corrected"][reference] = {"archiveDate": entry["releaseDate"], "headerDate": released}
                entry["releaseDate"] = released
            else:
                checks["matched"] += 1
            if sum([checks["matched"], len(checks["corrected"]), len(checks["confirmedBySchedule"]), len(checks["unparsed"])]) % 24 == 0:
                print(f"CPI headers checked through {reference}", flush=True)
    print(f"CPI header checks: {checks}", flush=True)
    if checks["unparsed"]:
        raise RuntimeError(f"Unverified CPI report dates: {checks['unparsed']}")
    # A partial scrape must not replace a previously verified archive.
    for group in ("cpi", "pce"):
        missing = [f"{year}-{month:02}" for year in range(1998, 2016) for month in range(1, 13)
                   if f"{year}-{month:02}" not in groups.get(group, {})]
        if missing:
            raise RuntimeError(f"{group}: missing 1998-2015 references: {missing}")
    return {"checkedAt": date.today().isoformat(), "dateBasis": "US publication date", "cpiHeaderChecks": checks,
            "sources": [cpi_url, archive_url], "groups": groups}


def main():
    history = build_history()
    INFLATION_HISTORY_PATH.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for group, entries in history["groups"].items():
        print(f"{group}: {len(entries)} releases, {min(entries)} to {max(entries)}")


if __name__ == "__main__":
    main()

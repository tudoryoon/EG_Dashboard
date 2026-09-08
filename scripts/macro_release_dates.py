"""Verified reference-period -> US release-date mapping for comparison charts."""
from __future__ import annotations

import copy
import re
from datetime import date, datetime
from urllib.parse import urlencode, urljoin

from bs4 import BeautifulSoup
from curl_cffi import requests

ISM_URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/"
# Transcribed from the official 2026 calendar; includes ISM-specific holidays.
ISM_2026 = [(1, 5, 7), (2, 2, 4), (3, 2, 4), (4, 1, 6), (5, 1, 5),
            (6, 1, 3), (7, 1, 6), (8, 3, 5), (9, 1, 3), (10, 1, 5),
            (11, 2, 4), (12, 1, 3)]
MONTHS = {datetime(2000, m, 1).strftime("%B").lower(): m for m in range(1, 13)}
RELEASE_EXCEPTIONS = [
    ("pce", "2019-01", "2019-03-29", "https://www.bea.gov/news/2019/personal-income-february-2019-personal-outlays-january-2019"),
    ("pce", "2019-02", "2019-04-29", "https://www.bea.gov/news/2019/personal-income-and-outlays-march-2019"),
    ("ppi", "2025-10", "2026-01-14", "https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm"),
]


def fetch_soup(url):
    response = requests.get(url, impersonate="chrome", timeout=15)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def put(groups, group, reference, released, source, today=None):
    today = today or date.today()
    if date.fromisoformat(released) > today or released[:7] <= reference[:7]:
        return
    entry = {"releaseDate": released, "sourceUrl": source}
    old = groups.setdefault(group, {}).get(reference)
    if old is None or released < old["releaseDate"]:
        groups[group][reference] = entry


def monthly_references(text):
    match = re.search(r"([A-Za-z]+(?:\s+and\s+[A-Za-z]+)?)\s+(\d{4})", text)
    if not match:
        return []
    return [f"{match[2]}-{MONTHS[m.lower()]:02}" for m in match[1].split(" and ")
            if m.lower() in MONTHS]


def parse_bls(soup, groups, url):
    names = {"Consumer Price Index": "cpi", "Producer Price Index": "ppi",
             "Employment Situation": "employment", "Job Openings and Labor Turnover Survey": "jolts"}
    for row in soup.select("tr"):
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) != 3:
            continue
        description = cells[2].get_text(" ", strip=True)
        for name, group in names.items():
            if not description.startswith(name + " for "):
                continue
            try:
                released = datetime.strptime(cells[0].get_text(" ", strip=True), "%A, %B %d, %Y").date().isoformat()
            except ValueError:
                continue
            for reference in monthly_references(description):
                put(groups, group, reference, released, url)


def parse_bea_entry(description, released, groups, url):
    if description.lower().startswith("personal income and outlays"):
        for reference in monthly_references(description):
            put(groups, "pce", reference, released, url)
    if ("gross domestic product" in description.lower() or description.startswith("GDP (")) and "advance" in description.lower():
        for word, ordinal in [("First", "1st"), ("Second", "2nd"), ("Third", "3rd"), ("Fourth", "4th")]:
            description = re.sub(rf"\b{word} Quarter", f"{ordinal} Quarter", description, flags=re.I)
        match = re.search(r"([1-4])(?:st|nd|rd|th) Quarter(?: and (?:Year|Annual))? (\d{4})", description, re.I)
        if match:
            put(groups, "gdp", f"{match[2]}-{(int(match[1])-1)*3+1:02}", released, url)


def parse_bea(soup, groups, url, year):
    for row in soup.select("tr"):
        timestamp = row.select_one("time[datetime]")
        if timestamp:
            title = row.select_one("a")
            if title:
                parse_bea_entry(title.get_text(" ", strip=True), timestamp["datetime"][:10], groups,
                                urljoin(url, title.get("href", "")))
            continue
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) < 3:
            continue
        match = re.match(r"([A-Za-z]+)\s+(\d{1,2})\b", cells[0].get_text(" ", strip=True))
        if not match or match[1].lower() not in MONTHS:
            continue
        released = date(year, MONTHS[match[1].lower()], int(match[2])).isoformat()
        parse_bea_entry(" ".join(c.get_text(" ", strip=True) for c in cells[2:]), released, groups, url)


def parse_ism(soup, groups, url):
    for row in soup.select("tr"):
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) < 3:
            continue
        refs = monthly_references(cells[0].get_text(" ", strip=True))
        if not refs:
            continue
        year, month = map(int, refs[0].split("-"))
        reference = f"{year if month > 1 else year-1}-{month-1 if month > 1 else 12:02}"
        for cell, group in zip(cells[1:3], ["ism_manufacturing", "ism_services"]):
            day = re.match(r"\d{1,2}", cell.get_text(" ", strip=True))
            if day:
                put(groups, group, reference, date(year, month, int(day[0])).isoformat(), url)


def enrich_release_calendar(payload, backfill=False):
    calendar = copy.deepcopy(payload.get("releaseCalendar", {}))
    groups = calendar.setdefault("groups", {})
    errors = []
    year = date.today().year
    years = range(2016, year + 1) if backfill else [year - 1, year]
    for y in years:
        url = f"https://www.bls.gov/schedule/{y}/home.htm"
        try:
            before = sum(len(v) for v in groups.values())
            parse_bls(fetch_soup(url), groups, url)
            print(f"BLS {y}: {sum(len(v) for v in groups.values())-before} new release dates", flush=True)
        except Exception as exc:
            errors.append(f"{url}: {exc}")
    for y in ([year - 1, year]):
        url = "https://www.bea.gov/news/schedule/" + ("full" if y == year else f"full-{y}")
        try:
            parse_bea(fetch_soup(url), groups, url, y)
        except Exception as exc:
            errors.append(f"{url}: {exc}")
    if backfill:
        url = "https://www.bea.gov/news/archive"
        try:
            soup = fetch_soup(url)
            options = soup.select('select[name="created_1"] option')
            for option in options:
                label = option.get_text(strip=True)
                if not label.isdigit() or not 2016 <= int(label) <= year:
                    continue
                for title in ["Personal Income and Outlays", "Gross Domestic Product"]:
                    query = urlencode({"field_related_product_target_id": "All", "created_1": option["value"], "title": title})
                    archive_url = f"{url}?{query}"
                    pending, seen = [archive_url], set()
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
                                       if link.get_text(" ", strip=True).startswith("Next page")
                                       and "page=" in link["href"])
                print(f"BEA archive {label}: parsed", flush=True)
        except Exception as exc:
            errors.append(f"{url}: {exc}")
    for month, manufacturing, services in ISM_2026:
        reference = f"{2026 if month > 1 else 2025}-{month-1 if month > 1 else 12:02}"
        for day, group in [(manufacturing, "ism_manufacturing"), (services, "ism_services")]:
            put(groups, group, reference, date(2026, month, day).isoformat(), ISM_URL)
    for group, reference, released, source in RELEASE_EXCEPTIONS:
        put(groups, group, reference, released, source)
    try:
        parse_ism(fetch_soup(ISM_URL), groups, ISM_URL)
    except Exception as exc:
        errors.append(f"{ISM_URL}: {exc}")
    calendar.update({"checkedAt": date.today().isoformat(), "dateBasis": "US publication date",
                     "valueBasis": "Latest revised observations, not historical vintages", "errors": errors})
    payload["releaseCalendar"] = calendar
    return payload

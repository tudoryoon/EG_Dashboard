"""Import explicitly attributed company-total ARR from TickerTrends' public RSS."""
from __future__ import annotations

import copy
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/llm-data.js"
HISTORY = ROOT / "data/llm-arr-public-history.json"
FEED = "https://blog.tickertrends.io/feed"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}encoded"
PRODUCT = re.compile(r"\b(codex|claude code|chatgpt|ads|segment|valuation)\b", re.I)
MONEY = re.compile(
    r"\b(?P<company>OpenAI|Anthropic)(?:['\u2019]s)?\s+"
    r"(?:ARR\s+(?:read\s+)?(?:reaching|reached|of|at)|at)\s+"
    r"(?:(?:roughly|about)\s+)?\$(?P<value>\d+(?:\.\d+)?)\s*(?:billion|B)\b", re.I
)
DATED = re.compile(
    r"^\s*(?:as of|by|on)\s+(?P<month>[A-Za-z]+)\.?\s+(?P<day>\d{1,2})"
    r"(?:,?\s+(?P<year>20\d{2}))?\b", re.I
)
MONTHS = {datetime(2000, n, 1).strftime("%b").lower(): n for n in range(1, 13)}


def parse_feed(xml: bytes, today: date | None = None) -> tuple[list[dict], list[str]]:
    today = today or datetime.now(timezone.utc).date()
    root = ET.fromstring(xml)
    items = root.findall("./channel/item")
    if root.tag != "rss" or not items:
        raise ValueError("Public RSS is missing articles; keep previous ARR data")
    points, warnings = [], []
    for item in items:
        title = item.findtext("title", "")
        if not re.search(r"\b(OpenAI|Anthropic)\b", title, re.I) or not re.search(r"\bARR\b", title, re.I) or PRODUCT.search(title):
            continue
        url = item.findtext("link", "")
        if urlparse(url).scheme != "https" or urlparse(url).hostname != "blog.tickertrends.io":
            continue
        published = parsedate_to_datetime(item.findtext("pubDate", "")).date()
        if published > today:
            continue
        body = BeautifulSoup(item.findtext(CONTENT) or "", "html.parser")
        for el in body.select("blockquote, script, style"):
            el.decompose()
        article_points = []
        for paragraph in body.find_all("p"):
            text = paragraph.get_text(" ", strip=True)
            # Only explicit TickerTrends estimates, not reported revenue or product ARR.
            if PRODUCT.search(text) or not re.search(r"TickerTrends.{0,70}\b(track\w*)\b|Our latest", text, re.I):
                continue
            if re.search(r"\b(forecast|could|would|target|projected|expected|next year)\b", text, re.I):
                continue
            for match in MONEY.finditer(text):
                prefix = text[:match.start()]
                if re.search(r"\b(Bloomberg|Reuters|reported|CFO)\b", prefix, re.I):
                    continue
                value = float(match["value"])
                if not 0 < value < 1000:
                    continue
                tail = text[match.end():]
                if re.match(r"\s*(?:[-\u2013\u2014]|to\s+\$|\+)", tail):
                    continue
                dated = DATED.match(tail)
                as_of = None
                if dated:
                    month = MONTHS.get(dated["month"][:3].lower())
                    if not month:
                        continue
                    year = int(dated["year"] or published.year)
                    try:
                        as_of = date(year, month, int(dated["day"]))
                    except ValueError:
                        continue
                    if as_of > published or as_of > today:
                        continue
                elif re.match(r"\s*(?:as of|by|on)\b", tail, re.I):
                    continue  # Date syntax changed: do not guess.
                elif not re.search(r"\b(latest|now|currently)\b", text, re.I):
                    continue
                article_points.append({
                    "provider": match["company"].lower(), "value": value,
                    "date": (as_of or published).isoformat(),
                    "asOf": as_of.isoformat() if as_of else None,
                    "publishedAt": published.isoformat(),
                    "dateBasis": "observation" if as_of else "publication",
                    "sourceUrl": url, "sourceTitle": title,
                })
        points.extend(article_points)
        if not article_points:
            warnings.append(f"Needs review: no unambiguous company-total ARR parsed: {url}")
    return points, warnings


def merge_history(existing: list[dict], fresh: list[dict]) -> list[dict]:
    merged = {(p["provider"], p["date"], p["sourceUrl"]): p for p in existing}
    for point in fresh:
        merged[(point["provider"], point["date"], point["sourceUrl"])] = point
    return sorted(merged.values(), key=lambda p: (p["date"], p["provider"], p["publishedAt"], p["sourceUrl"]))


def legacy_date(label: str, source: str) -> str:
    match = re.search(r"\b([A-Za-z]{3})\s+(\d{1,2})\b", source)
    if match and match[1].lower() in MONTHS:
        return date(int(label[:4]), MONTHS[match[1].lower()], int(match[2])).isoformat()
    return label + "-01"


def update_payload(payload: dict, history: list[dict]) -> dict:
    result = copy.deepcopy(payload)
    panel = result["revenue"]
    old_labels = panel["labels"]
    # Keep the existing monthly chart; retain every dated release in the history file.
    labels = sorted(set(old_labels) | {p["date"][:7] for p in history})
    latest = {}
    for point in history:
        key = (point["provider"], point["date"][:7])
        prior = latest.get(key)
        if prior and (point["date"], point["publishedAt"]) == (prior["date"], prior["publishedAt"]) and point["value"] != prior["value"]:
            raise ValueError(f"Conflicting ARR estimates for {key}")
        if not prior or (point["date"], point["publishedAt"]) > (prior["date"], prior["publishedAt"]):
            latest[key] = point
    for series in panel["series"]:
        values = dict(zip(old_labels, series["values"]))
        sources = dict(zip(old_labels, series["sourceLabels"]))
        if series["mode"] == "tracking":
            for (provider, month), point in latest.items():
                if provider != series["key"]:
                    continue
                observation = series.get("observations", {}).get(month)
                prior_date = (observation or {}).get("date") or legacy_date(month, sources.get(month) or "")
                if point["date"] < prior_date:
                    continue
                values[month] = point["value"]
                basis = "기준일" if point["asOf"] else "게시일 기준 · 관측일 미공개"
                sources[month] = f"TickerTrends 추정 · {basis} {point['date']}"
                series.setdefault("observations", {})[month] = {**point, "status": "tracking"}
        series["values"] = [values.get(label) for label in labels]
        series["sourceLabels"] = [sources.get(label) for label in labels]
    panel["labels"] = labels
    if history:
        snapshots = [s for s in result.get("snapshots", []) if s.get("kind") != "tracking"]
        for provider in ("openai", "anthropic"):
            candidates = [p for p in history if p["provider"] == provider]
            if candidates:
                point = max(candidates, key=lambda p: (p["date"], p["publishedAt"]))
                basis = "관측 기준" if point["asOf"] else "게시일 기준 · 관측일 미공개"
                snapshots.append({"provider": "OpenAI" if provider == "openai" else "Anthropic", "kind": "tracking",
                                  "metric": "TickerTrends ARR 추정치", "value": f"${point['value']:g}B",
                                  "asOf": f"{point['date']} · {basis}", "tone": provider})
        result["snapshots"] = snapshots
    if panel != payload["revenue"]:
        result["updatedAt"] = max(payload["updatedAt"], *(p["publishedAt"] for p in history))
        known_urls = {s["url"] for s in result.get("sources", [])}
        for point in history:
            if point["sourceUrl"] not in known_urls:
                result.setdefault("sources", []).append({"label": f"TickerTrends: {point['sourceTitle']}", "url": point["sourceUrl"]})
                known_urls.add(point["sourceUrl"])
    return result


def load_payload() -> dict:
    script = "const fs=require('fs'),vm=require('vm'),w={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});process.stdout.write(JSON.stringify(w.llmDashboardData));"
    run = subprocess.run(["node", "-e", script, str(DATA)], check=True, capture_output=True, encoding="utf-8", timeout=20)
    return json.loads(run.stdout)


def main() -> None:
    response = requests.get(FEED, timeout=(10, 40), headers={"User-Agent": "EGDashboard/1.0 public ARR research"})
    response.raise_for_status()
    fresh, warnings = parse_feed(response.content)
    for warning in warnings:
        print(f"::warning::{warning}")
    previous = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {"observations": []}
    history = merge_history(previous["observations"], fresh)
    payload = load_payload()
    updated = update_payload(payload, history)
    if updated != payload:
        DATA.write_text("window.llmDashboardData = " + json.dumps(updated, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    if history != previous["observations"]:
        HISTORY.write_text(json.dumps({"source": FEED, "observations": history}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Public ARR: {len(fresh)} observations found; chart {'updated' if updated != payload else 'unchanged'}; {len(warnings)} review warnings")


if __name__ == "__main__":
    main()

"""Refresh public company-total revenue run rates without inventing daily ARR."""
from __future__ import annotations

import copy
import csv
import io
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
EPOCH = "https://epoch.ai/data/ai_companies_revenue_reports.csv"
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


def parse_reported_csv(text: str, today: date | None = None) -> tuple[list[dict], list[str]]:
    today = today or datetime.now(timezone.utc).date()
    reader = csv.DictReader(io.StringIO(text))
    required = {"Company", "Date", "Annualized revenue (USD)", "Annualized revenue type",
                "Scope", "Confidence", "Report date", "Source 1"}
    if not required.issubset(reader.fieldnames or []):
        raise ValueError("Epoch revenue dataset schema changed")
    points, warnings = [], []
    for row in reader:
        if (row["Company"] not in ("OpenAI", "Anthropic") or row["Date"] < "2026-06-01"
                or row["Scope"] != "Full company" or row["Annualized revenue type"] != "Annualized run rate"
                or row["Confidence"] not in ("Likely", "Confident")):
            continue
        try:
            observed = date.fromisoformat(row["Date"])
            published = date.fromisoformat(row["Report date"])
            value = float(row["Annualized revenue (USD)"]) / 1e9
        except (ValueError, TypeError):
            warnings.append(f"Review invalid Epoch date/value: {row.get('Id')}")
            continue
        if published < observed:
            warnings.append(f"Review Epoch report date precedes observation: {row.get('Id')}")
            continue
        url = row["Source 1"]
        host = urlparse(url).hostname or ""
        allowed = ("ft.com", "reuters.com", "bloomberg.com", "axios.com", "openai.com", "anthropic.com")
        if (urlparse(url).scheme != "https" or not any(host == domain or host.endswith("." + domain) for domain in allowed)
                or observed > today or published > today or not 0 < value < 1000):
            continue
        # Do not turn quarterly revenue, interpolation or forecasts into ARR.
        if re.search(r"\b(forecast|target|projected|expected|could reach)\b", row.get("Other revenue info", ""), re.I):
            continue
        points.append({
            "provider": row["Company"].lower(), "kind": "reported", "value": value,
            "date": observed.isoformat(), "asOf": None, "observationMonth": observed.isoformat()[:7],
            "publishedAt": published.isoformat(), "dateBasis": "month-via-epoch",
            "sourceUrl": url, "sourceTitle": f"Epoch AI: {row.get('Id', row['Company'])}",
            "verificationUrl": EPOCH, "sourceName": "Epoch AI 공개 집계", "qualifier": "approximately",
            "note": "Epoch AI가 원문 출처와 함께 제공한 회사 전체 런레이트입니다. 기준 월만 표시하며 데이터셋의 일자를 정확한 관측일로 단정하지 않습니다."
                    + (" 후속 FT 보도에서 클라우드 파트너 매출을 gross-up한 이전 수치와 구분해 수정한 값입니다."
                       if "gross" in row.get("Notes", "").lower() else ""),
            "originalSourceNotes": row.get("Notes", ""), "confidence": row["Confidence"],
        })
    return points, warnings


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
        kind = point.get("kind", "tracking")
        key = (point["provider"], point["date"][:7], kind)
        prior = latest.get(key)
        if prior and (point["date"], point["publishedAt"]) == (prior["date"], prior["publishedAt"]) and point["value"] != prior["value"]:
            raise ValueError(f"Conflicting ARR estimates for {key}")
        order = ("publishedAt", "date") if kind == "reported" else ("date", "publishedAt")
        if not prior or tuple(point[k] for k in order) > tuple(prior[k] for k in order):
            latest[key] = point
    reported_changes = set()
    for series in panel["series"]:
        values = dict(zip(old_labels, series["values"]))
        sources = dict(zip(old_labels, series["sourceLabels"]))
        for (provider, month, kind), point in latest.items():
            if provider != series["key"] or kind != ("tracking" if series["mode"] == "tracking" else "reported"):
                continue
            observation = series.get("observations", {}).get(month)
            if kind == "tracking":
                prior_date = (observation or {}).get("date") or legacy_date(month, sources.get(month) or "")
                if point["date"] < prior_date:
                    continue
                values[month] = point["value"]
                basis = "기준일" if point["asOf"] else "게시일 기준 · 관측일 미공개"
                sources[month] = f"TickerTrends 추정 · {basis} {point['date']}"
                series.setdefault("observations", {})[month] = {**point, "status": "tracking"}
            else:
                prior_report = (observation or {}).get("reportedAt", "")
                if point["publishedAt"] < prior_report:
                    continue
                if point["publishedAt"] == prior_report and values.get(month) == point["value"]:
                    if observation.get("sourceUrl") != point["sourceUrl"] or all(observation.get(k) == v for k, v in point.items()):
                        continue
                record = {**point, "status": "reported", "reportedAt": point["publishedAt"]}
                if values.get(month) is not None and values[month] != point["value"]:
                    record["revisions"] = list((observation or {}).get("revisions", [])) + [{
                        "value": values[month], "sourceLabel": sources.get(month),
                        "sourceUrl": (observation or {}).get("sourceUrl"),
                    }]
                elif observation and observation.get("revisions"):
                    record["revisions"] = observation["revisions"]
                values[month] = point["value"]
                sources[month] = f"{point.get('sourceName', '언론 보도')} · {point['publishedAt']} · {month} 기준"
                series.setdefault("observations", {})[month] = record
                reported_changes.add(provider)
        series["values"] = [values.get(label) for label in labels]
        series["sourceLabels"] = [sources.get(label) for label in labels]
    panel["labels"] = labels
    if history:
        snapshots = [s for s in result.get("snapshots", []) if s.get("kind") != "tracking"]
        for provider in ("openai", "anthropic"):
            candidates = [p for p in history if p["provider"] == provider and p.get("kind", "tracking") == "tracking"]
            if candidates:
                point = max(candidates, key=lambda p: (p["date"], p["publishedAt"]))
                basis = "관측 기준" if point["asOf"] else "게시일 기준 · 관측일 미공개"
                snapshots.append({"provider": "OpenAI" if provider == "openai" else "Anthropic", "kind": "tracking",
                                  "metric": "TickerTrends ARR 추정치", "value": f"${point['value']:g}B",
                                  "asOf": f"{point['date']} · {basis}", "tone": provider, "sourceUrl": point["sourceUrl"]})
        result["snapshots"] = snapshots
    for provider in reported_changes:
        series = next(s for s in panel["series"] if s["key"] == provider and s["mode"] == "actual")
        month = max(label for label, value in zip(labels, series["values"]) if value is not None)
        record = series["observations"][month]
        value = series["values"][labels.index(month)]
        suffix = "+" if record.get("qualifier") == "more-than" else " 내외"
        snapshot = {"provider": "OpenAI" if provider == "openai" else "Anthropic", "kind": "reported",
                    "metric": "보도된 연환산 매출 런레이트", "value": f"${value:g}B{suffix}",
                    "asOf": f"{month} 기준 · {record['reportedAt']} 보도", "tone": provider,
                    "sourceUrl": record["sourceUrl"]}
        index = next((i for i, s in enumerate(result["snapshots"]) if s.get("tone") == provider and s.get("kind") != "tracking"), None)
        if index is None:
            result["snapshots"].insert(0, snapshot)
        else:
            result["snapshots"][index] = snapshot
    if panel != payload["revenue"]:
        result["updatedAt"] = max(payload["updatedAt"], *(p["publishedAt"] for p in history))
        known_urls = {s["url"] for s in result.get("sources", [])}
        for point in history:
            if point["sourceUrl"] not in known_urls:
                result.setdefault("sources", []).append({"label": point['sourceTitle'], "url": point["sourceUrl"]})
                known_urls.add(point["sourceUrl"])
            if point.get("verificationUrl") and point["verificationUrl"] not in known_urls:
                result["sources"].append({"label": "Epoch AI 공개 매출 이력: 원문 교차 확인", "url": point["verificationUrl"]})
                known_urls.add(point["verificationUrl"])
    return result


def load_payload() -> dict:
    script = "const fs=require('fs'),vm=require('vm'),w={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});process.stdout.write(JSON.stringify(w.llmDashboardData));"
    run = subprocess.run(["node", "-e", script, str(DATA)], check=True, capture_output=True, encoding="utf-8", timeout=20)
    return json.loads(run.stdout)


def main() -> None:
    fresh, warnings, checks = [], [], []
    for key, url, parser in [("tickertrends", FEED, parse_feed), ("epoch", EPOCH, parse_reported_csv)]:
        try:
            response = requests.get(url, timeout=(10, 35), headers={"User-Agent": "EGDashboard/1.0 public ARR research"})
            response.raise_for_status()
            points, notices = parser(response.content if key == "tickertrends" else response.text)
            fresh.extend(points)
            warnings.extend(notices)
            checks.append({"key": key, "url": url, "status": "ok", "observations": len(points), "reviewWarnings": len(notices)})
        except Exception as error:
            warnings.append(f"{key} public ARR check failed; stored observations preserved: {error}")
            checks.append({"key": key, "url": url, "status": "failed"})
    if not any(check["status"] == "ok" for check in checks):
        raise RuntimeError("All public ARR sources failed; previous files preserved")
    for warning in warnings:
        print(f"::warning::{warning}")
    previous = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {"observations": []}
    history = merge_history(previous["observations"], fresh)
    payload = load_payload()
    updated = update_payload(payload, history)
    chart_changed = updated["revenue"] != payload["revenue"]
    updated["arrRefresh"] = {"checkedAt": datetime.now(timezone.utc).isoformat(), "sources": checks}
    if updated != payload:
        DATA.write_text("window.llmDashboardData = " + json.dumps(updated, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    if history != previous["observations"]:
        HISTORY.write_text(json.dumps({"source": FEED, "sourceUrls": [FEED, EPOCH], "observations": history}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Public ARR: {len(fresh)} observations found; chart {'updated' if chart_changed else 'unchanged'}; {len(warnings)} review warnings")


if __name__ == "__main__":
    main()

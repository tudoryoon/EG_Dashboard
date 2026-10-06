"""Independent earnings sources, persistent fallback and coverage reconciliation."""
from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
from urllib.parse import quote

import requests

HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "text/html,application/json"}
EXCLUDED_ETFS = {"DRAM"}


class EmbeddedJSONParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == "script" and dict(attrs).get("type") == "application/json":
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.current is not None:
            self.blocks.append("".join(self.current))
            self.current = None


def parse_yahoo_summary(markup, ticker):
    parser = EmbeddedJSONParser()
    parser.feed(markup)
    for block in parser.blocks:
        try:
            wrapped = json.loads(block)
            payload = json.loads(wrapped["body"]) if isinstance(wrapped.get("body"), str) else wrapped
            results = payload.get("quoteSummary", {}).get("result") or []
        except (ValueError, TypeError, AttributeError):
            continue
        for item in results:
            price = item.get("price") or {}
            if price.get("symbol", "").upper() != ticker.upper():
                continue
            quote_type = price.get("quoteType")
            if quote_type == "ETF":
                return {"ticker": ticker, "excluded": True, "dates": []}
            if quote_type != "EQUITY":
                raise ValueError(f"Unsupported Yahoo quote type: {quote_type}")
            calendar = item.get("calendarEvents")
            if not isinstance(calendar, dict):
                raise ValueError("Yahoo earnings calendar module missing")
            earnings = calendar.get("earnings") or {}
            dates = []
            for value in earnings.get("earningsDate") or []:
                # fmt is the provider's reporting date, not a synthetic UTC timestamp.
                dates.append(date.fromisoformat(value["fmt"]).isoformat())
            dates = sorted(set(dates))
            if len(dates) > 2:
                raise ValueError("Unexpected Yahoo earnings date range")
            return {
                "ticker": ticker, "dates": dates, "session": "",
                "providerEstimate": earnings.get("isEarningsDateEstimate"),
                "name": price.get("shortName") or ticker,
                "sourceUrl": f"https://finance.yahoo.com/quote/{quote(ticker)}/",
            }
    raise ValueError("Yahoo symbol/earnings data not found; response may be a challenge")


def fetch_yahoo(ticker):
    response = requests.get(f"https://finance.yahoo.com/quote/{quote(ticker)}/", headers=HEADERS, timeout=12)
    response.raise_for_status()
    return parse_yahoo_summary(response.text, ticker)


def safe_fetch(fetch, key):
    try:
        return key, fetch(key), None
    except Exception as error:
        return key, None, f"{type(error).__name__}: {str(error)[:180]}"


def collect_sources(universe, start, end, cache, request_nasdaq, now, yahoo_fetch=fetch_yahoo):
    """Replace only successfully checked date/ticker partitions, never a whole source."""
    sources = cache.setdefault("sources", {})
    nasdaq = sources.setdefault("Nasdaq", {"events": [], "checks": {}})
    yahoo = sources.setdefault("Yahoo", {"records": {}, "checks": {}})
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)
            if (start + timedelta(days=i)).weekday() < 5]

    def get_nasdaq(day):
        with requests.Session() as session:
            session.headers.update(HEADERS | {"Referer": "https://www.nasdaq.com/"})
            return request_nasdaq(session, day)

    with ThreadPoolExecutor(max_workers=4) as pool:
        for day, rows, error in pool.map(lambda day: safe_fetch(get_nasdaq, day), days):
            key = day.isoformat()
            old_check = nasdaq["checks"].get(key, {})
            nasdaq["checks"][key] = {"checkedAt": now, "status": "failed" if error else "success",
                                     "lastSuccessAt": old_check.get("lastSuccessAt") if error else now,
                                     "error": error}
            if error:
                continue
            fresh = []
            for row in rows:
                ticker = str(row.get("symbol") or "").upper().replace("/", ".").replace("-", ".")
                if ticker not in universe or ticker in EXCLUDED_ETFS:
                    continue
                session = {"time-after-hours": "A", "time-pre-market": "B"}.get(row.get("time"), "")
                fresh.append({"ticker": ticker, "date": key, "session": session,
                              "name": row.get("name") or universe[ticker]["name"],
                              "note": " · ".join(f"{label} {row[key]}" for key, label in
                                                  (("fiscalQuarterEnding", "회계분기 종료"), ("epsForecast", "EPS 컨센서스")) if row.get(key)),
                              "fetchedAt": now,
                              "sourceUrl": f"https://www.nasdaq.com/market-activity/earnings?date={key}"})
            retained = [item for item in nasdaq["events"] if item["date"] != key]
            nasdaq["events"] = retained + fresh

    tickers = sorted(set(universe) - EXCLUDED_ETFS)
    with ThreadPoolExecutor(max_workers=4) as pool:
        for offset in range(0, len(tickers), 16):
            batch = tickers[offset:offset + 16]
            results = list(pool.map(lambda ticker: safe_fetch(yahoo_fetch, ticker), batch))
            for ticker, record, error in results:
                old_check = yahoo["checks"].get(ticker, {})
                yahoo["checks"][ticker] = {"checkedAt": now, "status": "failed" if error else "success",
                                          "lastSuccessAt": old_check.get("lastSuccessAt") if error else now,
                                          "error": error}
                if not error:
                    yahoo["records"][ticker] = record | {"fetchedAt": now}
            print(f"Yahoo earnings: checked {offset + len(batch)}/{len(tickers)}", flush=True)
            if len(batch) == 16 and all(error for _, _, error in results):
                # Stop hammering a blocked/unavailable provider; keep every cached record.
                for ticker in tickers[offset + 16:]:
                    old_check = yahoo["checks"].get(ticker, {})
                    yahoo["checks"][ticker] = {"checkedAt": now, "status": "failed",
                                              "lastSuccessAt": old_check.get("lastSuccessAt"),
                                              "error": "Skipped after 16 consecutive provider failures"}
                break

    nasdaq["events"] = [item for item in nasdaq["events"]
                        if item["ticker"] in universe and start.isoformat() <= item["date"] <= end.isoformat()]
    nasdaq["checks"] = {k: v for k, v in nasdaq["checks"].items() if start.isoformat() <= k <= end.isoformat()}
    yahoo["records"] = {k: v for k, v in yahoo["records"].items() if k in universe}
    yahoo["checks"] = {k: v for k, v in yahoo["checks"].items() if k in universe}
    cache.update({"version": 1, "updatedAt": now})
    return cache


def reconcile(universe, start, display_end, collection_end, cache, previous_events, localize):
    sources = cache.get("sources", {})
    nasdaq = sources.get("Nasdaq", {})
    yahoo = sources.get("Yahoo", {})
    previous = {e["ticker"]: e for e in previous_events if e.get("ticker") in universe
                and start.isoformat() <= e["date"] <= collection_end.isoformat()}
    events, statuses = [], []
    for ticker, company in sorted(universe.items()):
        yr = yahoo.get("records", {}).get(ticker, {})
        if ticker in EXCLUDED_ETFS or yr.get("excluded"):
            statuses.append({"ticker": ticker, "name": company["name"], "status": "excluded-etf"})
            continue
        candidates = {}
        for item in nasdaq.get("events", []):
            if item["ticker"] == ticker and start.isoformat() <= item["date"] <= collection_end.isoformat():
                candidates.setdefault(item["date"], []).append(item | {"source": "Nasdaq"})
        ydates = yr.get("dates", [])
        if len(ydates) == 1 and start.isoformat() <= ydates[0] <= collection_end.isoformat():
            candidates.setdefault(ydates[0], []).append(yr | {"date": ydates[0], "source": "Yahoo"})
        elif len(ydates) == 2:
            for day in list(candidates):
                if ydates[0] <= day <= ydates[-1]:
                    candidates[day].append(yr | {"date": day, "source": "Yahoo", "dateRange": ydates})
        old = previous.get(ticker)
        # Never discard a still-valid official confirmation or a schedule lost by a source.
        if old and (old.get("confirmed") or not candidates):
            event = dict(old)
            event["stale"] = not event.get("confirmed", False)
            event["verificationStatus"] = "confirmed" if event.get("confirmed") else "cached"
            if not event.get("confirmed"):
                event["verificationLabel"] = "이전 일정·재확인"
                event["note"] = "이전 일정 유지·재확인 · " + event.get("sourceLabel", "")
            events.append(event)
            statuses.append({"ticker": ticker, "name": company["name"], "date": event["date"],
                             "status": event["verificationStatus"] if event["date"] <= display_end.isoformat() else "outside-window"})
            continue
        if not candidates:
            future = [d for d in ydates if d >= start.isoformat()]
            statuses.append({"ticker": ticker, "name": company["name"],
                             "status": "outside-window" if future and min(future) > display_end.isoformat()
                             else "date-range" if len(future) == 2 else "unconfirmed",
                             "dateRange": future})
            continue
        conflict = len(candidates) > 1
        selected = old["date"] if old and old["date"] in candidates else min(candidates)
        if not old or old["date"] not in candidates:
            selected = next((d for d in sorted(candidates) if any(i["source"] == "Nasdaq" for i in candidates[d])), selected)
        if selected > display_end.isoformat() and any(d <= display_end.isoformat() for d in candidates):
            # A conflicting later estimate must not hide an earlier candidate from the calendar.
            selected = min(candidates)
        evidence = candidates[selected]
        names = sorted(set(i["source"] for i in evidence))
        stale = any(sources[i["source"]].get("checks", {}).get(selected if i["source"] == "Nasdaq" else ticker, {}).get("status") != "success" for i in evidence)
        status = "conflict" if conflict else "cached" if stale else "cross-checked" if len(names) > 1 else "single-source"
        sessions = set(i.get("session") for i in evidence if i.get("session"))
        session = next(iter(sessions)) if len(sessions) == 1 else ""
        kst_date, _, kst_time = localize(date.fromisoformat(selected), {"A": "time-after-hours", "B": "time-pre-market"}.get(session, ""))
        labels = {"conflict": "날짜 불일치·재확인", "cached": "이전 일정 유지·재확인",
                  "cross-checked": "예상·교차 확인", "single-source": "예상·단일 출처"}
        event = {"ticker": ticker, "date": selected, "usDate": selected, "kstDate": kst_date.isoformat(),
                 "time": kst_time, "session": session, "kind": "earnings", "confirmed": False,
                 "title": f"{company['name']} ({ticker}) 실적 발표", "sector": company["sector"],
                 "sourceLabel": " + ".join(names), "sourceUrl": evidence[0]["sourceUrl"],
                 "verificationStatus": status, "verificationLabel": labels[status], "stale": stale,
                 "note": labels[status] + " · " + " + ".join(names),
                 "evidence": [{"source": i["source"], "date": d, "session": i.get("session", ""),
                               "url": i["sourceUrl"], "fetchedAt": i.get("fetchedAt"),
                               "providerEstimate": i.get("providerEstimate"), "dateRange": i.get("dateRange")}
                              for d, items in sorted(candidates.items()) for i in items]}
        if conflict:
            event["note"] += " · " + ", ".join(f"{i['source']} {d}" for d, items in sorted(candidates.items()) for i in items)
        for item in evidence:
            if item.get("note"):
                event["note"] += " · " + item["note"]
        events.append(event)
        statuses.append({"ticker": ticker, "name": company["name"], "date": selected,
                         "status": status if selected <= display_end.isoformat() else "outside-window",
                         "verificationStatus": status, "candidateDates": sorted(candidates)})
    summary = {}
    for source, body in sources.items():
        checks = list(body.get("checks", {}).values())
        successes = [c.get("lastSuccessAt") for c in checks if c.get("lastSuccessAt")]
        summary[source] = {"successfulChecks": sum(c["status"] == "success" for c in checks),
                           "failedChecks": sum(c["status"] == "failed" for c in checks),
                           "lastSuccessAt": max(successes) if successes else None,
                           "warnings": [f"{k}: {v['error']}" for k, v in body.get("checks", {}).items() if v.get("error")][:8]}
    return events, {"collectionEnd": collection_end.isoformat(), "symbols": statuses, "sources": summary}

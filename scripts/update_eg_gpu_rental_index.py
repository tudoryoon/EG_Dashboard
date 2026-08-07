from __future__ import annotations

import argparse
import csv
import io
import json
import os
import statistics
import time
import urllib.parse
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "eg-gpu-rental-index-data.js"
OUTPUT_PREFIX = "window.egGpuRentalIndexData = "

VERSION_URL = "https://dstack-gpu-pricing.s3.eu-west-1.amazonaws.com/v2/version"
CATALOG_URL = "https://dstack-gpu-pricing.s3.eu-west-1.amazonaws.com/v2/{version}/catalog.zip"
WORKFLOW_RUNS_URL = "https://api.github.com/repos/dstackai/gpuhunt/actions/workflows/catalogs.yml/runs"
SOURCE_REPOSITORY_URL = "https://github.com/dstackai/gpuhunt"
KNOWN_BASE_VERSION = "20250622-9376"
DEFAULT_START_DATE = date(2025, 6, 22)
MINIMUM_PROVIDERS = 4
SMOOTHING_HALF_LIFE_DAYS = 105

# Verified latest successful public catalog for each weekly backfill date. Keeping
# this map local makes rebuilds deterministic and avoids consuming GitHub's API
# quota every time the dashboard history is regenerated.
KNOWN_BACKFILL_VERSIONS = {
    "2025-06-22": "20250622-9376",
    "2025-07-06": "20250706-9727",
    "2025-07-13": "20250713-9895",
    "2025-07-20": "20250720-10063",
    "2025-07-27": "20250727-10231",
    "2025-08-10": "20250810-10571",
    "2025-08-24": "20250824-10909",
    "2025-08-31": "20250831-11077",
    "2025-09-14": "20250914-11416",
    "2025-09-21": "20250921-11584",
    "2025-09-28": "20250928-11749",
    "2025-10-05": "20251005-11926",
    "2025-10-12": "20251012-12094",
    "2025-10-19": "20251019-12265",
    "2025-10-26": "20251026-12442",
    "2025-11-02": "20251102-12607",
    "2025-11-09": "20251109-12782",
    "2025-11-16": "20251116-12950",
    "2025-11-23": "20251123-13118",
    "2025-11-30": "20251130-13287",
    "2025-12-07": "20251207-13456",
    "2025-12-14": "20251214-13628",
    "2026-01-04": "20260104-14132",
    "2026-01-11": "20260111-14300",
    "2026-01-18": "20260118-14468",
    "2026-01-25": "20260125-14636",
    "2026-02-01": "20260201-14802",
    "2026-02-08": "20260208-14965",
    "2026-02-15": "20260215-15126",
    "2026-02-22": "20260222-15288",
    "2026-03-01": "20260301-15450",
    "2026-03-08": "20260308-15611",
    "2026-03-22": "20260322-15934",
    "2026-03-29": "20260329-16096",
    "2026-04-05": "20260405-16258",
    "2026-04-12": "20260412-16419",
    "2026-04-19": "20260419-16575",
    "2026-04-26": "20260426-16731",
    "2026-05-31": "20260531-17388",
    "2026-06-07": "20260607-17495",
    "2026-06-14": "20260614-17607",
    "2026-06-21": "20260621-17714",
    "2026-07-26": "20260726-18405",
    "2026-08-02": "20260802-18552",
}

HYPERSCALERS = {"aws", "azure", "gcp", "oci"}

MODEL_DEFINITIONS = {
    "h100_80": {
        "label": "H100 80GB",
        "names": {"H100"},
        "memoryMin": 70,
        "memoryMax": 90,
        "indexMember": True,
        "display": True,
        "color": "#0f9f83",
    },
    "a100_80": {
        "label": "A100 80GB",
        "names": {"A100"},
        "memoryMin": 70,
        "memoryMax": 90,
        "indexMember": True,
        "display": True,
        "color": "#2563eb",
    },
    "l40s": {
        "label": "L40S",
        "names": {"L40S"},
        "memoryMin": 40,
        "memoryMax": 55,
        "indexMember": True,
        "display": False,
        "color": "#7c3aed",
    },
    "h200_141": {
        "label": "H200 141GB",
        "names": {"H200"},
        "memoryMin": 130,
        "memoryMax": 150,
        "indexMember": False,
        "display": True,
        "color": "#d97706",
    },
    "b200_180": {
        "label": "B200 180GB",
        "names": {"B200"},
        "memoryMin": 170,
        "memoryMax": 195,
        "indexMember": False,
        "display": True,
        "color": "#dc2626",
    },
}


def request_bytes(url: str, *, accept: str = "*/*") -> bytes:
    headers = {
        "Accept": accept,
        "User-Agent": "EG-Dashboard-GPU-Index/1.0",
    }
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token and "api.github.com" in url:
        headers["Authorization"] = f"Bearer {token}"
        headers["X-GitHub-Api-Version"] = "2022-11-28"
    request = Request(url, headers=headers)
    for attempt in range(4):
        try:
            with urlopen(request, timeout=90) as response:  # nosec B310 - fixed public data hosts
                return response.read()
        except HTTPError:
            raise
        except (OSError, TimeoutError, URLError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Unable to fetch {url}")


def fetch_text(url: str) -> str:
    return request_bytes(url, accept="text/plain").decode("utf-8").strip().strip('"')


def fetch_json(url: str) -> dict[str, object]:
    payload = json.loads(request_bytes(url, accept="application/vnd.github+json").decode("utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"Expected an object from {url}")
    return payload


def number(value: object) -> float | None:
    try:
        parsed = float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None
    return parsed if parsed is not None and parsed == parsed else None


def normalized_gpu_name(value: object) -> str:
    return "".join(character for character in str(value or "").upper() if character.isalnum())


def is_spot(value: object) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y"}


def model_key_for_row(row: dict[str, str]) -> str | None:
    name = normalized_gpu_name(row.get("gpu_name"))
    memory = number(row.get("gpu_memory"))
    if memory is None:
        return None
    for key, definition in MODEL_DEFINITIONS.items():
        names = {normalized_gpu_name(item) for item in definition["names"]}
        if name in names and float(definition["memoryMin"]) <= memory <= float(definition["memoryMax"]):
            return key
    return None


def percentile(values: Iterable[float], quantile: float) -> float | None:
    ordered = sorted(float(value) for value in values)
    if not ordered:
        return None
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * quantile
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def rounded(value: float | None, digits: int = 4) -> float | None:
    return round(value, digits) if value is not None else None


def ewma_irregular(
    labels: list[str],
    values: list[float | None],
    half_life_days: int,
) -> list[float | None]:
    smoothed_values: list[float | None] = []
    previous_date: date | None = None
    previous_value: float | None = None
    for label, value in zip(labels, values):
        current_date = date.fromisoformat(label)
        if value is None:
            smoothed_values.append(None)
        elif previous_value is None or previous_date is None:
            previous_value = float(value)
            smoothed_values.append(rounded(previous_value))
        else:
            elapsed_days = max((current_date - previous_date).days, 1)
            alpha = 1 - 0.5 ** (elapsed_days / half_life_days)
            previous_value += alpha * (float(value) - previous_value)
            smoothed_values.append(rounded(previous_value))
        if value is not None:
            previous_date = current_date
    return smoothed_values


def parse_catalog(catalog_bytes: bytes, version: str) -> dict[str, object]:
    provider_model_offers: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    with zipfile.ZipFile(io.BytesIO(catalog_bytes)) as archive:
        for member in archive.namelist():
            if not member.lower().endswith(".csv"):
                continue
            provider = Path(member).stem.lower()
            with archive.open(member) as raw_file:
                text_file = io.TextIOWrapper(raw_file, encoding="utf-8-sig", newline="")
                for row in csv.DictReader(text_file):
                    if is_spot(row.get("spot")):
                        continue
                    model_key = model_key_for_row(row)
                    price = number(row.get("price"))
                    gpu_count = number(row.get("gpu_count"))
                    if not model_key or price is None or gpu_count is None or price <= 0 or gpu_count <= 0:
                        continue
                    price_per_gpu_hour = price / gpu_count
                    if 0 < price_per_gpu_hour < 100:
                        provider_model_offers[model_key][provider].append(price_per_gpu_hour)

    models: dict[str, object] = {}
    total_offers = 0
    all_providers: set[str] = set()
    for model_key, definition in MODEL_DEFINITIONS.items():
        provider_offers = provider_model_offers.get(model_key, {})
        provider_medians = {
            provider: rounded(statistics.median(values))
            for provider, values in provider_offers.items()
            if values
        }
        provider_count = len(provider_medians)
        offer_count = sum(len(values) for values in provider_offers.values())
        total_offers += offer_count
        all_providers.update(provider_medians)
        market_price = (
            statistics.median(float(value) for value in provider_medians.values())
            if provider_count >= MINIMUM_PROVIDERS
            else None
        )
        hyperscaler_values = [
            float(value) for provider, value in provider_medians.items() if provider in HYPERSCALERS
        ]
        neo_cloud_values = [
            float(value) for provider, value in provider_medians.items() if provider not in HYPERSCALERS
        ]
        hyperscaler_median = statistics.median(hyperscaler_values) if hyperscaler_values else None
        neo_cloud_median = statistics.median(neo_cloud_values) if neo_cloud_values else None
        premium_pct = (
            (hyperscaler_median / neo_cloud_median - 1) * 100
            if hyperscaler_median is not None and neo_cloud_median not in (None, 0)
            else None
        )
        models[model_key] = {
            "label": definition["label"],
            "price": rounded(market_price),
            "providerCount": provider_count,
            "neoCloudProviderCount": len(neo_cloud_values),
            "hyperscalerProviderCount": len(hyperscaler_values),
            "offerCount": offer_count,
            "providerMedians": dict(sorted(provider_medians.items())),
            "hyperscalerMedian": rounded(hyperscaler_median),
            "neoCloudMedian": rounded(neo_cloud_median),
            "hyperscalerPremiumPct": rounded(premium_pct, 2),
        }

    version_date = datetime.strptime(version[:8], "%Y%m%d").date().isoformat()
    return {
        "date": version_date,
        "catalogVersion": version,
        "catalogUrl": CATALOG_URL.format(version=version),
        "providerCount": len(all_providers),
        "offerCount": total_offers,
        "models": models,
    }


def download_snapshot(version: str) -> dict[str, object]:
    catalog_url = CATALOG_URL.format(version=version)
    return parse_catalog(request_bytes(catalog_url, accept="application/zip"), version)


def workflow_versions_for_date(target: date) -> list[str]:
    query = urllib.parse.urlencode({"created": target.isoformat(), "per_page": 100})
    payload = fetch_json(f"{WORKFLOW_RUNS_URL}?{query}")
    runs = payload.get("workflow_runs")
    if not isinstance(runs, list):
        return []
    successful_runs = [
        run
        for run in runs
        if isinstance(run, dict) and run.get("conclusion") == "success" and number(run.get("run_number")) is not None
    ]
    successful_runs.sort(key=lambda run: str(run.get("created_at") or ""), reverse=True)
    return [f"{target:%Y%m%d}-{int(float(run['run_number']))}" for run in successful_runs]


def download_historical_snapshot(target: date) -> dict[str, object] | None:
    known_version = KNOWN_BACKFILL_VERSIONS.get(target.isoformat())
    versions = [known_version] if known_version else workflow_versions_for_date(target)
    for version in versions:
        try:
            return download_snapshot(version)
        except HTTPError as exc:
            if exc.code != 404:
                raise
    return None


def load_existing_history() -> list[dict[str, object]]:
    if not OUTPUT_PATH.exists():
        return []
    text = OUTPUT_PATH.read_text(encoding="utf-8").strip()
    if not text.startswith(OUTPUT_PREFIX):
        return []
    try:
        payload = json.loads(text[len(OUTPUT_PREFIX):].rstrip(";"))
    except json.JSONDecodeError:
        return []
    history = payload.get("history") if isinstance(payload, dict) else None
    return [item for item in history if isinstance(item, dict)] if isinstance(history, list) else []


def compact_snapshot(snapshot: dict[str, object]) -> dict[str, object]:
    models = snapshot.get("models") if isinstance(snapshot.get("models"), dict) else {}
    return {
        "date": snapshot.get("date"),
        "catalogVersion": snapshot.get("catalogVersion"),
        "providerCount": snapshot.get("providerCount"),
        "offerCount": snapshot.get("offerCount"),
        "models": {
            key: {
                "price": model.get("price"),
                "neoCloudMedian": model.get("neoCloudMedian"),
                "hyperscalerMedian": model.get("hyperscalerMedian"),
                "providerCount": model.get("providerCount"),
                "neoCloudProviderCount": model.get("neoCloudProviderCount"),
                "hyperscalerProviderCount": model.get("hyperscalerProviderCount"),
                "offerCount": model.get("offerCount"),
            }
            for key, model in models.items()
            if isinstance(model, dict)
        },
    }


def calculate_change(values: list[float | None], labels: list[str], days: int) -> float | None:
    valid = [(date.fromisoformat(label), value) for label, value in zip(labels, values) if value is not None]
    if len(valid) < 2:
        return None
    latest_date, latest_value = valid[-1]
    target = latest_date - timedelta(days=days)
    prior = next(((item_date, value) for item_date, value in reversed(valid[:-1]) if item_date <= target), None)
    if prior is None or prior[1] == 0:
        return None
    return rounded((float(latest_value) / float(prior[1]) - 1) * 100, 2)


def build_payload(snapshots: list[dict[str, object]], latest_full_snapshot: dict[str, object]) -> dict[str, object]:
    ordered = sorted(snapshots, key=lambda item: str(item.get("date") or ""))
    index_keys = [key for key, definition in MODEL_DEFINITIONS.items() if definition["indexMember"]]
    base_snapshot = next(
        (
            item
            for item in ordered
            if all(
                number(((item.get("models") or {}).get(key) or {}).get("neoCloudMedian")) is not None
                for key in index_keys
            )
        ),
        None,
    )
    if base_snapshot is None:
        raise RuntimeError("No snapshot has complete coverage for the fixed index panel")
    base_date = str(base_snapshot["date"])
    base_prices = {
        key: float(base_snapshot["models"][key]["neoCloudMedian"])
        for key in index_keys
    }

    labels: list[str] = []
    index_values: list[float | None] = []
    band_low_values: list[float | None] = []
    band_high_values: list[float | None] = []
    model_series = {
        key: {
            "key": key,
            "label": definition["label"],
            "unit": "USD per GPU-hour",
            "color": definition["color"],
            "indexMember": definition["indexMember"],
            "display": definition["display"],
            "dates": [],
            "values": [],
            "rawValues": [],
            "allMarketValues": [],
            "hyperscalerValues": [],
            "providerCounts": [],
            "offerCounts": [],
        }
        for key, definition in MODEL_DEFINITIONS.items()
    }

    for snapshot in ordered:
        snapshot_date = str(snapshot.get("date") or "")
        models = snapshot.get("models") if isinstance(snapshot.get("models"), dict) else {}
        labels.append(snapshot_date)
        for key, series in model_series.items():
            model = models.get(key) if isinstance(models.get(key), dict) else {}
            price = number(model.get("neoCloudMedian"))
            series["dates"].append(snapshot_date)
            series["rawValues"].append(rounded(price))
            series["allMarketValues"].append(rounded(number(model.get("price"))))
            series["hyperscalerValues"].append(rounded(number(model.get("hyperscalerMedian"))))
            series["providerCounts"].append(int(number(model.get("neoCloudProviderCount")) or 0))
            series["offerCounts"].append(int(number(model.get("offerCount")) or 0))

    for series in model_series.values():
        series["values"] = ewma_irregular(
            labels,
            series["rawValues"],
            SMOOTHING_HALF_LIFE_DAYS,
        )

    for index in range(len(labels)):
        relatives = [
            100 * float(model_series[key]["values"][index]) / base_prices[key]
            for key in index_keys
            if model_series[key]["values"][index] is not None
        ]
        if len(relatives) == len(index_keys):
            index_values.append(rounded(statistics.median(relatives)))
            band_low_values.append(rounded(percentile(relatives, 0.2)))
            band_high_values.append(rounded(percentile(relatives, 0.8)))
        else:
            index_values.append(None)
            band_low_values.append(None)
            band_high_values.append(None)

    for series in model_series.values():
        latest_index = next(
            (index for index in range(len(series["values"]) - 1, -1, -1) if series["values"][index] is not None),
            None,
        )
        series["latestDate"] = series["dates"][latest_index] if latest_index is not None else None
        series["latestValue"] = series["values"][latest_index] if latest_index is not None else None
        series["latestProviderCount"] = series["providerCounts"][latest_index] if latest_index is not None else 0
        series["latestOfferCount"] = series["offerCounts"][latest_index] if latest_index is not None else 0

    latest_models = latest_full_snapshot.get("models") if isinstance(latest_full_snapshot.get("models"), dict) else {}
    return {
        "updatedAt": labels[-1],
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "dstack gpuhunt public catalog",
            "repositoryUrl": SOURCE_REPOSITORY_URL,
            "versionUrl": VERSION_URL,
            "catalogUrl": latest_full_snapshot.get("catalogUrl"),
            "license": "MPL-2.0",
            "calculation": "EG Dashboard",
        },
        "methodology": {
            "name": "EG Smoothed Neo-Cloud GPU Rental Index",
            "baseDate": base_date,
            "baseValue": 100,
            "indexPanel": index_keys,
            "minimumProviders": MINIMUM_PROVIDERS,
            "historyFrequency": "Weekly public-catalog backfill; daily snapshots from deployment onward",
            "unitFormula": "offer USD per GPU-hour = instance hourly price / GPU count",
            "providerFormula": "provider model price = median of eligible on-demand offers",
            "modelFormula": "raw neo-cloud model price = median of non-hyperscaler provider medians",
            "smoothingFormula": f"calendar-time EWMA of raw model price, half-life = {SMOOTHING_HALF_LIFE_DAYS} days",
            "indexFormula": "EG smoothed neo-cloud index = median of fixed-panel smoothed model price relatives, base date = 100",
            "bandFormula": "dispersion band = 20th to 80th percentile of fixed-panel model price relatives",
        },
        "baseDate": base_date,
        "baseValue": 100,
        "basePrices": {key: rounded(value) for key, value in base_prices.items()},
        "labels": labels,
        "indexValues": index_values,
        "bandLowValues": band_low_values,
        "bandHighValues": band_high_values,
        "latestValue": next((value for value in reversed(index_values) if value is not None), None),
        "weeklyChangePct": calculate_change(index_values, labels, 7),
        "models": model_series,
        "latestSnapshot": {
            "date": latest_full_snapshot.get("date"),
            "catalogVersion": latest_full_snapshot.get("catalogVersion"),
            "catalogUrl": latest_full_snapshot.get("catalogUrl"),
            "providerCount": latest_full_snapshot.get("providerCount"),
            "offerCount": latest_full_snapshot.get("offerCount"),
            "models": latest_models,
        },
        "history": [compact_snapshot(snapshot) for snapshot in ordered],
    }


def write_payload(payload: dict[str, object]) -> None:
    OUTPUT_PATH.write_text(
        OUTPUT_PREFIX + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def backfill_targets(start: date, end: date, step_days: int) -> list[date]:
    targets = []
    cursor = start
    while cursor <= end:
        targets.append(cursor)
        cursor += timedelta(days=step_days)
    if targets[-1] != end:
        targets.append(end)
    return targets


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the independent EG GPU Rental Index from gpuhunt catalogs.")
    parser.add_argument("--backfill", action="store_true", help="Rebuild history from public gpuhunt catalog snapshots.")
    parser.add_argument("--start-date", default=DEFAULT_START_DATE.isoformat())
    parser.add_argument("--backfill-step-days", type=int, default=7)
    parser.add_argument("--catalog-version", help="Use a specific public catalog version for the latest snapshot.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    latest_version = args.catalog_version or fetch_text(VERSION_URL)
    latest_snapshot = download_snapshot(latest_version)

    if args.backfill:
        start = date.fromisoformat(args.start_date)
        end = date.fromisoformat(str(latest_snapshot["date"]))
        snapshots_by_date: dict[str, dict[str, object]] = {}
        for target in backfill_targets(start, end, max(1, args.backfill_step_days)):
            if target == end:
                snapshot = latest_snapshot
            else:
                try:
                    snapshot = download_historical_snapshot(target)
                except (HTTPError, URLError) as exc:
                    status = getattr(exc, "code", exc.__class__.__name__)
                    print(f"Skipped {target}: source request failed ({status})")
                    continue
            if snapshot is None:
                print(f"Skipped {target}: no successful public catalog snapshot")
                continue
            snapshots_by_date[str(snapshot["date"])] = snapshot
            print(f"Loaded {snapshot['date']} ({snapshot['catalogVersion']})")
    else:
        snapshots_by_date = {
            str(item.get("date")): item
            for item in load_existing_history()
            if item.get("date")
        }
        snapshots_by_date[str(latest_snapshot["date"])] = latest_snapshot

    ordered_snapshots = sorted(snapshots_by_date.values(), key=lambda item: str(item.get("date") or ""))
    payload = build_payload(ordered_snapshots, latest_snapshot)
    write_payload(payload)
    print(f"Wrote {OUTPUT_PATH}")
    print(
        f"EG GPU Rental Index {payload['updatedAt']}: {payload['latestValue']} "
        f"from catalog {latest_snapshot['catalogVersion']}"
    )


if __name__ == "__main__":
    main()

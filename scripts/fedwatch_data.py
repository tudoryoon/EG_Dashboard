from __future__ import annotations

import calendar
import csv
import io
import math
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

import requests
from curl_cffi import requests as curl_requests


CME_FEDWATCH_URL = "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
CME_SETTLEMENTS_URL = (
    "https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/305/FUT"
)
FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARL,DFEDTARU,DFF"
DISPLAY_COLUMNS = [
    "250-275",
    "275-300",
    "300-325",
    "325-350",
    "350-375",
    "375-400",
    "400-425",
    "425-450",
    "450-475",
    "475-500",
]
MONTH_NUMBERS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}

# Officially scheduled FOMC decision dates. Extend when the Federal Reserve
# publishes the next calendar; keeping the dates explicit makes changes auditable.
FOMC_MEETING_DATES = [
    date(2026, 9, 16),
    date(2026, 10, 28),
    date(2026, 12, 9),
    date(2027, 1, 27),
    date(2027, 3, 17),
    date(2027, 4, 28),
    date(2027, 6, 9),
    date(2027, 7, 28),
    date(2027, 9, 15),
    date(2027, 10, 27),
    date(2027, 12, 8),
]


def _parse_contract_month(value: str) -> tuple[int, int]:
    month_name, year_text = value.strip().upper().split()[:2]
    return (2000 + int(year_text), MONTH_NUMBERS[month_name])


def _month_sequence(start: tuple[int, int], end: tuple[int, int]) -> list[tuple[int, int]]:
    output: list[tuple[int, int]] = []
    year, month = start
    while (year, month) <= end:
        output.append((year, month))
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
    return output


def _next_month(value: tuple[int, int]) -> tuple[int, int]:
    year, month = value
    return (year + 1, 1) if month == 12 else (year, month + 1)


def _fetch_latest_settlements() -> tuple[dict[tuple[int, int], float], dict[str, object]]:
    today = datetime.now(timezone.utc).date()
    last_error: Exception | None = None
    for offset in range(0, 11):
        candidate = today - timedelta(days=offset)
        if candidate.weekday() >= 5:
            continue
        try:
            response = curl_requests.get(
                CME_SETTLEMENTS_URL,
                params={"tradeDate": candidate.strftime("%m/%d/%Y")},
                impersonate="chrome",
                timeout=30,
            )
            response.raise_for_status()
            payload = response.json()
            if payload.get("empty") or not payload.get("settlements"):
                continue
            if str(payload.get("reportType") or "").lower() != "final":
                continue
            settlements: dict[tuple[int, int], float] = {}
            for row in payload["settlements"]:
                settle_text = str(row.get("settle") or "").replace("B", "").strip()
                if not settle_text or settle_text == "-":
                    continue
                try:
                    settlements[_parse_contract_month(str(row["month"]))] = float(settle_text)
                except (KeyError, ValueError):
                    continue
            if settlements:
                return settlements, payload
        except Exception as error:
            last_error = error
    raise RuntimeError(f"No recent final CME Fed Funds settlement was available: {last_error}")


def _fetch_fred_policy_rates() -> tuple[float, float, float | None]:
    response = requests.get(FRED_CSV_URL, timeout=30)
    response.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(response.text)))
    target_lower = target_upper = effective_rate = None
    for row in reversed(rows):
        if target_lower is None and row.get("DFEDTARL") not in {None, "", "."}:
            target_lower = float(row["DFEDTARL"])
        if target_upper is None and row.get("DFEDTARU") not in {None, "", "."}:
            target_upper = float(row["DFEDTARU"])
        if effective_rate is None and row.get("DFF") not in {None, "", "."}:
            effective_rate = float(row["DFF"])
        if target_lower is not None and target_upper is not None and effective_rate is not None:
            break
    if target_lower is None or target_upper is None:
        raise RuntimeError("FRED did not return the current federal funds target range")
    return target_lower, target_upper, effective_rate


def _binary_meeting_moves(
    settlements: dict[tuple[int, int], float],
    meeting_dates: list[date],
    effective_rate: float | None,
) -> list[tuple[date, tuple[int, int], tuple[float, float]]]:
    meeting_by_month = {(item.year, item.month): item for item in meeting_dates}
    first_month = min(settlements)
    final_meeting_month = (meeting_dates[-1].year, meeting_dates[-1].month)
    end_month = _next_month(final_meeting_month)
    while end_month in meeting_by_month:
        end_month = _next_month(end_month)
    months = _month_sequence(first_month, end_month)
    missing = [month for month in months if month not in settlements]
    if missing:
        raise RuntimeError(f"CME settlements are missing required contracts: {missing}")

    p_avg = [settlements[month] for month in months]
    p_start = [0.0 if month in meeting_by_month else p_avg[index] for index, month in enumerate(months)]
    p_end = list(p_start)
    if months[0] in meeting_by_month and effective_rate is not None:
        p_start[0] = 100.0 - effective_rate

    for index in range(1, len(months) - 1):
        if p_start[index] == 0.0 and p_end[index - 1] != 0.0:
            p_start[index] = p_end[index - 1]
        if p_end[index] == 0.0 and p_start[index + 1] != 0.0:
            p_end[index] = p_start[index + 1]

    for index in range(len(months) - 2, -1, -1):
        if months[index] not in meeting_by_month:
            continue
        if p_end[index] == 0.0:
            p_end[index] = p_start[index + 1]
        if p_start[index] == 0.0:
            meeting_date = meeting_by_month[months[index]]
            days_in_month = calendar.monthrange(meeting_date.year, meeting_date.month)[1]
            post_meeting_days = days_in_month - meeting_date.day + 1
            pre_meeting_days = days_in_month - post_meeting_days
            if pre_meeting_days <= 0:
                raise RuntimeError(f"Cannot split the meeting month for {meeting_date}")
            p_start[index] = (
                p_avg[index] - (post_meeting_days / days_in_month) * p_end[index]
            ) / (pre_meeting_days / days_in_month)

    output: list[tuple[date, tuple[int, int], tuple[float, float]]] = []
    for meeting_date in meeting_dates:
        index = months.index((meeting_date.year, meeting_date.month))
        change_steps = ((100.0 - p_end[index]) - (100.0 - p_start[index])) / 0.25
        base_steps = math.trunc(change_steps)
        next_steps = base_steps + (1 if change_steps > 0 else -1 if change_steps < 0 else 0)
        fraction = abs(change_steps) - math.trunc(abs(change_steps))
        probabilities = (1.0 - fraction, fraction)
        output.append((meeting_date, (base_steps * 25, next_steps * 25), probabilities))
    return output


def _rounded_percentages(values: list[float]) -> list[float]:
    rounded = [round(max(0.0, value) * 100.0, 1) for value in values]
    if rounded:
        difference = round(100.0 - sum(rounded), 1)
        largest_index = max(range(len(rounded)), key=rounded.__getitem__)
        rounded[largest_index] = round(rounded[largest_index] + difference, 1)
    return rounded


def build_fedwatch_snapshot() -> dict[str, object]:
    settlements, metadata = _fetch_latest_settlements()
    trade_date = datetime.strptime(str(metadata["tradeDate"]), "%m/%d/%Y").date()
    meeting_dates = [item for item in FOMC_MEETING_DATES if item > trade_date]
    if not meeting_dates:
        raise RuntimeError("No upcoming FOMC meetings are configured")
    target_lower, target_upper, effective_rate = _fetch_fred_policy_rates()
    binary_moves = _binary_meeting_moves(settlements, meeting_dates, effective_rate)

    cumulative: dict[int, float] = {0: 1.0}
    row_distributions: list[tuple[date, dict[str, float]]] = []
    all_columns = set(DISPLAY_COLUMNS)
    lower_bps = round(target_lower * 100)
    upper_bps = round(target_upper * 100)
    for meeting_date, moves, probabilities in binary_moves:
        next_distribution: defaultdict[int, float] = defaultdict(float)
        for cumulative_move, cumulative_probability in cumulative.items():
            for move, probability in zip(moves, probabilities):
                if probability > 0:
                    next_distribution[cumulative_move + move] += cumulative_probability * probability
        cumulative = dict(next_distribution)
        by_range = {
            f"{lower_bps + move}-{upper_bps + move}": probability
            for move, probability in cumulative.items()
        }
        all_columns.update(
            range_label for range_label, probability in by_range.items() if probability >= 0.0005
        )
        row_distributions.append((meeting_date, by_range))

    columns = sorted(all_columns, key=lambda value: int(value.split("-", 1)[0]))
    rows = []
    for meeting_date, by_range in row_distributions:
        probabilities = _rounded_percentages([by_range.get(column, 0.0) for column in columns])
        max_probability = max(probabilities)
        max_index = probabilities.index(max_probability)
        rows.append(
            {
                "meetingDate": meeting_date.isoformat(),
                "probabilities": probabilities,
                "maxProbability": max_probability,
                "maxRange": columns[max_index],
            }
        )

    now = datetime.now(timezone.utc)
    return {
        "source": "CME 공식 EOD 결제값 기반 FedWatch 재산출",
        "sourceUrl": CME_FEDWATCH_URL,
        "settlementSourceUrl": CME_SETTLEMENTS_URL,
        "asOf": trade_date.isoformat(),
        "sourceUpdatedAt": metadata.get("updateTime"),
        "refreshedAt": now.isoformat(),
        "title": "CME FedWatch Tool - Conditional Meeting Probabilities",
        "sourceNote": (
            "CME 30-Day Fed Funds 선물의 최신 Final 결제값과 FRED 기준금리 범위를 "
            "CME FedWatch 방법론으로 재산출한 EOD 확률입니다. 장중 CME 화면과는 변동분만큼 차이가 날 수 있습니다."
        ),
        "columns": columns,
        "rows": rows,
        "currentTargetRange": f"{lower_bps}-{upper_bps}",
        "effectiveRate": effective_rate,
        "settlementReportType": metadata.get("reportType"),
        "method": "official-eod-reconstruction",
        "isFallback": False,
    }

"""Fill SEC coverage gaps with dated, currency-tagged Yahoo quarterly statements."""
import copy
import json
import math
import os
import re
from datetime import datetime, timezone
from pathlib import Path

METRICS = ('revenue', 'grossMarginPct', 'operatingMarginPct', 'epsDiluted', 'ocf', 'fcf')
SOURCE = 'Yahoo Finance / yfinance quarterly financial statements (reported)'


def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (ValueError, TypeError):
        return None


def load_statements(ticker):
    cache = os.environ.get('MARKET_RS_FINANCIALS_YAHOO_CACHE_DIR')
    if cache:
        path = Path(cache) / f'{ticker}.json'
        if path.exists():
            return json.loads(path.read_text(encoding='utf-8'))
    import yfinance as yf
    yf.set_tz_cache_location(str(Path(__file__).resolve().parents[1] / '.yfinance-cache'))
    stock = yf.Ticker(ticker)

    def serialize(frame):
        if frame is None or frame.empty:
            return {}
        return {date.date().isoformat(): {key: number(value) for key, value in frame[date].items()} for date in frame.columns}

    return {'ticker': ticker, 'currency': stock.get_info().get('financialCurrency'),
            'income': serialize(stock.get_income_stmt(freq='quarterly')),
            'cash': serialize(stock.get_cash_flow(freq='quarterly'))}


def distance(left, right):
    return abs((datetime.fromisoformat(left) - datetime.fromisoformat(right)).days)


def statement_rows(snapshot):
    result = []
    for date, income in snapshot.get('income', {}).items():
        revenue = number(income.get('TotalRevenue'))
        if revenue is None or revenue < 0:
            continue
        cash = snapshot.get('cash', {}).get(date, {})
        gross, operating = number(income.get('GrossProfit')), number(income.get('OperatingIncome'))
        ocf, capex = number(cash.get('OperatingCashFlow')), number(cash.get('CapitalExpenditure'))
        quarter = (int(date[5:7]) - 1) // 3 + 1
        result.append({
            'period': f'{date[:4]} Q{quarter}', 'periodKey': f'CY{date[:4]}Q{quarter}',
            'periodStart': None, 'periodEnd': date, 'filed': None,
            'periodBasis': 'Yahoo fiscal quarter end may be normalized to calendar month end',
            'revenue': revenue, 'revenueYoyPct': None,
            'grossMarginPct': round(gross / revenue * 100, 1) if gross is not None and revenue else None,
            'operatingMarginPct': round(operating / revenue * 100, 1) if operating is not None and revenue else None,
            'operatingMarginYoyPp': None, 'epsDiluted': number(income.get('DilutedEPS')),
            'ocf': ocf, 'fcf': round(ocf - abs(capex), 0) if ocf is not None and capex is not None else None,
            'metricSources': {metric: SOURCE for metric in METRICS},
        })
    return sorted(result, key=lambda row: row['periodEnd'], reverse=True)


def overlay(profile, snapshot):
    result = copy.deepcopy(profile)
    currency = snapshot.get('currency')
    if not currency or not re.fullmatch('[A-Z]{3}', currency):
        return result
    additions = statement_rows(snapshot)
    if not additions:
        return result
    # Never mix a foreign issuer's local currency with old USD-labelled IR
    # table guesses. Quarterly statement dates also replace filing dates.
    replace_history = currency != 'USD' or result.get('usesIrOnly', False)
    rows = [] if replace_history else result.get('quarters', [])
    applied = 0
    for fresh in additions:
        matches = [row for row in rows if row.get('periodEnd') and distance(row['periodEnd'], fresh['periodEnd']) <= 21]
        match = min(matches, key=lambda row: distance(row['periodEnd'], fresh['periodEnd'])) if matches else None
        if match is None:
            rows.append(fresh)
            applied += 1
            continue
        # Keep confirmed SEC/IR values. Only fill missing amounts on a
        # comparable revenue basis; cash flow has an independent denominator.
        comparable = (number(match.get('revenue')) is not None
                      and abs(match['revenue'] - fresh['revenue']) <= max(1, abs(fresh['revenue']) * 0.005))
        for metric in METRICS:
            if match.get(metric) is None and fresh.get(metric) is not None and (comparable or metric in ('ocf', 'fcf')):
                match[metric] = fresh[metric]
                match.setdefault('metricSources', {})[metric] = SOURCE
                applied += 1
    rows.sort(key=lambda row: row['periodEnd'], reverse=True)
    result['quarters'] = rows
    result['currency'] = currency
    result['yahooValuesApplied'] = applied
    result['statementCheckedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    result['statementSourceUrl'] = f'https://finance.yahoo.com/quote/{snapshot["ticker"]}/financials/'
    if replace_history:
        result['usesIrOnly'] = False
        result['irValuesApplied'] = 0
        result['nonGaapRows'] = 0
        result['adjustedRows'] = 0
        result['curatedAdjustmentsApplied'] = 0
    result['source'] = 'SEC EDGAR + official IR; Yahoo Finance quarterly statements for coverage gaps'
    result['basis'] = ('SEC/official IR values retained where available. Yahoo Finance quarterly statements fill missing coverage. '
                       f'Financial statement currency: {currency}; no FX conversion. EPS is on the statement share basis, separate from Yahoo ADR EPS surprise. '
                       'Yahoo may normalize fiscal dates to month end; unavailable year-ago comparisons remain blank.')
    return result


def apply_verified_quarters(profile, definitions):
    rows = {row['periodEnd']: row for row in profile.get('quarters', [])}
    for definition in definitions:
        row = rows.get(definition['periodEnd'])
        if row is None:
            continue
        row['period'] = definition['period']
        row['periodKey'] = definition['period'].replace(' ', '')
        row['periodStart'] = definition.get('periodStart')
        row.pop('periodBasis', None)
        for metric, value in definition['values'].items():
            if metric not in METRICS:
                continue
            row[metric] = value
            basis = definition.get('metricBasis', {}).get(metric, 'Reported')
            row.setdefault('metricSources', {})[metric] = f'Verified official earnings table ({basis}): {definition["source"]}'
        row['irReleaseUrl'] = definition['source']
        row['irReleaseDate'] = definition['filed']
        row['filed'] = definition['filed']
    return profile

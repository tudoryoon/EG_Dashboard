"""Validate published Daily Briefing financials and optional refresh isolation."""
import argparse
import json
import math
from pathlib import Path

import update_market_rs_financials as financials
import update_market_canslim_earnings as earnings


def audit(baseline=None):
    payload = financials.read_previous_payload()
    profiles = payload['financials']
    tickers = financials.load_daily_briefing_tickers()
    errors, warnings = [], []
    totals = {'companies': len(tickers), 'covered': 0, 'quarters': 0, 'revenueYoy': 0, 'opmYoy': 0}
    latest = {}
    for ticker in sorted(tickers):
        profile = profiles.get(ticker, {})
        rows = profile.get('quarters', [])
        if not rows:
            warnings.append(f'{ticker}: no supported quarterly statements')
            continue
        totals['covered'] += 1
        dates = [row.get('periodEnd', '') for row in rows]
        if dates != sorted(set(dates), reverse=True) or len(rows) > 8:
            errors.append(f'{ticker}: duplicate, unordered or excess quarters')
        latest[ticker] = dates[0]
        currency = profile.get('currency', 'USD')
        for row in rows:
            key = f'{ticker} {row.get("periodEnd")}'
            totals['quarters'] += 1
            for metric in ('revenue', 'grossMarginPct', 'operatingMarginPct', 'epsDiluted', 'ocf', 'fcf', 'revenueYoyPct', 'operatingMarginYoyPp'):
                value = row.get(metric)
                if value is not None and (not isinstance(value, (int, float)) or not math.isfinite(value)):
                    errors.append(f'{key}: invalid {metric}')
            if row.get('revenue') is not None and row['revenue'] < 0:
                errors.append(f'{key}: negative revenue requires source review')
            if row.get('periodStart') and row['periodStart'] > row['periodEnd']:
                errors.append(f'{key}: invalid fiscal period range')
            if currency != 'USD' and not profile.get('statementSourceUrl'):
                errors.append(f'{key}: native currency without statement provenance')
            reference = row.get('yoyComparison', {})
            if row.get('revenueYoyPct') is not None:
                totals['revenueYoy'] += 1
                if not financials.is_same_quarter_year_ago(row['periodEnd'], reference.get('periodEnd')):
                    errors.append(f'{key}: missing or non-comparable YoY reference')
                expected = financials.safe_round(financials.pct_change(row.get('revenue'), reference.get('revenue')), 1)
                if expected != row['revenueYoyPct']:
                    errors.append(f'{key}: Revenue YoY {row["revenueYoyPct"]} != {expected}')
            if row.get('operatingMarginYoyPp') is not None:
                totals['opmYoy'] += 1
                prior_opm = reference.get('operatingMarginPct')
                if prior_opm is not None:
                    expected = financials.safe_round(row['operatingMarginPct'] - prior_opm, 1)
                    if expected != row['operatingMarginYoyPp']:
                        errors.append(f'{key}: OPM YoY does not match reference')
        if dates[0] < '2026-03-01':
            warnings.append(f'{ticker}: latest supported quarter {dates[0]}')
    eps_path = financials.ROOT / 'data/market-canslim-earnings-data.js'
    eps = financials.read_js_payload(eps_path, 'marketCanslimEarningsData')['profiles']
    eps_scope = set(earnings.load_daily_briefing_tickers())
    for ticker in sorted(eps_scope):
        profile = eps.get(ticker, {})
        if profile.get('fallback'):
            warnings.append(f'{ticker}: EPS source unavailable; retained previous observations')
        rows = profile.get('quarters', [])
        releases = [row['releaseDate'] for row in rows]
        if len(releases) != len(set(releases)) or len(rows) > 4:
            errors.append(f'{ticker}: duplicate or excess EPS reports')
        for row in rows:
            if row.get('period'):
                days = (financials.parse_iso_date(row['releaseDate']) - financials.parse_iso_date(row['period'])).days
                if not -7 <= days <= 120:
                    errors.append(f'{ticker}: EPS fiscal quarter mismatched to release')
            values = row['eps']
            if values.get('actual') is not None and values.get('estimate') is not None:
                expected = round(values['actual'] - values['estimate'], 4)
                if values.get('surpriseValue') != expected:
                    errors.append(f'{ticker}: EPS surprise value mismatch')
    if baseline:
        before = financials.read_js_payload(baseline / 'market-rs-financials-data.js', 'marketRsFinancialsData')['financials']
        outside = (set(before) | set(profiles)) - tickers
        changed = [ticker for ticker in outside if before.get(ticker) != profiles.get(ticker)]
        if changed:
            errors.append(f'Outside financial scope changed: {changed}')
        before_eps = financials.read_js_payload(baseline / 'market-canslim-earnings-data.js', 'marketCanslimEarningsData')['profiles']
        outside_eps = (set(before_eps) | set(eps)) - eps_scope
        changed_eps = [ticker for ticker in outside_eps if before_eps.get(ticker) != eps.get(ticker)]
        if changed_eps:
            errors.append(f'Outside EPS scope changed: {changed_eps}')
        totals['advancedQuarterCount'] = sum(latest.get(ticker, '') > max((row.get('periodEnd', '') for row in before.get(ticker, {}).get('quarters', [])), default='') for ticker in tickers)
    return {'totals': totals, 'errors': errors, 'warnings': warnings, 'latestQuarter': latest}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = audit(args.baseline)
    if args.output:
        args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in result.items() if key != 'latestQuarter'}, indent=2))
    raise SystemExit(1 if result['errors'] else 0)

"""Reconcile M7 quarterly comparisons without replacing reviewed IR adjustments."""
import argparse
import copy
import json
from datetime import datetime, timezone
from pathlib import Path
import update_market_rs_financials as financials

PILOT = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA']


def repair(item, facts):
    rebuilt = financials.build_company_financials(
        item['ticker'], item['name'], item['cik'], {}, facts_payload=facts, ir_releases=[],
    )
    old_by_end = {row['periodEnd']: row for row in item['quarters']}
    if max(old_by_end, default='') > max((row['periodEnd'] for row in rebuilt['quarters']), default=''):
        raise ValueError(f"SEC facts lag the reviewed latest quarter for {item['ticker']}")
    rows = []
    for fresh in rebuilt['quarters']:
        old = old_by_end.get(fresh['periodEnd'])
        row = copy.deepcopy(old or fresh)
        row['period'] = fresh['period']
        row['periodKey'] = fresh['periodKey']
        comparison = copy.deepcopy(fresh.get('yoyComparison'))
        if comparison:
            reviewed_prior = old_by_end.get(comparison['periodEnd'])
            prior = reviewed_prior or comparison
            comparison['revenue'] = prior.get('revenue')
            comparison['operatingMarginPct'] = prior.get('operatingMarginPct')
            row['yoyComparison'] = comparison
            row['revenueYoyPct'] = financials.safe_round(financials.pct_change(row.get('revenue'), prior.get('revenue')), 1)
            current_opm, prior_opm = row.get('operatingMarginPct'), prior.get('operatingMarginPct')
            # A SEC-only rebuild cannot replace an older IR-adjusted comparison
            # outside the retained window. Preserve that reviewed YoY value.
            if not reviewed_prior and old and old.get('operatingMarginYoyPp') is not None:
                comparison.pop('operatingMarginPct', None)
            elif not reviewed_prior and row.get('metricSources', {}).get('operatingMarginPct') != 'SEC GAAP companyfacts':
                comparison.pop('operatingMarginPct', None)
            elif current_opm is not None and prior_opm is not None:
                row['operatingMarginYoyPp'] = financials.safe_round(current_opm - prior_opm, 1)
            row.setdefault('metricSources', {})['revenueYoyPct'] = f"Revenue / same-quarter revenue ended {comparison['periodEnd']} - 1; SEC companyfacts"
        rows.append(row)
    result = copy.deepcopy(item)
    result['quarters'] = rows
    result['yoyVerifiedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--cache-dir', type=Path)
    args = parser.parse_args()
    payload = financials.read_previous_payload()
    for ticker in PILOT:
        item = payload['financials'][ticker]
        cached = args.cache_dir / f'{ticker}-companyfacts.json' if args.cache_dir else None
        facts = json.loads(cached.read_text(encoding='utf-8')) if cached and cached.exists() else financials.fetch_json(financials.SEC_COMPANY_FACTS_URL.format(cik=item['cik']))
        fixed = repair(item, facts)
        assert len(fixed['quarters']) == 8
        assert all(row.get('revenueYoyPct') is not None for row in fixed['quarters']), ticker
        payload['financials'][ticker] = fixed
        print(ticker, [(q['period'], q['revenueYoyPct']) for q in fixed['quarters']])
    if args.write:
        financials.write_js_payload(financials.OUTPUT_PATH, 'marketRsFinancialsData', payload)


if __name__ == '__main__':
    main()

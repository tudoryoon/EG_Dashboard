# Market Regime Scorecard

Route: `#/research/market-regime` (the former Study area).

Reproduces the user-supplied [Claude artifact](https://claude.ai/code/artifact/76bae242-11c2-4615-8a97-bb6655301a0c) as local static files. US data now uses `eg-us-regime-v1`, an independent implementation of the displayed methodology. KR/CN remain the original snapshots. Exact original-value parity and the original backtest results are not independently verified.

## Structure

- `snapshot.js`: independently calculated US data plus original KR/CN data, 252 observations per market.
- `scorecard.js`: original plain JavaScript renderer and custom SVG charts; no charting framework.
- `scorecard.css`: original application styles.
- `integration.js` / `integration.css`: collection/snapshot distinction, accessible tabs, responsive wrapping, and iframe height synchronization.
- `provenance.json`: original dates, universe counts, and canonical data checksum.

The parent dashboard loads this page only when its subtab is opened. Its sandbox allows scripts but not same-origin access, forms, or navigation. A restrictive CSP prevents data connections. The only parent message reports height; the parent checks the frame's window before accepting it.

## Data Boundary

Only the US data is refreshed. KR/CN are September 9, 2026 snapshots. The imported artifact lacked collection/backtest code; the new US code implements the displayed formulas with the explicit conventions below. The entire US display history is recalculated consistently; original and EG values are not spliced.

## US Pipeline

- Inputs: S&P500 membership from the existing RS payload, not Daily Briefing; Yahoo Finance/yfinance split-adjusted close/high/low/volume, without dividend reinvestment.
- Benchmarks: SPY QQQ XLK XLF XLE XLV XLI XLY XLP XLU XLB XLRE XLC.
- Four years of inputs: moving-average warm-up, rolling 500-session percentiles, 252 displayed sessions.
- 1/2: SPY and QQQ each have five long/short-term checks. HH/HL uses confirmed 5-left/5-right pivots over 120 sessions. All averages are SMA.
- 3: Mean percentage above 20/50 SMA divided by 10; missing prices/MAs excluded, not bearish votes.
- 4: Close above prior 50-session **intraday high**, volume above 1.5 times prior 50-session average; today excluded from both thresholds.
- 5: 5-session sector excess-return rank correlation versus five sessions earlier; shrink to neutral using population dispersion / expanding median from the four-year input start; 3-session smoothing.
- 6: 50 SMA > 200 SMA, close > 200 SMA, Wilder RSI(5) < 30; Wilder's first gain/loss seed is the simple mean.
- 7: Previous top two sectors' realized 5-session excess return / current cross-sector population standard deviation; clip(5 + 5 * 21-session mean z, 0, 10).

For 4/6, deduplicate within five sessions per stock. Evaluate signal close to the fifth subsequent close; success is positive return. Aggregate **completed exit dates** over 21 sessions; expand to 63 if fewer than 20 events; fewer than eight is N/A. Missing intervening bars invalidate the event. No immature signals enter the score. Costs/slippage are excluded. These explicit conventions resolve details missing from the original artifact. The weighted payoff score is not actual P&L; inspect average return separately.

## Schedule and Safeguards

`.github/workflows/update-market-regime.yml`: UTC Mon-Fri 20:05 = **KST Tue-Sat 05:05**.
US Friday requires a Korean Saturday run. KST Sunday/Monday and NYSE holidays are skipped.
Winter runs wait until 16:05 New York (06:05 KST); early closes use the exchange calendar.
GitHub queuing/vendor lag can delay publication. Manual dispatch targets the last completed session.

Require all 13 benchmarks and >=98% of constituents current (minimum 450), and >=95% latest breadth coverage.
Stale/insufficient data fails without replacing published data; repeated current-session runs are no-ops.
Independent Actions OHLCV cache supports incremental downloads, weekly full history refreshes and split-triggered history refreshes.
The workflow writes only the scorecard snapshot, provenance and its own script cache token, not RS/Trend/CANSLIM/Briefing or root `index.html`.
Pages is rebuilt explicitly after publishing. The isolated iframe still makes no provider requests.

## Validation

```text
python -m pip install -r scripts/market-regime-requirements.txt
python -m unittest discover -s scripts -p test_market_regime_daily.py
python scripts/update_market_regime.py --output artifacts/market-regime-validation
python scripts/test_market_regime_artifact.py
```

`--force` recalculates the same session; `--full` bypasses incremental collection. Source imports via `import_market_regime_artifact.py` are not a daily refresh mechanism and will replace the hosted app; retain authenticated platform HTML only in untracked `artifacts/`.

# Market Regime Scorecard

Route: `#/research/market-regime` (the former Study area).

Reproduces the user-supplied [Claude artifact](https://claude.ai/code/artifact/76bae242-11c2-4615-8a97-bb6655301a0c) as local static files. This is not a remote Claude iframe and requires no Claude login.

## Structure

- `snapshot.js`: original embedded US/KR/CN results, 252 observations per market.
- `scorecard.js`: original plain JavaScript renderer and custom SVG charts; no charting framework.
- `scorecard.css`: original application styles.
- `integration.js` / `integration.css`: snapshot notice, accessible tab navigation, small-screen wrapping, and iframe height synchronization.
- `provenance.json`: original dates, universe counts, and canonical data checksum.

The parent dashboard loads this page only when its subtab is opened. Its sandbox allows scripts but not same-origin access, forms, or navigation. A restrictive CSP prevents data connections. The only parent message reports height; the parent checks the frame's window before accepting it.

## Data Boundary

This is a September 9, 2026 snapshot, not a newly calculated or live feed. The original US observation is provisional. The artifact included stored results and methodology descriptions but not the underlying collection/backtest pipeline. Cloning does not independently validate those estimates. Existing dashboard data and GitHub Actions are unchanged.

To import a newly authorized source export, run `python scripts/import_market_regime_artifact.py <export.html>`, inspect the output, then run `python scripts/test_market_regime_artifact.py`. Keep authenticated platform HTML in the untracked `artifacts/` directory, never in the deployed assets. The importer excludes Claude session/runtime code and preserves only the scorecard app.

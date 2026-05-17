# EG Dashboard

GitHub Pages dashboard for market, macro, M7, Taiwan revenue, memory spot, cloud, and capex tracking.

## Current Tabs

- `Daily Briefing`
  - sector heatmaps, major headlines, and Korean mover notes
- `Market > Price`
  - total dashboard, rates / dollar / energy / metals price dashboard, and market relative performance
- `Market > Macro`
  - US monthly macro snapshot, release coverage, category grouping, and historical chart
- `Market > Breadth`
  - embedded Stockbee breadth monitor
- `Market > RS`
  - StockEasy-style RS leaderboard, period RS table, search, and stock-level daily RS trend
- `Big Tech > M7`
  - M7 relative price chart and quarterly earnings cards
- `Big Tech > Cloud`
  - cloud revenue / growth / margin dashboard
- `Big Tech > Capex`
  - big tech capex and cash flow dashboard
- `Semis > Memory Spot`
  - DRAM and NAND spot dashboard
- `Semis > GPU Rental Price`
  - SemiAnalysis-focused GPU rental dashboard
- `Taiwan`
  - monthly revenue company cards

## Automated In GitHub

- `/.github/workflows/update-m7-prices.yml`
  - runs daily
  - scheduled at `22:00 UTC` / `07:00 KST`
  - updates `data/m7-price-data.js`
  - sources: Yahoo Finance

- `/.github/workflows/update-market-briefing.yml`
  - runs daily
  - scheduled at `21:10 UTC` / `06:10 KST`
  - updates `data/market-briefing-data.js`
  - sources: Yahoo Finance and Google News/public news feeds used by the briefing script

- `/.github/workflows/update-market-rs.yml`
  - runs daily
  - scheduled at `21:20 UTC` / `06:20 KST`
  - updates `data/market-rs-data.js`
  - sources: Yahoo Finance and constituent tables used by the RS pipeline

- `/.github/workflows/update-market-prices.yml`
  - runs daily
  - scheduled at `21:40 UTC` / `06:40 KST`
  - updates `data/market-price-data.js` and `data/market-macro-data.js`
  - sources: Yahoo Finance and public macro/market pages

- `/.github/workflows/update-fx-dashboard.yml`
  - runs daily
  - scheduled at `22:40 UTC` / `07:40 KST`
  - updates the FX panel inside `data/market-macro-data.js`
  - sources: Yahoo Finance daily FX with existing historical data preserved

- `/.github/workflows/update-memory-spot.yml`
  - runs daily
  - scheduled at `22:20 UTC` / `07:20 KST`
  - updates `data/memory-spot-history.js`

- `/.github/workflows/update-macro-data.yml`
  - runs daily at `16:30 UTC`
  - updates `data/macro-indicators-data.js`
  - source priority: FRED-compatible CSV endpoints
  - note: scheduled GitHub Actions use UTC and can run a few minutes late

## Manual Or Semi-Manual

- `Taiwan`
  - source file: `data/companies.js`
  - monthly revenue values are maintained manually

- `M7 quarterly earnings`
  - source file: `data/us-overview-data.js`
  - segment revenue / YoY / OPM are maintained manually from IR and SEC data

- `Cloud`
  - source file: `data/cloud-data.js`
  - maintained manually from raw Excel data

- `Capex & Cash Flow`
  - source file: `data/capex-data.js`
  - maintained manually from raw Excel data

- `GPU Rental Price`
  - source files: `data/gpu-cloud-data.js`, `data/gpu-cloud-history.js`
  - not currently on a scheduled GitHub Action

- `ISM Services / ISM Manufacturing`
  - currently shown inside `Market > Macro`
  - marked as `manual/source pending` until a stable free source is adopted

## Main Files

- `index.html`
- `styles.css`
- `dashboard.js`
- `data/*.js`
- `scripts/update_m7_prices.py`
- `scripts/update_market_prices.py`
- `scripts/update_market_macro.py`
- `scripts/update_market_briefing.py`
- `scripts/update_market_rs.py`
- `scripts/update_memory_spot.py`
- `scripts/update_macro_data.py`

## Deployment

- push to `main` -> GitHub Pages deploy
- the header `Updated ... KST` is fetched from the latest `main` commit time
- the default landing tab is `Market`

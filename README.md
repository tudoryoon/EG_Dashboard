# EG Dashboard

GitHub Pages dashboard for market, macro, M7, Taiwan revenue, memory spot, cloud, and capex tracking.

## Current Tabs

- `Daily Briefing`
  - sector heatmaps, major headlines, and Korean mover notes
- `Market > Price`
  - total dashboard, rates / dollar / energy / metals price dashboard, and market relative performance
- `Market > Macro`
  - US monthly macro snapshot, release coverage, category grouping, and historical chart
- `Market > Valuation`
  - Shiller CAPE, Daily CAPE Proxy, Total Return CAPE, and S&P 500 valuation history from 1981
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
  - existing SemiAnalysis-focused GPU rental dashboard plus Ornn Compute Price Index section
- `Infra`
  - data-center power-stress dashboard with daily EIA/ICE power-hub prices, spike counts, and rolling max prices
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
  - updates `data/market-price-data.js`, `data/market-macro-data.js`, `data/market-vix-data.js`, and `data/market-valuation-data.js`
  - sources: Yahoo Finance, public macro/market pages, CBOE/Yahoo VIX references, and Robert Shiller/Yale valuation data

- `/.github/workflows/update-fx-dashboard.yml`
  - runs daily
  - scheduled at `22:40 UTC` / `07:40 KST`
  - updates the FX and commodity panels inside `data/market-macro-data.js`
  - sources: Yahoo Finance daily FX/futures with existing historical data preserved

- `/.github/workflows/update-memory-spot.yml`
  - runs daily
  - scheduled at `22:20 UTC` / `07:20 KST`
  - updates `data/memory-spot-history.js`

- `/.github/workflows/update-ornn-gpu-index.yml`
  - runs daily
  - scheduled at `22:30 UTC` / `07:30 KST`
  - updates `data/ornn-gpu-index-data.js`
  - source: Ornn public Compute Price Index API behind `dashboard.ornnai.com`

- `/.github/workflows/update-infra-grid-status.yml`
  - runs daily
  - scheduled at `23:47 UTC` / `08:47 KST`
  - updates `data/infra-grid-status-data.js`
  - source: EIA Wholesale Electricity Market Data / ICE

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
  - legacy SemiAnalysis / public-offer section is maintained manually unless a stable public feed is available

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
- `scripts/update_market_valuation.py`
- `scripts/update_market_briefing.py`
- `scripts/update_market_rs.py`
- `scripts/update_memory_spot.py`
- `scripts/update_ornn_gpu_index.py`
- `scripts/update_macro_data.py`

## Deployment

- push to `main` -> GitHub Pages deploy
- the header `Updated ... KST` is fetched from the latest `main` commit time
- the default landing tab is `Daily Briefing`

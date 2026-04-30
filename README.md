# EG Dashboard

GitHub Pages dashboard for market, M7, Taiwan revenue, memory spot, cloud, and capex tracking.

## Current Tabs

- `Market > Overview`: macro dashboard, total dashboard, and market relative performance
- `Market > Breadth`: embedded Stockbee breadth monitor
- `Market > RS`: IBD-style RS leaderboard, search, and stock-level daily RS trend
- `Big Tech > M7`: M7 relative price chart and quarterly earnings cards
- `Big Tech > Cloud`: cloud revenue / growth / margin dashboard
- `Big Tech > Capex`: big tech capex and cash flow dashboard
- `Semis > Memory Spot`: DRAM and NAND spot dashboard
- `Semis > GPU Rental Price`: GPU rental dashboard
- `Taiwan`: monthly revenue company cards

## Automated In GitHub

- `/.github/workflows/update-m7-prices.yml`
  - runs daily
  - updates `data/m7-price-data.js`, `data/market-price-data.js`, `data/market-macro-data.js`, and `data/market-rs-data.js`
  - sources: Yahoo Finance daily adjusted close + Wikipedia constituent tables for RS universe

- `/.github/workflows/update-memory-spot.yml`
  - runs daily
  - updates `data/memory-spot-history.js`
  - source: public Google Sheets / TrendForce-linked history pipeline

## Manual Or Semi-Manual

- `Taiwan` company revenue data
  - main source file: `data/companies.js`
  - company monthly revenue values are maintained manually

- `M7 quarterly earnings`
  - main source file: `data/us-overview-data.js`
  - segment revenue / YoY / OPM are maintained manually from IR and SEC data

- `Cloud` dashboard
  - main source file: `data/cloud-data.js`
  - maintained manually from raw Excel data

- `Capex & 현금흐름`
  - main source file: `data/capex-data.js`
  - maintained manually from raw Excel data

- `GPU Rental Price`
  - main source files: `data/gpu-cloud-data.js`, `data/gpu-cloud-history.js`
  - scripts exist, but the dashboard is not currently on a scheduled GitHub Action

- `/.github/workflows/update-market-prices.yml`
  - manual run only
  - left as a fallback workflow
  - scheduled market updates are already handled by `update-m7-prices.yml`

## Main Files

- `index.html`: page shell
- `styles.css`: dashboard styles
- `dashboard.js`: main rendering logic
- `data/*.js`: dashboard datasets
- `scripts/update_m7_prices.py`: daily M7 price updater
- `scripts/update_market_prices.py`: market price updater
- `scripts/update_market_rs.py`: market RS snapshot and history updater
- `scripts/update_memory_spot.py`: memory spot updater

## Deployment

- `main` branch push -> GitHub Pages deploy
- header `Updated ... KST` is fetched from the latest `main` commit time
- default landing tab is `Market`

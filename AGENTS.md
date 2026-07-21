# Dashboard Contribution Rules

## Daily Briefing ticker additions

- Whenever a ticker is added to a Daily Briefing sector, it must also be available in the RS, Trend Score, and CANSLIM tabs.
- First check `data/market-rs-data.js`. Index constituents already in the RS universe must not be duplicated in `data/market-rs-manual-tickers.json`.
- If the ticker is absent from the RS universe, add it through `scripts/add_market_rs_tickers.py` so the manual universe, RS history, and Trend Score data stay synchronized.
- CANSLIM uses the RS universe. A newly added ticker must appear in CANSLIM even when its financial profile is pending or unavailable.
- Regenerate the affected Daily Briefing, RS, Trend Score, and CANSLIM data, then verify that the ticker is selectable through the matching Daily Briefing sector filter in all three analysis tabs.

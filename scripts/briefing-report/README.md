# Weekly Briefing Archive

`Publish Weekly Briefing PDF` runs on Sunday at 11:00 KST (02:00 UTC).
GitHub may queue scheduled jobs; this is the requested start time, not a guaranteed completion time.

- `session.py` uses the NYSE calendar to find the final session of the reporting week. Friday holidays use the preceding open session; KST does not change with US daylight saving time.
- `export.cjs` reads the existing briefing and RS files. Both dates and all six index dates must match the expected session. Missing current equities, incomplete sector returns, or a report exceeding one A4 page fail the job before publication.
- Generated files live in `study/briefing-report/archive/YYYY-MM-DD/`: `report.pdf`, `preview.png`, and `snapshot.json`. The snapshot freezes membership, market caps, rankings, and chart data from that issue.
- `archive/index.json` lists every report and SHA-256 hashes for its files. Existing dates are verified and skipped, never overwritten or expired. The archive is committed to the repository, not stored only in expiring Actions artifacts.
- The page opens the latest archived issue by default. The date selector switches between past reports and the live preview. Archived reports lock the original market-cap filter; PDF and image links open the original saved files.
- The 2026-09-10 initial sample is labeled `sample`, not a completed weekly issue. No historical weekly data is invented or backfilled from today's membership.
- `workflow_dispatch` defaults to `dry_run: true`: it tests the current snapshot and uploads a temporary preview without publishing. Disable dry run only when the reporting week's data is complete. The regular Sunday schedule publishes automatically.
- After committing the archive, the workflow explicitly requests a GitHub Pages build. It does not depend on a bot commit automatically triggering another workflow.

Local checks:

```sh
npm ci --prefix scripts/briefing-report
python -m pip install -r scripts/briefing-report/requirements.txt
node scripts/briefing-report/node_modules/playwright/cli.js install --with-deps chromium
python -m unittest discover -s scripts/briefing-report -p 'test_session.py'
node --test scripts/briefing-report/test_export.cjs
python scripts/briefing-report/session.py > session.json
node scripts/briefing-report/export.cjs --session session.json
```

Use `--sample --output <scratch-directory>` for a non-publishing local preview. Do not relabel stale sample data as a weekly issue.

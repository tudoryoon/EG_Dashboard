# EG Dashboard Market Refresh Dispatcher

This Cloudflare Worker dispatches the two market-critical GitHub workflows just
after the New York regular session closes. It is a scheduler only: generation,
validation, commits, and pushes remain in GitHub Actions.

## Worker configuration

- Worker name: `eg-market-refresh-dispatcher`
- Cron trigger: `* * * * *`
- Secret: `GH_ACTIONS_TOKEN`
- Variables:
  - `GITHUB_OWNER=tudoryoon`
  - `GITHUB_REPO=EG_Dashboard`

The Worker uses the scheduled event time in `America/New_York`, so it follows
US daylight saving time without manually changing cron expressions.

| New York time | Workflow | Purpose |
| --- | --- | --- |
| 16:12 | `update-market-critical-morning.yml` | Daily Briefing primary |
| 16:27 | `update-market-rs.yml` | RS, Trend Score, CANSLIM primary |
| 16:42 | `update-market-critical-morning.yml` | Daily Briefing freshness retry |
| 16:55 | `update-market-rs.yml` | RS, Trend Score, CANSLIM freshness retry |

The retry dispatches use `refresh_if_stale=true`. The workflow exits before
dependency installation when the latest completed QQQ session is already in
the generated files.

## GitHub token

Create a fine-grained personal access token restricted to the `EG_Dashboard`
repository with `Actions: Read and write`. Store it only as the Cloudflare
Worker secret `GH_ACTIONS_TOKEN`; do not commit or paste it into this project.

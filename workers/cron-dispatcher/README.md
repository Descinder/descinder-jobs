# descinder-cron-dispatcher

One Cloudflare Worker that fires every backend cron on its own schedule —
the CF-native alternative to GitHub Actions cron.

Times are all UTC:

| Cron            | Job                        | Purpose                                        |
| --------------- | -------------------------- | ---------------------------------------------- |
| `7 * * * *`     | `process_instant_alerts`   | hourly instant-alert fan-out                   |
| `0 3 * * *`     | `purge_sessions`           | expired/revoked session cleanup                |
| `10 3 * * *`    | `purge_stale_tailored_cvs` | 60-day-old ai_tailored CVs                     |
| `20 3 * * *`    | `retention_purge`          | **GDPR Art. 17 — 30-day-grace user erasure**   |
| `30 3 * * *`    | `purge_alert_deliveries`   | 180-day alert-delivery log                     |
| `0 4 * * *`     | `digest_daily`             | daily alerts digest                            |
| `15 4 * * *`    | `daily_ingestion`          | Adzuna + Reed → jobs (this is the "seeding")   |
| `30 4 * * *`    | `expiry_sweep`             | expire jobs past their expires_at              |
| `45 4 * * *`    | `reset_ai_cv_counters`     | monthly AI-CV quota reset                      |
| `0 5 * * 1`     | `digest_weekly`            | weekly alerts digest (Mondays)                 |

## Why this Worker (vs. GitHub Actions)

- No 60-day-inactivity auto-disable.
- Cloudflare Cron Triggers are not documented as "best-effort" the way GH
  Actions cron is — reliability is closer to the SLA of the platform itself.
- Same auth surface as the rest of your CF stack.
- Same-account observability: Worker Metrics + Tail + Notifications all
  live next to your Pages project.

Trade-off: you now have TWO Cloudflare Workers (this one + `purge-monitor`)
whose secrets you rotate together instead of one GH Actions secret. Small.

## What's already wired

- All 10 cron triggers (`wrangler.toml` `[triggers].crons`).
- `src/index.ts` dispatches by `event.cron` → `CRON_MAP` (keep the two in
  lock-step when adding a new backend cron).
- Failure alerting via optional Slack webhook. Fallback = `wrangler tail`.
- Manual trigger for testing:
  `curl "https://<worker>.workers.dev/run?job=retention_purge"`

## What you still need to do (deployment-only)

Run these from `workers/cron-dispatcher/`:

### 1. Install + login

```bash
npm install
npx wrangler login
```

### 2. If your domain isn't `descinder.com`, edit `wrangler.toml`

Change `CRON_ENDPOINT_BASE` to your prod origin (no trailing slash).

### 3. Secrets

The **same** `CRON_SECRET` you use in the Pages env AND the `purge-monitor`
Worker — rotate all three together on any incident:

```bash
npx wrangler secret put CRON_SECRET
# paste the same 32+ char random value used in prod
```

Optional Slack webhook — you'll get a Slack message on any failed job (non-2xx
or `{ok:false}`):

```bash
npx wrangler secret put ALERT_SLACK_URL
# paste the Slack Incoming Webhook URL (same one purge-monitor uses is fine)
```

### 4. Deploy

```bash
npx wrangler deploy
```

### 5. Sanity check (manual trigger)

Wrangler prints a URL like `https://descinder-cron-dispatcher.<subdomain>.workers.dev`.

```bash
curl "https://descinder-cron-dispatcher.<subdomain>.workers.dev/run?job=expiry_sweep"
```

Expect JSON like `{"ok":true,"job":"expiry_sweep","status":200,"body":{"ok":true,"detail":{"expired":0}}}`.

### 6. Verify the cron actually fires

```bash
npx wrangler tail
```

Wait for `:07` past the hour — you should see the Worker's `scheduled` invocation
firing `process_instant_alerts`. If nothing shows for 15 minutes, check the
Cloudflare Dashboard → **Workers & Pages → descinder-cron-dispatcher → Triggers → Cron Triggers**.

## Coexistence with other schedulers — pick ONE

Do NOT also enable a GitHub Actions cron pointing at the same endpoints. If
you do, every job fires twice per day (harmless because they're idempotent —
but wasteful and confuses monitoring).

## Adding a new backend cron

1. Add its `CRON_JOBS` entry in `lib/shared/schemas/cron.ts`.
2. Wire the `runCronJob` branch in `lib/server/services/cron.ts`.
3. Append the schedule string to `wrangler.toml` `[triggers].crons`.
4. Add the same schedule → job-name mapping in `src/index.ts#CRON_MAP`.
5. `npx wrangler deploy`.

Steps 3+4 must stay in lock-step — if they drift, the new cron fires with
"no mapping" and alerts.

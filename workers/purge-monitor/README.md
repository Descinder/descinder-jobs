# descinder-purge-monitor

Hourly Cloudflare Worker that pings the app's `/api/health/purge` endpoint and
alerts you (Slack or Cloudflare Email) if the GDPR-critical `retention_purge`
cron has stopped running. Runs at `:07` past every hour.

The health endpoint returns `stale: true` when `app_settings.retention_purge_last_ok`
is older than the threshold (default 36 h — one missed daily run + buffer).

---

## What's already wired

- Worker code (`src/index.ts`) — checks health, alerts on stale, safe against fetch/HTTP failures.
- Cron schedule (`wrangler.toml` → `crons = ["7 * * * *"]`).
- Non-secret vars (`HEALTH_URL`, `STALE_HOURS_OVERRIDE`).
- App-side health endpoint (`app/api/health/purge/route.ts` in the Next.js repo).

## What you still need to do (deployment-only)

Run these from `workers/purge-monitor/`:

### 1. Install + login

```bash
npm install
npx wrangler login
```

### 2. Edit `wrangler.toml` if your domain isn't `descinder.com`

Change `HEALTH_URL` to your prod URL.

### 3. Set the two secrets

`CRON_SECRET` — the **same value** you set in the app's prod env and the GH
Actions repo secret. Generated once with `openssl rand -hex 32`:

```bash
npx wrangler secret put CRON_SECRET
# paste the value when prompted
```

`SLACK_WEBHOOK_URL` — pick one of the two alerting paths below.

#### Alert channel option A: Slack (recommended, 5 min)

1. https://api.slack.com/apps → **Create New App** → *From scratch*, name `descinder-alerts`.
2. **Incoming Webhooks** → toggle on → **Add New Webhook to Workspace** → pick the channel.
3. Copy the webhook URL (looks like `https://hooks.slack.com/services/T.../B.../…`).
4. Set it:

```bash
npx wrangler secret put SLACK_WEBHOOK_URL
# paste the URL
```

*(Discord works the same way — Discord's Incoming Webhook accepts the Slack-style `{text}` payload.)*

#### Alert channel option B: Cloudflare Email

1. Cloudflare Dashboard → your domain → **Email → Email Workers → Send from Worker**.
2. Add a "send from" address like `monitor@descinder.com`. Follow Cloudflare's verification.
3. Uncomment the `[[send_email]]` block in `wrangler.toml` and set `destination_address` to where alerts should go (e.g. `ops@descinder.com`).
4. Also set the `ALERT_EMAIL_TO` var:

```bash
npx wrangler secret put ALERT_EMAIL_TO
# paste the recipient address
```

You can leave `SLACK_WEBHOOK_URL` unset if you're only using email. If both are set, Slack is preferred (see `src/index.ts#alert`).

### 4. Deploy

```bash
npx wrangler deploy
```

Wrangler prints a URL like `https://descinder-purge-monitor.<subdomain>.workers.dev`.

### 5. Sanity check

Manually trigger a run:

```bash
curl https://descinder-purge-monitor.<subdomain>.workers.dev/ping
```

Should return JSON like:

```json
{ "checked": true, "alerted": false, "health": { "ok": true, "stale": false, "ageHours": 2.3, "lastOk": "…" } }
```

Force a stale-alert once, to prove Slack/email work end-to-end. In your prod
DB (Supabase Studio → SQL editor):

```sql
update app_settings set value = '"2024-01-01T00:00:00Z"' where key = 'retention_purge_last_ok';
```

Hit `/ping` again → expect `"alerted": true` and a message in Slack/email.
Then restore it:

```sql
update app_settings set value = to_jsonb(now()::text) where key = 'retention_purge_last_ok';
```

## Monitoring the monitor

- `npx wrangler tail` streams live logs from the deployed Worker (great during initial validation).
- Cloudflare Dashboard → **Workers & Pages → descinder-purge-monitor → Metrics** shows invocation count + error rate.
- If both Slack and Email are unconfigured, the Worker `console.warn`s the alert text instead — visible in `wrangler tail`.

## Notes

- The Worker holds NO PII. It only reads a timestamp + boolean and forwards a short text alert.
- `x-cron-secret` gates the health endpoint so a leaked Worker URL doesn't expose the timestamp; the Worker sends it from a Cloudflare secret (not observable to third parties).
- If you rotate `CRON_SECRET`, rotate it in **three** places on the same deploy: Pages env, GH Actions repo secret, this Worker.
- The 60-day GH Actions idle disable does **not** apply here — Cloudflare Cron Triggers don't lapse.

// descinder-cron-dispatcher — one Cloudflare Worker that fires every backend
// cron on its own schedule. Alternative to GitHub Actions cron; wins on
// reliability (no "best-effort" skips) and no 60-day idle disable, in
// exchange for being colocated with the rest of the CF stack.
//
// Dispatches by matching `event.cron` (the exact string Cloudflare passes)
// to the CRON_MAP table below. If a new backend cron job is added, extend
// wrangler.toml `[triggers].crons` AND add the entry here — they must stay
// in lock-step, else the new schedule fires with a "no mapping" alert.

interface Env {
  CRON_ENDPOINT_BASE: string;   // e.g. https://descinder.com/api/internal/cron
  CRON_SECRET: string;
  ALERT_SLACK_URL?: string;
}

// KEEP IN SYNC with wrangler.toml `[triggers].crons`.
const CRON_MAP: Record<string, string> = {
  "7 * * * *":   "process_instant_alerts",
  "0 3 * * *":   "purge_sessions",
  "10 3 * * *":  "purge_stale_tailored_cvs",
  "20 3 * * *":  "retention_purge",
  "30 3 * * *":  "purge_alert_deliveries",
  "0 4 * * *":   "digest_daily",
  "15 4 * * *":  "daily_ingestion",
  "30 4 * * *":  "expiry_sweep",
  "45 4 * * *":  "reset_ai_cv_counters",
  "0 5 * * 1":   "digest_weekly",
};

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(dispatch(event.cron, env));
  },
  // Manual trigger for testing:  curl "https://<worker>.workers.dev/run?job=retention_purge"
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== "/run") return new Response("descinder-cron-dispatcher: try GET /run?job=<name>\n", { status: 404 });
    const job = url.searchParams.get("job") ?? "";
    if (!Object.values(CRON_MAP).includes(job)) {
      return new Response(`unknown job "${job}"\n`, { status: 400 });
    }
    const result = await fireJob(job, env);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 502,
      headers: { "content-type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;

async function dispatch(cronString: string, env: Env): Promise<void> {
  const job = CRON_MAP[cronString];
  if (!job) {
    // A cron trigger fired but has no mapping — the two config files drifted.
    // Alert loudly rather than silently no-op.
    await alertFailure(env, `Cron dispatcher: no job mapped for schedule "${cronString}". Check wrangler.toml and CRON_MAP.`);
    return;
  }
  const result = await fireJob(job, env);
  if (!result.ok) {
    await alertFailure(env, `Cron dispatcher: job "${job}" failed — status=${result.status} error=${result.error ?? "n/a"}`);
  }
}

type FireResult = { ok: boolean; job: string; status?: number; body?: unknown; error?: string };

async function fireJob(job: string, env: Env): Promise<FireResult> {
  const url = `${env.CRON_ENDPOINT_BASE}/${encodeURIComponent(job)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET, "content-type": "application/json" },
      body: "{}",
      cf: { cacheTtl: 0 } as RequestInitCfProperties,
    });
    if (!res.ok) return { ok: false, job, status: res.status, error: `http_${res.status}` };
    // The endpoint returns { ok: boolean, detail: {...} }. Consider `ok:false`
    // (e.g. daily_ingestion with all sources failed) a failure so ops sees it.
    let body: unknown = null;
    try { body = await res.json(); } catch { /* empty body */ }
    const bodyOk = body != null && typeof body === "object" && (body as { ok?: unknown }).ok === true;
    return { ok: bodyOk, job, status: res.status, body };
  } catch (e) {
    return { ok: false, job, error: e instanceof Error ? e.message : "fetch_error" };
  }
}

async function alertFailure(env: Env, text: string): Promise<void> {
  if (env.ALERT_SLACK_URL) {
    try {
      await fetch(env.ALERT_SLACK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `🚨 ${text}` }),
      });
      return;
    } catch (e) {
      console.error("Slack alert failed", e);
    }
  }
  // Fall back to Worker Tail — visible in `wrangler tail` and the CF dashboard.
  console.error("[cron-dispatcher]", text);
}

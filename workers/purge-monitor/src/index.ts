// descinder-purge-monitor — hourly Cloudflare Worker that checks whether the
// GDPR-critical retention_purge cron has stopped running. Alerts on staleness
// so an ICO complaint isn't the way you find out.
//
// Alert channel priority: Slack webhook (if SLACK_WEBHOOK_URL secret is set) →
// Cloudflare Email Workers binding (if ALERT_EMAIL_FROM_ADDRESS binding + var
// are set) → console.warn (Worker Tail). See README for setup.

interface Env {
  HEALTH_URL: string;
  STALE_HOURS_OVERRIDE?: string;
  CRON_SECRET: string;
  SLACK_WEBHOOK_URL?: string;
  ALERT_EMAIL_TO?: string;
  ALERT_EMAIL_FROM_ADDRESS?: {
    send: (message: unknown) => Promise<void>;
  };
}

type Health = {
  ok: boolean;
  stale: boolean;
  ageHours: number | null;
  lastOk: string | null;
  thresholdHours?: number;
  reason?: string;
};

type RunResult = {
  checked: boolean;
  alerted: boolean;
  health?: Health;
  error?: string;
};

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env));
  },
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/ping") {
      const result = await run(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("descinder-purge-monitor: try GET /ping\n", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function run(env: Env): Promise<RunResult> {
  try {
    const res = await fetch(env.HEALTH_URL, {
      headers: { "x-cron-secret": env.CRON_SECRET },
      cf: { cacheTtl: 0 } as RequestInitCfProperties,
    });
    if (!res.ok) {
      const msg = `Purge monitor: health endpoint returned HTTP ${res.status}`;
      await alert(env, `⚠️ ${msg}`);
      return { checked: true, alerted: true, error: `http_${res.status}` };
    }
    const health = (await res.json()) as Health;
    const override = Number(env.STALE_HOURS_OVERRIDE);
    const stale = Number.isFinite(override) && override > 0 && health.ageHours != null
      ? health.ageHours > override
      : health.stale;
    if (stale) {
      const age = health.ageHours == null ? "never" : `${health.ageHours.toFixed(1)}h`;
      const threshold = Number.isFinite(override) && override > 0 ? override : health.thresholdHours;
      await alert(
        env,
        `🚨 Retention purge is STALE. Last ok: ${health.lastOk ?? "never"} ` +
          `(age ${age}, threshold ${threshold}h). GDPR Art. 17 SLA is at risk — ` +
          `investigate the cron.`,
      );
      return { checked: true, alerted: true, health };
    }
    return { checked: true, alerted: false, health };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await alert(env, `⚠️ Purge monitor threw: ${msg}`);
    return { checked: true, alerted: true, error: msg };
  }
}

async function alert(env: Env, text: string): Promise<void> {
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return;
    } catch (e) {
      console.error("Slack alert failed", e);
    }
  }
  if (env.ALERT_EMAIL_FROM_ADDRESS && env.ALERT_EMAIL_TO) {
    try {
      const { EmailMessage } = await import("cloudflare:email");
      const to = env.ALERT_EMAIL_TO;
      const body =
        `From: monitor@descinder.com\r\n` +
        `To: ${to}\r\n` +
        `Subject: [Descinder] Purge monitor alert\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n` +
        `\r\n` +
        text +
        `\r\n`;
      const msg = new EmailMessage("monitor@descinder.com", to, body);
      await env.ALERT_EMAIL_FROM_ADDRESS.send(msg);
      return;
    } catch (e) {
      console.error("Email alert failed", e);
    }
  }
  console.warn("[purge-monitor] no alert channel configured — would have alerted:", text);
}

import { describe, it, expect } from "vitest";
import { cronJobSchema, CRON_JOBS } from "@/lib/shared/schemas/cron";

describe("cronJobSchema", () => {
  it("accepts every known job, rejects unknown", () => {
    for (const j of CRON_JOBS) expect(cronJobSchema.safeParse(j).success).toBe(true);
    expect(cronJobSchema.safeParse("drop_tables").success).toBe(false);
    expect(cronJobSchema.safeParse("").success).toBe(false);
  });
  it("exposes the ten ops jobs", () => {
    expect([...CRON_JOBS].sort()).toEqual(
      ["daily_ingestion", "expiry_sweep", "purge_sessions", "purge_stale_tailored_cvs", "reset_ai_cv_counters", "retention_purge", "process_instant_alerts", "digest_daily", "digest_weekly", "purge_alert_deliveries"].sort(),
    );
  });
});

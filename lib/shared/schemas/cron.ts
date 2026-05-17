import { z } from "zod";
export const CRON_JOBS = [
  "daily_ingestion",
  "expiry_sweep",
  "reset_ai_cv_counters",
  "purge_sessions",
  "purge_stale_tailored_cvs",
  "retention_purge",
] as const;
export const cronJobSchema = z.enum(CRON_JOBS);
export type CronJob = z.infer<typeof cronJobSchema>;

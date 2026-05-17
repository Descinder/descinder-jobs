import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SESSION_COOKIE_SECRET: z.string().min(32),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z.string().transform((v) => v === "true"),
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_APP_KEY: z.string().optional(),
  REED_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRICE_SEEKER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_COMPANY_MONTHLY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PROVIDER_MODE: z.enum(["both", "claude_only"]).optional(),
  CRON_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // Only set true where there is NO Cloudflare edge and the origin is fronted
  // by a TRUSTED proxy (local dev / CI). Never set in the CF production deploy.
  RATE_LIMIT_TRUST_FORWARDED: z.string().optional(),
  // Per-IP rate limiting is meaningful only behind a real edge (Cloudflare):
  // production sets this "true". Off in local/CI (every request shares the
  // loopback IP, so per-IP buckets are nonsensical there). Per-USER limits are
  // always active regardless; the IP-resolution + gating logic is unit-tested.
  RATE_LIMIT_IP_ENABLED: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

const isServer = typeof window === "undefined";
const schema = isServer ? serverEnvSchema : clientEnvSchema;

const parsed = schema.safeParse(
  isServer
    ? process.env
    : {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      },
);

if (!parsed.success) {
  console.error("Invalid env:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

// `env` is typed as the server schema so server-only modules can access all
// fields without casts. On the client only NEXT_PUBLIC_* fields are populated
// at runtime; accessing server-only keys from client code is a programming error.
export const env = parsed.data as z.infer<typeof serverEnvSchema>;

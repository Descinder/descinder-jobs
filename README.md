# Descinder Jobs

Job board MVP. Next.js 15 + Supabase + Cloudflare Pages.

See design spec: `../docs/superpowers/specs/2026-05-09-descinder-rebuild-design.md`

## Development

```bash
npm install
cp .env.example .env.local  # fill in values
npm run dev
```

App runs on http://localhost:3000.

## Tests

```bash
npm run test         # vitest unit tests
npm run test:e2e     # playwright end-to-end tests
```

## Plan 2a — Backend Foundation (complete)

BFF architecture: the browser talks only to `/api/*`; only the backend touches Supabase.

- Revision-2 schema (migrations 00007–00010): dual-source jobs, cv kinds, `cv_generations`, `ingestion_runs`, `sessions`, `processed_stripe_events`, AI-CV counters, Revision-2 `app_settings`, kind-aware cv cap trigger, RLS backstop
- `lib/server/repos/db.ts` — the single server-only service-role Supabase client
- Wrapped-GoTrue auth + backend session (AES-256-GCM-encrypted refresh token, opaque httpOnly `ds_session` cookie, double-submit CSRF via `ds_csrf`)
- API conventions: `AppError` + `ok/fail` envelope, Zod schemas, handler helpers
- Server-authoritative authz (`requireUser/Role/OwnerOrAdmin/CompanyMember`) + feature gating (`evaluateGate`/`featureGate`)
- Auth API: signup, login, logout, magic-link, callback, forgot, reset (`/api/auth/*`)
- `proxy.ts` (Next 16 renamed `middleware.ts`) — cheap CSRF-cookie only, no Supabase
- Client Supabase modules deleted; Plan-1 auth pages now `fetch` `/api/auth/*`; editors stubbed for Plan 3
- Tests: 36 vitest unit, 3 Playwright integration (auth-api, gotrue, session) — all green; `tsc --noEmit` clean

Known follow-ups (tracked in specs):
- Local GoTrue overrides `redirect_to` to `site_url` until `supabase stop && supabase start`; production needs Supabase Auth redirect-allowlist config (deployment task)
- Plan 3 decision: server components call `/api/*` vs `db()` directly (strict BFF vs server-only allowance)
- `sessions` purge cron + DSAR export of `cv_generations`/`ai_tailored` → Plan 2d

Next: Plan 2b (jobs/applications/CV/ingestion services + endpoints).

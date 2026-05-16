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

## Plan 2b-i — Jobs Core (complete)

- Schemas + pure DTO mappers (native/ingested shape divergence, data-minimized; adapted to Zod 4)
- Repos: jobs (list/filter/sort/paginate, detail, similar, employer CRUD), companies, profile
- Services: jobs/companies/profile with `requireRole`/`requireCompanyMember` authz + `employer_publish` gating
- Endpoints: GET `/api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/similar`, `/api/companies/:slug`; POST `/api/companies`; GET/PUT `/api/me/company`; POST `/api/jobs` + PATCH/close/repost; GET `/api/me/jobs`; PUT `/api/me/seeker-profile`; GET/PUT `/api/me/profile`; GET `/api/me/dashboard`
- Bad filter input → 422 (not masked 500); all mutations CSRF-checked
- Tests: unit (schemas, dto) + e2e (jobs-repo, companies-repo, jobs-api public browse, employer post flow) — all green; tsc clean

Next: Plan 2b-ii (applications: native apply gated, external-click, unified list, status/withdraw, application detail + CV-access authz, saved jobs, reports).

## Plan 2b-ii — CV Management + Blob Storage (complete)

- Storage: S3-protocol blob integration (`integrations/storage/blob.ts`) — dev=local Supabase Storage S3, prod=Cloudflare R2 (pure env-swap, verified working). Migration 00012 creates the local `cvs` bucket.
- CV repo + service (owner-scoped): list, upload-url (presigned PUT, ≤3-base trigger enforced), build-from-profile (deterministic text CV; AI tailoring is Plan 2c; tolerates no-profile-row), exclusive primary, delete (row + object), download (presigned GET, 60s TTL).
- Endpoints: GET `/api/me/cvs`, POST `/api/me/cvs/upload-url`, POST `/api/me/cvs/build-from-profile`, PATCH `/api/me/cvs/:id/primary`, DELETE `/api/me/cvs/:id`, GET `/api/me/cvs/:id/download`
- Tests: 51 unit (incl. cv schema) + e2e (blob round-trip, cv-repo incl. cap trigger, full lifecycle, owner-scoping → attacker 404)

Deployment note: production must create the R2 `cvs` bucket in Cloudflare + set STORAGE_* to R2 endpoint/creds (region `auto`); no code change.

Next: Plan 2b-iii (applications: native apply gated + cv_file_id, external-click, unified list, status/withdraw, application detail + CV-access authz, saved jobs, reports).

## Test discipline + quarantine note

`npm test` (51 vitest unit) and `npm run test:e2e` (18 passed, 2 skipped) are both green/honest as of Plan 2b-ii.

Quarantined (skipped with in-file reason, to be un-skipped + rewritten in Plan 3):
- `tests/e2e/profile-edit.spec.ts` — Plan-1 UI; onboarding/editor stubbed pending Plan 3 /api wiring
- `tests/e2e/signup-employer.spec.ts` — same; equivalent backend flow proven by `employer-jobs.spec.ts`

Process going forward: each implementation cluster runs a review agent on its files AND the relevant tests; every plan checkpoint runs the FULL `npm test` + `npm run test:e2e` and reports the true count (green, or with explicitly-quarantined known-stale specs — never silently red).

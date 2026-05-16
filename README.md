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

## Plan 2b-iii — Applications (complete, reviewed, remediated)

- Migration 00013: `applications.external_status` (seeker self-report vocab, CHECK-constrained — DB rejects out-of-vocab, pg 23514)
- Native apply: `featureGate("apply_native")` → 402 PAYWALL (free), 409 dup, native+published only, **cv_file_id ownership re-verified server-side** (cross-user CV-attach confirmed blocked)
- External apply: never gated, anon-allowed, idempotent subscriber stub (race-safe upsert), native-job guard (can't get a free stub for a native job)
- Unified `/api/me/applications` (DB-level source filter + correct filtered `total`), seeker external self-status, withdraw scrubs cover_letter+cv_file_id (GDPR)
- Application detail + CV presigned-GET — `canViewApplication` = applicant OR owning company member OR admin, else 404 (no existence leak; null-owner external apps → applicant/admin only)
- Employer applicants + native status (company-member only; cross-tenant 403); seeker/employer status vocabularies disjoint
- Saved jobs (idempotent) + content reports
- Review verdict SOUND after remediation (F1 source-filter pagination/count, F2 race-safe stub, F3 native guard). No Critical; both top abuse paths SAFE.
- Tests: 62 unit + e2e (applications-repo incl. F1 negative, saved-reports-repo, apply-flow, external-apply, employer-applicants, saved-reports). FULL suite: 62 unit / e2e 25 pass + 2 quarantined.

Accepted product decision (review F4): employers see *withdrawn* applications in the applicants list with `withdrawn=true` and PII already scrubbed (cover_letter/cv null) — intentional (employer learns the candidate withdrew); no PII leak. Revisit in Plan 3 UI if undesirable.
Deferred: seeker email notification on employer status change → Plan 2d (Resend).

Next: Plan 2b-iv (ingestion: Adzuna UK/US/AU/CA + Reed UK, §6 degradation mapping, ingestion_runs, admin trigger).

## Plan 2b-iv — Third-Party Ingestion (complete, reviewed, remediated)

- Pure mappers (`lib/shared/ingest-map.ts`): Adzuna + Reed → NOT-NULL-safe ingested rows; work_mode/experience inferred via keyword scan; salary_is_predicted (Adzuna only); skills=[]; company_id=null + source_company_name + "Sourced from …"; per-country currency; malformed/empty provider date → safe ISO fallback (both sources)
- Thin env-guarded clients (Adzuna `it-jobs` UK/US/AU/CA; Reed keyword UK) — SSRF-safe (whitelisted country path, fixed hosts, no user-controlled URL)
- **Migration 00014**: replaced 00007's *partial* `jobs_source_external_uidx (where external_id is not null)` with a full unique index — the partial index could not be an `ON CONFLICT (source,external_id)` inference target (supabase-js `upsert` emits no predicate). Native rows keep `external_id NULL`; default unique-index NULL-distinct semantics leave unlimited native rows valid.
- Ingestion repo: idempotent upsert on `(source,external_id)`; `expireUnseen` (source+country+published+`ingested_at < runStart` — provably cannot touch native or other-source rows); `expires_at` 60-day backstop stamped per upsert (rolls forward each run) so a generic expiry sweep handles ingested inventory consistently — **expireUnseen remains the authoritative ingested-expiry mechanism**
- Ingestion service: injected fetcher (fixtures in CI, real clients in prod), bounded `MAX_PAGES=5`, **expire ONLY on a fully successful run** (partial/failed pull never mass-expires — now explicitly tested); `ingestion_runs.error_message` is sanitized (configured API-key values redacted, length-bounded) since it is admin-readable
- Admin endpoints: `GET /api/admin/ingestion-runs`, `POST /api/admin/ingestion/run` — admin-gated (401 anon / 403 non-admin / 200 admin) + CSRF on the POST; clear CONFLICT when API keys absent
- Review verdict SOUND after remediation. AuthZ / SSRF / secret-handling / §6 degradation render / expiry scoping / migration 00014 all SAFE. Remediated: M1 (expires_at backstop), M2 (added expiry-only-on-success e2e), L1 (error sanitization), L2 (Adzuna date fallback).
- Tests: unit (schemas-ingestion 3, ingest-map 7) + e2e (ingestion-repo; ingestion: fixture→public-feed degraded shape + idempotent + expiry + **expiry-only-on-success** + admin authz 401/403/200)

Deferred to Plan 2d: (a) daily ingestion cron schedule (this plan built the testable service + manual admin trigger; 2d wires pg_cron → secured internal endpoint calling `ingestSource` per (source,country)); (b) **concurrent-run guard** — two simultaneous admin triggers for the same (source,country) could transiently over-expire (self-heals next clean run; admin-only/low-probability); add a per-(source,country) advisory lock / "run in progress" guard when wiring the 2d cron; (c) 2d cron should add a wall-clock timeout (admin manual trigger is bounded by MAX_PAGES but has no overall timeout).

This completes Plan 2b (i jobs-core · ii CV+storage · iii applications · iv ingestion). Next: Plan 2c — AI-CV (Groq→Claude) + Stripe embedded billing + webhooks (+ deferred `employer_publish` gate completion, backend-spec §13 I1).

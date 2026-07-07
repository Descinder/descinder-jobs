# CI / CD

## `deploy-migrations.yml` — Supabase migrations on push

Runs on any push to `main` that touches `supabase/migrations/**`. Push behaviour:

1. Installs the Supabase CLI.
2. Sanity-checks the three inputs are present.
3. Links to the remote project.
4. Prints the pending-migration list (visible in the job log — this is your paper trail).
5. Applies pending migrations via `supabase db push --include-all`.

A `workflow_dispatch` trigger is also wired — you can manually re-run from the Actions UI with `dry_run: true` to just list pending migrations without applying.

Concurrency-guarded (`supabase-migrations-prod`) so two merges landing simultaneously can't race the schema.

## What you still need to do (one-time setup)

### 1. Create a Supabase Access Token

- https://supabase.com/dashboard/account/tokens → **Generate new token**, name it `github-ci` or similar.
- Copy the token.

### 2. Get the project reference

- Your Supabase project URL: `https://supabase.com/dashboard/project/<PROJECT_ID>`.
- The `<PROJECT_ID>` (also called "project ref") is a 20-char string like `abcdefghijklmnopqrst`.

### 3. Get the DB password

- Supabase Dashboard → **Project Settings → Database → Connection info** → **Database password**. (If you never set one, reset it here — Supabase doesn't recover it.)

### 4. Add the three inputs to GitHub

Repository → **Settings → Secrets and variables → Actions**:

**Secrets** (repository secrets):
- `SUPABASE_ACCESS_TOKEN` — the token from step 1
- `SUPABASE_DB_PASSWORD` — the DB password from step 3

**Variable** (repository variable — not a secret; the project ref isn't sensitive):
- `SUPABASE_PROJECT_ID` — the ref from step 2

### 5. First run

- Merge any migration change to `main`, OR trigger `workflow_dispatch` from Actions UI with `dry_run: true` to preview.
- Watch the run in Actions → `Deploy Supabase migrations` → `push` job → `Show pending migrations` and `Push migrations (real run)` step logs.

## Discipline notes

- **Migrations are ADDITIVE only in this project.** Never edit a migration once it's landed on `main`; add a new numbered migration that patches. Editing a pushed migration silently drifts local vs. remote and will eventually corrupt state.
- **Never** put schema changes in the app code path — every schema change belongs in a numbered file in `supabase/migrations/`.
- If a migration fails partway (e.g. a bad constraint), the workflow leaves the remote in the failed state and the job goes red. Fix on a follow-up PR — do not force-retry an already-applied migration.

## Rotation

Rotate `SUPABASE_ACCESS_TOKEN` yearly (or on incident). To rotate:
1. Create a new token in Supabase.
2. Update the `SUPABASE_ACCESS_TOKEN` GitHub secret.
3. Revoke the old token in Supabase.

`SUPABASE_DB_PASSWORD` rotation is a bigger deal (touches the app's `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` too) — do that as a scheduled maintenance window, not routinely.

# Deployment Runbook (Branching + CI/CD + Manual Operations)

## Overview

Your repo uses a promotion flow intended to keep `main` (production) stable:

- Work happens on `feature/*` branches and is merged into `develop`
- `develop` is promoted to `staging` when you’re ready for release testing
- Once staging is verified, `staging` is promoted to `main`

CI/CD responsibilities:

- `.github/workflows/ci.yml`: validates PRs into `develop` (lint/type-check/build)
- `.github/workflows/deploy-staging.yml`: on `push` to `staging`, builds the app, pushes Supabase schema, and deploys Edge Functions
- `.github/workflows/deploy-production.yml`: on `push` to `main`, builds the app, pushes Supabase schema, and deploys Edge Functions

## GitHub Secrets required for automated deploys

The staging/production workflows run Supabase CLI commands via your npm scripts.

### Required
- `SUPABASE_ACCESS_TOKEN`: used by the Supabase CLI inside `npm run push:staging` / `npm run push:prod` and `./scripts/deploy-edge-functions.sh`.

### Optional (best-effort diagnostics only)
- `SUPABASE_SERVICE_ROLE_KEY`: only affects the “environment validation (best-effort)” steps. The workflows do not require it to deploy.

## Runtime `.env` generation (no secrets committed)

The build runs `node env-manager.js` as part of `npm run build` / `npm run dev`.

`env-manager.js` copies one of `.env.staging`, `.env.production`, etc. into `.env.next`.

For CI/CD, you can additionally inject overrides via environment variables (for example, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY`). This avoids committing sensitive values to `*.env` files.

## Manual-only scripts (use with care)

### `scripts/migrate-staging-to-production.sh` (DESCTRUCTIVE DATA OVERWRITE)

When to use:
- Exceptional situations where you must align *production data* to the *current staging data*.

What it does:
- Creates a fresh SQL dump from staging
- Creates a backup dump from production
- Overwrites production data with the staging dump (it explicitly warns that it will overwrite all existing data)
- Verifies by listing tables and sampling `auth.users`

Safety notes:
- This script prompts for confirmation (`Continue? (y/N)`).
- Ensure you’ve captured/validated a production backup before proceeding (the script attempts a backup, but verify output).
- Ensure Postgres client tools (`pg_dump`, `psql`) are available on the machine running the script.

Never run this from CI/CD.

### `scripts/sync-to-production.sh` (LOCAL REPO SYNC, INTERACTIVE)

When to use:
- When you need to sync code (and optionally schema) from the staging codebase to a local “production repo” checkout on your machine.

What it does:
- Uses fixed absolute paths for `STAGING_DIR` and `PRODUCTION_DIR` (so it only works in the intended local environment)
- Syncs application code from staging to production via `rsync`
- Optionally syncs the database schema (schema-only) using `supabase db dump --schema-only` and `supabase db push`
- Optionally commits the changes to the local production repo (interactive prompt)

Safety notes:
- It is interactive and not suitable for automated pipeline usage.
- Because it uses local absolute paths, it can fail or sync the wrong directories if run on another machine without editing the script.

## Recommended “safe defaults”

For routine releases, prefer the automated promotion + Supabase schema push flow:
- Merge to `staging` for testing
- Merge to `main` for production deploy

Use the manual scripts only for the exceptional cases described above.


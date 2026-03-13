
Goal: make company switching a hard tenant boundary across the whole app (all modules + settings), so changing company updates every screen and data source immediately.

1) What is currently blocking this
- Company context is inconsistent:
  - `/choose-company` is outside `OrgProvider`, but `CompanyPicker` calls `useOrg()` (context mismatch).
  - `OrgContext` still mixes org/company resolution with localStorage fallbacks and platform-admin shortcuts.
- Data fetches are inconsistent:
  - Many pages/services query by `organization_id` only (or no tenant filter at all), so switching company does not change results.
  - Several React Query keys do not include `companyId`, so caches stay stale after switching.
- DB policies are too permissive:
  - Core tables currently have permissive “allow all” policies (including `employees`, `pay_groups`, `pay_runs`, `projects`, etc.), so UI filters are the only guard.
- Add-company flow is partial:
  - Company row is created, but membership assignment is not guaranteed atomically (confirmed by data: new company exists, membership missing), so it won’t appear in dropdown.

2) Implementation plan (system-wide)
Phase A — Tenant context hardening
- Move `OrgProvider` up so both `/choose-company` and main app routes share the same tenant context.
- Refactor `OrgContext` to a single source of truth:
  - active company
  - derived organization
  - explicit “needs company selection” state
- On company switch:
  - update context
  - invalidate/clear query cache
  - trigger a global tenant-change event for non-query pages

Phase B — Atomic company creation + membership
- Replace current two-step client flow with one DB RPC transaction:
  - create company
  - insert creator membership
  - return new company id
- Dialog then auto-selects the new company and refreshes memberships list.

Phase C — Enforce company boundary at DB layer
- Remove permissive “allow all” policies on business tables.
- Introduce strict company-scoped RLS pattern for company-scoped data:
  - require authenticated user membership in row company
  - enforce org/company consistency where needed
- Keep org-level/global tables explicitly org-scoped (or global) by design.
- Add/adjust helper functions for policy reuse (membership checks and scoped access checks).

Phase D — Schema normalization for true “everything by company”
- Add `company_id` to key org-only tables that must follow company switching (starting with payroll/settings/project surfaces).
- Backfill `company_id` using deterministic mapping (existing relations where possible, default company fallback only when unavoidable).
- Add constraints/triggers so new rows always carry valid `company_id` for company-scoped tables.

Phase E — Frontend data scoping sweep
- Create a shared tenant-query helper and apply it in services/pages.
- Update all module queries (Dashboard, Employees, Pay Groups, Pay Runs, Projects, Attendance, EHS, Settings) to include company scope.
- Update React Query keys to include `companyId` (and `organizationId` where relevant).

3) Technical details (targeted changes)
Frontend files (core)
- `src/App.tsx` (provider placement for `/choose-company` + app routes)
- `src/lib/tenant/OrgContext.tsx` (context simplification + deterministic switch behavior)
- `src/components/auth/CompanyPicker.tsx` (safe context usage + selection flow)
- `src/layouts/MainLayout.tsx` (switch handling + cache invalidation/refetch)
- Service/page sweep in:
  - `src/lib/services/*`
  - `src/pages/*`
  - `src/components/*` modules that query Supabase directly

Database (migrations)
- New transactional RPC for create-company-and-membership.
- RLS policy replacement on core business tables (remove permissive “allow all” and replace with scoped policies).
- Add `company_id` where missing for company-scoped entities; backfill + indexes + FK constraints + integrity checks.

4) Rollout & verification
- Step 1: context + atomic create flow (fix visible “company not appearing” immediately).
- Step 2: RLS hardening + schema updates.
- Step 3: module-by-module query sweep + cache key updates.
- Step 4: E2E validation matrix:
  - switch company in header => every module changes dataset
  - create company => appears immediately + auto-switch works
  - refresh/login preserves selected company correctly
  - no cross-company leakage in any module/settings page.

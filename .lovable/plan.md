

## Problems Identified

There are three distinct issues:

### 1. No company selection after login
After login, users land on `/dashboard` directly. The `CompanyPicker` component exists at `/choose-company` but is never triggered. The `OrgContext` silently auto-picks the first company if there's only one membership, and does nothing visible if there are multiple — users are never redirected to choose.

### 2. Company switching in the header dropdown does nothing to data
The header dropdown in `MainLayout` calls `setCompanyId(val)` on the OrgContext and updates `localStorage`, but **most pages only use `organizationId` from `useOrg()`** — not `companyId`. The Dashboard, Employees, PayGroups, and PayRuns pages all filter by `organizationId` only, so switching company has zero effect on displayed data.

### 3. No UI to add a new company
There is a `CompanyService.createCompany()` in `src/lib/services/admin/companies.ts`, but no user-facing dialog or form to create a company under an organization.

---

## Plan

### A. Redirect to company picker after login (when user has multiple companies)

- Modify `OrgContext.tsx`: when `user_company_memberships` returns multiple companies and no `active_company_id` is stored, set a flag (e.g. `needsCompanySelection: true`) on the context.
- Modify `ProtectedRoute.tsx`: if `needsCompanySelection` is true, redirect to `/choose-company` instead of rendering children.
- After selecting a company in `CompanyPicker`, it already sets `localStorage` and navigates to `/dashboard` — this flow will work.

### B. Make company switching actually re-scope data

- In `MainLayout.tsx` company dropdown `onValueChange`: after setting `companyId`, also update `organizationId` from the selected company (derive via the already-loaded `assignedCompanies` data or a quick lookup). Force a re-render by updating OrgContext state.
- Add `companyId` as a filter in key data-fetching pages (Dashboard, Employees, PayGroups, PayRuns) so they respect the selected company. Where queries already filter by `organization_id`, add an additional `.eq('company_id', companyId)` when `companyId` is present.
- Alternatively, make `OrgContext` re-derive `organizationId` when `companyId` changes (it partially does this already but the effect dependency array doesn't include `companyId`).

### C. Add "Create Company" dialog

- Create `src/components/admin/CreateCompanyDialog.tsx` — a simple form dialog with fields: name, country (dropdown from `countries` table), currency (dropdown from `currencies` table).
- Wire it into the company settings or organization admin area, gated behind admin role check.
- On submit, call `CompanyService.createCompany()` and auto-create a `user_company_memberships` row for the creating user.

### Technical details

**OrgContext changes:**
- Add `needsCompanySelection` boolean to context value
- Fix `useEffect` dependency: add `companyId` to the dep array so org re-derives when company changes
- When `companyId` changes via `setCompanyId`, clear and re-derive `organizationId`

**ProtectedRoute changes:**
- Wrap with `OrgProvider` awareness or check `localStorage('active_company_id')` + membership count to decide redirect

**Dashboard/page changes:**
- Pages that currently filter only by `organizationId` will additionally filter by `companyId` when available, so company switching actually changes the visible data

**CreateCompanyDialog:**
- Standard shadcn dialog with name, country selector, currency selector
- Uses existing `CompanyService.createCompany()`
- Accessible from the Settings area or header company dropdown (as an "Add Company" option)


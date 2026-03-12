

## Diagnosis

I found several root causes for why nothing appears to work:

### Problem 1: CompanyPicker doesn't update OrgContext
`CompanyPicker.tsx` only sets `localStorage` and navigates to `/dashboard`. It never calls `setCompanyId()` from `OrgContext`, so the context state (`companyId`, `organizationId`) is stale after selection. Pages that depend on `useOrg()` don't see the change.

### Problem 2: RLS blocks membership insert after company creation
The `CreateCompanyDialog` creates a company, then tries to insert into `user_company_memberships` to auto-assign the creator. But the INSERT RLS policies on that table require the JWT to contain `role = 'super_admin' | 'organization_admin'` AND `organization_id` in the JWT claims. Most users' JWTs don't have these claims set, so the insert **silently fails**. The company gets created but the user never gets linked to it, so it doesn't appear in their dropdown.

### Problem 3: PayGroups page ignores companyId
`PayGroups.tsx` only filters by `organizationId`, never by `companyId`. Switching companies has no effect on that page.

---

## Fix Plan

### A. Fix CompanyPicker to update OrgContext
- Import `useOrg` in `CompanyPicker.tsx`
- Call `setCompanyId(id)` when a company is selected (instead of just setting localStorage)
- This ensures OrgContext state updates, triggering re-renders across all pages

### B. Fix RLS for user_company_memberships
Create a **database function** `assign_company_membership(p_user_id uuid, p_company_id uuid)` with `SECURITY DEFINER` that:
- Validates the company exists and belongs to the caller's org
- Inserts the membership row bypassing RLS
- Update `CreateCompanyDialog` to call this RPC instead of a direct insert

### C. Fix PayGroups to filter by companyId
- Add `companyId` to the query filter in `PayGroups.tsx`
- Add `companyId` to the `useEffect` dependency array

### D. Refresh company dropdown after creation
- After `CreateCompanyDialog` succeeds, call `setCompanyId(newCompanyId)` so the user immediately switches to the new company
- Ensure `fetchCompanies()` is called to refresh the dropdown list

### Files to change
- `src/components/auth/CompanyPicker.tsx` — use `setCompanyId` from OrgContext
- `src/components/admin/CreateCompanyDialog.tsx` — use RPC, auto-switch to new company
- `src/pages/MyDashboard/PayGroups.tsx` — add company filter
- **New migration** — create `assign_company_membership` SECURITY DEFINER function


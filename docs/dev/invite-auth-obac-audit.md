# Invite, Auth, and Audit System Audit

## 1. Audit Logging (activity_logs)

### Current State
- **Database Schema**: `activity_logs` table contains:
  - `id` (uuid)
  - `organization_id` (uuid)
  - `user_id` (uuid)
  - `action` (text)
  - `resource_type` (text)
  - `resource_id` (uuid)
  - `details` (jsonb)
  - `ip_address` (inet)
  - `user_agent` (text)
  - `created_at` (timestamptz)
- **Logger Service**: `src/lib/services/audit-logger.ts` sends:
  - `org_id` (incorrect, should be `organization_id`)
  - `resource` (incorrect, should be `resource_type`)
  - `metadata` (not in schema, should be merged into `details`)

### Solution
Align the `AuditLogger` and TypeScript definitions with the actual database schema. Merge `metadata` into `details`.

---

## 2. Invites and Provisioning

### Current State
- **Trigger**: `activate_invited_user` on `auth.users` handles provisioning on first login (`confirmed_at` change).
- **Metadata**: Expects `role_data` in `user_invites` with format: `{orgs: [{orgId, roles: [roleKeys], companyIds}]}`.
- **Issue**: Provisioning may fail if the invite creation doesn't follow this format or if the trigger fails silently.

### Solution
- Verify `invite-org-user` Edge Function output format.
- Ensure `AcceptInvite.tsx` correctly triggers the `confirmed_at` update.
- Upgrade UI to show metadata (Name, Org, Roles).

---

## 3. Auth and Login (secure-login)

### Current State
- **Secure Login**: Checks a `profiles` table for lockout status.
- **Frontend Hook**: Fetches profile data from `user_profiles`.
- **Mismatch**: Possible conflict/redundancy between `profiles` and `user_profiles`. The `profiles` table may be stale or missing keys like `locked_at`.
- **401 Error**: Returned when user is not found or account is locked. Generic error in UI prevents diagnosis.

### Solution
- Consolidate identity/lockout checking to `user_profiles`.
- Ensure `use-supabase-auth.tsx` sends the `Authorization` header when calling `secure-login`.
- Update `secure-login` to return more specific errors (while maintaining security).

---

## 4. OBAC Enforcement

### Current State
- Multi-tier roles exist (`org_roles`, `org_user_roles`).
- Users may be seeing too much due to legacy RLS policies or frontend "Super Admin" checks that don't respect the new scoped RBAC.

### Solution
- Review and tighten RLS policies across all org-scoped tables.
- Remove hardcoded role checks that bypass scoped logic.

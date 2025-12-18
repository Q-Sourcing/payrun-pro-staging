# Invite Cleanup (Pending Users Only)

This repo includes a one-time cleanup path for removing **invited/pending users who never onboarded** while protecting active users and payroll data.

## Phase 1 — Inventory (Dry-run only)

Run the SQL inventory script:

- `supabase/sql/invite_cleanup_inventory.sql`

This lists:
- `email`
- `auth_user_id`
- invite state (`user_invites` or `auth_only`)
- timestamps and auth flags (`invited_at`, `confirmed_at`, `last_sign_in_at`, `has_password`)

## Phase 2 — Guardrails (what is considered deletable)

The cleanup only targets users who meet **all**:
- Invite is pending (`user_invites.status = 'pending'`) OR auth-only invite (optional)
- `auth.users.invited_at IS NOT NULL`
- `auth.users.confirmed_at IS NULL`
- `auth.users.last_sign_in_at IS NULL`
- No password set (`encrypted_password` empty)
- **No FK references to `auth.users`** outside a small allowlist of “safe to purge” tables (org mappings, profiles, etc)

If any protected FK reference is found (e.g. `pay_runs.created_by`, `employees.user_id`, approval tables), the user is **skipped**.

## Phase 3 — Execution (Edge Function, preferred)

### Prerequisites

Apply migrations so `cleanup_logs` and helper functions exist:
- `supabase/migrations/20251217194500_invite_cleanup_logs_and_helpers.sql`

### Function

Edge function:
- `supabase/functions/cleanup-invited-users`

### Dry-run call (recommended)

Invoke with:
```json
{
  "dryRun": true,
  "limit": 200,
  "olderThanDays": 30,
  "requireExpired": true,
  "includeAuthOnly": false
}
```

### Execute deletion (explicit confirmation required)

```json
{
  "dryRun": false,
  "confirm": true,
  "limit": 200,
  "olderThanDays": 30,
  "requireExpired": true,
  "includeAuthOnly": false,
  "authDeleteMode": "hard"
}
```

Notes:
- The function requires the caller to be a **platform admin**.
- It writes audit rows to `public.cleanup_logs` **before** deletion and again after deletion or errors.
- Auth users are deleted via `supabase.auth.admin.deleteUser` (never SQL).

## Audit & review

- Audit table: `public.cleanup_logs`
- Each run records: candidate snapshot, deletion request, operator identity, and outcome.


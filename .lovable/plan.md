
## Root Cause Analysis

From the database investigation, here is the exact situation:

**What I found:**
1. `user_management_profiles` does **NOT** have `full_name`, `email`, or `role` columns — it only has: `id`, `user_id`, `phone`, `department`, `status`, `created_at`, `updated_at`, `username`
2. `user_profiles` does **NOT** have a `full_name` column — it has `first_name` and `last_name` separately
3. The edge function is trying to upsert `full_name` and `email` into `user_management_profiles` → **column doesn't exist → silent failure**
4. The edge function is trying to upsert `full_name` and `role` into `user_profiles` → **`full_name` column doesn't exist**
5. The one successful invite to `tadong@flipafrica.app` has `status: pending` in `user_management_invitations` — the user clicked the link and was confirmed in Supabase Auth (`confirmed_at` is set, `last_sign_in_at` is set) — but the `/accept` action was never properly called, so the invitation record is still `pending`

**The core email problem:** The invite for `tadong@flipafrica.app` already exists with `status: pending`. When the admin tries to invite any new user, it hits the 409 "pending invitation already exists" check for that email — or for a new email, the `inviteUserByEmail` call succeeds but the subsequent `user_management_profiles` upsert **crashes** with a column-not-found error, causing the edge function to return 500, which the UI shows as a failure even though the Supabase Auth invite email was already sent.

Wait — re-reading the error flow: the `user_management_profiles` upsert error is NOT checked (it just silently runs with `.upsert()`), and the `user_profiles` upsert also runs silently. Both would fail since columns don't exist, but they don't stop execution. The invitation INSERT into `user_management_invitations` happens after these upserts... actually no — reading the code again: the invitation INSERT happens BEFORE the profile upserts (line 113-131 first, then 134-155). So the invitation DOES get stored, and the email IS sent.

**Real problem:** The `tadong@flipafrica.app` user clicked the link, Supabase confirmed them (`confirmed_at` is set), but the `accept` action was never successfully called because:
- The `verify-token` endpoint requires an `Authorization` header
- On the `/accept-invite-user` page, `verifyInviteToken()` uses the **anon key** as the Bearer token — but the edge function checks `supabaseAdmin.auth.getUser(token)` with the anon key → this returns an error, so `isAdmin` check fails → 403 returned

Actually wait — `verify-token` and `accept` go through the same auth check in the edge function, which requires the caller to be an admin/HR. But the invited user is NOT an admin — they haven't even set a password yet. They have a session (Supabase signed them in after the invite link click), so their `session.access_token` is used in the `accept` call. But since they're a new user with role `employee`, `isAdmin` is `false` → 403 → accept fails silently (the code has `console.warn` and doesn't block).

**Fix plan:**

### 1. Fix the `verify-token` and `accept` actions to NOT require admin auth

The `verify-token` and `accept` actions are called by the **invited user**, not an admin. They should bypass the admin permission check. Only `list`, `invite`, `resend`, and `cancel` need admin auth.

### 2. Fix the `user_management_profiles` upsert

The table only has: `id`, `user_id`, `phone`, `department`, `status`, `created_at`, `updated_at`, `username`. The edge function needs to add the missing columns OR skip the unnecessary fields.

**Add columns to `user_management_profiles`**: `full_name TEXT`, `email TEXT`, `role TEXT` — this is the cleanest fix so the profile table actually stores useful data.

### 3. Fix the `user_profiles` upsert

Split `full_name` into `first_name` and `last_name` when upserting `user_profiles`.

### 4. Clear the stuck `tadong` invitation

The `tadong@flipafrica.app` user is already confirmed in Supabase Auth. Their invitation is stuck as `pending`. We should update it to `accepted` in the DB and also update their profile to `active` via migration.

### Files to change

**Migration** — Add `full_name`, `email`, `role` columns to `user_management_profiles`, and fix `tadong`'s stuck invitation:
```sql
ALTER TABLE public.user_management_profiles 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT;

-- Fix stuck invitation for already-confirmed user
UPDATE public.user_management_invitations 
SET status = 'accepted', accepted_at = now()
WHERE email = 'tadong@flipafrica.app' AND status = 'pending';
```

**`supabase/functions/invite-user/index.ts`** — Three fixes:
1. Move `verify-token` and `accept` action handling **before** the admin permission check (or add a special bypass for those two actions)
2. Fix `user_management_profiles` upsert to include `full_name`, `email`, `role`
3. Fix `user_profiles` upsert to split `full_name` → `first_name` + `last_name` and NOT pass `full_name`

### Restructured auth flow in the edge function:

```text
Request arrives
    │
    ├── OPTIONS → CORS
    │
    ├── action == 'verify-token' → no auth needed, just use service role
    │
    ├── action == 'accept' → no admin needed, user just needs a valid session OR anon key
    │
    └── All other actions → require admin auth check
```

For `verify-token`: currently uses anon key as Bearer → `getUser(anonKey)` fails → returns error. Fix: skip the `getUser` check entirely for `verify-token` (it's a public read of invitation status, not sensitive).

For `accept`: the invited user has a real session token at this point. The issue is they're not an admin. Fix: skip the admin check for `accept` too — just verify they have a valid auth session (any authenticated user).

This is the minimal, targeted set of changes needed.

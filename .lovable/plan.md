
## Invitation-Based User Creation System

### What exists today
- `user_management_profiles` table: stores `id`, `user_id`, `username`, `full_name`, `email`, `role`, `phone`, `department`, `status`, `created_at`, `updated_at`
- `manage-users` edge function: POST creates users directly with password; GET/PATCH/DELETE for CRUD
- `UserManagementTab.tsx`: existing UI with Create/Edit/Delete dialogs
- `user_invites` table (existing for org invites) and `AcceptInvite` page already exist — but these are for the org-level flow and reference `organizations`
- `invite-org-user` edge function: already handles org invitations via Supabase `generateLink`

The new system needs a **separate** invitation flow scoped to User Management (admin-created users), separate from the org-invite flow.

### What needs to be built

**1. Database Migration**
New table: `public.user_management_invitations`
```
id              UUID PK
email           TEXT NOT NULL
full_name       TEXT NOT NULL
role            TEXT NOT NULL
department      TEXT
phone           TEXT
invited_by      UUID → auth.users(id)
token           TEXT UNIQUE (crypto random, 64 chars)
status          TEXT: 'pending' | 'accepted' | 'cancelled' | 'expired'
expires_at      TIMESTAMPTZ (now + 48 hours)
accepted_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ
```
RLS: service role full access; authenticated admins/HR can SELECT.

Add `full_name`, `email`, `role`, `phone`, `department` columns to `user_management_profiles` (currently the table only has `user_id`, `username`, `phone`, `department`, `status`). Actually looking at the manage-users edge function POST handler — it already inserts `full_name`, `email`, `role` into profiles. This means the profile table has those columns from the actual DB, even though the migration SQL for 20260306105843 only shows a subset. The edge function and TypeScript types are the source of truth here.

**2. Edge Function: `invite-user` (new)**
Handles the entire invitation lifecycle:
- `POST /invite` — sends invitation: validates admin auth, creates invitation record, uses `supabaseAdmin.auth.admin.generateLink({ type: 'invite' })` to get the invite link (same as `invite-org-user`), stores token in DB, sends email via Supabase's built-in mechanism (using `inviteUserByEmail` since no Resend key is guaranteed), updates `user_management_profiles` with status `pending`
- `GET /invitations` — lists all invitations for the admin dashboard
- `POST /resend` — regenerates token + expiry, resends email
- `POST /cancel` — sets status to `cancelled`
- `POST /accept` — verifies token not expired/cancelled, creates the auth user, sets profile status to `active`, logs to audit

**Strategy for email**: Use `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: origin + '/accept-invite-user' })` which sends a Supabase-managed invitation email. No RESEND_API_KEY required. The redirect URL points to a new dedicated page.

**3. New Page: `/accept-invite-user`**
Separate from the existing `/accept-invite` (which is for org invitations).
- Reads `token` from URL query param plus Supabase auth `code` or hash
- Verifies invitation is still valid (not expired/cancelled) by calling the edge function
- Shows a "Set Password" form
- On submit: calls `supabase.auth.updateUser({ password })` + calls edge function to mark invitation `accepted` and profile `active`
- Redirects to `/login` on success

**4. Updated `UserManagementTab.tsx`**
Replace "Create User" button with "Invite User" button.
Add new `InviteUserDialog` (replaces `CreateUserDialog`) with fields: Full Name, Email, Role, Department, Phone.
Add a second sub-tab (or second table section below users) for **Pending Invitations**:
- Columns: Full Name, Email, Role, Department, Status (Pending/Expired), Sent Date, Expires
- Actions: Resend, Cancel

**5. Route registration in App.tsx**
Add `/accept-invite-user` as a public route.

### Architecture Diagram
```text
Admin (Settings → User Mgmt)
    │
    ▼
[Invite User Dialog]
    │  Full Name, Email, Role, Dept, Phone
    ▼
invite-user Edge Function (POST /invite)
    ├── generateLink (type: invite) → Supabase sends email
    ├── INSERT user_management_invitations (token, status=pending, expires 48h)
    └── INSERT user_management_profiles (status=pending)
          │
          ▼
       User receives email
          │ clicks link
          ▼
    /accept-invite-user page
          │ Supabase exchanges code for session
          │ User sets password
          ▼
    invite-user Edge Function (POST /accept)
          ├── Validate token not expired
          ├── UPDATE invitation status = accepted
          └── UPDATE profile status = active
          │
          ▼
       Redirect to /login

Admin Dashboard (invitations tab)
    ├── GET invitations via invite-user
    ├── Resend → regenerate token + new 48h expiry
    └── Cancel → status = cancelled
```

### Files to create/modify

**Create:**
- `supabase/migrations/[timestamp]_user_management_invitations.sql` — new table
- `supabase/functions/invite-user/index.ts` — new edge function
- `src/pages/AcceptInviteUser.tsx` — new public page for setting password

**Modify:**
- `src/components/settings/UserManagementTab.tsx` — replace CreateUserDialog with InviteUserDialog; add Invitations sub-section
- `src/App.tsx` — register `/accept-invite-user` as public route

### Technical Notes
- Token generation: `crypto.randomUUID()` in the edge function for the `token` field stored in the DB. The Supabase invite link itself carries its own token; the DB token is used to validate the `/accept-invite-user` page request.
- Expiry check: edge function `/accept` endpoint checks `expires_at < now()` and returns error if expired.
- The existing `AcceptInvite` page and `user_invites` table remain untouched — they serve the org invite flow.
- The new `/accept-invite-user` page mirrors the existing `AcceptInvite` page's logic but looks up `user_management_invitations` instead of `user_invites`.
- Audit logging: insert into the existing `audit_logs` table on invite sent, accepted, and cancelled.
- The `manage-users` edge function's POST path (direct password creation) is kept as-is. The new "Invite User" flow is an addition, not a replacement, in case the admin still wants to create users directly.

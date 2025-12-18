-- ==========================================================
-- PHASE 1 (Dry-Run): Inventory invited/pending users
-- ==========================================================
-- This script NEVER deletes anything.
--
-- Representation of "invited users" covered:
-- 1) App-level invites: public.user_invites.status = 'pending'
-- 2) Auth-level invites: auth.users.invited_at is not null AND confirmed_at is null
--
-- Notes:
-- - Supabase Auth users MUST NOT be deleted via SQL. Use Admin API / Edge Functions.
-- - This query is intended to be run by a privileged operator (SQL editor).

-- 1) Pending invites (primary, preferred source of truth)
select
  'user_invites' as source,
  ui.email,
  au.id as auth_user_id,
  ui.status::text as invite_status,
  ui.created_at as created_at,
  ui.expires_at,
  au.invited_at,
  au.confirmed_at,
  au.last_sign_in_at,
  (coalesce(nullif(au.encrypted_password, ''), '') <> '') as has_password
from public.user_invites ui
left join auth.users au
  on lower(au.email) = lower(ui.email)
where ui.status = 'pending'
order by ui.created_at asc;

-- 2) Auth-only invites (invited in Supabase Auth, but no user_invites row)
select
  'auth_only' as source,
  au.email,
  au.id as auth_user_id,
  'pending' as invite_status,
  au.created_at as created_at,
  null::timestamptz as expires_at,
  au.invited_at,
  au.confirmed_at,
  au.last_sign_in_at,
  (coalesce(nullif(au.encrypted_password, ''), '') <> '') as has_password
from auth.users au
where au.invited_at is not null
  and au.confirmed_at is null
  and au.last_sign_in_at is null
  and coalesce(nullif(au.encrypted_password, ''), '') = ''
  and not exists (
    select 1
    from public.user_invites ui
    where lower(ui.email) = lower(au.email)
  )
order by au.created_at asc;

-- 3) Schema safety: list all FK references to auth.users (review before cleanup)
select
  kcu.table_schema as referencing_schema,
  kcu.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'auth'
  and ccu.table_name = 'users'
order by 1,2,3;


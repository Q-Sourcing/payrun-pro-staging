

## Plan: Finalize Zoho Integration

Two code changes are needed to make the Zoho integration operational now that the secrets are configured.

### 1. Register all Zoho edge functions in `config.toml`

Add `verify_jwt = false` entries for `zoho-auth-start`, `zoho-auth-callback`, `zoho-disconnect`, and `zoho-sync-employees`. These functions validate auth manually via `supabaseAdmin.auth.getUser()` or receive unauthenticated OAuth redirects.

### 2. Fix CORS headers in `platform-admin-auth.ts`

Update `Access-Control-Allow-Headers` to include the full set of Supabase client headers:
`authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`

This prevents preflight request failures when the frontend calls the Zoho edge functions.

### Files to change

- **`supabase/config.toml`** -- Add 4 function registration blocks
- **`supabase/functions/_shared/platform-admin-auth.ts`** -- Update line 6 CORS headers

No database changes needed. The shared `zoho.ts` module and all 4 edge functions are already fully implemented.


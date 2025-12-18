import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CleanupRequestSchema = z.object({
  dryRun: z.boolean().default(true),
  confirm: z.boolean().default(false),
  limit: z.number().int().min(1).max(2000).default(200),
  olderThanDays: z.number().int().min(0).max(3650).default(30),
  requireExpired: z.boolean().default(true),
  includeAuthOnly: z.boolean().default(false),
  tenantId: z.string().uuid().optional(),
  authDeleteMode: z.enum(['hard', 'soft']).default('hard'),
})

type CleanupRequest = z.infer<typeof CleanupRequestSchema>

type CandidateRow = {
  source?: string
  invite_id: string | null
  email: string
  invite_status: string
  invite_created_at: string
  invite_expires_at: string | null
  auth_user_id: string | null
  auth_created_at: string | null
  invited_at: string | null
  confirmed_at: string | null
  last_sign_in_at: string | null
  has_password: boolean | null
  protected_ref: unknown | null
  eligible: boolean
}

type PostgrestErrorLike = { code?: string; message?: string }

function isMissingRelationError(err: unknown): boolean {
  const e = err as PostgrestErrorLike | null
  return (
    e?.code === '42P01' ||
    (typeof e?.message === 'string' &&
      e.message.toLowerCase().includes('relation') &&
      e.message.toLowerCase().includes('does not exist'))
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const input: CleanupRequest = CleanupRequestSchema.parse(body)

    // Authorization: platform admin only (for safety)
    let paOk = false
    const { data: paById, error: paByIdErr } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('allowed', true)
      .eq('auth_user_id', caller.id)
      .maybeSingle()
    if (paByIdErr) throw paByIdErr
    if (paById) paOk = true

    if (!paOk && caller.email) {
      const { data: paByEmail, error: paByEmailErr } = await supabaseAdmin
        .from('platform_admins')
        .select('id')
        .eq('allowed', true)
        .ilike('email', caller.email)
        .maybeSingle()
      if (paByEmailErr) throw paByEmailErr
      if (paByEmail) paOk = true
    }

    if (!paOk) {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden: platform admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: candidates, error: invErr } = await supabaseAdmin.rpc('invite_cleanup_candidates', {
      p_limit: input.limit,
      p_older_than_days: input.olderThanDays,
      p_tenant_id: input.tenantId ?? null,
      p_require_expired: input.requireExpired,
      p_include_auth_only: input.includeAuthOnly,
    })

    if (invErr) throw invErr

    const rows: CandidateRow[] = (candidates ?? []) as CandidateRow[]
    const eligible = rows.filter((r) => r.eligible)
    const ineligible = rows.filter((r) => !r.eligible)

    if (input.dryRun || !input.confirm) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          criteria: {
            pendingInvite: true,
            requireExpired: input.requireExpired,
            olderThanDays: input.olderThanDays,
            noPassword: true,
            neverConfirmed: true,
            neverSignedIn: true,
            noProtectedReferences: true,
          },
          counts: {
            totalInvitesScanned: rows.length,
            eligibleToDelete: eligible.length,
            ineligible: ineligible.length,
          },
          results: rows.map((r) => ({
            source: r.source ?? 'user_invites',
            inviteId: r.invite_id,
            email: r.email,
            authUserId: r.auth_user_id,
            inviteStatus: r.invite_status,
            inviteCreatedAt: r.invite_created_at,
            inviteExpiresAt: r.invite_expires_at,
            invitedAt: r.invited_at,
            confirmedAt: r.confirmed_at,
            lastSignInAt: r.last_sign_in_at,
            hasPassword: r.has_password,
            protectedRef: r.protected_ref,
            eligible: r.eligible,
          })),
          nextStep:
            'If the dry-run looks correct, re-run with {"dryRun":false,"confirm":true} to delete eligible users.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const summary = {
      requested: {
        limit: input.limit,
        olderThanDays: input.olderThanDays,
        requireExpired: input.requireExpired,
        includeAuthOnly: input.includeAuthOnly,
        tenantId: input.tenantId ?? null,
        authDeleteMode: input.authDeleteMode,
      },
      counts: {
        totalInvitesScanned: rows.length,
        eligibleToDelete: eligible.length,
        deleted: 0,
        skipped: 0,
        errors: 0,
      },
      outcomes: [] as Array<Record<string, unknown>>,
    }

    const safeSelect = async (query: () => Promise<{ data: unknown; error: unknown }>) => {
      const res = await query()
      const err = (res as { error?: unknown }).error
      if (err && !isMissingRelationError(err)) throw err
      return (res as { data?: unknown }).data ?? null
    }

    for (const r of rows) {
      const snapshot: Record<string, unknown> = {}

      // Best-effort snapshot for reversibility/audit (pre-delete)
      if (r.eligible) {
        if (r.invite_id) {
          snapshot.user_invites = await safeSelect(() =>
            supabaseAdmin.from('user_invites').select('*').eq('id', r.invite_id).maybeSingle()
          )
        }
        if (r.auth_user_id) {
          snapshot.org_users = await safeSelect(() =>
            supabaseAdmin.from('org_users').select('id, org_id, status, created_at, created_by').eq('user_id', r.auth_user_id)
          )
          snapshot.user_profiles = await safeSelect(() =>
            supabaseAdmin
              .from('user_profiles')
              .select('id, email, first_name, last_name, organization_id, role, created_at, updated_at')
              .eq('id', r.auth_user_id)
              .maybeSingle()
          )
          snapshot.user_roles = await safeSelect(() =>
            supabaseAdmin.from('user_roles').select('role, created_at').eq('user_id', r.auth_user_id)
          )
          snapshot.user_company_memberships = await safeSelect(() =>
            supabaseAdmin.from('user_company_memberships').select('company_id, created_at').eq('user_id', r.auth_user_id)
          )
          snapshot.org_license_assignments = await safeSelect(() =>
            supabaseAdmin
              .from('org_license_assignments')
              .select('org_id, active, seat_type, created_at')
              .eq('user_id', r.auth_user_id)
          )
          snapshot.access_grants = await safeSelect(() =>
            supabaseAdmin
              .from('access_grants')
              .select('id, org_id, company_id, scope_type, scope_key, effect, created_at')
              .eq('user_id', r.auth_user_id)
              .limit(50)
          )
        }
      }

      const plannedDetails = {
        candidate: {
          source: r.source ?? 'user_invites',
          invite_id: r.invite_id,
          email: r.email,
          invite_status: r.invite_status,
          invite_created_at: r.invite_created_at,
          invite_expires_at: r.invite_expires_at,
          auth_user_id: r.auth_user_id,
          auth_created_at: r.auth_created_at,
          invited_at: r.invited_at,
          confirmed_at: r.confirmed_at,
          last_sign_in_at: r.last_sign_in_at,
          has_password: r.has_password,
          protected_ref: r.protected_ref,
          eligible: r.eligible,
        },
        requestedBy: { id: caller.id, email: caller.email },
        request: input,
        snapshot,
      }

      const { error: logErr } = await supabaseAdmin
        .from('cleanup_logs')
        .insert({
          action: r.eligible ? 'planned' : 'skipped',
          reason: 'invite_cleanup',
          email: r.email,
          auth_user_id: r.auth_user_id,
          invite_id: r.invite_id,
          details: plannedDetails,
        })

      if (logErr) throw logErr

      if (!r.eligible) {
        summary.counts.skipped += 1
        summary.outcomes.push({ email: r.email, inviteId: r.invite_id, authUserId: r.auth_user_id, result: 'skipped', protectedRef: r.protected_ref })
        continue
      }

      try {
        const userId = r.auth_user_id

        // 1) Related app tables (best-effort)
        if (userId) {
          const deletions: Array<Promise<unknown>> = []

          deletions.push(supabaseAdmin.from('org_users').delete().eq('user_id', userId))
          deletions.push(supabaseAdmin.from('user_profiles').delete().eq('id', userId))
          deletions.push(supabaseAdmin.from('user_roles').delete().eq('user_id', userId))
          deletions.push(supabaseAdmin.from('user_company_memberships').delete().eq('user_id', userId))
          deletions.push(supabaseAdmin.from('org_license_assignments').delete().eq('user_id', userId))
          deletions.push(supabaseAdmin.from('access_grants').delete().eq('user_id', userId))
          deletions.push(supabaseAdmin.from('notifications').delete().eq('user_id', userId))

          // Optional legacy table
          deletions.push(supabaseAdmin.from('profiles').delete().eq('id', userId))

          const results = await Promise.allSettled(deletions)
          for (const res of results) {
            if (res.status === 'fulfilled') {
              const err = (res.value as { error?: unknown } | null)?.error
              if (err && !isMissingRelationError(err)) throw err
            } else {
              const err = res.reason as unknown
              if (err && !isMissingRelationError(err)) throw err
            }
          }
        }

        // 2) user_invites row (pending only, if present)
        if (r.invite_id) {
          const { error: inviteDelErr } = await supabaseAdmin
            .from('user_invites')
            .delete()
            .eq('id', r.invite_id)
            .eq('status', 'pending')

          if (inviteDelErr) throw inviteDelErr
        }

        // 3) Supabase Auth user deletion (never via SQL)
        if (userId) {
          const shouldSoftDelete = input.authDeleteMode === 'soft'
          const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId, shouldSoftDelete)
          if (authDelErr) throw authDelErr
        }

        // Final audit row
        await supabaseAdmin.from('cleanup_logs').insert({
          action: 'deleted',
          reason: 'invite_cleanup',
          email: r.email,
          auth_user_id: r.auth_user_id,
          invite_id: r.invite_id,
          details: {
            ...plannedDetails,
            deletedAt: new Date().toISOString(),
            authDeleteMode: input.authDeleteMode,
          },
        })

        summary.counts.deleted += 1
        summary.outcomes.push({ email: r.email, inviteId: r.invite_id, authUserId: r.auth_user_id, result: 'deleted' })
      } catch (err: unknown) {
        summary.counts.errors += 1
        const errMsg = err instanceof Error ? err.message : String(err)
        summary.outcomes.push({ email: r.email, inviteId: r.invite_id, authUserId: r.auth_user_id, result: 'error', error: errMsg })

        await supabaseAdmin.from('cleanup_logs').insert({
          action: 'error',
          reason: 'invite_cleanup',
          email: r.email,
          auth_user_id: r.auth_user_id,
          invite_id: r.invite_id,
          details: {
            ...plannedDetails,
            error: { message: errMsg },
          },
        })
      }
    }

    return new Response(JSON.stringify({ success: true, dryRun: false, ...summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ success: false, message: 'Validation error', errors: error.errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const errMsg = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ success: false, message: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, message: 'Authorization header required' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !currentUser) {
      return json({ success: false, message: 'Invalid authentication token' }, 401)
    }

    // Permission check
    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .maybeSingle()

    const { data: platformAdmin } = await supabaseAdmin
      .from('platform_admins')
      .select('allowed')
      .eq('email', currentUser.email)
      .maybeSingle()

    const SUPER_ADMIN_EMAILS = ['nalungukevin@gmail.com']
    const callerRole = callerProfile?.role || ''
    const isAdmin =
      ['super_admin', 'admin', 'org_admin', 'organization_admin', 'ADMIN', 'HR', 'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN'].includes(callerRole) ||
      !!platformAdmin?.allowed ||
      SUPER_ADMIN_EMAILS.includes(currentUser.email || '')

    if (!isAdmin) {
      return json({ success: false, message: 'Insufficient permissions. Admin role required.' }, 403)
    }

    const orgId = callerProfile?.organization_id ?? DEFAULT_ORG_ID
    const url = new URL(req.url)

    // ── GET: list all users ────────────────────────────────────────────────────
    if (req.method === 'GET') {
      // Sync: pull all auth users and merge into user_management_profiles
      // so that existing users always appear in the list
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const authUsers = listData?.users ?? []

        // Get existing user_profiles for role/org data
        const { data: existingProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email, first_name, last_name, role, organization_id')

        const profileMap = new Map((existingProfiles ?? []).map(p => [p.id, p]))

        // Get existing management profiles to avoid overwriting admin-edited data
        const { data: existingMgmt } = await supabaseAdmin
          .from('user_management_profiles')
          .select('user_id')

        const existingMgmtIds = new Set((existingMgmt ?? []).map(p => p.user_id))

        // Get rbac assignments for role codes
        const { data: rbacAssignments } = await supabaseAdmin
          .from('rbac_assignments')
          .select('user_id, role_code')

        const rbacMap = new Map((rbacAssignments ?? []).map(a => [a.user_id, a.role_code]))

        // Upsert any auth users missing from user_management_profiles
        const toUpsert = []
        for (const authUser of authUsers) {
          if (existingMgmtIds.has(authUser.id)) continue // already managed
          const up = profileMap.get(authUser.id)
          const rbacRole = rbacMap.get(authUser.id)
          const fullName = authUser.user_metadata?.full_name ||
            (up ? `${up.first_name || ''} ${up.last_name || ''}`.trim() : '') ||
            authUser.email?.split('@')[0] || 'User'

          // Determine status: if user has confirmed email and signed in, they're active
          const hasSignedIn = !!(authUser as any).last_sign_in_at
          const status = hasSignedIn ? 'active' : 'pending'

          toUpsert.push({
            user_id: authUser.id,
            username: authUser.user_metadata?.username || null,
            full_name: fullName,
            email: authUser.email || '',
            role: rbacRole || up?.role || authUser.user_metadata?.role || 'STAFF',
            phone: authUser.user_metadata?.phone || null,
            department: authUser.user_metadata?.department || null,
            status,
            created_at: authUser.created_at,
            updated_at: new Date().toISOString(),
          })
        }

        if (toUpsert.length > 0) {
          const { error: syncErr } = await supabaseAdmin
            .from('user_management_profiles')
            .upsert(toUpsert, { onConflict: 'user_id', ignoreDuplicates: true })
          if (syncErr) console.error('Sync upsert error:', syncErr)
        }
      } catch (syncError) {
        console.error('User sync error (non-fatal):', syncError)
      }

      const { data: profiles, error } = await supabaseAdmin
        .from('user_management_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return json({ success: false, message: error.message }, 500)
      }

      return json({ success: true, users: profiles ?? [] })
    }

    // ── POST: create user ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      const { username, email, password, full_name, role, phone, department, status, role_code } = body
      const resolvedRole = role_code || role

      if (!email || !password) {
        return json({ success: false, message: 'Email and password are required' }, 400)
      }
      if (password.length < 8) {
        return json({ success: false, message: 'Password must be at least 8 characters' }, 400)
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ success: false, message: 'Invalid email address' }, 400)
      }

      // Create auth user
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || username || '',
          username: username || '',
          role: resolvedRole || 'employee',
        }
      })

      if (createError || !newAuthUser?.user) {
        console.error('Error creating auth user:', createError)
        return json({ success: false, message: createError?.message ?? 'Failed to create user' }, 400)
      }

      const userId = newAuthUser.user.id

      // Upsert into user_management_profiles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_management_profiles')
        .upsert({
          user_id: userId,
          username: username || null,
          full_name: full_name || username || '',
          email,
          role: resolvedRole || 'employee',
          phone: phone || null,
          department: department || null,
          status: status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ success: false, message: 'Failed to save user profile: ' + profileError.message }, 500)
      }

      // Also ensure user_profiles row exists for RBAC
      await supabaseAdmin.from('user_profiles').upsert({
        id: userId,
        email,
        full_name: full_name || username || '',
        role: resolvedRole || 'employee',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      // ── Assign role in rbac_assignments (maps to permissions) ──────────────
      if (resolvedRole) {
        await supabaseAdmin.from('rbac_assignments').upsert({
          user_id: userId,
          role_code: resolvedRole,
          scope_type: 'GLOBAL',
          scope_id: null,
          org_id: orgId,
          assigned_by: currentUser.id,
        }, { onConflict: 'user_id,role_code,scope_type' }).then(({ error: e }) => {
          if (e) console.error('rbac_assignments upsert error (create):', e)
        })
      }

      console.log(`User created: ${email} by ${currentUser.email}`)
      return json({ success: true, message: 'User created successfully', user: profile })
    }

    // ── PATCH: update user ─────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, username, full_name, role, role_code, phone, department, status } = body
      const resolvedRole = role_code || role

      if (!id) return json({ success: false, message: 'User ID is required' }, 400)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (username !== undefined) updates.username = username
      if (full_name !== undefined) updates.full_name = full_name
      if (resolvedRole !== undefined) updates.role = resolvedRole
      if (phone !== undefined) updates.phone = phone || null
      if (department !== undefined) updates.department = department || null
      if (status !== undefined) updates.status = status

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_management_profiles')
        .update(updates)
        .eq('user_id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return json({ success: false, message: updateError.message }, 400)
      }

      // Sync to user_profiles
      if (full_name !== undefined || resolvedRole !== undefined) {
        await supabaseAdmin.from('user_profiles').update({
          ...(full_name !== undefined ? { full_name } : {}),
          ...(resolvedRole !== undefined ? { role: resolvedRole } : {}),
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      }

      // ── Re-sync rbac_assignments when role changes ────────────────────────
      if (resolvedRole !== undefined) {
        // Remove any previous org-level assignments for this user first
        await supabaseAdmin
          .from('rbac_assignments')
          .delete()
          .eq('user_id', id)
          .eq('org_id', orgId)
          .neq('role_code', 'PLATFORM_SUPER_ADMIN')

        // Insert the new assignment
        await supabaseAdmin.from('rbac_assignments').upsert({
          user_id: id,
          role_code: resolvedRole,
          scope_type: 'GLOBAL',
          scope_id: null,
          org_id: orgId,
          assigned_by: currentUser.id,
        }, { onConflict: 'user_id,role_code,scope_type' }).then(({ error: e }) => {
          if (e) console.error('rbac_assignments upsert error (update):', e)
        })
      }

      console.log(`User updated: ${id} by ${currentUser.email}`)
      return json({ success: true, message: 'User updated successfully', user: updated })
    }

    // ── DELETE: remove user ────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const idParam = url.searchParams.get('id')
      let userId = idParam

      if (!userId) {
        try {
          const body = await req.json()
          userId = body.id
        } catch { /* no body */ }
      }

      if (!userId) return json({ success: false, message: 'User ID is required' }, 400)
      if (userId === currentUser.id) {
        return json({ success: false, message: 'Cannot delete your own account' }, 400)
      }

      // Clean up rbac_assignments
      await supabaseAdmin.from('rbac_assignments').delete().eq('user_id', userId)

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        return json({ success: false, message: deleteError.message }, 400)
      }

      await supabaseAdmin.from('user_management_profiles').delete().eq('user_id', userId)

      console.log(`User deleted: ${userId} by ${currentUser.email}`)
      return json({ success: true, message: 'User deleted successfully' })
    }

    return json({ success: false, message: 'Method not allowed' }, 405)

  } catch (error) {
    console.error('Unexpected error:', error)
    return json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown')
    }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

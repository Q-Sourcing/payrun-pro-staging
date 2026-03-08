import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MANAGED_UI_ROLES = ['admin', 'hr', 'manager', 'employee'] as const
type UiRole = typeof MANAGED_UI_ROLES[number]

const UI_ROLE_TO_APP_ROLE: Record<UiRole, 'admin' | 'manager' | 'employee'> = {
  admin: 'admin',
  hr: 'manager',
  manager: 'manager',
  employee: 'employee',
}

const UI_ROLE_TO_RBAC_ROLE: Record<UiRole, string> = {
  admin: 'ORG_ADMIN',
  hr: 'ORG_HR_ADMIN',
  manager: 'PROJECT_MANAGER',
  employee: 'SELF_USER',
}

const MANAGED_RBAC_ROLES = Object.values(UI_ROLE_TO_RBAC_ROLE)

function getUserProfileRoleCandidates(role?: string): string[] {
  const normalized = (role || '').toLowerCase()

  if (['super_admin', 'platform_super_admin', 'platform_admin', 'org_super_admin'].includes(normalized)) {
    return ['super_admin']
  }

  if (['admin', 'org_admin', 'organization_admin', 'org_owner', 'hr', 'hr_business_partner', 'manager', 'payroll_manager'].includes(normalized)) {
    if (normalized.startsWith('hr')) return ['hr', 'hr_business_partner', 'employee', 'user']
    if (normalized.includes('manager')) return ['manager', 'payroll_manager', 'employee', 'user']
    return ['admin', 'organization_admin', 'employee', 'user']
  }

  return ['employee', 'user']
}

function mapToUiRole(role?: string): UiRole {
  const normalized = (role || '').toLowerCase()

  if (['super_admin', 'organization_admin', 'admin', 'org_admin'].includes(normalized)) {
    return 'admin'
  }
  if (['hr', 'hr_business_partner'].includes(normalized)) {
    return 'hr'
  }
  if (['manager', 'payroll_manager'].includes(normalized)) {
    return 'manager'
  }
  return 'employee'
}

function normalizeUiRole(role?: string): UiRole {
  const normalized = (role || '').toLowerCase()
  if (MANAGED_UI_ROLES.includes(normalized as UiRole)) {
    return normalized as UiRole
  }
  return mapToUiRole(normalized)
}

function isMissingAuthUserError(error: { message?: string; code?: string; status?: number } | null): boolean {
  if (!error) return false
  const message = (error.message || '').toLowerCase()
  return (
    error.status === 404 ||
    error.code === 'user_not_found' ||
    message.includes('user not found')
  )
}

function parseName(fullName?: string, fallback = '') {
  const normalized = (fullName || fallback || '').trim()
  const parts = normalized.split(/\s+/).filter(Boolean)
  return {
    fullName: normalized,
    firstName: parts[0] || fallback || '',
    lastName: parts.slice(1).join(' '),
  }
}

async function hydrateManagedUsers(supabaseAdmin: any, managedRows: any[]) {
  if (!managedRows.length) return []

  const userIds = managedRows.map((row) => row.user_id)
  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, first_name, last_name, role')
    .in('id', userIds)

  const { data: assignments } = await supabaseAdmin
    .from('rbac_assignments')
    .select('user_id, role_code, scope_type, created_at')
    .in('user_id', userIds)

  const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]))
  const assignmentById = new Map<string, any>()
  for (const assignment of assignments ?? []) {
    const existing = assignmentById.get(assignment.user_id)
    if (!existing) {
      assignmentById.set(assignment.user_id, assignment)
      continue
    }
    if ((assignment.created_at ?? '') > (existing.created_at ?? '')) {
      assignmentById.set(assignment.user_id, assignment)
    }
  }

  return managedRows.map((row) => {
    const profile = profileById.get(row.user_id)
    const assignment = assignmentById.get(row.user_id)
    const first = profile?.first_name || ''
    const last = profile?.last_name || ''
    const fullName = `${first} ${last}`.trim() || row.username || 'User'
    const effectiveRole = assignment?.role_code
      ? mapToUiRole(assignment.role_code)
      : mapToUiRole(profile?.role)

    return {
      id: row.user_id,
      username: row.username ?? null,
      full_name: fullName,
      email: profile?.email ?? '',
      role: effectiveRole,
      phone: row.phone ?? null,
      department: row.department ?? null,
      status: row.status ?? 'active',
      created_at: row.created_at ?? new Date().toISOString(),
    }
  })
}

async function syncUserAccessRecords(args: {
  supabaseAdmin: any
  userId: string
  requestedRole?: string
  organizationId?: string | null
  currentUserId: string
}) {
  const { supabaseAdmin, userId, requestedRole, organizationId, currentUserId } = args
  const uiRole = normalizeUiRole(requestedRole)
  const appRole = UI_ROLE_TO_APP_ROLE[uiRole]
  const rbacRole = UI_ROLE_TO_RBAC_ROLE[uiRole]

  // Keep legacy app_role-based checks in sync.
  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
  const { error: userRolesError } = await supabaseAdmin.from('user_roles').insert({
    user_id: userId,
    role: appRole,
  })
  if (userRolesError) {
    throw userRolesError
  }

  // Keep OBAC/RBAC permissions in sync with selected role.
  if (organizationId) {
    await supabaseAdmin
      .from('rbac_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('scope_type', 'ORGANIZATION')
      .in('role_code', MANAGED_RBAC_ROLES)

    const { error: rbacError } = await supabaseAdmin.from('rbac_assignments').insert({
      user_id: userId,
      role_code: rbacRole,
      scope_type: 'ORGANIZATION',
      scope_id: organizationId,
      assigned_by: currentUserId,
    })
    if (rbacError) {
      throw rbacError
    }
  }
}

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
      ['super_admin', 'admin', 'org_admin', 'organization_admin'].includes(callerRole) ||
      !!platformAdmin?.allowed ||
      SUPER_ADMIN_EMAILS.includes(currentUser.email || '')

    if (!isAdmin) {
      return json({ success: false, message: 'Insufficient permissions. Admin role required.' }, 403)
    }

    const url = new URL(req.url)

    // ── GET: list all users ────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data: profiles, error } = await supabaseAdmin
        .from('user_management_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return json({ success: false, message: error.message }, 500)
      }

      const users = await hydrateManagedUsers(supabaseAdmin, profiles ?? [])
      return json({ success: true, users })
    }

    // ── POST: create user ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      const { username, email, password, full_name, role, phone, department, status } = body
      const requestedRole = normalizeUiRole(role)
      const userProfileRoleCandidates = getUserProfileRoleCandidates(requestedRole)
      const { fullName: normalizedFullName, firstName, lastName } = parseName(full_name, username || '')

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
          first_name: firstName,
          last_name: lastName,
          full_name: normalizedFullName,
          username: username || '',
          organization_id: callerProfile?.organization_id || null,
          // Preserve requested app role for UI/business logic.
          app_role: requestedRole,
        }
      })

      if (createError || !newAuthUser?.user) {
        console.error('Error creating auth user:', createError)
        const details = [
          createError?.message,
          createError?.code ? `code=${createError.code}` : null,
          createError?.status ? `status=${createError.status}` : null,
        ].filter(Boolean).join(' | ')
        return json({ success: false, message: details || 'Failed to create user' }, 400)
      }

      const userId = newAuthUser.user.id

      // Upsert into user_management_profiles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_management_profiles')
        .upsert({
          user_id: userId,
          username: username || null,
          phone: phone || null,
          department: department || null,
          status: status || 'active',
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Roll back auth user
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ success: false, message: 'Failed to save user profile: ' + profileError.message }, 500)
      }

      // Also ensure user_profiles row exists for RBAC.
      // Try multiple role variants to support mixed legacy schemas.
      let userProfileError: any = null
      for (const candidateRole of userProfileRoleCandidates) {
        const { error } = await supabaseAdmin.from('user_profiles').upsert({
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          organization_id: callerProfile?.organization_id || null,
          role: candidateRole,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        if (!error) {
          userProfileError = null
          break
        }
        userProfileError = error
        console.warn('user_profiles role candidate failed:', candidateRole, error.message)
      }

      if (userProfileError) {
        console.error('Error syncing user_profiles after role fallbacks:', userProfileError)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ success: false, message: 'Failed to save user profile: ' + userProfileError.message }, 500)
      }

      try {
        await syncUserAccessRecords({
          supabaseAdmin,
          userId,
          requestedRole,
          organizationId: callerProfile?.organization_id || null,
          currentUserId: currentUser.id,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown role sync error'
        console.error('Error syncing role permissions:', error)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ success: false, message: 'Failed to assign role permissions: ' + message }, 500)
      }

      const [hydratedUser] = await hydrateManagedUsers(supabaseAdmin, [profile])
      console.log(`User created: ${email} by ${currentUser.email}`)
      return json({ success: true, message: 'User created successfully', user: hydratedUser })
    }

    // ── PATCH: update user ─────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, username, full_name, role, phone, department, status } = body

      if (!id) return json({ success: false, message: 'User ID is required' }, 400)
      const normalizedRole = role !== undefined ? normalizeUiRole(role) : undefined
      const userProfileRoleCandidates = getUserProfileRoleCandidates(normalizedRole)
      const { firstName, lastName } = parseName(full_name)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (username !== undefined) updates.username = username
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
      if (full_name !== undefined || normalizedRole !== undefined) {
        let syncError: any = null
        const roleCandidates = normalizedRole !== undefined ? userProfileRoleCandidates : [undefined]

        for (const candidateRole of roleCandidates) {
          const payload = {
            ...(full_name !== undefined ? { first_name: firstName, last_name: lastName } : {}),
            ...(normalizedRole !== undefined ? { role: candidateRole } : {}),
            updated_at: new Date().toISOString(),
          }
          const { error } = await supabaseAdmin.from('user_profiles').update(payload).eq('id', id)

          if (!error) {
            syncError = null
            break
          }
          syncError = error
          console.warn('user_profiles update role candidate failed:', candidateRole, error.message)
        }

        if (syncError) {
          return json({ success: false, message: 'Failed to sync base profile: ' + syncError.message }, 500)
        }
      }

      if (normalizedRole !== undefined) {
        try {
          await syncUserAccessRecords({
            supabaseAdmin,
            userId: id,
            requestedRole: normalizedRole,
            organizationId: callerProfile?.organization_id || null,
            currentUserId: currentUser.id,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown role sync error'
          return json({ success: false, message: 'Failed to update role permissions: ' + message }, 500)
        }
      }

      const [hydratedUser] = await hydrateManagedUsers(supabaseAdmin, [updated])
      console.log(`User updated: ${id} by ${currentUser.email}`)
      return json({ success: true, message: 'User updated successfully', user: hydratedUser })
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

      // Delete from auth (cascades to user_management_profiles via FK)
      await supabaseAdmin.from('rbac_assignments').delete().eq('user_id', userId)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.from('user_management_profiles').delete().eq('user_id', userId)

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError && !isMissingAuthUserError(deleteError)) {
        console.error('Error deleting user:', deleteError)
        return json({ success: false, message: deleteError.message }, 400)
      }

      if (deleteError) {
        console.warn(`Auth user already missing during delete for ${userId}; treating cleanup as success`)
      }

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

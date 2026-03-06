import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
      .select('role')
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

      return json({ success: true, users: profiles ?? [] })
    }

    // ── POST: create user ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      const { username, email, password, full_name, role, phone, department, status } = body

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
          role: role || 'employee',
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
          id: userId,
          username: username || null,
          full_name: full_name || username || '',
          email,
          role: role || 'employee',
          phone: phone || null,
          department: department || null,
          status: status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Roll back auth user
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ success: false, message: 'Failed to save user profile: ' + profileError.message }, 500)
      }

      // Also ensure user_profiles row exists for RBAC
      await supabaseAdmin.from('user_profiles').upsert({
        id: userId,
        email,
        full_name: full_name || username || '',
        role: role || 'employee',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      console.log(`User created: ${email} by ${currentUser.email}`)
      return json({ success: true, message: 'User created successfully', user: profile })
    }

    // ── PATCH: update user ─────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, username, full_name, role, phone, department, status } = body

      if (!id) return json({ success: false, message: 'User ID is required' }, 400)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (username !== undefined) updates.username = username
      if (full_name !== undefined) updates.full_name = full_name
      if (role !== undefined) updates.role = role
      if (phone !== undefined) updates.phone = phone || null
      if (department !== undefined) updates.department = department || null
      if (status !== undefined) updates.status = status

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_management_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return json({ success: false, message: updateError.message }, 400)
      }

      // Sync to user_profiles
      if (full_name !== undefined || role !== undefined) {
        await supabaseAdmin.from('user_profiles').update({
          ...(full_name !== undefined ? { full_name } : {}),
          ...(role !== undefined ? { role } : {}),
          updated_at: new Date().toISOString(),
        }).eq('id', id)
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

      // Delete from auth (cascades to user_management_profiles via FK)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        return json({ success: false, message: deleteError.message }, 400)
      }

      // Explicitly clean up profile in case FK didn't cascade
      await supabaseAdmin.from('user_management_profiles').delete().eq('id', userId)

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

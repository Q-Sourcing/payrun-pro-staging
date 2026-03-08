import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || (req.method === 'GET' ? 'list' : 'invite')

    // ── Public actions: verify-token and accept do NOT require admin auth ─────
    if (action === 'verify-token') {
      if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405)
      const body = await req.json()
      const { token: invToken } = body
      if (!invToken) return json({ success: false, message: 'token is required' }, 400)

      const { data: inv, error: fetchError } = await supabaseAdmin
        .from('user_management_invitations')
        .select('id, email, full_name, role, department, status, expires_at')
        .eq('token', invToken)
        .maybeSingle()

      if (fetchError || !inv) return json({ success: false, message: 'Invalid invitation token' }, 404)
      if (inv.status === 'cancelled') return json({ success: false, message: 'This invitation has been cancelled', status: 'cancelled' }, 410)
      if (inv.status === 'accepted') return json({ success: false, message: 'This invitation has already been accepted', status: 'accepted' }, 409)

      if (new Date(inv.expires_at) < new Date()) {
        await supabaseAdmin.from('user_management_invitations').update({ status: 'expired' }).eq('id', inv.id)
        return json({ success: false, message: 'This invitation has expired', status: 'expired', expired: true }, 410)
      }

      return json({ success: true, invitation: inv })
    }

    if (action === 'accept') {
      if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405)
      const body = await req.json()
      const { token: invToken, user_id } = body
      if (!invToken) return json({ success: false, message: 'token is required' }, 400)

      const { data: inv, error: fetchError } = await supabaseAdmin
        .from('user_management_invitations')
        .select('*')
        .eq('token', invToken)
        .maybeSingle()

      if (fetchError || !inv) return json({ success: false, message: 'Invalid invitation token' }, 404)
      if (inv.status === 'accepted') return json({ success: false, message: 'This invitation has already been accepted' }, 409)
      if (inv.status === 'cancelled') return json({ success: false, message: 'This invitation has been cancelled' }, 410)

      if (new Date(inv.expires_at) < new Date()) {
        await supabaseAdmin.from('user_management_invitations').update({ status: 'expired' }).eq('id', inv.id)
        return json({ success: false, message: 'This invitation link has expired. Please ask the admin to resend the invitation.', expired: true }, 410)
      }

      const { error: acceptError } = await supabaseAdmin
        .from('user_management_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', inv.id)

      if (acceptError) return json({ success: false, message: acceptError.message }, 500)

      if (user_id) {
        const nameParts = (inv.full_name || '').trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        await supabaseAdmin.from('user_management_profiles').upsert({
          id: user_id,
          username: null,
          full_name: inv.full_name,
          email: inv.email,
          role: inv.role,
          phone: inv.phone || null,
          department: inv.department || null,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        await supabaseAdmin.from('user_profiles').upsert({
          id: user_id,
          email: inv.email,
          first_name: firstName,
          last_name: lastName,
          role: inv.role || 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }

      await supabaseAdmin.from('audit_logs').insert({
        integration_name: 'user_management',
        action: 'invitation.accepted',
        user_id: user_id || null,
        resource: 'user_management_invitations',
        details: { email: inv.email, full_name: inv.full_name },
        timestamp: new Date().toISOString(),
        result: 'success',
      }).then(() => {}).catch(() => {})

      return json({ success: true, message: 'Invitation accepted. Account activated.', invitation: inv })
    }

    // ── Auth check for all other actions ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ success: false, message: 'Authorization header required' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !currentUser) return json({ success: false, message: 'Invalid authentication token' }, 401)

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
      ['super_admin', 'admin', 'org_admin', 'organization_admin', 'hr', 'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN'].includes(callerRole) ||
      !!platformAdmin?.allowed ||
      SUPER_ADMIN_EMAILS.includes(currentUser.email || '')

    if (!isAdmin) return json({ success: false, message: 'Insufficient permissions' }, 403)

    // ── GET /invite-user?action=list ──────────────────────────────────────────
    if (req.method === 'GET' && action === 'list') {
      const { data, error } = await supabaseAdmin
        .from('user_management_invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return json({ success: false, message: error.message }, 500)
      return json({ success: true, invitations: data ?? [] })
    }

    if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405)

    const body = await req.json()

    // ── POST ?action=invite ───────────────────────────────────────────────────
    if (action === 'invite') {
      const { email, full_name, role, department, phone } = body

      if (!email || !full_name) return json({ success: false, message: 'Email and full name are required' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ success: false, message: 'Invalid email address' }, 400)

      const { data: existing } = await supabaseAdmin
        .from('user_management_invitations')
        .select('id, status')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        return json({ success: false, message: 'A pending invitation already exists for this email. Please cancel or resend the existing one.' }, 409)
      }

      const inviteToken = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://id-preview--d4039800-cafc-472d-9b4b-2216eac18925.lovable.app'
      const redirectTo = `${origin}/accept-invite-user?token=${inviteToken}`

      const nameParts = (full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name,
          first_name: firstName,
          last_name: lastName,
          role: role || 'user',
          invitation_token: inviteToken,
        }
      })

      if (inviteError) {
        console.error('Invite error:', inviteError)
        if (!inviteError.message?.includes('already been registered') && !inviteError.message?.includes('already exists')) {
          return json({ success: false, message: inviteError.message }, 400)
        }
      }

      const { data: invitation, error: insertError } = await supabaseAdmin
        .from('user_management_invitations')
        .insert({
          email: email.toLowerCase(),
          full_name,
          role: role || 'employee',
          department: department || null,
          phone: phone || null,
          invited_by: currentUser.id,
          token: inviteToken,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert invitation error:', insertError)
        return json({ success: false, message: 'Failed to store invitation: ' + insertError.message }, 500)
      }

      const authUserId = inviteData?.user?.id
      if (authUserId) {
        await supabaseAdmin.from('user_management_profiles').upsert({
          id: authUserId,
          username: null,
          full_name,
          email: email.toLowerCase(),
          role: role || 'employee',
          phone: phone || null,
          department: department || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        await supabaseAdmin.from('user_profiles').upsert({
          id: authUserId,
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          role: role || 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }

      await supabaseAdmin.from('audit_logs').insert({
        integration_name: 'user_management',
        action: 'invitation.sent',
        user_id: currentUser.id,
        resource: 'user_management_invitations',
        details: { email, full_name, role, invited_by: currentUser.email, expires_at: expiresAt },
        timestamp: new Date().toISOString(),
        result: 'success',
      }).then(() => {}).catch(() => {})

      console.log(`Invitation sent to ${email} by ${currentUser.email}`)
      return json({ success: true, message: 'Invitation sent successfully', invitation })
    }

    // ── POST ?action=resend ───────────────────────────────────────────────────
    if (action === 'resend') {
      const { invitation_id } = body
      if (!invitation_id) return json({ success: false, message: 'invitation_id is required' }, 400)

      const { data: inv, error: fetchError } = await supabaseAdmin
        .from('user_management_invitations')
        .select('*')
        .eq('id', invitation_id)
        .maybeSingle()

      if (fetchError || !inv) return json({ success: false, message: 'Invitation not found' }, 404)
      if (inv.status === 'accepted') return json({ success: false, message: 'This invitation has already been accepted' }, 409)
      if (inv.status === 'cancelled') return json({ success: false, message: 'This invitation has been cancelled. Please create a new invitation.' }, 409)

      const newToken = crypto.randomUUID() + '-' + crypto.randomUUID()
      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://id-preview--d4039800-cafc-472d-9b4b-2216eac18925.lovable.app'
      const redirectTo = `${origin}/accept-invite-user?token=${newToken}`

      const nameParts = (inv.full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const { error: resendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(inv.email, {
        redirectTo,
        data: {
          full_name: inv.full_name,
          first_name: firstName,
          last_name: lastName,
          role: inv.role,
          invitation_token: newToken,
        }
      })

      if (resendError && !resendError.message?.includes('already been registered') && !resendError.message?.includes('already exists')) {
        return json({ success: false, message: resendError.message }, 400)
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_management_invitations')
        .update({ token: newToken, expires_at: newExpiry, status: 'pending' })
        .eq('id', invitation_id)
        .select()
        .single()

      if (updateError) return json({ success: false, message: updateError.message }, 500)

      await supabaseAdmin.from('audit_logs').insert({
        integration_name: 'user_management',
        action: 'invitation.resent',
        user_id: currentUser.id,
        resource: 'user_management_invitations',
        details: { email: inv.email, invited_by: currentUser.email },
        timestamp: new Date().toISOString(),
        result: 'success',
      }).then(() => {}).catch(() => {})

      return json({ success: true, message: 'Invitation resent successfully', invitation: updated })
    }

    // ── POST ?action=cancel ───────────────────────────────────────────────────
    if (action === 'cancel') {
      const { invitation_id } = body
      if (!invitation_id) return json({ success: false, message: 'invitation_id is required' }, 400)

      const { data: inv, error: fetchError } = await supabaseAdmin
        .from('user_management_invitations')
        .select('*')
        .eq('id', invitation_id)
        .maybeSingle()

      if (fetchError || !inv) return json({ success: false, message: 'Invitation not found' }, 404)
      if (inv.status === 'accepted') return json({ success: false, message: 'Cannot cancel an accepted invitation' }, 409)

      const { error: updateError } = await supabaseAdmin
        .from('user_management_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitation_id)

      if (updateError) return json({ success: false, message: updateError.message }, 500)

      await supabaseAdmin.from('audit_logs').insert({
        integration_name: 'user_management',
        action: 'invitation.cancelled',
        user_id: currentUser.id,
        resource: 'user_management_invitations',
        details: { email: inv.email, cancelled_by: currentUser.email },
        timestamp: new Date().toISOString(),
        result: 'success',
      }).then(() => {}).catch(() => {})

      return json({ success: true, message: 'Invitation cancelled' })
    }

    return json({ success: false, message: 'Unknown action' }, 400)

  } catch (error) {
    console.error('Unexpected error:', error)
    return json({ success: false, message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

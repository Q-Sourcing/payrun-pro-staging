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

      // Always upsert the user profile as active — handles both cases:
      // 1. Profile was pre-created at invite time (update status to active)
      // 2. Profile was never created (insert it now)
      if (user_id) {
        const nameParts = (inv.full_name || '').trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const { error: profileErr } = await supabaseAdmin.from('user_management_profiles').upsert({
          id: user_id,
          username: null,
          full_name: inv.full_name,
          email: inv.email,
          role: inv.role,
          phone: inv.phone || null,
          department: inv.department || null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        if (profileErr) {
          console.error('Profile upsert error on accept:', profileErr)
        }

        const { error: upErr } = await supabaseAdmin.from('user_profiles').upsert({
          id: user_id,
          email: inv.email,
          first_name: firstName,
          last_name: lastName,
          role: inv.role || 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        if (upErr) {
          console.error('user_profiles upsert error on accept:', upErr)
        }
      }

      await supabaseAdmin.from('audit_logs').insert({
        integration_name: 'user_management',
        action: 'invitation.accepted',
        user_id: user_id || null,
        resource: 'user_management_invitations',
        details: { email: inv.email, full_name: inv.full_name, role: inv.role },
        timestamp: new Date().toISOString(),
        result: 'success',
      }).then(() => {}).catch(() => {})

      return json({ success: true, message: 'Invitation accepted. Account activated.', invitation: { ...inv, status: 'accepted' } })
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

      // Cancel any existing pending invitation for this email before creating a new one
      const { data: existing } = await supabaseAdmin
        .from('user_management_invitations')
        .select('id, status')
        .eq('email', email.toLowerCase())
        .in('status', ['pending', 'expired', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin
          .from('user_management_invitations')
          .update({ status: 'cancelled' })
          .eq('id', existing.id)
      }

      const inviteToken = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

      // Redirect target: /set-password — dynamically determined from request origin
      const origin = req.headers.get('origin') || req.headers.get('referer')
      let APP_URL = 'https://payroll.flipafrica.app' // production fallback
      if (origin) {
        try {
          const originUrl = new URL(origin)
          if (
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1' ||
            originUrl.hostname.endsWith('.flipafrica.app') ||
            originUrl.hostname.endsWith('.lovable.app')
          ) {
            APP_URL = `${originUrl.protocol}//${originUrl.host}`
          }
        } catch { /* ignore malformed origin */ }
      }
      const redirectTo = `${APP_URL}/set-password?token=${inviteToken}`
      console.log('[invite-user] redirectTo:', redirectTo)


      const nameParts = (full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      let { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
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
        const alreadyExists = inviteError.message?.includes('already been registered') ||
          inviteError.message?.includes('already exists') ||
          inviteError.message?.includes('email_exists')

        if (alreadyExists) {
          // Ghost auth user exists (never onboarded) — delete it and retry the invite once
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
          const ghostUser = listData?.users?.find((u: { email: string }) => u.email?.toLowerCase() === email.toLowerCase())
          if (ghostUser) {
            await supabaseAdmin.auth.admin.deleteUser(ghostUser.id)
            // Retry invite after deleting ghost account
            const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
              redirectTo,
              data: { full_name, first_name: firstName, last_name: lastName, role: role || 'user', invitation_token: inviteToken }
            })
            if (retryError) {
              return json({ success: false, message: `Failed to send invitation after cleanup: ${retryError.message}` }, 400)
            }
            inviteData = retryData
          } else {
            return json({ success: false, message: `An account already exists for ${email} and could not be cleaned up automatically. Please contact support.`, code: 'email_exists' }, 409)
          }
        } else {
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

      const resendOrigin = req.headers.get('origin') || req.headers.get('referer')
      let APP_URL = 'https://payroll.flipafrica.app'
      if (resendOrigin) {
        try {
          const originUrl = new URL(resendOrigin)
          if (
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1' ||
            originUrl.hostname.endsWith('.flipafrica.app') ||
            originUrl.hostname.endsWith('.lovable.app')
          ) {
            APP_URL = `${originUrl.protocol}//${originUrl.host}`
          }
        } catch { /* ignore */ }
      }
      const redirectTo = `${APP_URL}/set-password?token=${newToken}`

      const nameParts = (inv.full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // For resend: always delete the existing auth user first, then re-invite.
      // This handles both ghost accounts (never onboarded) and confirmed accounts where
      // the admin explicitly wants to resend (e.g. user lost the link).
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const existingAuthUser = listData?.users?.find(
        (u: { email: string }) => u.email?.toLowerCase() === inv.email.toLowerCase()
      )

      if (existingAuthUser) {
        // Only delete if the user has NOT fully onboarded (no password set / never signed in)
        const hasPassword = !!(existingAuthUser as any).encrypted_password &&
          (existingAuthUser as any).encrypted_password !== ''
        const hasSignedIn = !!(existingAuthUser as any).last_sign_in_at

        if (hasPassword && hasSignedIn) {
          // Fully active user — use generateLink instead to avoid deleting real account
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: inv.email,
            options: {
              redirectTo,
              data: {
                full_name: inv.full_name,
                first_name: firstName,
                last_name: lastName,
                role: inv.role,
                invitation_token: newToken,
              }
            }
          })
          if (linkError) return json({ success: false, message: linkError.message }, 400)
          // Link generated — proceed to update the invitation record below
        } else {
          // Ghost / unactivated account — safe to delete and re-invite
          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
          if (delError) {
            console.error('Failed to delete ghost auth user on resend:', delError)
            return json({ success: false, message: `Could not clean up existing account: ${delError.message}` }, 500)
          }

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
          if (resendError) return json({ success: false, message: resendError.message }, 400)
        }
      } else {
        // No existing auth user — send a fresh invite
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
        if (resendError) return json({ success: false, message: resendError.message }, 400)
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

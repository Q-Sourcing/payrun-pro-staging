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
      const { token: invToken, email: lookupEmail } = body
      if (!invToken && !lookupEmail) return json({ success: false, message: 'token or email is required' }, 400)

      // Always include `token` in SELECT so the frontend can recover it for Path B
      // (email-scanner scenario: magic link consumed, user looks up invite by email)
      let inv: Record<string, unknown> | null = null
      let fetchError: unknown = null

      if (invToken) {
        const { data, error } = await supabaseAdmin
          .from('user_management_invitations')
          .select('id, email, full_name, role, department, status, expires_at, token')
          .eq('token', invToken)
          .maybeSingle()
        inv = data; fetchError = error
      } else {
        // Email-based lookup — returns the most recent pending invitation for that address
        const { data, error } = await supabaseAdmin
          .from('user_management_invitations')
          .select('id, email, full_name, role, department, status, expires_at, token')
          .eq('email', (lookupEmail as string).toLowerCase())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        inv = data; fetchError = error
        if (!fetchError && !inv) return json({ success: false, message: 'No pending invitation found for that email address.' }, 404)
      }

      if (fetchError || !inv) return json({ success: false, message: 'Invalid invitation token' }, 404)
      if (inv.status === 'cancelled') return json({ success: false, message: 'This invitation has been cancelled', status: 'cancelled' }, 410)
      if (inv.status === 'accepted') return json({ success: false, message: 'This invitation has already been accepted', status: 'accepted' }, 409)

      if (new Date(inv.expires_at as string) < new Date()) {
        await supabaseAdmin.from('user_management_invitations').update({ status: 'expired' }).eq('id', inv.id)
        return json({ success: false, message: 'This invitation has expired', status: 'expired', expired: true }, 410)
      }

      return json({ success: true, invitation: inv })
    }

    if (action === 'accept') {
      if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405)
      const body = await req.json()
      const { token: invToken, user_id, password: bodyPassword } = body
      let effectiveUserId: string | undefined = user_id as string | undefined
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

      // Path B: password provided but no Supabase session / user_id.
      // New invite flow: auth user is created HERE (at acceptance time), not at invite time.
      // This prevents corporate email scanners from pre-consuming a Supabase OTP and
      // registering the user in Supabase before they set a password.
      if (!effectiveUserId && bodyPassword && inv.email) {
        const { data: { users: userList } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const matchedUser = (userList ?? []).find(
          (u: { email: string }) => u.email?.toLowerCase() === inv.email.toLowerCase()
        )
        if (matchedUser) {
          // Auth user exists from a previous invite attempt — just set their password
          effectiveUserId = matchedUser.id
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(matchedUser.id, {
            password: bodyPassword,
            email_confirm: true,
          })
          if (pwErr) return json({ success: false, message: 'Failed to set password: ' + pwErr.message }, 500)
        } else {
          // No auth user yet — create one now (this is the normal path for the new invite flow)
          const nameParts = (inv.full_name || '').trim().split(/\s+/)
          const { data: { user: newUser }, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: inv.email,
            password: bodyPassword,
            email_confirm: true,
            user_metadata: {
              full_name: inv.full_name,
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              role: inv.role,
              invitation_token: inv.token,
            },
          })
          if (createErr || !newUser) {
            return json({ success: false, message: 'Failed to create account: ' + (createErr?.message ?? 'Unknown error') }, 500)
          }
          effectiveUserId = newUser.id
        }
      }

      // Always upsert the user profile as active — handles both cases:
      // 1. Profile was pre-created at invite time (update status to active)
      // 2. Profile was never created (insert it now)
      if (effectiveUserId) {
        const nameParts = (inv.full_name || '').trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // ── Wire up RBAC: assign the invited role so permissions take effect ──
        if (inv.role) {
          // Determine org_id — default to the single org in the system
          const ORG_ID = '00000000-0000-0000-0000-000000000001'
          let orgId = ORG_ID
          const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles').select('organization_id').eq('id', effectiveUserId).maybeSingle()
          if (existingProfile?.organization_id) orgId = existingProfile.organization_id

          // Ensure user_profiles has the correct org_id set BEFORE rbac_assignment
          // (validate_rbac_assignment trigger requires user.organization_id = assignment.org_id)
          const { error: upErr } = await supabaseAdmin.from('user_profiles').upsert({
            id: effectiveUserId,
            email: inv.email,
            first_name: firstName,
            last_name: lastName,
            role: inv.role || 'user',
            phone: inv.phone || null,
            department: inv.department || null,
            status: 'active',
            organization_id: orgId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          if (upErr) console.error('user_profiles upsert error on accept:', upErr)

          // Remove old org-level assignments, then insert fresh one
          await supabaseAdmin.from('rbac_assignments').delete()
            .eq('user_id', effectiveUserId).eq('org_id', orgId).neq('role_code', 'PLATFORM_SUPER_ADMIN')

          const { error: rbacErr } = await supabaseAdmin.from('rbac_assignments').insert({
            user_id: effectiveUserId,
            role_code: inv.role,
            scope_type: 'GLOBAL',
            scope_id: null,
            org_id: orgId,
          })
          if (rbacErr) console.error('rbac_assignments insert error on accept:', rbacErr)

          // Apply additive module-access grants from role_data
          const moduleAccess: Record<string, string> = inv.role_data?.module_access ?? {}
          // Canonical module→permission mapping (keep in sync with src/lib/constants/permissions-registry.ts)
          const MODULE_PERMISSION_MAP: Record<string, { view: string[]; full: string[] }> = {
            employees:          { view: ['people.view'], full: ['people.view', 'people.create', 'people.edit', 'people.assign_project'] },
            payroll:            { view: ['payroll.view'], full: ['payroll.view', 'payroll.prepare', 'payroll.submit', 'payroll.approve'] },
            pay_groups:         { view: ['paygroups.view'], full: ['paygroups.view', 'paygroups.manage'] },
            projects:           { view: ['projects.view'], full: ['projects.view', 'projects.manage'] },
            earnings_deductions:{ view: ['earnings.view'], full: ['earnings.view', 'earnings.manage'] },
            contracts:          { view: ['contracts.view'], full: ['contracts.view', 'contracts.manage'] },
            reports:            { view: ['reports.view'], full: ['reports.view', 'finance.view_reports', 'reports.export'] },
            ehs:                { view: ['ehs.view_dashboard'], full: ['ehs.view_dashboard', 'ehs.manage_incidents', 'ehs.manage_hazards'] },
            settings:           { view: [], full: ['admin.manage_users', 'admin.assign_roles', 'admin.activity_logs.view'] },
            user_management:    { view: ['users.view'], full: ['users.view', 'users.invite', 'users.edit'] },
            attendance:         { view: ['attendance.view'], full: ['attendance.view', 'attendance.manage', 'attendance.approve'] },
            assets:             { view: ['assets.view'], full: ['assets.view', 'assets.create', 'assets.edit', 'assets.view_financials'] },
          }
          for (const [moduleId, level] of Object.entries(moduleAccess)) {
            if (level === 'none') continue
            const perms = MODULE_PERMISSION_MAP[moduleId]?.[level as 'view' | 'full'] ?? []
            for (const permKey of perms) {
              await supabaseAdmin.from('rbac_grants').insert({
                user_id: effectiveUserId,
                permission_key: permKey,
                scope_type: 'ORGANIZATION',
                scope_id: orgId,
                effect: 'ALLOW',
              }).then(() => {}).catch(console.error)
            }
          }

          // For SELF_USER invites: link the matching employee record
          if (inv.role === 'SELF_USER' || inv.role === 'SELF_CONTRACTOR') {
            const { data: empRecord } = await supabaseAdmin
              .from('employees')
              .select('id')
              .ilike('email', inv.email)
              .maybeSingle()
            if (empRecord?.id) {
              await supabaseAdmin.from('employees')
                .update({ user_id: effectiveUserId })
                .eq('id', empRecord.id)
                .then(() => {}).catch(console.error)
            }
          }
        }
      }

      // Mark invite_accepted in user metadata so ProtectedRoute doesn't redirect
      // the user to /set-password again on future logins.
      if (effectiveUserId) {
        await supabaseAdmin.auth.admin.updateUserById(effectiveUserId, {
          user_metadata: { invite_accepted: true },
        }).catch(err => console.error('updateUserById invite_accepted error:', err))
      }

      await supabaseAdmin.from('audit_logs').insert({
        integration_name: 'user_management',
        action: 'invitation.accepted',
        user_id: effectiveUserId || null,
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

      // Cancel any existing pending invitation for this email
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

      const origin = req.headers.get('origin') || req.headers.get('referer')
      let APP_URL = 'https://payroll.flipafrica.app'
      if (origin) {
        try {
          const originUrl = new URL(origin)
          // Only allow localhost overrides for local dev. Never use Lovable preview
          // URLs (.lovable.app) — those are dev-only and must not appear in real emails.
          if (
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1'
          ) {
            APP_URL = `${originUrl.protocol}//${originUrl.host}`
          }
        } catch { /* ignore */ }
      }
      // Direct link — no Supabase OTP. Email scanners can safely fetch this URL
      // without consuming any single-use token, so the user always gets a valid link.
      const inviteLink = `${APP_URL}/set-password?token=${inviteToken}`
      console.log('[invite-user] inviteLink:', inviteLink)

      const nameParts = (full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // Store invitation record first
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
          role_data: body.role_data ?? {},
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert invitation error:', insertError)
        return json({ success: false, message: 'Failed to store invitation: ' + insertError.message }, 500)
      }

      // Send invitation email via Resend (plain custom link — no Supabase magic link).
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured')
        return json({ success: false, message: 'Email service not configured. Please contact your administrator.' }, 500)
      }

      const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#0f766e;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">FLIP Africa Payroll</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${firstName || full_name},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            You have been invited to join <strong>FLIP Africa Payroll</strong>. Click the button below to create your password and activate your account.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#0f766e;border-radius:6px;padding:12px 28px;">
              <a href="${inviteLink}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Create Your Password</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Or copy and paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#6b7280;word-break:break-all;">${inviteLink}</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;">This invitation expires in 48 hours. If you were not expecting this email, you can safely ignore it.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Sent by FLIP Africa Payroll &middot; team@payroll.flipafrica.app</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FLIP Africa Payroll <team@payroll.flipafrica.app>',
          to: [email],
          subject: `You've been invited to FLIP Africa Payroll`,
          html: emailHtml,
        }),
      })

      if (!emailRes.ok) {
        const emailErr = await emailRes.text()
        console.error('Resend error:', emailErr)
        return json({ success: false, message: 'Invitation saved but email failed to send. Use "Copy Invite Link" to share it manually.' }, 500)
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
          // Only allow localhost overrides for local dev. Never use Lovable preview
          // URLs (.lovable.app) — those are dev-only and must not appear in real emails.
          if (
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1'
          ) {
            APP_URL = `${originUrl.protocol}//${originUrl.host}`
          }
        } catch { /* ignore */ }
      }
      const newInviteLink = `${APP_URL}/set-password?token=${newToken}`

      const nameParts = (inv.full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''

      // Delete any ghost auth user (unactivated) so a fresh account can be
      // created at acceptance time via the new lazy-creation flow.
      const { data: listDataResend } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const existingAuthUser = (listDataResend?.users ?? []).find(
        (u: { email?: string; last_sign_in_at?: string }) =>
          u.email?.toLowerCase() === inv.email.toLowerCase() && !u.last_sign_in_at
      )
      if (existingAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id).catch(console.error)
      }

      // Update invite record with new token
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_management_invitations')
        .update({ token: newToken, expires_at: newExpiry, status: 'pending' })
        .eq('id', invitation_id)
        .select()
        .single()

      if (updateError) return json({ success: false, message: updateError.message }, 500)

      // Send via Resend
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (resendApiKey) {
        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#0f766e;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">FLIP Africa Payroll</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${firstName || inv.full_name},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Your invitation to <strong>FLIP Africa Payroll</strong> has been resent. Click the button below to create your password and activate your account.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#0f766e;border-radius:6px;padding:12px 28px;">
              <a href="${newInviteLink}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Create Your Password</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Or copy and paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#6b7280;word-break:break-all;">${newInviteLink}</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;">This invitation expires in 48 hours.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Sent by FLIP Africa Payroll &middot; team@payroll.flipafrica.app</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'FLIP Africa Payroll <team@payroll.flipafrica.app>',
            to: [inv.email],
            subject: `Your FLIP Africa Payroll invitation (resent)`,
            html: emailHtml,
          }),
        }).catch(console.error)
      }

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

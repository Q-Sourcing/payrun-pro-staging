import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotifyLockoutRequest {
  locked_user_id: string;
  locked_user_email: string;
  locked_user_name: string;
  org_id: string | null;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    const body: NotifyLockoutRequest = await req.json()

    // Get platform admins
    const { data: platformAdmins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, profiles!inner(email, first_name, last_name)')
      .eq('role', 'platform_admin')

    // Get org super admins
    let orgAdmins: any[] = []
    if (body.org_id) {
      const { data: orgAdminsData } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, profiles!inner(email, first_name, last_name, organization_id)')
        .eq('role', 'org_super_admin')
        .eq('profiles.organization_id', body.org_id)

      orgAdmins = orgAdminsData || []
    }

    // Combine admin emails and user IDs
    const adminEmails: string[] = []
    const adminUserIds: string[] = []

      ; (platformAdmins || []).forEach((admin: any) => {
        if (admin.profiles?.email) {
          adminEmails.push(admin.profiles.email)
          adminUserIds.push(admin.user_id)
        }
      })

    orgAdmins.forEach((admin: any) => {
      if (admin.profiles?.email && !adminEmails.includes(admin.profiles.email)) {
        adminEmails.push(admin.profiles.email)
        adminUserIds.push(admin.user_id)
      }
    })

    // Get org details if present
    let orgName = '';
    if (body.org_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', body.org_id)
        .single();
      orgName = org?.name || '';
    }

    // Check if email alerts are enabled
    let emailAlertsEnabled = true;
    if (body.org_id) {
      const { data: settings } = await supabaseAdmin
        .from('organization_security_settings')
        .select('email_alerts_enabled')
        .eq('org_id', body.org_id)
        .single()

      emailAlertsEnabled = settings?.email_alerts_enabled !== false
    }

    // Send email notifications if enabled
    if (emailAlertsEnabled && adminEmails.length > 0) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      if (RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #721c24; margin: 0 0 10px 0;">🔒 Account Locked - Security Alert</h2>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
              <h3 style="margin-top: 0;">Account Lockout Details</h3>
              <p><strong>User:</strong> ${body.locked_user_name} (${body.locked_user_email})</p>
              <p><strong>Reason:</strong> ${body.reason}</p>
              <p><strong>Locked At:</strong> ${new Date().toLocaleString()}</p>
              ${orgName ? `<p><strong>Organization:</strong> ${orgName}</p>` : ''}
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px;">
              <p style="margin: 0;"><strong>Action Required:</strong> Please review the account lockout and unlock if necessary.</p>
            </div>
          </div>
        `

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Q-Payroll Security <security@payrunpro.com>',
            to: adminEmails,
            subject: `🔒 Account Locked: ${body.locked_user_email}`,
            html: emailHtml,
          }),
        }).catch(err => console.error('Failed to send email:', err))
      }
    }

    // Create in-app notifications
    if (adminUserIds.length > 0) {
      const notifications = adminUserIds.map((adminId) => ({
        user_id: adminId,
        type: 'account_locked',
        title: 'Account Locked',
        message: `Account for ${body.locked_user_name} (${body.locked_user_email}) has been locked. Reason: ${body.reason}`,
        metadata: {
          locked_user_id: body.locked_user_id,
          locked_user_email: body.locked_user_email,
          locked_user_name: body.locked_user_name,
          org_id: body.org_id,
          reason: body.reason,
        },
      }))

      await supabaseAdmin
        .from('notifications')
        .insert(notifications)
        .catch(err => console.error('Failed to create notifications:', err))
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in notify-account-locked:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


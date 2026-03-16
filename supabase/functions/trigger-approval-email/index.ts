import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Direct invocation payload (from service layer)
interface DirectPayload {
  payrun_id: string;
  event_key: 'PAYRUN_SUBMITTED' | 'PAYRUN_APPROVED' | 'PAYRUN_REJECTED' | 'APPROVAL_REMINDER';
  recipient_user_id: string;
}

// Webhook payload (legacy support)
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  schema: string;
  record: any;
  old_record: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()

    let eventKey = ''
    let recipientUserId = ''
    let payrunId = ''

    // Detect direct invocation vs webhook payload
    if (body.event_key && body.recipient_user_id && body.payrun_id) {
      // Direct call from service layer
      const payload = body as DirectPayload
      eventKey = payload.event_key
      recipientUserId = payload.recipient_user_id
      payrunId = payload.payrun_id
      console.log(`Direct invocation: ${eventKey} for user ${recipientUserId}`)
    } else {
      // Legacy webhook payload routing
      const payload = body as WebhookPayload
      const { table, record, type } = payload

      console.log(`Webhook trigger: ${table} ${type}`)

      if (table === 'payrun_approval_steps') {
        if (record.status === 'pending') {
          eventKey = 'PAYRUN_SUBMITTED'
          recipientUserId = record.approver_user_id
          payrunId = record.payrun_id
        } else {
          return new Response(JSON.stringify({ skipped: true, reason: 'status_ignored' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } else if (table === 'pay_runs') {
        payrunId = record.id
        if (record.status === 'rejected' && payload.old_record?.status !== 'rejected') {
          eventKey = 'PAYRUN_REJECTED'
          recipientUserId = record.created_by
        } else if (record.status === 'locked' && payload.old_record?.status !== 'locked' && record.approval_status === 'approved') {
          eventKey = 'PAYRUN_APPROVED'
          recipientUserId = record.created_by
        } else {
          return new Response(JSON.stringify({ skipped: true, reason: 'status_ignored' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } else {
        return new Response(JSON.stringify({ skipped: true, reason: 'table_ignored' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (!eventKey || !recipientUserId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_data' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 1. Resolve recipient email & name from user_profiles ──────────────
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, first_name, last_name')
      .eq('id', recipientUserId)
      .maybeSingle()

    let email = userProfile?.email
    let name = userProfile?.first_name
      ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim()
      : ''

    if (!email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(recipientUserId)
      if (!authUser?.user) {
        console.error('User not found:', recipientUserId)
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      email = authUser.user.email!
      if (!name) name = email.split('@')[0]
    }

    // ── 2. Get payrun details with enriched data ──────────────────────────
    const { data: payrun } = await supabase
      .from('pay_runs')
      .select(`
        id, pay_period_start, pay_period_end, total_gross, status,
        approval_submitted_by, approval_status,
        pay_group_id,
        pay_group_master:pay_group_master_id(name)
      `)
      .eq('id', payrunId)
      .maybeSingle()

    if (!payrun) {
      console.error('Payrun not found:', payrunId)
      return new Response(JSON.stringify({ error: 'Payrun not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 3. Get org info ───────────────────────────────────────────────────
    let orgId = ''
    let orgName = 'Your Organization'

    if (payrun.pay_group_id) {
      const { data: pg } = await supabase
        .from('pay_groups')
        .select('organization_id, organizations(name)')
        .eq('id', payrun.pay_group_id)
        .maybeSingle()
      if (pg) {
        orgId = pg.organization_id
        orgName = (pg as any).organizations?.name || orgName
      }
    }

    // ── 4. Get employee count from pay_items ──────────────────────────────
    const { count: totalEmployees } = await supabase
      .from('pay_items')
      .select('id', { count: 'exact', head: true })
      .eq('pay_run_id', payrunId)

    // ── 5. Build rich variables ───────────────────────────────────────────
    const periodStart = payrun.pay_period_start
      ? new Date(payrun.pay_period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A'
    const periodEnd = payrun.pay_period_end
      ? new Date(payrun.pay_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A'

    const appUrl = Deno.env.get('APP_URL') || 'https://payroll.flipafrica.app'

    const variables: Record<string, string> = {
      period: `${periodStart} to ${periodEnd}`,
      pay_period: `${periodStart} to ${periodEnd}`,
      payrun_id: payrunId,
      organization_name: orgName,
      total_gross: payrun.total_gross ? Number(payrun.total_gross).toLocaleString('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }) : '0',
      total_employees: String(totalEmployees || 0),
      pay_group_name: (payrun.pay_group_master as any)?.name || 'Default',
      approver_name: name,
      employee_name: name,
      user_name: name,
      user_email: email,
      action_url: `${appUrl}/my-approvals`,
    }

    // Event-specific enrichment
    if (eventKey === 'PAYRUN_SUBMITTED' && payrun.approval_submitted_by) {
      const { data: submitter } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', payrun.approval_submitted_by)
        .maybeSingle()
      variables['submitted_by'] = submitter
        ? `${submitter.first_name || ''} ${submitter.last_name || ''}`.trim()
        : 'System'
      variables['action_url'] = `${appUrl}/my-approvals`
    }

    if (eventKey === 'PAYRUN_REJECTED') {
      const { data: step } = await supabase
        .from('payrun_approval_steps')
        .select('actioned_by, comments')
        .eq('payrun_id', payrunId)
        .eq('status', 'rejected')
        .order('actioned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (step?.actioned_by) {
        const { data: rejector } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', step.actioned_by)
          .maybeSingle()
        variables['rejected_by'] = rejector
          ? `${rejector.first_name || ''} ${rejector.last_name || ''}`.trim()
          : 'Approver'
      } else {
        variables['rejected_by'] = 'Approver'
      }
      variables['reason'] = step?.comments || 'No reason provided'
      variables['action_url'] = `${appUrl}/payroll`
    }

    if (eventKey === 'PAYRUN_APPROVED') {
      const { data: finalStep } = await supabase
        .from('payrun_approval_steps')
        .select('actioned_by')
        .eq('payrun_id', payrunId)
        .eq('status', 'approved')
        .order('actioned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (finalStep?.actioned_by) {
        const { data: approver } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', finalStep.actioned_by)
          .maybeSingle()
        variables['approved_by'] = approver
          ? `${approver.first_name || ''} ${approver.last_name || ''}`.trim()
          : 'Approver'
      } else {
        variables['approved_by'] = 'Approver'
      }
      variables['action_url'] = `${appUrl}/payroll`
    }

    if (eventKey === 'APPROVAL_REMINDER') {
      variables['hours_pending'] = 'N/A'
      variables['action_url'] = `${appUrl}/my-approvals`
    }

    // ── 6. Queue email via queue-email function ───────────────────────────
    const queueResponse = await fetch(`${supabaseUrl}/functions/v1/queue-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        org_id: orgId || null,
        event_key: eventKey,
        recipient_email: email,
        recipient_name: name,
        variables,
      }),
    })

    const queueResult = await queueResponse.json()
    console.log(`Email queued for ${eventKey}: `, queueResult)

    return new Response(JSON.stringify({ success: true, event_key: eventKey, queue_result: queueResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('trigger-approval-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ─── Types ───

interface DirectPayload {
  payrun_id: string;
  event_key: 'PAYRUN_SUBMITTED' | 'PAYRUN_APPROVED' | 'PAYRUN_REJECTED' | 'APPROVAL_REMINDER';
  recipient_user_id: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  schema: string;
  record: any;
  old_record: any;
}

interface ApprovalStep {
  level: number;
  status: string;
  approver_user_id: string;
  actioned_at: string | null;
  actioned_by: string | null;
  comments: string | null;
  approver_name?: string;
}

interface TopEmployee {
  name: string;
  designation: string;
  gross_pay: number;
}

interface Anomaly {
  description: string;
  severity: string;
  affected_record_type: string;
}

const EVENT_TO_MESSAGE_TYPE: Record<string, string> = {
  PAYRUN_SUBMITTED: 'submitted',
  PAYRUN_APPROVED: 'approved',
  PAYRUN_REJECTED: 'rejected',
  APPROVAL_REMINDER: 'followup',
}

// ─── Formatting ───

function formatCurrency(amount: number | null): string {
  if (!amount) return 'UGX 0'
  return 'UGX ' + Number(amount).toLocaleString('en-UG', { maximumFractionDigits: 0 })
}

function formatDate(d: string | null): string {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d: string | null): string {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPeriodShort(start: string | null, end: string | null): string {
  if (!start) return 'N/A'
  const s = new Date(start)
  const e = end ? new Date(end) : s
  const mo = s.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return mo
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

// ─── HTML Email Builder ───

function buildApprovalChainHtml(steps: ApprovalStep[], currentLevel: number | null): string {
  let rows = ''

  // Submitted row
  rows += `
    <tr>
      <td style="padding:8px 12px;width:28px;vertical-align:top;">
        <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#0D9488;color:#fff;text-align:center;line-height:24px;font-size:12px;">✓</span>
      </td>
      <td style="padding:8px 12px;font-size:14px;color:#1E293B;">Submitted</td>
      <td style="padding:8px 12px;font-size:13px;color:#64748B;text-align:right;">—</td>
    </tr>`

  for (const step of steps) {
    let icon = ''
    let nameStyle = 'color:#64748B;'
    if (step.status === 'approved') {
      icon = `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#0D9488;color:#fff;text-align:center;line-height:24px;font-size:12px;">✓</span>`
      nameStyle = 'color:#0D9488;font-weight:600;'
    } else if (step.status === 'rejected') {
      icon = `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#DC2626;color:#fff;text-align:center;line-height:24px;font-size:12px;">✗</span>`
      nameStyle = 'color:#DC2626;font-weight:600;'
    } else if (step.level === currentLevel) {
      icon = `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#F59E0B;color:#fff;text-align:center;line-height:24px;font-size:12px;">⏳</span>`
      nameStyle = 'color:#B45309;font-weight:600;'
    } else {
      icon = `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#E5E7EB;color:#94A3B8;text-align:center;line-height:24px;font-size:14px;">○</span>`
    }

    const label = step.approver_name || 'Approver'
    const statusText = step.status === 'pending'
      ? (step.level === currentLevel ? 'Pending' : 'Waiting')
      : step.status.charAt(0).toUpperCase() + step.status.slice(1)

    rows += `
    <tr>
      <td style="padding:8px 12px;width:28px;vertical-align:top;">${icon}</td>
      <td style="padding:8px 12px;font-size:14px;${nameStyle}">Level ${step.level} — ${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#64748B;text-align:right;">${statusText}</td>
    </tr>`
  }

  return `<table style="width:100%;border-collapse:collapse;">${rows}</table>`
}

function buildTopEmployeesHtml(employees: TopEmployee[]): string {
  if (!employees.length) return ''
  let rows = ''
  for (const emp of employees) {
    rows += `
    <tr>
      <td style="padding:6px 12px;font-size:13px;color:#1E293B;">${emp.name}</td>
      <td style="padding:6px 12px;font-size:13px;color:#64748B;">${emp.designation || '—'}</td>
      <td style="padding:6px 12px;font-size:13px;color:#1E293B;text-align:right;font-weight:600;">${formatCurrency(emp.gross_pay)}</td>
    </tr>`
  }
  return `
  <table style="width:100%;border-collapse:collapse;">
    <tr style="border-bottom:1px solid #E5E7EB;">
      <th style="padding:6px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Employee</th>
      <th style="padding:6px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Designation</th>
      <th style="padding:6px 12px;text-align:right;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Gross Pay</th>
    </tr>
    ${rows}
  </table>`
}

function buildAnomaliesHtml(anomalies: Anomaly[]): string {
  if (!anomalies.length) return ''
  let items = ''
  for (const a of anomalies) {
    const severityColor = a.severity === 'critical' ? '#DC2626' : '#B45309'
    items += `<li style="margin-bottom:6px;font-size:13px;color:#92400E;">
      <span style="font-weight:600;color:${severityColor};">[${a.severity.toUpperCase()}]</span> ${a.description}
    </li>`
  }
  return `
  <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:16px;margin:0;">
    <div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:8px;">⚠ Anomalies Detected</div>
    <ul style="margin:0;padding-left:20px;">${items}</ul>
    <div style="font-size:12px;color:#A16207;margin-top:8px;">These were flagged by the system. Review before approving.</div>
  </div>`
}

interface EmailData {
  eventKey: string;
  recipientName: string;
  submitterName: string;
  payGroupName: string;
  payrunType: string;
  periodStart: string;
  periodEnd: string;
  periodShort: string;
  submittedAt: string;
  currentLevel: number | null;
  totalLevels: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerNssf: number;
  topEmployees: TopEmployee[];
  approvalChain: ApprovalStep[];
  anomalies: Anomaly[];
  orgName: string;
  payrunId: string;
  appUrl: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedLevel?: number;
  daysPending?: number;
}

function buildSubject(data: EmailData): string {
  const { eventKey, payGroupName, periodShort, totalGross } = data
  const gross = formatCurrency(totalGross)
  switch (eventKey) {
    case 'PAYRUN_SUBMITTED':
      return `Action Required: Payroll Approval — ${payGroupName} | ${periodShort} | ${gross}`
    case 'PAYRUN_APPROVED':
      return `✓ Approved: ${payGroupName} | ${periodShort} | ${gross}`
    case 'PAYRUN_REJECTED':
      return `✗ Rejected: ${payGroupName} | ${periodShort} | ${gross}`
    case 'APPROVAL_REMINDER':
      return `⏰ Reminder: Approval Pending — ${payGroupName} | ${data.daysPending || '?'} days overdue`
    default:
      return `Payroll Notification — ${payGroupName}`
  }
}

function buildHtmlBody(data: EmailData): string {
  const {
    eventKey, recipientName, submitterName, payGroupName, payrunType,
    periodStart, periodEnd, submittedAt, currentLevel, totalLevels,
    totalEmployees, totalGross, totalDeductions, totalNet, totalEmployerNssf,
    topEmployees, approvalChain, anomalies, orgName, payrunId, appUrl,
    rejectionReason, rejectedBy, rejectedLevel, daysPending,
  } = data

  const approveUrl = `${appUrl}/pay-runs/${payrunId}?action=approve`
  const rejectUrl = `${appUrl}/pay-runs/${payrunId}?action=reject`
  const viewUrl = `${appUrl}/pay-runs/${payrunId}`
  const draftUrl = `${appUrl}/pay-runs/${payrunId}?action=return_draft`

  // Level badge
  const levelBadge = currentLevel && totalLevels
    ? `<span style="display:inline-block;background:#F0FDFA;color:#0D9488;font-size:12px;font-weight:700;padding:4px 12px;border-radius:12px;border:1px solid #99F6E4;">Level ${currentLevel} of ${totalLevels}</span>`
    : ''

  // Reminder banner
  const reminderBanner = eventKey === 'APPROVAL_REMINDER'
    ? `<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <span style="font-size:14px;font-weight:700;color:#92400E;">⏰ This approval has been pending for ${daysPending || '?'} days and requires your action.</span>
      </div>`
    : ''

  // Rejection box
  const rejectionBox = eventKey === 'PAYRUN_REJECTED' && rejectionReason
    ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;color:#DC2626;margin-bottom:8px;">✗ Rejection Reason</div>
        <div style="font-size:14px;color:#991B1B;line-height:1.5;">${rejectionReason}</div>
        <div style="font-size:12px;color:#B91C1C;margin-top:8px;">Rejected by ${rejectedBy || 'Approver'}${rejectedLevel ? ` at Level ${rejectedLevel}` : ''}</div>
      </div>`
    : ''

  // Intro text
  let introText = ''
  switch (eventKey) {
    case 'PAYRUN_SUBMITTED':
    case 'APPROVAL_REMINDER':
      introText = `<b>${submitterName}</b> has submitted a pay run for your approval. Please review the details below and take action.`
      break
    case 'PAYRUN_APPROVED':
      introText = `The pay run for <b>${payGroupName}</b> has been fully approved and is now ready for processing.`
      break
    case 'PAYRUN_REJECTED':
      introText = `The pay run for <b>${payGroupName}</b> has been rejected. Please review the reason below and resubmit.`
      break
  }

  // Fully approved message
  const fullyApprovedMsg = eventKey === 'PAYRUN_APPROVED'
    ? `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <span style="font-size:14px;font-weight:700;color:#166534;">✓ This pay run is now fully approved and ready for processing.</span>
      </div>`
    : ''

  // Action buttons
  let actionButtons = ''
  if (eventKey === 'PAYRUN_SUBMITTED' || eventKey === 'APPROVAL_REMINDER') {
    actionButtons = `
    <div style="text-align:center;padding:24px 0;">
      <a href="${approveUrl}" style="display:inline-block;background:#0D9488;color:#ffffff;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;margin-right:12px;">APPROVE</a>
      <a href="${rejectUrl}" style="display:inline-block;background:#ffffff;color:#DC2626;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;border:2px solid #DC2626;">REJECT</a>
    </div>`
  } else if (eventKey === 'PAYRUN_REJECTED') {
    actionButtons = `
    <div style="text-align:center;padding:24px 0;">
      <a href="${draftUrl}" style="display:inline-block;background:#0D9488;color:#ffffff;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;">RETURN TO DRAFT</a>
    </div>`
  }

  // Top employees section
  const topEmpSection = topEmployees.length > 0
    ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Top ${topEmployees.length} Employees by Gross Pay</div>
      ${buildTopEmployeesHtml(topEmployees)}
      ${totalEmployees > topEmployees.length ? `<div style="font-size:12px;color:#94A3B8;padding:8px 12px;">+ ${totalEmployees - topEmployees.length} more employees in this pay run</div>` : ''}
    </div>
    <div style="border-bottom:1px solid #E5E7EB;margin-bottom:24px;"></div>`
    : ''

  // Anomalies section
  const anomalySection = anomalies.length > 0
    ? `<div style="margin-bottom:24px;">${buildAnomaliesHtml(anomalies)}</div><div style="border-bottom:1px solid #E5E7EB;margin-bottom:24px;"></div>`
    : ''

  // Approval chain
  const chainSection = approvalChain.length > 0
    ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Approval Chain</div>
      ${buildApprovalChainHtml(approvalChain, currentLevel)}
    </div>
    <div style="border-bottom:1px solid #E5E7EB;margin-bottom:24px;"></div>`
    : ''

  // Expiry notice
  const expiryNote = (eventKey === 'PAYRUN_SUBMITTED' || eventKey === 'APPROVAL_REMINDER')
    ? `<div style="font-size:12px;color:#94A3B8;text-align:center;margin-top:8px;">This request will expire if not actioned within 7 days. After that, a reminder will be sent.</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0D9488;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">PayRun Pro</td>
                <td style="text-align:right;font-size:13px;color:#CCFBF1;">${orgName}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Title bar -->
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:16px;font-weight:700;color:#1E293B;text-transform:uppercase;letter-spacing:1px;">
                    ${eventKey === 'PAYRUN_SUBMITTED' || eventKey === 'APPROVAL_REMINDER' ? 'Payroll Approval Request' : eventKey === 'PAYRUN_APPROVED' ? 'Payroll Approved' : 'Payroll Rejected'}
                  </div>
                </td>
                <td style="text-align:right;">${levelBadge}</td>
              </tr>
            </table>
            <div style="border-bottom:2px solid #E5E7EB;margin-top:16px;"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 32px 0 32px;">
            ${reminderBanner}
            ${rejectionBox}
            ${fullyApprovedMsg}

            <!-- Greeting -->
            <div style="font-size:15px;color:#334155;line-height:1.6;margin-bottom:24px;">
              Hi ${recipientName.split(' ')[0] || recipientName},<br><br>
              ${introText}
            </div>

            <div style="border-bottom:1px solid #E5E7EB;margin-bottom:24px;"></div>

            <!-- Pay Run Summary -->
            <div style="margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Pay Run Summary</div>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748B;width:40%;">Pay Group</td>
                  <td style="padding:6px 0;font-size:14px;color:#1E293B;font-weight:600;">${payGroupName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748B;">Pay Period</td>
                  <td style="padding:6px 0;font-size:14px;color:#1E293B;">${formatDate(periodStart)} to ${formatDate(periodEnd)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748B;">Pay Run Type</td>
                  <td style="padding:6px 0;font-size:14px;color:#1E293B;">${payrunType || 'Regular'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748B;">Submitted By</td>
                  <td style="padding:6px 0;font-size:14px;color:#1E293B;">${submitterName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748B;">Submitted On</td>
                  <td style="padding:6px 0;font-size:14px;color:#1E293B;">${submittedAt}</td>
                </tr>
                ${currentLevel && totalLevels ? `<tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748B;">Your Role</td>
                  <td style="padding:6px 0;font-size:14px;color:#0D9488;font-weight:600;">Level ${currentLevel} Approver of ${totalLevels}</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="border-bottom:1px solid #E5E7EB;margin-bottom:24px;"></div>

            <!-- Financial Summary -->
            <div style="margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Financial Summary</div>
              <table style="width:100%;border-collapse:collapse;background:#F8FAFC;border-radius:8px;">
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#64748B;">Total Employees</td>
                  <td style="padding:10px 16px;font-size:15px;color:#1E293B;font-weight:700;text-align:right;">${totalEmployees}</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:10px 16px;font-size:13px;color:#64748B;">Total Gross Pay</td>
                  <td style="padding:10px 16px;font-size:15px;color:#1E293B;font-weight:700;text-align:right;">${formatCurrency(totalGross)}</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:10px 16px;font-size:13px;color:#64748B;">Total Deductions</td>
                  <td style="padding:10px 16px;font-size:14px;color:#DC2626;text-align:right;">-${formatCurrency(totalDeductions)}</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:10px 16px;font-size:13px;color:#64748B;">Total Net Pay</td>
                  <td style="padding:10px 16px;font-size:15px;color:#0D9488;font-weight:700;text-align:right;">${formatCurrency(totalNet)}</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:10px 16px;font-size:13px;color:#64748B;">Total Employer NSSF</td>
                  <td style="padding:10px 16px;font-size:14px;color:#1E293B;text-align:right;">${formatCurrency(totalEmployerNssf)}</td>
                </tr>
              </table>
            </div>

            <div style="border-bottom:1px solid #E5E7EB;margin-bottom:24px;"></div>

            <!-- Top Employees -->
            ${topEmpSection}

            <!-- Anomalies -->
            ${anomalySection}

            <!-- Approval Chain -->
            ${chainSection}

            <!-- Action buttons -->
            ${actionButtons}

            <!-- View link -->
            <div style="text-align:center;margin-bottom:8px;">
              <span style="font-size:12px;color:#94A3B8;">Or copy this link to view the full pay run:</span><br>
              <a href="${viewUrl}" style="font-size:12px;color:#0D9488;word-break:break-all;">${viewUrl}</a>
            </div>

            ${expiryNote}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;background:#F8FAFC;border-top:1px solid #E5E7EB;margin-top:24px;">
            <div style="font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">
              <b>PayRun Pro</b> · Professional Payroll<br>
              <a href="https://payroll.flipafrica.app" style="color:#0D9488;text-decoration:none;">payroll.flipafrica.app</a><br><br>
              You are receiving this because you are an approver in ${orgName}'s payroll workflow.
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Main Handler ───

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

    // ─── Parse payload (direct or webhook) ───
    if (body.event_key && body.recipient_user_id && body.payrun_id) {
      const payload = body as DirectPayload
      eventKey = payload.event_key
      recipientUserId = payload.recipient_user_id
      payrunId = payload.payrun_id
      console.log(`Direct invocation: ${eventKey} for user ${recipientUserId}`)
    } else {
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

    // ─── 1. Resolve recipient ───
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, first_name, last_name')
      .eq('id', recipientUserId)
      .maybeSingle()

    let email = userProfile?.email
    let recipientName = userProfile?.first_name
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
      if (!recipientName) recipientName = email.split('@')[0]
    }

    // ─── 2. Get payrun details ───
    const { data: payrun } = await supabase
      .from('pay_runs')
      .select(`
        id, pay_period_start, pay_period_end, total_gross, total_net, total_deductions,
        status, payroll_type, approval_submitted_by, approval_submitted_at,
        approval_status, approval_current_level, organization_id,
        pay_group_id, pay_group_master_id
      `)
      .eq('id', payrunId)
      .maybeSingle()

    if (!payrun) {
      console.error('Payrun not found:', payrunId)
      return new Response(JSON.stringify({ error: 'Payrun not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── 3. Pay group name ───
    let payGroupName = 'Default'
    if (payrun.pay_group_master_id) {
      const { data: pgm } = await supabase
        .from('pay_group_master')
        .select('name')
        .eq('id', payrun.pay_group_master_id)
        .maybeSingle()
      if (pgm?.name) payGroupName = pgm.name
    } else if (payrun.pay_group_id) {
      const { data: pg } = await supabase
        .from('pay_groups')
        .select('name')
        .eq('id', payrun.pay_group_id)
        .maybeSingle()
      if (pg?.name) payGroupName = pg.name
    }

    // ─── 4. Org info ───
    let orgId = payrun.organization_id || ''
    let orgName = 'Your Organization'
    if (orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()
      if (org?.name) orgName = org.name
    }
    if (!orgId && payrun.pay_group_id) {
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

    // ─── 5. Financial aggregates from pay_items ───
    const { data: financials } = await supabase
      .from('pay_items')
      .select('gross_pay, net_pay, total_deductions, employer_nssf')
      .eq('pay_run_id', payrunId)

    let totalGross = payrun.total_gross || 0
    let totalNet = payrun.total_net || 0
    let totalDeductions = payrun.total_deductions || 0
    let totalEmployerNssf = 0
    let totalEmployees = 0

    if (financials && financials.length > 0) {
      totalEmployees = financials.length
      // Use aggregated if pay_runs totals are 0
      if (!totalGross) totalGross = financials.reduce((s: number, i: any) => s + (Number(i.gross_pay) || 0), 0)
      if (!totalNet) totalNet = financials.reduce((s: number, i: any) => s + (Number(i.net_pay) || 0), 0)
      if (!totalDeductions) totalDeductions = financials.reduce((s: number, i: any) => s + (Number(i.total_deductions) || 0), 0)
      totalEmployerNssf = financials.reduce((s: number, i: any) => s + (Number(i.employer_nssf) || 0), 0)
    } else {
      // Fallback count
      const { count } = await supabase
        .from('pay_items')
        .select('id', { count: 'exact', head: true })
        .eq('pay_run_id', payrunId)
      totalEmployees = count || 0
    }

    // ─── 6. Top 5 employees by gross ───
    const { data: topEmpData } = await supabase
      .from('pay_items')
      .select(`
        gross_pay,
        employee:employee_id(first_name, last_name, designation_id, designations:designation_id(name))
      `)
      .eq('pay_run_id', payrunId)
      .order('gross_pay', { ascending: false })
      .limit(5)

    const topEmployees: TopEmployee[] = (topEmpData || []).map((item: any) => {
      const emp = item.employee || {}
      return {
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown',
        designation: emp.designations?.name || '—',
        gross_pay: Number(item.gross_pay) || 0,
      }
    })

    // ─── 7. Approval chain ───
    const { data: stepsData } = await supabase
      .from('payrun_approval_steps')
      .select('level, status, approver_user_id, actioned_at, actioned_by, comments')
      .eq('payrun_id', payrunId)
      .order('level', { ascending: true })

    const approvalChain: ApprovalStep[] = []
    const totalLevels = stepsData?.length || 0

    if (stepsData) {
      for (const step of stepsData) {
        let approverName = 'Approver'
        if (step.approver_user_id) {
          if (step.approver_user_id === recipientUserId) {
            approverName = 'You'
          } else {
            const { data: ap } = await supabase
              .from('user_profiles')
              .select('first_name, last_name')
              .eq('id', step.approver_user_id)
              .maybeSingle()
            if (ap) approverName = `${ap.first_name || ''} ${ap.last_name || ''}`.trim() || 'Approver'
          }
        }
        approvalChain.push({
          level: step.level,
          status: step.status,
          approver_user_id: step.approver_user_id,
          actioned_at: step.actioned_at,
          actioned_by: step.actioned_by,
          comments: step.comments,
          approver_name: approverName,
        })
      }
    }

    // ─── 8. Anomalies ───
    const { data: anomalyData } = await supabase
      .from('anomaly_logs')
      .select('description, severity, affected_record_type')
      .eq('affected_record_id', payrunId)
      .eq('status', 'active')
      .order('severity', { ascending: true })
      .limit(10)

    const anomalies: Anomaly[] = (anomalyData || []).map((a: any) => ({
      description: a.description || '',
      severity: a.severity || 'warning',
      affected_record_type: a.affected_record_type || '',
    }))

    // ─── 9. Submitter info ───
    let submitterName = 'System'
    if (payrun.approval_submitted_by) {
      const { data: submitter } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', payrun.approval_submitted_by)
        .maybeSingle()
      if (submitter) {
        submitterName = `${submitter.first_name || ''} ${submitter.last_name || ''}`.trim() || 'System'
      }
    }

    // ─── 10. Event-specific data ───
    let rejectionReason = ''
    let rejectedBy = ''
    let rejectedLevel: number | undefined
    let daysPending: number | undefined

    if (eventKey === 'PAYRUN_REJECTED') {
      const { data: step } = await supabase
        .from('payrun_approval_steps')
        .select('actioned_by, comments, level')
        .eq('payrun_id', payrunId)
        .eq('status', 'rejected')
        .order('actioned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      rejectionReason = step?.comments || 'No reason provided'
      rejectedLevel = step?.level

      if (step?.actioned_by) {
        const { data: rejector } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', step.actioned_by)
          .maybeSingle()
        rejectedBy = rejector
          ? `${rejector.first_name || ''} ${rejector.last_name || ''}`.trim()
          : 'Approver'
      }
    }

    if (eventKey === 'APPROVAL_REMINDER' && payrun.approval_submitted_at) {
      const submitted = new Date(payrun.approval_submitted_at)
      daysPending = Math.floor((Date.now() - submitted.getTime()) / (1000 * 60 * 60 * 24))
    }

    // ─── 11. Build email data ───
    const appUrl = Deno.env.get('APP_URL') || 'https://payroll.flipafrica.app'

    const emailData: EmailData = {
      eventKey,
      recipientName,
      submitterName,
      payGroupName,
      payrunType: payrun.payroll_type || 'Regular',
      periodStart: payrun.pay_period_start,
      periodEnd: payrun.pay_period_end,
      periodShort: formatPeriodShort(payrun.pay_period_start, payrun.pay_period_end),
      submittedAt: formatDateTime(payrun.approval_submitted_at),
      currentLevel: payrun.approval_current_level,
      totalLevels,
      totalEmployees,
      totalGross,
      totalDeductions,
      totalNet,
      totalEmployerNssf,
      topEmployees,
      approvalChain,
      anomalies,
      orgName,
      payrunId,
      appUrl,
      rejectionReason,
      rejectedBy,
      rejectedLevel,
      daysPending,
    }

    // ─── 12. Check for per-workflow custom message template ───
    let useWorkflowTemplate = false
    let workflowSubject = ''
    let workflowBody = ''
    const messageEventType = EVENT_TO_MESSAGE_TYPE[eventKey]

    // Build variables for template rendering
    const variables: Record<string, string> = {
      period: `${formatDate(payrun.pay_period_start)} to ${formatDate(payrun.pay_period_end)}`,
      pay_period: `${formatDate(payrun.pay_period_start)} to ${formatDate(payrun.pay_period_end)}`,
      payrun_id: payrunId,
      organization_name: orgName,
      org_name: orgName,
      total_gross: formatCurrency(totalGross),
      total_deductions: formatCurrency(totalDeductions),
      total_net: formatCurrency(totalNet),
      total_employer_nssf: formatCurrency(totalEmployerNssf),
      total_employees: String(totalEmployees),
      pay_group_name: payGroupName,
      payrun_type: payrun.payroll_type || 'Regular',
      approver_name: recipientName,
      submitter_name: submitterName,
      submitted_by: submitterName,
      submitted_at: formatDateTime(payrun.approval_submitted_at),
      current_level: String(payrun.approval_current_level || ''),
      total_levels: String(totalLevels),
      action_url: `${appUrl}/pay-runs/${payrunId}`,
      approve_url: `${appUrl}/pay-runs/${payrunId}?action=approve`,
      reject_url: `${appUrl}/pay-runs/${payrunId}?action=reject`,
      rejection_reason: rejectionReason,
      rejected_by: rejectedBy,
      days_pending: String(daysPending || ''),
      employee_name: recipientName,
      user_name: recipientName,
      user_email: email,
      workflow_name: '',
      due_date: '',
    }

    if (messageEventType) {
      const { data: approvalStep } = await supabase
        .from('payrun_approval_steps')
        .select('workflow_id')
        .eq('payrun_id', payrunId)
        .limit(1)
        .maybeSingle()

      const workflowId = (approvalStep as any)?.workflow_id

      if (workflowId) {
        // Get workflow name
        const { data: wf } = await supabase
          .from('approval_workflows')
          .select('name')
          .eq('id', workflowId)
          .maybeSingle()
        if (wf?.name) variables['workflow_name'] = wf.name

        const { data: wfMessage } = await supabase
          .from('approval_workflow_messages')
          .select('subject, body_content, is_active')
          .eq('workflow_id', workflowId)
          .eq('event_type', messageEventType)
          .maybeSingle()

        if (wfMessage && wfMessage.is_active) {
          useWorkflowTemplate = true
          workflowSubject = renderTemplate(wfMessage.subject, variables)
          workflowBody = renderTemplate(wfMessage.body_content, variables)
          console.log(`Using per-workflow template for ${eventKey} (workflow: ${workflowId})`)
        }
      }
    }

    // ─── 13. Build final email ───
    const subject = useWorkflowTemplate ? workflowSubject : buildSubject(emailData)
    const htmlBody = useWorkflowTemplate ? workflowBody : buildHtmlBody(emailData)

    // ─── 14. Queue email ───
    const queuePayload: Record<string, any> = {
      org_id: orgId || null,
      event_key: eventKey,
      recipient_email: email,
      recipient_name: recipientName,
      variables,
      subject_override: subject,
      body_override: htmlBody,
    }

    const queueResponse = await fetch(`${supabaseUrl}/functions/v1/queue-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queuePayload),
    })

    const queueResult = await queueResponse.json()
    console.log(`Email queued for ${eventKey}:`, queueResult)

    // ─── 15. Create in-app notification ───
    if (eventKey === 'PAYRUN_SUBMITTED' || eventKey === 'APPROVAL_REMINDER') {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientUserId,
          type: 'approval_request',
          title: eventKey === 'APPROVAL_REMINDER'
            ? `⏰ Reminder: ${payGroupName} payroll pending`
            : `Payroll Approval Required — ${payGroupName}`,
          message: `${submitterName} submitted a ${formatCurrency(totalGross)} payroll for ${payGroupName} (${formatPeriodShort(payrun.pay_period_start, payrun.pay_period_end)}).`,
          metadata: {
            payrun_id: payrunId,
            type: 'payroll_approval',
            pay_group: payGroupName,
            total_gross: totalGross,
          },
        })
        .then(({ error }) => { if (error) console.warn('Notification insert error:', error) })
    }

    return new Response(JSON.stringify({
      success: true,
      event_key: eventKey,
      used_workflow_template: useWorkflowTemplate,
      queue_result: queueResult,
    }), {
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

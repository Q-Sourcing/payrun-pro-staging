import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAuditEvent, extractIpAddress, extractUserAgent } from '../_shared/audit-logger.ts'
import { validateRequest, CreatePayRunRequestSchema, UpdatePayRunRequestSchema, DeletePayRunRequestSchema } from '../_shared/validation-schemas.ts'
import { corsHeaders } from '../_shared/cors.ts'


type PayRunStatus = 'draft' | 'pending_approval' | 'approved' | 'processed'

interface CreatePayRunRequest {
  pay_run_date?: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_group_id?: string;
  pay_group_master_id?: string;
  status?: PayRunStatus;
  category?: string;
  employee_type?: string;
  pay_frequency?: string;
  payroll_type?: string;
  project_id?: string;
  exchange_rate?: number;
  days_worked?: number;
  created_by?: string;
}

interface UpdatePayRunRequest {
  id: string;
  pay_run_date?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  pay_group_id?: string;
  pay_group_master_id?: string;
  status?: PayRunStatus;
  category?: string;
  employee_type?: string;
  pay_frequency?: string;
  payroll_type?: string;
  project_id?: string;
  exchange_rate?: number;
  days_worked?: number;
  total_gross_pay?: number;
  total_deductions?: number;
  total_net_pay?: number;
  approved_by?: string;
  approved_at?: string;
}

interface DeletePayRunRequest {
  id: string;
  hard_delete?: boolean;
}

interface PayRunResponse {
  success: boolean;
  message: string;
  pay_run?: any;
  error?: string;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<PayRunStatus, PayRunStatus[]> = {
  draft: ['pending_approval', 'draft'],
  pending_approval: ['approved', 'draft'],
  approved: ['processed', 'pending_approval'],
  processed: [], // Cannot transition from processed
}

function validateStatusTransition(currentStatus: PayRunStatus, newStatus: PayRunStatus): boolean {
  return VALID_TRANSITIONS[currentStatus].includes(newStatus)
}

function generatePayRunId(category?: string): string {
  const date = new Date()
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  const prefix = category === 'projects' ? 'PRJ' : 'HOF'
  return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the service role key from environment
    const supabaseUrl = (globalThis as any).Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authorization header required'
        } as PayRunResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid authentication token'
        } as PayRunResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check user permissions (OBAC system)
    const rbacPermissions = user.app_metadata?.rbac_permissions || []
    const isPlatformAdmin = user.app_metadata?.is_platform_admin || false
    const canManagePayRuns = isPlatformAdmin || rbacPermissions.includes('payroll.prepare')

    // Extract IP and user agent for audit logging
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)

    if (!canManagePayRuns) {
      // Log denied access attempt
      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payrun.operation',
        resource: 'pay_runs',
        details: { attempted_action: req.method, reason: 'insufficient_permissions' },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'denied',
      })

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Insufficient permissions. Finance, Admin, or Super Admin role required.',
          code: 'PERMISSION_DENIED'
        } as PayRunResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle CREATE request
    if (req.method === 'POST') {
      let body: CreatePayRunRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(CreatePayRunRequestSchema, rawBody)
      } catch (validationError) {
        // ... logging
        return new Response(JSON.stringify({ success: false, message: 'Validation failed' }), { status: 400, headers: corsHeaders })
      }

      // Generate pay_run_id
      const payRunId = generatePayRunId('head_office')

      // Ensure organization_id and pay_group_master_id are handled correctly
      let organizationId = user.app_metadata?.organization_id || (user as any).organization_id;
      let payGroupMasterId = body.pay_group_master_id;

      // 1. Resolve organization_id and payGroupMasterId if missing
      if (!organizationId || !payGroupMasterId) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id && !organizationId) {
          organizationId = profile.organization_id;
        }

        if (body.pay_group_id || body.pay_group_master_id) {
          const pgId = body.pay_group_master_id || body.pay_group_id;
          console.log('Resolving Pay Group Master for pgId:', pgId);

          const { data: pg, error: pgmError } = await supabaseAdmin
            .from('pay_group_master')
            .select('id, source_id, organization_id')
            .or(`id.eq.${pgId},source_id.eq.${pgId}`)
            .maybeSingle();

          if (pgmError) {
            console.error('Error querying pay_group_master:', pgmError);
          }

          if (pg) {
            console.log(`Successfully resolved Pay Group Master: ${pg.id} (Source ID: ${pg.source_id})`);
            if (!payGroupMasterId) payGroupMasterId = pg.id;
            if (!organizationId) organizationId = pg.organization_id;
            // Store source_id for population logic
            (body as any)._resolved_source_id = pg.source_id;
          } else {
            console.warn('No Pay Group Master found for pgId:', pgId);
          }
        }
      }

      if (!organizationId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to create pay run: Organization ID is required and could not be determined.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!payGroupMasterId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to create pay run: Pay Group Master ID is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const insertData: any = {
        pay_run_date: body.pay_run_date || new Date().toISOString().split('T')[0],
        pay_period_start: body.pay_period_start,
        pay_period_end: body.pay_period_end,
        pay_group_master_id: payGroupMasterId,
        pay_group_id: body.pay_group_id, // Still pass it, but legacy FK is now dropped or will be dropped
        employee_type: body.employee_type || 'regular',
        status: body.status || 'draft',
        category: 'head_office',
        pay_run_id: payRunId,
        project_id: body.project_id,
        created_by: body.created_by || user.id,
        organization_id: organizationId,
      }

      const { data: payRun, error } = await supabaseAdmin
        .from('pay_runs')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payrun.create',
          resource: 'pay_runs',
          details: { error: error.message, data: insertData },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })
        return new Response(JSON.stringify({ success: false, message: 'Failed to create pay run: ' + error.message }), { status: 400, headers: corsHeaders })
      }

      let populationMessage = 'Pay run created successfully'
      let debugInfo: any = {
        resolved_source_id: (body as any)._resolved_source_id || body.pay_group_id,
        members_count: 0
      }

      if (body.pay_group_id || payGroupMasterId) {
        try {
          // Use the resolved source_id if we have it, otherwise fallback to pay_group_id
          const targetGroupId = (body as any)._resolved_source_id || body.pay_group_id;
          debugInfo.resolved_source_id = targetGroupId;

          console.log(`📋 Fetching members from head_office_pay_group_members for group ${targetGroupId}`);

          // Fetch members from head_office_pay_group_members
          let { data: members, error: membersError } = await supabaseAdmin
            .from('head_office_pay_group_members')
            .select('employee_id')
            .eq('pay_group_id', targetGroupId)
            .eq('active', true);

          // FALLBACK: If no members found in head_office table, try paygroup_employees (legacy/regular)
          if (!membersError && (!members || members.length === 0)) {
            console.log(`⚠️ No members in head_office_pay_group_members, trying paygroup_employees fallback...`);
            const { data: fallbackMembers, error: fallbackError } = await supabaseAdmin
              .from('paygroup_employees')
              .select('employee_id')
              .eq('pay_group_id', targetGroupId)
              .eq('active', true);

            if (!fallbackError && fallbackMembers && fallbackMembers.length > 0) {
              console.log(`✅ Found ${fallbackMembers.length} members in paygroup_employees fallback`);
              members = fallbackMembers;
              debugInfo.fallback_used = true;
            }
          }

          if (membersError) {
            console.error('❌ Error fetching pay group members:', membersError);
            debugInfo.error = membersError.message;
            populationMessage = 'Created pay run but failed to fetch group members: ' + membersError.message;
          } else if (members && members.length > 0) {
            console.log(`📋 Found ${members.length} members for pay group ${targetGroupId}`);
            debugInfo.members_count = members.length;

            const payItems = members.map((m: any) => ({
              pay_run_id: payRun.id,
              employee_id: m.employee_id,
              status: 'draft',
              gross_pay: 0,
              tax_deduction: 0,
              benefit_deductions: 0,
              total_deductions: 0,
              net_pay: 0,
              employer_contributions: 0,
              organization_id: organizationId
            }));

            const { error: insertItemsError } = await supabaseAdmin
              .from('pay_items')
              .insert(payItems);

            if (insertItemsError) {
              console.error('❌ Error inserting pay items:', insertItemsError);
              debugInfo.insert_error = insertItemsError.message;
              populationMessage = 'Created pay run but failed to populate items: ' + insertItemsError.message;
            } else {
              console.log(`✅ Successfully populated ${payItems.length} pay items`);
              populationMessage = `Pay run created and populated with ${payItems.length} members`;
            }
          } else {
            console.warn(`⚠️ No members found for pay group ${targetGroupId} in head_office_pay_group_members OR paygroup_employees`);
            populationMessage = 'Pay run created but no members were found in this pay group';
          }
        } catch (populationError) {
          console.error('❌ Unexpected error during population:', populationError);
          debugInfo.unexpected_error = populationError instanceof Error ? populationError.message : String(populationError);
          populationMessage = 'Created pay run but encountered an error during population';
        }
      }

      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payrun.create',
        resource: 'pay_runs',
        details: { pay_run_id: payRun.id, category: 'head_office', population: populationMessage },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

      return new Response(JSON.stringify({
        success: true,
        message: populationMessage,
        pay_run: payRun,
        debug: debugInfo
      }), { status: 200, headers: corsHeaders })
    }

    // Handle UPDATE request
    if (req.method === 'PUT' || req.method === 'PATCH') {
      let body: UpdatePayRunRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(UpdatePayRunRequestSchema, rawBody)
      } catch (validationError) {
        return new Response(JSON.stringify({ success: false, message: 'Validation failed' }), { status: 400, headers: corsHeaders })
      }

      // Get existing
      const { data: existing } = await supabaseAdmin.from('pay_runs').select('*').eq('id', body.id).single()
      if (!existing) return new Response(JSON.stringify({ success: false, message: 'Not found' }), { status: 404, headers: corsHeaders })

      const updateData: any = {
        updated_at: new Date().toISOString(),
        status: body.status,
        pay_period_start: body.pay_period_start,
        pay_period_end: body.pay_period_end,
        project_id: body.project_id,
      }

      const { data: updated, error } = await supabaseAdmin
        .from('pay_runs')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single()

      if (error) {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payrun.update',
          resource: 'pay_runs',
          details: { id: body.id, error: error.message },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400, headers: corsHeaders })
      }

      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payrun.update',
        resource: 'pay_runs',
        details: { id: body.id, changes: updateData },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

      return new Response(JSON.stringify({ success: true, pay_run: updated }), { status: 200, headers: corsHeaders })
    }

    // Handle DELETE
    if (req.method === 'DELETE') {
      const { id } = await req.json()
      const { error } = await supabaseAdmin.from('pay_runs').delete().eq('id', id)

      if (error) {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payrun.delete',
          resource: 'pay_runs',
          details: { id, error: error.message },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400, headers: corsHeaders })
      }

      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payrun.delete',
        resource: 'pay_runs',
        details: { id },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers: corsHeaders })

  } catch (error) {
    console.error('Unexpected error in manage-payruns function:', error)

    // Try to log the error (but don't fail if logging fails)
    try {
      const ipAddress = extractIpAddress(req)
      const userAgent = extractUserAgent(req)
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token) {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (serviceRoleKey) {
          const supabaseAdmin = createClient(
            (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )

          const { data: { user } } = await supabaseAdmin.auth.getUser(token)
          if (user) {
            await logAuditEvent(supabaseAdmin, {
              user_id: user.id,
              action: 'payrun.operation',
              resource: 'pay_runs',
              details: { error: error instanceof Error ? error.message : 'Unknown error', method: req.method },
              ip_address: ipAddress,
              user_agent: userAgent,
              result: 'failure',
            })
          }
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      } as PayRunResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

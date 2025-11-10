import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PayRunStatus = 'draft' | 'pending_approval' | 'approved' | 'processed'

interface CreatePayRunRequest {
  pay_run_date?: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_group_id?: string;
  pay_group_master_id?: string;
  status?: PayRunStatus;
  category?: string;
  sub_type?: string;
  pay_frequency?: string;
  payroll_type?: string;
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
  sub_type?: string;
  pay_frequency?: string;
  payroll_type?: string;
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
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  const prefix = category === 'projects' ? 'PRJ' : 'HOF'
  return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the service role key from environment
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
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

    // Check user permissions (finance, admin, or super_admin can manage pay runs)
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to verify user permissions' 
        } as PayRunResponse),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const role = userRole.role
    const canManagePayRuns = ['finance', 'admin', 'super_admin'].includes(role)

    if (!canManagePayRuns) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient permissions. Finance, Admin, or Super Admin role required.' 
        } as PayRunResponse),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle CREATE request
    if (req.method === 'POST') {
      const body: CreatePayRunRequest = await req.json()

      // Validate required fields
      if (!body.pay_period_start || !body.pay_period_end) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'pay_period_start and pay_period_end are required' 
          } as PayRunResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Generate pay_run_id
      const payRunId = generatePayRunId(body.category)

      const insertData: any = {
        pay_run_date: body.pay_run_date || new Date().toISOString().split('T')[0],
        pay_period_start: body.pay_period_start,
        pay_period_end: body.pay_period_end,
        pay_group_id: body.pay_group_id,
        pay_group_master_id: body.pay_group_master_id,
        status: body.status || 'draft',
        category: body.category,
        sub_type: body.sub_type,
        pay_frequency: body.pay_frequency,
        payroll_type: body.payroll_type,
        exchange_rate: body.exchange_rate,
        days_worked: body.days_worked,
        pay_run_id: payRunId,
        created_by: body.created_by || user.id,
        total_gross_pay: 0,
        total_deductions: 0,
        total_net_pay: 0,
      }

      const { data: payRun, error } = await supabaseAdmin
        .from('pay_runs')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating pay run:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to create pay run: ' + error.message 
          } as PayRunResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Pay run created: ${payRun.id} by ${user.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pay run created successfully',
          pay_run: payRun
        } as PayRunResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle UPDATE request
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body: UpdatePayRunRequest = await req.json()

      if (!body.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay run ID is required' 
          } as PayRunResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get existing pay run
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('pay_runs')
        .select('*')
        .eq('id', body.id)
        .single()

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay run not found' 
          } as PayRunResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate status transition
      if (body.status && body.status !== existing.status) {
        if (!validateStatusTransition(existing.status as PayRunStatus, body.status)) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Invalid status transition from ${existing.status} to ${body.status}` 
            } as PayRunResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (body.pay_run_date !== undefined) updateData.pay_run_date = body.pay_run_date
      if (body.pay_period_start !== undefined) updateData.pay_period_start = body.pay_period_start
      if (body.pay_period_end !== undefined) updateData.pay_period_end = body.pay_period_end
      if (body.pay_group_id !== undefined) updateData.pay_group_id = body.pay_group_id
      if (body.pay_group_master_id !== undefined) updateData.pay_group_master_id = body.pay_group_master_id
      if (body.status !== undefined) updateData.status = body.status
      if (body.category !== undefined) updateData.category = body.category
      if (body.sub_type !== undefined) updateData.sub_type = body.sub_type
      if (body.pay_frequency !== undefined) updateData.pay_frequency = body.pay_frequency
      if (body.payroll_type !== undefined) updateData.payroll_type = body.payroll_type
      if (body.exchange_rate !== undefined) updateData.exchange_rate = body.exchange_rate
      if (body.days_worked !== undefined) updateData.days_worked = body.days_worked
      if (body.total_gross_pay !== undefined) updateData.total_gross_pay = body.total_gross_pay
      if (body.total_deductions !== undefined) updateData.total_deductions = body.total_deductions
      if (body.total_net_pay !== undefined) updateData.total_net_pay = body.total_net_pay

      // Handle approval
      if (body.status === 'approved' && !existing.approved_at) {
        updateData.approved_by = body.approved_by || user.id
        updateData.approved_at = body.approved_at || new Date().toISOString()
      }

      const { data: updatedPayRun, error: updateError } = await supabaseAdmin
        .from('pay_runs')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating pay run:', updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to update pay run: ' + updateError.message 
          } as PayRunResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Pay run updated: ${body.id} by ${user.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pay run updated successfully',
          pay_run: updatedPayRun
        } as PayRunResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      const body: DeletePayRunRequest = await req.json()

      if (!body.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay run ID is required' 
          } as PayRunResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get existing pay run
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('pay_runs')
        .select('status')
        .eq('id', body.id)
        .single()

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay run not found' 
          } as PayRunResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prevent deletion of processed pay runs unless hard delete
      if (existing.status === 'processed' && !body.hard_delete) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cannot delete processed pay runs. Use hard delete if necessary.' 
          } as PayRunResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Only super_admin can hard delete
      if (body.hard_delete && role !== 'super_admin') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Only super admin can perform hard delete' 
          } as PayRunResponse),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (body.hard_delete) {
        // Hard delete - remove from database (cascade will delete pay_items)
        const { error: deleteError } = await supabaseAdmin
          .from('pay_runs')
          .delete()
          .eq('id', body.id)

        if (deleteError) {
          console.error('Error deleting pay run:', deleteError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to delete pay run: ' + deleteError.message 
            } as PayRunResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log(`Pay run hard deleted: ${body.id} by ${user.email}`)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pay run deleted successfully' 
          } as PayRunResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Soft delete - set status to draft (if allowed)
        if (existing.status === 'draft') {
          const { error: updateError } = await supabaseAdmin
            .from('pay_runs')
            .update({
              status: 'draft',
              updated_at: new Date().toISOString(),
            })
            .eq('id', body.id)

          if (updateError) {
            console.error('Error soft deleting pay run:', updateError)
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: 'Failed to soft delete pay run: ' + updateError.message 
              } as PayRunResponse),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          console.log(`Pay run soft deleted: ${body.id} by ${user.email}`)

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Pay run soft deleted successfully' 
            } as PayRunResponse),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Cannot soft delete pay run with status: ${existing.status}` 
            } as PayRunResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      } as PayRunResponse),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in manage-payruns function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') 
      } as PayRunResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


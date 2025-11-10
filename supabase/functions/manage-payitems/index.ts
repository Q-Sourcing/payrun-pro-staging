import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PayItemStatus = 'draft' | 'pending' | 'approved' | 'paid'

interface CreatePayItemRequest {
  pay_run_id: string;
  employee_id: string;
  hours_worked?: number | null;
  pieces_completed?: number | null;
  gross_pay: number;
  tax_deduction: number;
  benefit_deductions: number;
  employer_contributions?: number;
  status?: PayItemStatus;
  notes?: string | null;
}

interface UpdatePayItemRequest {
  id: string;
  hours_worked?: number | null;
  pieces_completed?: number | null;
  gross_pay?: number;
  tax_deduction?: number;
  benefit_deductions?: number;
  employer_contributions?: number;
  status?: PayItemStatus;
  notes?: string | null;
}

interface DeletePayItemRequest {
  id: string;
}

interface PayItemResponse {
  success: boolean;
  message: string;
  pay_item?: any;
  error?: string;
}

// Helper function to recalculate and update pay run totals
async function updatePayRunTotals(
  supabaseAdmin: any,
  payRunId: string
): Promise<void> {
  const { data: payItems, error } = await supabaseAdmin
    .from('pay_items')
    .select('gross_pay, total_deductions, net_pay')
    .eq('pay_run_id', payRunId)

  if (error) {
    console.error('Error fetching pay items for totals:', error)
    throw error
  }

  const totals = (payItems || []).reduce(
    (acc: any, item: any) => {
      acc.total_gross_pay += item.gross_pay || 0
      acc.total_deductions += item.total_deductions || 0
      acc.total_net_pay += item.net_pay || 0
      return acc
    },
    { total_gross_pay: 0, total_deductions: 0, total_net_pay: 0 }
  )

  const { error: updateError } = await supabaseAdmin
    .from('pay_runs')
    .update({
      total_gross_pay: totals.total_gross_pay,
      total_deductions: totals.total_deductions,
      total_net_pay: totals.total_net_pay,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payRunId)

  if (updateError) {
    console.error('Error updating pay run totals:', updateError)
    throw updateError
  }
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
        } as PayItemResponse),
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
        } as PayItemResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check user permissions (finance, admin, or super_admin can manage pay items)
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
        } as PayItemResponse),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const role = userRole.role
    const canManagePayItems = ['finance', 'admin', 'super_admin'].includes(role)

    if (!canManagePayItems) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient permissions. Finance, Admin, or Super Admin role required.' 
        } as PayItemResponse),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle CREATE request
    if (req.method === 'POST') {
      const body: CreatePayItemRequest = await req.json()

      // Validate required fields
      if (!body.pay_run_id || !body.employee_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'pay_run_id and employee_id are required' 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify pay run exists and is not processed
      const { data: payRun, error: payRunError } = await supabaseAdmin
        .from('pay_runs')
        .select('id, status')
        .eq('id', body.pay_run_id)
        .single()

      if (payRunError || !payRun) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay run not found' 
          } as PayItemResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (payRun.status === 'processed') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cannot add pay items to processed pay runs' 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Recalculate totals to ensure consistency
      const totalDeductions = (body.tax_deduction || 0) + (body.benefit_deductions || 0)
      const netPay = (body.gross_pay || 0) - totalDeductions

      const insertData: any = {
        pay_run_id: body.pay_run_id,
        employee_id: body.employee_id,
        hours_worked: body.hours_worked,
        pieces_completed: body.pieces_completed,
        gross_pay: body.gross_pay || 0,
        tax_deduction: body.tax_deduction || 0,
        benefit_deductions: body.benefit_deductions || 0,
        employer_contributions: body.employer_contributions || 0,
        total_deductions: totalDeductions,
        net_pay: netPay,
        status: body.status || 'draft',
        notes: body.notes,
      }

      const { data: payItem, error } = await supabaseAdmin
        .from('pay_items')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating pay item:', error)
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'A pay item for this employee already exists in this pay run' 
            } as PayItemResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to create pay item: ' + error.message 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update pay run totals
      try {
        await updatePayRunTotals(supabaseAdmin, body.pay_run_id)
      } catch (totalsError) {
        console.error('Error updating pay run totals:', totalsError)
        // Don't fail the request, but log the error
      }

      console.log(`Pay item created: ${payItem.id} by ${user.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pay item created successfully',
          pay_item: payItem
        } as PayItemResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle UPDATE request
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body: UpdatePayItemRequest = await req.json()

      if (!body.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay item ID is required' 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get existing pay item
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('pay_items')
        .select('*, pay_runs!inner(id, status)')
        .eq('id', body.id)
        .single()

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay item not found' 
          } as PayItemResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if pay run is processed
      if (existing.pay_runs?.status === 'processed') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cannot update pay items in processed pay runs' 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (body.hours_worked !== undefined) updateData.hours_worked = body.hours_worked
      if (body.pieces_completed !== undefined) updateData.pieces_completed = body.pieces_completed
      if (body.gross_pay !== undefined) updateData.gross_pay = body.gross_pay
      if (body.tax_deduction !== undefined) updateData.tax_deduction = body.tax_deduction
      if (body.benefit_deductions !== undefined) updateData.benefit_deductions = body.benefit_deductions
      if (body.employer_contributions !== undefined) updateData.employer_contributions = body.employer_contributions
      if (body.status !== undefined) updateData.status = body.status
      if (body.notes !== undefined) updateData.notes = body.notes

      // Recalculate totals
      const grossPay = updateData.gross_pay !== undefined ? updateData.gross_pay : existing.gross_pay
      const taxDeduction = updateData.tax_deduction !== undefined ? updateData.tax_deduction : existing.tax_deduction
      const benefitDeductions = updateData.benefit_deductions !== undefined ? updateData.benefit_deductions : existing.benefit_deductions
      
      updateData.total_deductions = taxDeduction + benefitDeductions
      updateData.net_pay = grossPay - updateData.total_deductions

      const { data: updatedPayItem, error: updateError } = await supabaseAdmin
        .from('pay_items')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating pay item:', updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to update pay item: ' + updateError.message 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update pay run totals
      try {
        await updatePayRunTotals(supabaseAdmin, existing.pay_run_id)
      } catch (totalsError) {
        console.error('Error updating pay run totals:', totalsError)
        // Don't fail the request, but log the error
      }

      console.log(`Pay item updated: ${body.id} by ${user.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pay item updated successfully',
          pay_item: updatedPayItem
        } as PayItemResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      const body: DeletePayItemRequest = await req.json()

      if (!body.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay item ID is required' 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get pay item to get pay_run_id for updating totals
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('pay_items')
        .select('pay_run_id, pay_runs!inner(status)')
        .eq('id', body.id)
        .single()

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Pay item not found' 
          } as PayItemResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if pay run is processed
      if (existing.pay_runs?.status === 'processed') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cannot delete pay items from processed pay runs' 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const payRunId = existing.pay_run_id

      const { error: deleteError } = await supabaseAdmin
        .from('pay_items')
        .delete()
        .eq('id', body.id)

      if (deleteError) {
        console.error('Error deleting pay item:', deleteError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to delete pay item: ' + deleteError.message 
          } as PayItemResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update pay run totals
      try {
        await updatePayRunTotals(supabaseAdmin, payRunId)
      } catch (totalsError) {
        console.error('Error updating pay run totals:', totalsError)
        // Don't fail the request, but log the error
      }

      console.log(`Pay item deleted: ${body.id} by ${user.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pay item deleted successfully' 
        } as PayItemResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      } as PayItemResponse),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in manage-payitems function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') 
      } as PayItemResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


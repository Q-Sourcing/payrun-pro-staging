import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAuditEvent, extractIpAddress, extractUserAgent } from '../_shared/audit-logger.ts'
import { validateRequest, CreatePayItemRequestSchema, UpdatePayItemRequestSchema, DeletePayItemRequestSchema } from '../_shared/validation-schemas.ts'
import { corsHeaders } from '../_shared/cors.ts'


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

    // Check user permissions (OBAC system)
    const rbacPermissions = user.app_metadata?.rbac_permissions || []
    const isPlatformAdmin = user.app_metadata?.is_platform_admin || false
    const canManagePayItems = isPlatformAdmin || rbacPermissions.includes('payroll.prepare')

    // Extract IP and user agent for audit logging
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)

    if (!canManagePayItems) {
      // Log denied access attempt
      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payitem.operation',
        resource: 'pay_items',
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
        } as PayItemResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle CREATE request
    if (req.method === 'POST') {
      let body: CreatePayItemRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(CreatePayItemRequestSchema, rawBody)
      } catch (validationError) {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.create',
          resource: 'pay_items',
          details: { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: validationError instanceof Error ? validationError.message : 'Invalid request data',
            code: 'VALIDATION_ERROR'
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
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.create',
          resource: 'pay_items',
          details: { pay_run_id: body.pay_run_id, error: 'Pay run not found' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Pay run not found',
            code: 'NOT_FOUND'
          } as PayItemResponse),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (payRun.status === 'processed') {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.create',
          resource: 'pay_items',
          details: { pay_run_id: body.pay_run_id, status: payRun.status, reason: 'processed_payrun_protection' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'denied',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Cannot add pay items to processed pay runs',
            code: 'PROCESSED_PAYRUN_PROTECTION'
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

        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.create',
          resource: 'pay_items',
          details: {
            pay_run_id: body.pay_run_id,
            employee_id: body.employee_id,
            error: error.message,
            error_code: error.code
          },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        if (error.code === '23505') {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'A pay item for this employee already exists in this pay run',
              code: 'DUPLICATE_PAY_ITEM'
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
            message: 'Failed to create pay item: ' + error.message,
            code: 'CREATE_ERROR'
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

      // Log successful creation
      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payitem.create',
        resource: 'pay_items',
        details: {
          pay_item_id: payItem.id,
          pay_run_id: body.pay_run_id,
          employee_id: body.employee_id,
          gross_pay: payItem.gross_pay,
          net_pay: payItem.net_pay
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

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
      let body: UpdatePayItemRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(UpdatePayItemRequestSchema, rawBody)
      } catch (validationError) {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.update',
          resource: 'pay_items',
          details: { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: validationError instanceof Error ? validationError.message : 'Invalid request data',
            code: 'VALIDATION_ERROR'
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
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.update',
          resource: 'pay_items',
          details: { pay_item_id: body.id, error: 'Pay item not found' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Pay item not found',
            code: 'NOT_FOUND'
          } as PayItemResponse),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check if pay run is processed
      if (existing.pay_runs?.status === 'processed') {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.update',
          resource: 'pay_items',
          details: { pay_item_id: body.id, pay_run_id: existing.pay_run_id, status: existing.pay_runs.status, reason: 'processed_payrun_protection' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'denied',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Cannot update pay items in processed pay runs',
            code: 'PROCESSED_PAYRUN_PROTECTION'
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

        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.update',
          resource: 'pay_items',
          details: { pay_item_id: body.id, error: updateError.message },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to update pay item: ' + updateError.message,
            code: 'UPDATE_ERROR'
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

      // Log successful update
      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payitem.update',
        resource: 'pay_items',
        details: {
          pay_item_id: body.id,
          pay_run_id: existing.pay_run_id,
          employee_id: existing.employee_id,
          changes: Object.keys(updateData).filter(k => k !== 'updated_at')
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

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
      let body: DeletePayItemRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(DeletePayItemRequestSchema, rawBody)
      } catch (validationError) {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.delete',
          resource: 'pay_items',
          details: { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: validationError instanceof Error ? validationError.message : 'Invalid request data',
            code: 'VALIDATION_ERROR'
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
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.delete',
          resource: 'pay_items',
          details: { pay_item_id: body.id, error: 'Pay item not found' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Pay item not found',
            code: 'NOT_FOUND'
          } as PayItemResponse),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check if pay run is processed
      if (existing.pay_runs?.status === 'processed') {
        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.delete',
          resource: 'pay_items',
          details: { pay_item_id: body.id, pay_run_id: existing.pay_run_id, status: existing.pay_runs.status, reason: 'processed_payrun_protection' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'denied',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Cannot delete pay items from processed pay runs',
            code: 'PROCESSED_PAYRUN_PROTECTION'
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

        await logAuditEvent(supabaseAdmin, {
          user_id: user.id,
          action: 'payitem.delete',
          resource: 'pay_items',
          details: { pay_item_id: body.id, error: deleteError.message },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to delete pay item: ' + deleteError.message,
            code: 'DELETE_ERROR'
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

      // Log successful deletion
      await logAuditEvent(supabaseAdmin, {
        user_id: user.id,
        action: 'payitem.delete',
        resource: 'pay_items',
        details: { pay_item_id: body.id, pay_run_id: payRunId },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

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
            Deno.env.get('SUPABASE_URL') ?? '',
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
              action: 'payitem.operation',
              resource: 'pay_items',
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
      } as PayItemResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


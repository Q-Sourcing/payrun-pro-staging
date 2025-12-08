import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAuditEvent, extractIpAddress, extractUserAgent } from '../_shared/audit-logger.ts'
import { validateRequest, UpdateUserRequestSchema, DeleteUserRequestSchema } from '../_shared/validation-schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'employee' | 'hr_manager' | 'finance' | 'admin' | 'super_admin';
  is_active?: boolean;
  permissions?: any[];
  restrictions?: string[];
  two_factor_enabled?: boolean;
  session_timeout?: number;
}

interface UpdateUserResponse {
  success: boolean;
  message: string;
  user?: any;
  error?: string;
}

interface DeleteUserRequest {
  id: string;
  hard_delete?: boolean;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
  error?: string;
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
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user info
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !currentUser) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid authentication token' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin or super_admin role
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || !userRoles) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to verify user permissions' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userRole = userRoles.role
    const isAdmin = userRole === 'admin' || userRole === 'super_admin'

    // Extract IP and user agent for audit logging
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)

    if (!isAdmin) {
      // Log denied access attempt
      await logAuditEvent(supabaseAdmin, {
        user_id: currentUser.id,
        action: 'user.update',
        resource: 'users',
        details: { attempted_action: 'update', reason: 'insufficient_permissions' },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'denied',
      })

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient permissions. Admin role required.',
          code: 'PERMISSION_DENIED'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // Handle UPDATE request
    if (req.method === 'PUT' || req.method === 'PATCH') {
      let body: UpdateUserRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(UpdateUserRequestSchema, rawBody)
      } catch (validationError) {
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.update',
          resource: 'users',
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
          } as UpdateUserResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if user exists
      const { data: existingProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', body.id)
        .single()

      if (fetchError || !existingProfile) {
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.update',
          resource: 'users',
          details: { target_user_id: body.id, error: 'User not found' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User not found',
            code: 'NOT_FOUND'
          } as UpdateUserResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prepare profile update data
      const profileUpdate: any = {
        updated_at: new Date().toISOString(),
      }

      if (body.first_name !== undefined) profileUpdate.first_name = body.first_name
      if (body.last_name !== undefined) profileUpdate.last_name = body.last_name
      if (body.email !== undefined) profileUpdate.email = body.email

      // Update profile
      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', body.id)
        .select()
        .single()

      if (profileError) {
        console.error('Error updating profile:', profileError)
        
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.update',
          resource: 'users',
          details: { target_user_id: body.id, error: profileError.message },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'failure',
        })

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to update user profile: ' + profileError.message,
            code: 'UPDATE_ERROR'
          } as UpdateUserResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update role if changed
      if (body.role !== undefined) {
        // Only super_admin can change roles
        if (userRole !== 'super_admin') {
          await logAuditEvent(supabaseAdmin, {
            user_id: currentUser.id,
            action: 'user.update',
            resource: 'users',
            details: { target_user_id: body.id, attempted_action: 'change_role', reason: 'insufficient_permissions' },
            ip_address: ipAddress,
            user_agent: userAgent,
            result: 'denied',
          })

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Only super admin can change user roles',
              code: 'PERMISSION_DENIED'
            } as UpdateUserResponse),
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { error: roleUpdateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: body.role })
          .eq('user_id', body.id)

        if (roleUpdateError) {
          console.error('Error updating role:', roleUpdateError)
          
          await logAuditEvent(supabaseAdmin, {
            user_id: currentUser.id,
            action: 'user.update',
            resource: 'users',
            details: { target_user_id: body.id, attempted_action: 'change_role', error: roleUpdateError.message },
            ip_address: ipAddress,
            user_agent: userAgent,
            result: 'failure',
          })

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to update user role: ' + roleUpdateError.message,
              code: 'UPDATE_ERROR'
            } as UpdateUserResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // Update auth user if email changed
      if (body.email !== undefined && body.email !== existingProfile.email) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          body.id,
          { email: body.email }
        )

        if (authUpdateError) {
          console.error('Error updating auth user:', authUpdateError)
          
          await logAuditEvent(supabaseAdmin, {
            user_id: currentUser.id,
            action: 'user.update',
            resource: 'users',
            details: { target_user_id: body.id, attempted_action: 'change_email', error: authUpdateError.message },
            ip_address: ipAddress,
            user_agent: userAgent,
            result: 'failure',
          })

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to update user email: ' + authUpdateError.message,
              code: 'UPDATE_ERROR'
            } as UpdateUserResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // Get updated user role
      const { data: updatedRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', body.id)
        .single()

      const updatedUser = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        firstName: updatedProfile.first_name || '',
        lastName: updatedProfile.last_name || '',
        role: updatedRole?.role || 'employee',
        isActive: body.is_active !== undefined ? body.is_active : true,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
        permissions: body.permissions || [],
        restrictions: body.restrictions || [],
        twoFactorEnabled: body.two_factor_enabled || false,
        sessionTimeout: body.session_timeout || 480,
      }

      // Log successful update
      await logAuditEvent(supabaseAdmin, {
        user_id: currentUser.id,
        action: 'user.update',
        resource: 'users',
        details: { 
          target_user_id: body.id,
          changes: {
            email: body.email !== undefined ? { old: existingProfile.email, new: body.email } : undefined,
            first_name: body.first_name !== undefined ? { old: existingProfile.first_name, new: body.first_name } : undefined,
            last_name: body.last_name !== undefined ? { old: existingProfile.last_name, new: body.last_name } : undefined,
            role: body.role !== undefined ? { old: existingProfile.role, new: body.role } : undefined,
          }
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        result: 'success',
      })

      console.log(`User updated successfully: ${body.id} by ${currentUser.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User updated successfully',
          user: updatedUser
        } as UpdateUserResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      let body: DeleteUserRequest
      try {
        const rawBody = await req.json()
        body = validateRequest(DeleteUserRequestSchema, rawBody)
      } catch (validationError) {
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.delete',
          resource: 'users',
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
          } as DeleteUserResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prevent self-deletion
      if (body.id === currentUser.id) {
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.delete',
          resource: 'users',
          details: { target_user_id: body.id, reason: 'self_deletion_prevented' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'denied',
        })

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cannot delete your own account',
            code: 'SELF_DELETION_DENIED'
          } as DeleteUserResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Only super_admin can hard delete
      if (body.hard_delete && userRole !== 'super_admin') {
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.delete',
          resource: 'users',
          details: { target_user_id: body.id, attempted_action: 'hard_delete', reason: 'insufficient_permissions' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'denied',
        })

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Only super admin can perform hard delete',
            code: 'PERMISSION_DENIED'
          } as DeleteUserResponse),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (body.hard_delete) {
        // Hard delete - remove from database
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(body.id)
        
        if (deleteError) {
          console.error('Error deleting user:', deleteError)
          
          await logAuditEvent(supabaseAdmin, {
            user_id: currentUser.id,
            action: 'user.delete',
            resource: 'users',
            details: { target_user_id: body.id, delete_type: 'hard', error: deleteError.message },
            ip_address: ipAddress,
            user_agent: userAgent,
            result: 'failure',
          })

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to delete user: ' + deleteError.message,
              code: 'DELETE_ERROR'
            } as DeleteUserResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Log successful hard delete
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.delete',
          resource: 'users',
          details: { target_user_id: body.id, delete_type: 'hard' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'success',
        })

        console.log(`User hard deleted: ${body.id} by ${currentUser.email}`)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User deleted successfully' 
          } as DeleteUserResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Soft delete - ban user
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(body.id, {
          ban_duration: '876000h', // Effectively permanent ban
        })

        if (banError) {
          console.error('Error banning user:', banError)
          
          await logAuditEvent(supabaseAdmin, {
            user_id: currentUser.id,
            action: 'user.delete',
            resource: 'users',
            details: { target_user_id: body.id, delete_type: 'soft', error: banError.message },
            ip_address: ipAddress,
            user_agent: userAgent,
            result: 'failure',
          })

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to deactivate user: ' + banError.message,
              code: 'DELETE_ERROR'
            } as DeleteUserResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Log successful soft delete
        await logAuditEvent(supabaseAdmin, {
          user_id: currentUser.id,
          action: 'user.delete',
          resource: 'users',
          details: { target_user_id: body.id, delete_type: 'soft' },
          ip_address: ipAddress,
          user_agent: userAgent,
          result: 'success',
        })

        console.log(`User soft deleted (banned): ${body.id} by ${currentUser.email}`)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User deactivated successfully' 
          } as DeleteUserResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in manage-users function:', error)
    
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
              action: 'user.operation',
              resource: 'users',
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
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient permissions. Admin role required.' 
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
      const body: UpdateUserRequest = await req.json()

      if (!body.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User ID is required' 
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
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User not found' 
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
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to update user profile: ' + profileError.message 
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
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Only super admin can change user roles' 
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
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to update user role: ' + roleUpdateError.message 
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
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to update user email: ' + authUpdateError.message 
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
      const body: DeleteUserRequest = await req.json()

      if (!body.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User ID is required' 
          } as DeleteUserResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prevent self-deletion
      if (body.id === currentUser.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cannot delete your own account' 
          } as DeleteUserResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Only super_admin can hard delete
      if (body.hard_delete && userRole !== 'super_admin') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Only super admin can perform hard delete' 
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
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to delete user: ' + deleteError.message 
            } as DeleteUserResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

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
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Failed to deactivate user: ' + banError.message 
            } as DeleteUserResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

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
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


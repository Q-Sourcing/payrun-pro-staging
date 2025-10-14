import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'employee' | 'hr_manager' | 'finance' | 'admin';
  country: string;
}

interface CreateUserResponse {
  success: boolean;
  message: string;
  user_id?: string;
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
        } as CreateUserResponse),
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
        } as CreateUserResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has super_admin role
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Error fetching user roles:', roleError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to verify user permissions' 
        } as CreateUserResponse),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const roles = userRoles?.map(r => r.role) || []
    if (!roles.includes('super_admin')) {
      console.error(`User ${user.email} attempted to create user without super_admin role`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient permissions. Super admin role required.' 
        } as CreateUserResponse),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { email, password, full_name, role, country }: CreateUserRequest = await req.json()

    // Validate required fields
    if (!email || !password || !full_name || !role || !country) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'All fields are required: email, password, full_name, role, country' 
        } as CreateUserResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    const validRoles = ['employee', 'hr_manager', 'finance', 'admin']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        } as CreateUserResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        country
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to create user: ' + (createError?.message || 'Unknown error') 
        } as CreateUserResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        first_name: full_name.split(' ')[0] || '',
        last_name: full_name.split(' ').slice(1).join(' ') || '',
        created_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Clean up the created user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to create user profile' 
        } as CreateUserResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Assign role to the user
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        assigned_by: user.id,
        assigned_at: new Date().toISOString()
      })

    if (roleAssignError) {
      console.error('Error assigning role:', roleAssignError)
      // Clean up the created user and profile if role assignment fails
      await supabaseAdmin.from('profiles').delete().eq('id', newUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to assign role to user' 
        } as CreateUserResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log successful user creation (without sensitive data)
    console.log(`User created successfully: ${email} with role ${role} by ${user.email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        user_id: newUser.user.id
      } as CreateUserResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in create-user function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      } as CreateUserResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

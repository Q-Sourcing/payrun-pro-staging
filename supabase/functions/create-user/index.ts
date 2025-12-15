import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password?: string; // Optional now, we prefer invite
  full_name: string;
  role: 'employee' | 'hr_manager' | 'finance' | 'admin';
  country?: string; // Optional
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

    // Check permissions using user_profiles (standard for this app)
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Fallback for Super Admin whitelist
    const SUPER_ADMIN_EMAILS = ['nalungukevin@gmail.com'];
    const isWhitelisted = SUPER_ADMIN_EMAILS.includes(user.email || '');

    const callerRole = callerProfile?.role || '';

    const { data: platformAdmin, error: platformAdminError } = await supabaseAdmin
      .from('platform_admins')
      .select('id, allowed')
      .eq('email', user.email)
      .maybeSingle()

    if (platformAdminError) {
      console.error('Platform admin lookup failed:', platformAdminError)
    }

    const isPlatformAdmin = !!platformAdmin?.allowed

    // Allowed roles for creating users
    const ALLOWED_ROLES = ['super_admin', 'org_admin', 'organization_admin', 'org_owner'];

    // Allow if has allowed role OR whitelisted email OR platform admin
    if (!ALLOWED_ROLES.includes(callerRole) && !isWhitelisted && !isPlatformAdmin) {
      console.error(`User ${user.email} (Role: ${callerRole}) attempted to create user without sufficient permissions`)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Insufficient permissions. Organization Admin or Super Admin role required.'
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
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Required fields: email, full_name, role'
        } as CreateUserResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate role (optional, align with your system roles)
    // We are more flexible now as role might be organization specific

    let newUser;

    if (password) {
      // Create with password
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          first_name: full_name.split(' ')[0] || '',
          last_name: full_name.split(' ').slice(1).join(' ') || '',
          country
        }
      })
      if (createError) throw createError;
      newUser = data.user;
    } else {
      // Invite user (better UX)
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name,
          first_name: full_name.split(' ')[0] || '',
          last_name: full_name.split(' ').slice(1).join(' ') || '',
          country
        }
      })
      if (inviteError) throw inviteError;
      newUser = data.user;
    }

    if (!newUser) {
      throw new Error('Failed to create or invite user')
    }

    // Create user profile in user_profiles table (Correct table)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: newUser.id,
        email: email,
        first_name: full_name.split(' ')[0] || '',
        last_name: full_name.split(' ').slice(1).join(' ') || '',
        role: role, // 'employee', 'organization_admin', etc.
        created_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Clean up if profile creation fails? 
      // Maybe not, as the auth user exists. We can return a warning.
      return new Response(
        JSON.stringify({
          success: true, // User created, but profile failed
          message: 'User created/invited, but profile creation failed: ' + profileError.message,
          user_id: newUser.id
        } as CreateUserResponse),
        {
          status: 200, // Still 200 as auth user is key
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Assign legacy role if needed
    // ...

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user_id: newUser.id
      } as CreateUserResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Unexpected error in create-user function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error'
      } as CreateUserResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

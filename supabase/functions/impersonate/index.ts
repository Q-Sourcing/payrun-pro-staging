import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImpersonateRequest {
  target_org_id: string
  target_role: 'org_admin' | 'user'
  target_user_id?: string
  ttl_seconds?: number
}

interface ImpersonateResponse {
  success: boolean
  token?: string
  expires_at?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the current user's token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions. Super admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { target_org_id, target_role, target_user_id, ttl_seconds = 900 }: ImpersonateRequest = await req.json()

    if (!target_org_id || !target_role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: target_org_id, target_role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate target organization exists
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, name, active')
      .eq('id', target_org_id)
      .single()

    if (orgError || !org || !org.active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Target organization not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If target_user_id is provided, validate it exists and belongs to the target org
    let targetUser = null
    if (target_user_id) {
      const { data: userProfile } = await supabaseClient
        .from('user_profiles')
        .select('id, organization_id, role')
        .eq('id', target_user_id)
        .single()

      if (!userProfile || userProfile.organization_id !== target_org_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Target user not found or does not belong to target organization' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      targetUser = userProfile
    }

    // Create impersonation JWT with custom claims
    const impersonationPayload = {
      sub: target_user_id || user.id, // Use target user ID if provided, otherwise current user
      aud: 'authenticated',
      role: 'authenticated',
      organization_id: target_org_id,
      organization_name: org.name,
      impersonated_role: target_role,
      impersonated_by: user.id,
      impersonated_at: new Date().toISOString(),
      exp: Math.floor(Date.now() / 1000) + ttl_seconds,
      iat: Math.floor(Date.now() / 1000),
      iss: 'supabase',
    }

    // Generate JWT token (simplified - in production, use proper JWT library)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify(impersonationPayload))
    const signature = btoa('impersonation_signature') // In production, use proper HMAC

    const impersonationToken = `${header}.${payload}.${signature}`

    // Log impersonation session
    const { error: logError } = await supabaseClient
      .from('impersonation_logs')
      .insert({
        super_admin_id: user.id,
        target_user_id: target_user_id || null,
        target_organization_id: target_org_id,
        target_role: target_role,
        impersonation_start: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

    if (logError) {
      console.error('Failed to log impersonation:', logError)
    }

    const response: ImpersonateResponse = {
      success: true,
      token: impersonationToken,
      expires_at: new Date(Date.now() + ttl_seconds * 1000).toISOString()
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Impersonation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

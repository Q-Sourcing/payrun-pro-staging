import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface GetAuthEventsRequest {
  org_id?: string;
  user_id?: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

interface GetAuthEventsResponse {
  success: boolean;
  data?: any[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

// Helper function to check if user is platform admin
async function isPlatformAdmin(supabaseAdmin: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('is_platform_admin', {
      _user_id: userId,
    })

    if (error) {
      return false
    }

    return data === true
  } catch (error) {
    return false
  }
}

// Helper function to check if user is org super admin
async function isOrgSuperAdmin(supabaseAdmin: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('is_org_super_admin', {
      _user_id: userId,
    })

    if (error) {
      return false
    }

    return data === true
  } catch (error) {
    return false
  }
}

// Helper function to get user's organization ID
async function getUserOrgId(supabaseAdmin: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data.organization_id || null
  } catch (error) {
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed'
      } as GetAuthEventsResponse),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
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
        } as GetAuthEventsResponse),
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
        } as GetAuthEventsResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check permissions
    const isPlatform = await isPlatformAdmin(supabaseAdmin, currentUser.id)
    const isOrgSuper = await isOrgSuperAdmin(supabaseAdmin, currentUser.id)

    if (!isPlatform && !isOrgSuper) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Insufficient permissions. Platform admin or org super admin role required.'
        } as GetAuthEventsResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse query parameters or request body
    let queryParams: GetAuthEventsRequest = {}

    if (req.method === 'GET') {
      const url = new URL(req.url)
      queryParams = {
        org_id: url.searchParams.get('org_id') || undefined,
        user_id: url.searchParams.get('user_id') || undefined,
        event_type: url.searchParams.get('event_type') || undefined,
        start_date: url.searchParams.get('start_date') || undefined,
        end_date: url.searchParams.get('end_date') || undefined,
        ip_address: url.searchParams.get('ip_address') || undefined,
        success: url.searchParams.get('success') === 'true' ? true : url.searchParams.get('success') === 'false' ? false : undefined,
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '50'),
      }
    } else {
      queryParams = await req.json()
    }

    const {
      org_id,
      user_id,
      event_type,
      start_date,
      end_date,
      ip_address,
      success,
      page = 1,
      limit = 50,
    } = queryParams

    // If org super admin, restrict to their organization
    let finalOrgId = org_id
    if (!isPlatform && isOrgSuper) {
      const userOrgId = await getUserOrgId(supabaseAdmin, currentUser.id)
      if (userOrgId) {
        finalOrgId = userOrgId // Override with their org
      } else {
        // User has no org - can't view any events
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            total: 0,
            page,
            limit
          } as GetAuthEventsResponse),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Build query
    const safeLimit = Math.min(limit, 1000)
    const from = (page - 1) * safeLimit
    const to = from + safeLimit - 1

    let query = supabaseAdmin
      .from('auth_events')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('timestamp_utc', { ascending: false })

    if (finalOrgId) {
      query = query.eq('org_id', finalOrgId)
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (event_type) {
      query = query.eq('event_type', event_type)
    }

    if (start_date) {
      query = query.gte('timestamp_utc', start_date)
    }

    if (end_date) {
      query = query.lte('timestamp_utc', end_date)
    }

    if (ip_address) {
      query = query.eq('ip_address', ip_address)
    }

    if (success !== undefined) {
      query = query.eq('success', success)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching auth events:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to fetch auth events: ' + error.message
        } as GetAuthEventsResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        total: count || 0,
        page,
        limit: safeLimit
      } as GetAuthEventsResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in get-auth-events function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      } as GetAuthEventsResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


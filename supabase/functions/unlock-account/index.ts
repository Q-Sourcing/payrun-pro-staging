import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UnlockAccountRequest {
  user_id: string;
  reason?: string;
}

interface UnlockAccountResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Helper function to check if user can unlock accounts
async function canUnlockAccounts(supabaseAdmin: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('can_unlock_accounts', {
      _user_id: userId,
    })

    if (error) {
      console.error('Error checking unlock permission:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error in canUnlockAccounts:', error)
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

// Helper function to get IP address from request
function getIpAddress(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return null
}

// Helper function to get geolocation from IP
async function getGeoLocation(ipAddress: string | null): Promise<any> {
  if (!ipAddress ||
    ipAddress === '127.0.0.1' ||
    ipAddress === '::1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.16.')) {
    return {
      country: 'Local',
      city: 'Local',
      country_code: 'LOCAL',
    }
  }

  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: {
        'User-Agent': 'Q-Payroll-Security/1.0',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data.error) {
      return null
    }

    return {
      country: data.country_name || undefined,
      city: data.city || undefined,
      region: data.region || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      timezone: data.timezone || undefined,
      country_code: data.country_code || undefined,
    }
  } catch (error) {
    console.error('Error fetching geolocation:', error)
    return null
  }
}

// Helper function to log auth event
async function logAuthEvent(
  supabaseAdmin: any,
  event: {
    org_id?: string;
    user_id?: string;
    event_type: string;
    success: boolean;
    reason?: string;
    metadata?: any;
  },
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  try {
    const geoLocation = await getGeoLocation(ipAddress)

    await supabaseAdmin
      .from('auth_events')
      .insert({
        org_id: event.org_id || null,
        user_id: event.user_id || null,
        event_type: event.event_type,
        timestamp_utc: new Date().toISOString(),
        ip_address: ipAddress,
        geo_location: geoLocation,
        user_agent: userAgent,
        success: event.success,
        reason: event.reason || null,
        metadata: event.metadata || {},
      })
  } catch (error) {
    console.error('Error logging auth event:', error)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed'
      } as UnlockAccountResponse),
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
        } as UnlockAccountResponse),
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
        } as UnlockAccountResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user can unlock accounts
    const canUnlock = await canUnlockAccounts(supabaseAdmin, currentUser.id)
    if (!canUnlock) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Insufficient permissions. Platform admin or org super admin role required.'
        } as UnlockAccountResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { user_id, reason }: UnlockAccountRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'user_id is required'
        } as UnlockAccountResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if account is actually locked
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('locked_at, organization_id, email, first_name, last_name')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User not found'
        } as UnlockAccountResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!profile.locked_at) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Account is not locked'
        } as UnlockAccountResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check permissions: platform_admin can unlock any, org_super_admin can only unlock their org
    const isPlatform = await isPlatformAdmin(supabaseAdmin, currentUser.id)
    const isOrgSuper = await isOrgSuperAdmin(supabaseAdmin, currentUser.id)

    if (!isPlatform) {
      // Org super admin - check if they can unlock this user
      if (isOrgSuper) {
        const currentUserOrgId = await getUserOrgId(supabaseAdmin, currentUser.id)
        const targetUserOrgId = profile.organization_id

        if (currentUserOrgId !== targetUserOrgId) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Insufficient permissions. You can only unlock accounts in your organization.'
            } as UnlockAccountResponse),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Insufficient permissions'
          } as UnlockAccountResponse),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Unlock the account
    const { error: unlockError } = await supabaseAdmin
      .from('profiles')
      .update({
        locked_at: null,
        locked_by: null,
        unlocked_at: new Date().toISOString(),
        unlocked_by: currentUser.id,
        failed_login_attempts: 0,
        lockout_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (unlockError) {
      console.error('Error unlocking account:', unlockError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to unlock account: ' + unlockError.message
        } as UnlockAccountResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get IP and user agent for logging
    const ipAddress = getIpAddress(req)
    const userAgent = req.headers.get('user-agent')

    // Log unlock event
    await logAuthEvent(
      supabaseAdmin,
      {
        user_id: user_id,
        org_id: profile.organization_id || undefined,
        event_type: 'account_unlocked',
        success: true,
        reason: reason || 'Account unlocked by administrator',
        metadata: {
          unlocked_by: currentUser.id,
          unlocked_by_email: currentUser.email,
        },
      },
      ipAddress,
      userAgent
    )

    // Create in-app notification for the unlocked user
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user_id,
        type: 'account_unlocked',
        title: 'Account Unlocked',
        message: `Your account has been unlocked by an administrator.`,
        metadata: {
          unlocked_by: currentUser.id,
          unlocked_by_email: currentUser.email,
        },
      })

    console.log(`Account unlocked: ${user_id} by ${currentUser.email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account unlocked successfully'
      } as UnlockAccountResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in unlock-account function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      } as UnlockAccountResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  session?: any;
  user?: any;
  error?: string;
}

// Helper function to get IP address from request
function getIpAddress(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
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
    };
  }

  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: {
        'User-Agent': 'Q-Payroll-Security/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.error) {
      return null;
    }

    return {
      country: data.country_name || undefined,
      city: data.city || undefined,
      region: data.region || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      timezone: data.timezone || undefined,
      country_code: data.country_code || undefined,
    };
  } catch (error) {
    console.error('Error fetching geolocation:', error);
    return null;
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
    const geoLocation = await getGeoLocation(ipAddress);

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
      });
  } catch (error) {
    console.error('Error logging auth event:', error);
    // Don't throw - logging failure shouldn't break login
  }
}

// Helper function to get user's organization ID
async function getUserOrgId(supabaseAdmin: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.organization_id || null;
  } catch (error) {
    return null;
  }
}

// Helper function to get lockout threshold
async function getLockoutThreshold(supabaseAdmin: any, orgId: string | null): Promise<number> {
  if (!orgId) {
    return 5; // Default
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('organization_security_settings')
      .select('lockout_threshold')
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return 5; // Default
    }

    return data.lockout_threshold || 5;
  } catch (error) {
    return 5; // Default
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
      } as LoginResponse),
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

    // Parse request body
    const { email, password }: LoginRequest = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email or password' // Generic error
        } as LoginResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get IP address and user agent
    const ipAddress = getIpAddress(req)
    const userAgent = req.headers.get('user-agent')

    // Find user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    const user = userData?.users?.find(u => u.email === email.toLowerCase())

    if (!user) {
      // Log failed login attempt (user not found)
      await logAuthEvent(
        supabaseAdmin,
        {
          user_id: null,
          event_type: 'login_failed',
          success: false,
          reason: 'User not found',
        },
        ipAddress,
        userAgent
      )

      // Return generic error (don't disclose if user exists)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email or password' // Generic error
        } as LoginResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if account is locked
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('locked_at, failed_login_attempts, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    }

    const isLocked = profile?.locked_at !== null

    if (isLocked) {
      // Log locked account login attempt
      await logAuthEvent(
        supabaseAdmin,
        {
          user_id: user.id,
          org_id: profile?.organization_id || null,
          event_type: 'login_failed',
          success: false,
          reason: 'Account is locked',
        },
        ipAddress,
        userAgent
      )

      // Return generic error (don't disclose account is locked)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email or password' // Generic error
        } as LoginResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Attempt authentication
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    })

    if (authError || !authData.user) {
      // Authentication failed - increment failed attempts
      const orgId = profile?.organization_id || null
      const threshold = await getLockoutThreshold(supabaseAdmin, orgId)

      // Increment failed attempts
      const { data: incrementResult, error: incrementError } = await supabaseAdmin.rpc(
        'increment_failed_login_attempts',
        { _user_id: user.id }
      )

      if (!incrementError) {
        const newCount = incrementResult || 0
        const shouldLock = newCount >= threshold

        // Log failed login
        await logAuthEvent(
          supabaseAdmin,
          {
            user_id: user.id,
            org_id: orgId || undefined,
            event_type: 'login_failed',
            success: false,
            reason: `Failed login attempt ${newCount} of ${threshold}`,
          },
          ipAddress,
          userAgent
        )

        // Lock account if threshold reached
        if (shouldLock) {
          await supabaseAdmin
            .from('profiles')
            .update({
              locked_at: new Date().toISOString(),
              locked_by: null,
              lockout_reason: 'Failed login attempts exceeded threshold',
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

          // Log lockout event
          await logAuthEvent(
            supabaseAdmin,
            {
              user_id: user.id,
              org_id: orgId || undefined,
              event_type: 'account_locked',
              success: true,
              reason: 'Failed login attempts exceeded threshold',
            },
            ipAddress,
            userAgent
          )

          // Get user profile for notifications
          const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', user.id)
            .single()

          const userName = userProfile 
            ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
            : user.email || 'Unknown'

          // Notify admins (async - don't wait)
          // Trigger notification in background
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-account-locked`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              locked_user_id: user.id,
              locked_user_email: user.email,
              locked_user_name: userName,
              org_id: orgId,
              reason: 'Failed login attempts exceeded threshold',
            }),
          }).catch(err => console.error('Failed to send lockout notification:', err))
        }
      }

      // Return generic error (don't disclose reason)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email or password' // Generic error
        } as LoginResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Login successful - reset failed attempts
    await supabaseAdmin.rpc('reset_failed_login_attempts', {
      _user_id: user.id,
    })

    // Get user's organization
    const orgId = await getUserOrgId(supabaseAdmin, user.id)

    // Log successful login
    await logAuthEvent(
      supabaseAdmin,
      {
        user_id: user.id,
        org_id: orgId || undefined,
        event_type: 'login_success',
        success: true,
      },
      ipAddress,
      userAgent
    )

    // Return session data
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Login successful',
        session: authData.session,
        user: authData.user
      } as LoginResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in secure-login function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An error occurred during login. Please try again.' // Generic error
      } as LoginResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


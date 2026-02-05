import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
      .from('user_profiles')
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

// @ts-ignore: Deno type definitions
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
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
    // @ts-ignore: Deno type definitions
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      // @ts-ignore: Deno type definitions
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
    let email: string;
    let password: string;

    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid request format'
        } as LoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password'
        } as LoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get IP address and user agent
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers.get('user-agent');

    console.log(`[secure-login] Attempting login for ${email} (IP: ${ipAddress})`);

    // Find user profile by email - Use case-insensitive matching
    // Defensive approach: Try full select first, fallback to basic if it fails (e.g. missing columns)
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, locked_at, failed_login_attempts, organization_id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (profileError) {
      console.warn(`[secure-login] Full profile lookup failed, likely missing columns. Falling back to basic lookup. Error: ${profileError.message}`);
      // Fallback to basic lookup without lockout fields
      const { data: basicProfile, error: basicError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, organization_id')
        .ilike('email', email.trim())
        .maybeSingle();

      if (basicError) {
        console.error(`[secure-login] Basic profile lookup also failed for ${email}:`, basicError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'A database error occurred. Please verify migrations are applied.'
          } as LoginResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      profile = basicProfile;
      profileError = null;
    }

    if (!profile) {
      console.warn(`[secure-login] User profile not found for email: ${email}`);
      // Log failed login attempt
      await logAuthEvent(
        supabaseAdmin,
        {
          user_id: undefined,
          event_type: 'login_failed',
          success: false,
          reason: 'User profile not found',
        },
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password'
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = { id: profile.id, email: profile.email };

    // Check for account lockout (only if column exists)
    const isLocked = profile.locked_at ? true : false;

    if (isLocked) {
      await logAuthEvent(
        supabaseAdmin,
        {
          user_id: user.id,
          org_id: profile.organization_id || undefined,
          event_type: 'login_failed',
          success: false,
          reason: 'Account is locked',
        },
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password'
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Attempt authentication with Supabase Auth
    // Use the exact email from the profile (which we matched case-insensitively)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (authError || !authData.user) {
      console.warn(`[secure-login] Auth failed for ${email}:`, authError?.message || 'No user data returned');

      // Handle lockout increments only if profile has the necessary fields
      const orgId = profile.organization_id || null;
      if ('failed_login_attempts' in profile) {
        try {
          const threshold = await getLockoutThreshold(supabaseAdmin, orgId);
          const { data: incrementResult, error: incrementError } = await supabaseAdmin.rpc(
            'increment_failed_login_attempts',
            { _user_id: user.id }
          );

          if (!incrementError) {
            const newCount = incrementResult || 0;
            const shouldLock = newCount >= threshold;

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
            );

            if (shouldLock) {
              await supabaseAdmin
                .from('user_profiles')
                .update({
                  locked_at: new Date().toISOString(),
                  locked_by: null,
                  lockout_reason: 'Failed login attempts exceeded threshold',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

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
              );

              // Get profile for metadata in notification
              const { data: userProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('email, first_name, last_name')
                .eq('id', user.id)
                .single();

              const userName = userProfile
                ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
                : user.email;

              // Notify admins
              // @ts-ignore: Deno type definitions
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
              }).catch(err => console.error('Failed to send lockout notification:', err));
            }
          }
        } catch (lockoutError) {
          console.error('[secure-login] Error in lockout increment logic:', lockoutError);
        }
      } else {
        // Log simple failed login if no lockout fields
        await logAuthEvent(
          supabaseAdmin,
          {
            user_id: user.id,
            org_id: orgId || undefined,
            event_type: 'login_failed',
            success: false,
            reason: authError?.message || 'Authentication failed',
          },
          ipAddress,
          userAgent
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password'
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Login successful - reset failed attempts
    await supabaseAdmin.rpc('reset_failed_login_attempts', {
      _user_id: user.id,
    });

    const orgId = profile.organization_id || null;

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
    );

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
    );

  } catch (error) {
    console.error('Unexpected error in secure-login function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An error occurred during login. Please try again.'
      } as LoginResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


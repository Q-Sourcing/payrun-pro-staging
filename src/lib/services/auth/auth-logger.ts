import { supabase } from '@/integrations/supabase/client';

export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'password_change'
  | 'account_locked'
  | 'account_unlocked'
  | 'account_created'
  | 'account_deleted'
  | 'session_expired'
  | 'session_refreshed'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'two_factor_verified'
  | 'two_factor_failed';

export interface GeoLocation {
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  country_code?: string;
}

export interface AuthEvent {
  id?: string;
  org_id?: string;
  user_id?: string;
  event_type: AuthEventType;
  timestamp_utc?: string;
  ip_address?: string;
  geo_location?: GeoLocation;
  user_agent?: string;
  success: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AuthEventQueryOptions {
  org_id?: string;
  user_id?: string;
  event_type?: AuthEventType;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

/**
 * AuthLogger Service
 * Handles authentication event logging with IP geolocation
 * ISO 27001 compliant audit logging
 */
export class AuthLogger {
  private static readonly DEFAULT_PAGE_SIZE = 50;
  private static readonly MAX_PAGE_SIZE = 1000;

  /**
   * Get IP geolocation data
   * Uses ipapi.co free tier (1000 requests/day)
   */
  private static async getGeoLocation(ipAddress: string): Promise<GeoLocation | null> {
    try {
      // Skip localhost/private IPs
      if (
        ipAddress === '127.0.0.1' ||
        ipAddress === '::1' ||
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.16.')
      ) {
        return {
          country: 'Local',
          city: 'Local',
          country_code: 'LOCAL',
        };
      }

      // Use ipapi.co for geolocation
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
        headers: {
          'User-Agent': 'Q-Payroll-Security/1.0',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch geolocation:', response.statusText);
        return null;
      }

      const data = await response.json();

      if (data.error) {
        console.warn('Geolocation API error:', data.reason);
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

  /**
   * Extract IP address from request headers
   */
  static extractIpAddress(headers: Headers | Record<string, string>): string | null {
    if (headers instanceof Headers) {
      // Check common proxy headers
      const forwardedFor = headers.get('x-forwarded-for');
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
      }

      const realIp = headers.get('x-real-ip');
      if (realIp) {
        return realIp;
      }

      const cfConnectingIp = headers.get('cf-connecting-ip');
      if (cfConnectingIp) {
        return cfConnectingIp;
      }
    } else {
      // Handle object-style headers
      const forwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
      if (forwardedFor) {
        return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim();
      }

      const realIp = headers['x-real-ip'] || headers['X-Real-Ip'];
      if (realIp) {
        return Array.isArray(realIp) ? realIp : realIp;
      }

      const cfConnectingIp = headers['cf-connecting-ip'] || headers['CF-Connecting-Ip'];
      if (cfConnectingIp) {
        return Array.isArray(cfConnectingIp) ? cfConnectingIp : cfConnectingIp;
      }
    }

    return null;
  }

  /**
   * Log an authentication event
   */
  static async log(event: AuthEvent, ipAddress?: string, userAgent?: string): Promise<string | null> {
    try {
      // Get IP address if not provided
      let finalIpAddress = ipAddress;
      if (!finalIpAddress && typeof window !== 'undefined') {
        // Client-side: we'll get IP from Edge Function
        finalIpAddress = null;
      }

      // Get geolocation if IP is available
      let geoLocation: GeoLocation | null = null;
      if (finalIpAddress) {
        geoLocation = await this.getGeoLocation(finalIpAddress);
      }

      // Prepare event data
      const eventData: any = {
        org_id: event.org_id || null,
        user_id: event.user_id || null,
        event_type: event.event_type,
        timestamp_utc: event.timestamp_utc || new Date().toISOString(),
        ip_address: finalIpAddress || null,
        geo_location: geoLocation || null,
        user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
        success: event.success,
        reason: event.reason || null,
        metadata: event.metadata || {},
      };

      // Insert into auth_events table
      // Note: This will be called from Edge Functions with service role
      const { data, error } = await supabase
        .from('auth_events')
        .insert(eventData)
        .select('id')
        .single();

      if (error) {
        console.error('Error logging auth event:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in AuthLogger.log:', error);
      return null;
    }
  }

  /**
   * Get auth events with filtering
   */
  static async getEvents(options: AuthEventQueryOptions = {}): Promise<{
    data: AuthEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      org_id,
      user_id,
      event_type,
      start_date,
      end_date,
      ip_address,
      success,
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      let query = supabase
        .from('auth_events')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('timestamp_utc', { ascending: false });

      if (org_id) {
        query = query.eq('org_id', org_id);
      }

      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      if (event_type) {
        query = query.eq('event_type', event_type);
      }

      if (start_date) {
        query = query.gte('timestamp_utc', start_date);
      }

      if (end_date) {
        query = query.lte('timestamp_utc', end_date);
      }

      if (ip_address) {
        query = query.eq('ip_address', ip_address);
      }

      if (success !== undefined) {
        query = query.eq('success', success);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching auth events:', error);
        throw error;
      }

      return {
        data: (data || []) as AuthEvent[],
        total: count || 0,
        page,
        limit: safeLimit,
      };
    } catch (error) {
      console.error('Error in AuthLogger.getEvents:', error);
      throw error;
    }
  }

  /**
   * Get auth events for a specific user
   */
  static async getEventsByUser(userId: string, options: Omit<AuthEventQueryOptions, 'user_id'> = {}): Promise<AuthEvent[]> {
    const result = await this.getEvents({
      ...options,
      user_id: userId,
      limit: 1000,
    });
    return result.data;
  }

  /**
   * Get auth events for a specific organization
   */
  static async getEventsByOrg(orgId: string, options: Omit<AuthEventQueryOptions, 'org_id'> = {}): Promise<AuthEvent[]> {
    const result = await this.getEvents({
      ...options,
      org_id: orgId,
      limit: 1000,
    });
    return result.data;
  }

  /**
   * Get recent failed login attempts for a user
   */
  static async getRecentFailedLogins(userId: string, hours: number = 24): Promise<AuthEvent[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const result = await this.getEvents({
      user_id: userId,
      event_type: 'login_failed',
      start_date: startDate.toISOString(),
      success: false,
      limit: 100,
    });

    return result.data;
  }
}


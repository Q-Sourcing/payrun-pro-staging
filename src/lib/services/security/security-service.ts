import { supabase } from '@/integrations/supabase/client';
import type { AuthEvent, AuthEventQueryOptions } from '@/lib/services/auth/auth-logger';

export interface LockedUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  locked_at: string;
  locked_by: string | null;
  lockout_reason: string | null;
  failed_login_attempts: number;
  organization_id: string | null;
}

export interface SecuritySettings {
  org_id: string;
  lockout_threshold: number;
  email_alerts_enabled: boolean;
}

export interface UnlockAccountRequest {
  user_id: string;
  reason?: string;
}

/**
 * SecurityService
 * Handles security-related API calls to Edge Functions
 */
export class SecurityService {
  private static getSupabaseUrl(): string {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }

  /**
   * Get locked users
   */
  static async getLockedUsers(orgId?: string): Promise<LockedUser[]> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Query profiles table directly with filters
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          locked_at,
          locked_by,
          lockout_reason,
          failed_login_attempts,
          organization_id
        `)
        .not('locked_at', 'is', null)
        .order('locked_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching locked users:', error);
        throw error;
      }

      return (data || []) as LockedUser[];
    } catch (error: any) {
      console.error('Error in getLockedUsers:', error);
      throw new Error(`Failed to fetch locked users: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Unlock a user account
   */
  static async unlockUser(request: UnlockAccountRequest): Promise<void> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const supabaseUrl = this.getSupabaseUrl();
      const response = await fetch(`${supabaseUrl}/functions/v1/unlock-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to unlock account');
      }
    } catch (error: any) {
      console.error('Error unlocking user:', error);
      throw new Error(`Failed to unlock user: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get auth events
   */
  static async getAuthEvents(options: AuthEventQueryOptions = {}): Promise<{
    data: AuthEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const supabaseUrl = this.getSupabaseUrl();
      const response = await fetch(`${supabaseUrl}/functions/v1/get-auth-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch auth events');
      }

      return {
        data: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 50,
      };
    } catch (error: any) {
      console.error('Error fetching auth events:', error);
      throw new Error(`Failed to fetch auth events: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get security settings for an organization
   */
  static async getSecuritySettings(orgId: string): Promise<SecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from('organization_security_settings')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found - return default
          return {
            org_id: orgId,
            lockout_threshold: 5,
            email_alerts_enabled: true,
          };
        }
        throw error;
      }

      return data as SecuritySettings;
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
      throw new Error(`Failed to fetch security settings: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update security settings for an organization
   */
  static async updateSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
    try {
      const { data, error } = await supabase
        .from('organization_security_settings')
        .upsert({
          org_id: settings.org_id,
          lockout_threshold: settings.lockout_threshold,
          email_alerts_enabled: settings.email_alerts_enabled,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as SecuritySettings;
    } catch (error: any) {
      console.error('Error updating security settings:', error);
      throw new Error(`Failed to update security settings: ${error?.message || 'Unknown error'}`);
    }
  }
}


import { supabase } from '@/integrations/supabase/client'

export interface ImpersonationRequest {
  target_org_id: string
  target_role: 'org_admin' | 'user'
  target_user_id?: string
  ttl_seconds?: number
}

export interface ImpersonationResponse {
  success: boolean
  token?: string
  expires_at?: string
  error?: string
}

export interface ImpersonationLog {
  id: string
  super_admin_id: string
  target_user_id?: string
  target_organization_id: string
  target_role: string
  impersonation_start: string
  impersonation_end?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  super_admin?: {
    first_name?: string
    last_name?: string
    email?: string
  }
  target_user?: {
    first_name?: string
    last_name?: string
    email?: string
  }
  target_organization?: {
    name: string
  }
}

export class ImpersonationService {
  static async impersonate(request: ImpersonationRequest): Promise<ImpersonationResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No active session found')
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Impersonation failed')
      }

      return result
    } catch (error) {
      console.error('Impersonation error:', error)
      throw error
    }
  }

  static async endImpersonation(sessionToken: string): Promise<void> {
    // In a real implementation, you would call an endpoint to invalidate the impersonation token
    // For now, we'll just clear the local session
    await supabase.auth.signOut()
  }

  static async getImpersonationLogs(): Promise<ImpersonationLog[]> {
    const { data, error } = await supabase
      .from('impersonation_logs')
      .select(`
        id,
        super_admin_id,
        target_user_id,
        target_organization_id,
        target_role,
        impersonation_start,
        impersonation_end,
        ip_address,
        user_agent,
        created_at,
        super_admin:super_admin_id(user_profiles!inner(first_name, last_name, email)),
        target_user:target_user_id(user_profiles!inner(first_name, last_name, email)),
        target_organization:target_organization_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching impersonation logs:', error)
      throw new Error('Failed to fetch impersonation logs')
    }

    return data || []
  }

  static async getActiveImpersonationSessions(): Promise<ImpersonationLog[]> {
    const { data, error } = await supabase
      .from('impersonation_logs')
      .select(`
        id,
        super_admin_id,
        target_user_id,
        target_organization_id,
        target_role,
        impersonation_start,
        impersonation_end,
        ip_address,
        user_agent,
        created_at,
        super_admin:super_admin_id(user_profiles!inner(first_name, last_name, email)),
        target_user:target_user_id(user_profiles!inner(first_name, last_name, email)),
        target_organization:target_organization_id(name)
      `)
      .is('impersonation_end', null)
      .order('impersonation_start', { ascending: false })

    if (error) {
      console.error('Error fetching active impersonation sessions:', error)
      throw new Error('Failed to fetch active impersonation sessions')
    }

    return data || []
  }

  static async endImpersonationSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('impersonation_logs')
      .update({ impersonation_end: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      console.error('Error ending impersonation session:', error)
      throw new Error('Failed to end impersonation session')
    }
  }

  // Helper method to check if current session is impersonated
  static isImpersonated(): boolean {
    try {
      const { data } = supabase.auth.getSession()
      if (!data?.session?.access_token) return false

      // Decode JWT to check for impersonation claims
      const payload = JSON.parse(atob(data.session.access_token.split('.')[1]))
      return !!(payload.impersonated_by && payload.impersonated_role)
    } catch {
      return false
    }
  }

  // Helper method to get impersonation context
  static getImpersonationContext(): {
    isImpersonated: boolean
    impersonatedBy?: string
    impersonatedRole?: string
    organizationId?: string
  } {
    try {
      const { data } = supabase.auth.getSession()
      if (!data?.session?.access_token) {
        return { isImpersonated: false }
      }

      const payload = JSON.parse(atob(data.session.access_token.split('.')[1]))
      return {
        isImpersonated: !!(payload.impersonated_by && payload.impersonated_role),
        impersonatedBy: payload.impersonated_by,
        impersonatedRole: payload.impersonated_role,
        organizationId: payload.organization_id
      }
    } catch {
      return { isImpersonated: false }
    }
  }
}

import { supabase } from '@/integrations/supabase/client'

export interface JWTClaims {
  sub: string
  email: string
  role: 'super_admin' | 'org_admin' | 'user'
  organization_id?: string
  impersonated_by?: string
  impersonated_role?: string
  impersonated_at?: string
  exp: number
  iat: number
  iss: string
}

export interface UserContext {
  userId: string
  email: string
  role: 'super_admin' | 'org_admin' | 'user'
  organizationId?: string
  isImpersonated: boolean
  impersonatedBy?: string
  impersonatedRole?: string
  impersonatedAt?: string
}

export class JWTClaimsService {
  /**
   * Get current user's JWT claims
   */
  static getCurrentClaims(): JWTClaims | null {
    try {
      const { data } = supabase.auth.getSession()
      if (!data?.session?.access_token) return null

      const payload = JSON.parse(atob(data.session.access_token.split('.')[1]))
      return payload as JWTClaims
    } catch (error) {
      console.warn('Failed to parse JWT claims:', error)
      return null
    }
  }

  /**
   * Get current user context with role and organization info
   */
  static getCurrentUserContext(): UserContext | null {
    const claims = this.getCurrentClaims()
    if (!claims) return null

    return {
      userId: claims.sub,
      email: claims.email,
      role: claims.role,
      organizationId: claims.organization_id,
      isImpersonated: !!(claims.impersonated_by && claims.impersonated_role),
      impersonatedBy: claims.impersonated_by,
      impersonatedRole: claims.impersonated_role,
      impersonatedAt: claims.impersonated_at
    }
  }

  /**
   * Check if current user has a specific role
   */
  static hasRole(role: 'super_admin' | 'org_admin' | 'user'): boolean {
    const context = this.getCurrentUserContext()
    return context?.role === role
  }

  /**
   * Check if current user is super admin
   */
  static isSuperAdmin(): boolean {
    return this.hasRole('super_admin')
  }

  /**
   * Check if current user is org admin
   */
  static isOrgAdmin(): boolean {
    return this.hasRole('org_admin') || this.hasRole('super_admin')
  }

  /**
   * Get current user's organization ID
   */
  static getCurrentOrganizationId(): string | null {
    const context = this.getCurrentUserContext()
    return context?.organizationId || null
  }

  /**
   * Check if current user can access organization data
   */
  static canAccessOrganization(organizationId: string): boolean {
    const context = this.getCurrentUserContext()
    if (!context) return false

    // Super admin can access all organizations
    if (context.role === 'super_admin') return true

    // Others can only access their own organization
    return context.organizationId === organizationId
  }

  /**
   * Check if current user can manage users
   */
  static canManageUsers(): boolean {
    const context = this.getCurrentUserContext()
    if (!context) return false

    return context.role === 'super_admin' || context.role === 'org_admin'
  }

  /**
   * Check if current user can access admin dashboard
   */
  static canAccessAdminDashboard(): boolean {
    return this.isSuperAdmin()
  }

  /**
   * Check if current user can impersonate
   */
  static canImpersonate(): boolean {
    return this.isSuperAdmin()
  }

  /**
   * Get impersonation context
   */
  static getImpersonationContext(): {
    isImpersonated: boolean
    impersonatedBy?: string
    impersonatedRole?: string
    organizationId?: string
  } {
    const context = this.getCurrentUserContext()
    if (!context) {
      return { isImpersonated: false }
    }

    return {
      isImpersonated: context.isImpersonated,
      impersonatedBy: context.impersonatedBy,
      impersonatedRole: context.impersonatedRole,
      organizationId: context.organizationId
    }
  }

  /**
   * Check if JWT token is expired
   */
  static isTokenExpired(): boolean {
    const claims = this.getCurrentClaims()
    if (!claims) return true

    const now = Math.floor(Date.now() / 1000)
    return claims.exp < now
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(): Date | null {
    const claims = this.getCurrentClaims()
    if (!claims) return null

    return new Date(claims.exp * 1000)
  }

  /**
   * Get time until token expires (in seconds)
   */
  static getTimeUntilExpiration(): number | null {
    const claims = this.getCurrentClaims()
    if (!claims) return null

    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, claims.exp - now)
  }

  /**
   * Refresh session if needed
   */
  static async refreshSessionIfNeeded(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.warn('Failed to refresh session:', error)
        return false
      }
      return !!data.session
    } catch (error) {
      console.warn('Error refreshing session:', error)
      return false
    }
  }

  /**
   * Validate user permissions for a specific action
   */
  static validatePermission(action: string, resource?: string): boolean {
    const context = this.getCurrentUserContext()
    if (!context) return false

    switch (action) {
      case 'admin.dashboard':
        return this.canAccessAdminDashboard()
      
      case 'admin.impersonate':
        return this.canImpersonate()
      
      case 'users.manage':
        return this.canManageUsers()
      
      case 'organizations.view':
        return context.role === 'super_admin'
      
      case 'organizations.manage':
        return context.role === 'super_admin'
      
      case 'payroll.view':
        return true // All authenticated users can view payroll
      
      case 'payroll.manage':
        return this.isOrgAdmin()
      
      case 'employees.view':
        return true // All authenticated users can view employees
      
      case 'employees.manage':
        return this.isOrgAdmin()
      
      default:
        return false
    }
  }
}

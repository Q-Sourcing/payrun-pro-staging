import { supabase } from '@/integrations/supabase/client'
import { Session } from '@supabase/supabase-js'

export type ScopeType = 'GLOBAL' | 'ORGANIZATION' | 'COMPANY' | 'PROJECT' | 'SELF'

export type RBACRoleEntry = {
  role: string
  scope_type: ScopeType
  scope_id: string | null
  org_id: string | null
}

export interface JWTClaims {
  sub: string
  email: string
  app_metadata?: {
    rbac_roles?: RBACRoleEntry[]
    rbac_permissions?: string[]
    is_platform_admin?: boolean
    organization_id?: string
    [key: string]: any
  }
  user_metadata?: {
    [key: string]: any
  }
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
  roles: RBACRoleEntry[]
  permissions: string[]
  isPlatformAdmin: boolean
  organizationId?: string
  isImpersonated: boolean
  impersonatedBy?: string
  impersonatedRole?: string
  impersonatedAt?: string
}

export class JWTClaimsService {
  private static currentSession: Session | null = null
  private static cachedClaims: JWTClaims | null = null
  private static cachedContext: UserContext | null = null

  /**
   * Cache the active session for synchronous helpers
   */
  static setCurrentSession(session: Session | null): void {
    this.currentSession = session
    this.cachedClaims = this.getClaimsFromSession(session)
    this.cachedContext = this.getUserContextFromSession(session)
  }

  /**
   * Get current user's JWT claims
   */
  /**
   * Get claims from a session object
   */
  static getClaimsFromSession(session: Session | null): JWTClaims | null {
    if (!session?.access_token) return null
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      return payload as JWTClaims
    } catch (error) {
      console.warn('Failed to parse JWT claims:', error)
      return null
    }
  }

  /**
   * Get user context from a session object
   */
  static getUserContextFromSession(session: Session | null): UserContext | null {
    const claims = this.getClaimsFromSession(session)
    if (!claims) return null

    // Extract from app_metadata or top level (fallback)
    const roles = claims.app_metadata?.rbac_roles || (claims as any).rbac_roles || []
    const permissions = claims.app_metadata?.rbac_permissions || (claims as any).rbac_permissions || []
    const isPlatformAdmin = !!(claims.app_metadata?.is_platform_admin || (claims as any).is_platform_admin)
    const organizationId = claims.app_metadata?.organization_id || claims.organization_id

    return {
      userId: claims.sub,
      email: claims.email,
      roles: roles.map((r: any) => ({
        role: r.role,
        scope_type: r.scope_type,
        scope_id: r.scope_id,
        org_id: r.org_id
      })),
      permissions,
      isPlatformAdmin,
      organizationId,
      isImpersonated: !!(claims.impersonated_by && claims.impersonated_role),
      impersonatedBy: claims.impersonated_by,
      impersonatedRole: claims.impersonated_role,
      impersonatedAt: claims.impersonated_at
    }
  }

  static getCurrentClaims(): JWTClaims | null {
    if (!this.cachedClaims && this.currentSession) {
      this.cachedClaims = this.getClaimsFromSession(this.currentSession)
    }
    return this.cachedClaims
  }

  static getCurrentUserContext(): UserContext | null {
    if (!this.cachedContext && this.currentSession) {
      this.cachedContext = this.getUserContextFromSession(this.currentSession)
    }
    return this.cachedContext
  }

  /**
   * Check if current user has a specific role (in any scope)
   */
  static hasRole(roleCode: string): boolean {
    const context = this.getCurrentUserContext()
    return !!context?.roles.some(r => r.role === roleCode)
  }

  /**
   * Check if current user is super admin
   */
  static isSuperAdmin(): boolean {
    const context = this.getCurrentUserContext()
    return !!context?.isPlatformAdmin || this.hasRole('PLATFORM_SUPER_ADMIN')
  }

  /**
   * Check if current user is org admin
   */
  static isOrgAdmin(): boolean {
    return this.isSuperAdmin() || this.hasRole('ORG_ADMIN')
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

    // Platform admin can access all organizations
    if (context.isPlatformAdmin) return true

    // Others can only access their own organization
    return context.organizationId === organizationId
  }

  /**
   * Check if current user can manage users
   */
  static canManageUsers(): boolean {
    const context = this.getCurrentUserContext()
    if (!context) return false

    return this.isOrgAdmin()
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
      this.setCurrentSession(data.session ?? null)
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

    // Platform Admins bypass everything
    if (context.isPlatformAdmin) return true

    const permissionKey = resource ? `${resource}.${action}` : action
    return context.permissions.includes(permissionKey)
  }
}

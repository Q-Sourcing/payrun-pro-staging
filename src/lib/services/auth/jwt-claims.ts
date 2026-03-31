/**
 * JWTClaimsService — SHIM
 * Delegates to the new pure functions in @/lib/auth/claims.
 * Will be deleted in Phase 4.
 */
import { supabase } from '@/integrations/supabase/client'
import { Session } from '@supabase/supabase-js'
import { parseClaims, getUserContext } from '@/lib/auth/claims'
import type { JWTClaims, UserContext, RBACRoleEntry, ScopeType } from '@/lib/auth/claims'

export type { JWTClaims, UserContext, RBACRoleEntry, ScopeType }

export class JWTClaimsService {
  private static currentSession: Session | null = null

  static setCurrentSession(session: Session | null): void {
    this.currentSession = session
  }

  static getCurrentClaims(): JWTClaims | null {
    return parseClaims(this.currentSession)
  }

  static getCurrentUserContext(): UserContext | null {
    return getUserContext(this.currentSession)
  }

  static validatePermission(permission: string): boolean {
    const ctx = this.getCurrentUserContext()
    if (!ctx) return false
    if (ctx.isPlatformAdmin) return true
    return ctx.permissions.includes(permission)
  }

  static hasRole(role: string): boolean {
    const ctx = this.getCurrentUserContext()
    if (!ctx) return false
    return ctx.roles.some(r => r.role === role)
  }

  static getClaimsFromSession(session: Session | null): JWTClaims | null {
    return parseClaims(session)
  }

  static getUserContextFromSession(session: Session | null): UserContext | null {
    return getUserContext(session)
  }

  static isSuperAdmin(): boolean {
    const ctx = this.getCurrentUserContext()
    return !!ctx?.isPlatformAdmin
  }

  static canAccessOrganization(organizationId: string): boolean {
    const ctx = this.getCurrentUserContext()
    if (!ctx) return false
    if (ctx.isPlatformAdmin) return true
    return ctx.organizationId === organizationId
  }
}

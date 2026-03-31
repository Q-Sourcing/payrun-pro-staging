/**
 * claims.ts — Pure-function JWT claims parser
 *
 * Replaces the old JWTClaimsService singleton. Every function here is
 * stateless: pass a session in, get data out. No mutable cache.
 */

import { Session } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────────

export type ScopeType = 'GLOBAL' | 'ORGANIZATION' | 'COMPANY' | 'PROJECT' | 'SELF';

export interface RBACRoleEntry {
  role: string;
  scope_type: ScopeType;
  scope_id: string | null;
  org_id?: string | null;
}

export interface JWTClaims {
  sub: string;
  email: string;
  app_metadata?: {
    rbac_roles?: RBACRoleEntry[];
    rbac_permissions?: string[];
    is_platform_admin?: boolean;
    organization_id?: string;
    [key: string]: any;
  };
  user_metadata?: {
    [key: string]: any;
  };
  organization_id?: string;
  impersonated_by?: string;
  impersonated_role?: string;
  impersonated_at?: string;
  exp: number;
  iat: number;
  iss: string;
}

export interface UserContext {
  userId: string;
  email: string;
  roles: RBACRoleEntry[];
  permissions: string[];
  isPlatformAdmin: boolean;
  organizationId?: string;
  isImpersonated: boolean;
  impersonatedBy?: string;
  impersonatedRole?: string;
  impersonatedAt?: string;
}

// ── Pure functions ───────────────────────────────────────────────────────────

/** Decode JWT payload from a Supabase session. Returns null if no session. */
export function parseClaims(session: Session | null): JWTClaims | null {
  if (!session?.access_token) return null;
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    return payload as JWTClaims;
  } catch {
    console.warn('[auth/claims] Failed to parse JWT');
    return null;
  }
}

/** Build a UserContext from a session's JWT claims. */
export function getUserContext(session: Session | null): UserContext | null {
  const claims = parseClaims(session);
  if (!claims) return null;

  const roles: RBACRoleEntry[] = (
    claims.app_metadata?.rbac_roles || (claims as any).rbac_roles || []
  ).map((r: any) => ({
    role: r.role,
    scope_type: r.scope_type,
    scope_id: r.scope_id ?? null,
    org_id: r.org_id ?? null,
  }));

  const permissions: string[] =
    claims.app_metadata?.rbac_permissions || (claims as any).rbac_permissions || [];

  const isPlatformAdmin = !!(
    claims.app_metadata?.is_platform_admin || (claims as any).is_platform_admin
  );

  const organizationId =
    claims.app_metadata?.organization_id || claims.organization_id;

  return {
    userId: claims.sub,
    email: claims.email,
    roles,
    permissions,
    isPlatformAdmin,
    organizationId,
    isImpersonated: !!(claims.impersonated_by && claims.impersonated_role),
    impersonatedBy: claims.impersonated_by,
    impersonatedRole: claims.impersonated_role,
    impersonatedAt: claims.impersonated_at,
  };
}

/** Check if the token in a session has expired. */
export function isTokenExpired(session: Session | null): boolean {
  const claims = parseClaims(session);
  if (!claims) return true;
  return claims.exp < Math.floor(Date.now() / 1000);
}

/** Seconds until the token expires (0 if already expired, null if no session). */
export function getTimeUntilExpiration(session: Session | null): number | null {
  const claims = parseClaims(session);
  if (!claims) return null;
  return Math.max(0, claims.exp - Math.floor(Date.now() / 1000));
}

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { JWTClaimsService, UserContext, JWTClaims } from '@/lib/services/auth/jwt-claims'
import { UserProfileService, UserProfile } from '@/lib/services/auth/user-profiles'
import { RBACService, Permission, Role } from '@/lib/services/auth/rbac'

interface AuthContextType {
  // User context
  userContext: UserContext | null
  userProfile: UserProfile | null
  isLoading: boolean

  // JWT claims
  claims: JWTClaims | null
  isTokenExpired: boolean
  timeUntilExpiration: number | null

  // Role and permissions
  role: Role | null
  permissions: Permission[]

  // Permission checks
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canAccessResource: (resource: string, action?: string) => boolean
  canManageResource: (resource: string) => boolean
  canCreateResource: (resource: string) => boolean
  canUpdateResource: (resource: string) => boolean
  canDeleteResource: (resource: string) => boolean

  // Role checks
  isSuperAdmin: () => boolean
  isOrgAdmin: () => boolean
  isUser: () => boolean

  // Organization checks
  getCurrentOrganizationId: () => string | null
  canAccessOrganization: (organizationId: string) => boolean

  // Impersonation
  isImpersonated: boolean
  impersonatedBy: string | null
  impersonatedRole: string | null
  canImpersonate: () => boolean

  // Profile management
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>

  // Token management
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [claims, setClaims] = useState<JWTClaims | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user context and profile
  const loadUserData = async () => {
    try {
      setIsLoading(true)

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      JWTClaimsService.setCurrentSession(session ?? null)

      // Get JWT claims
      const jwtClaims = JWTClaimsService.getClaimsFromSession(session)
      setClaims(jwtClaims)

      // Get user context
      const context = JWTClaimsService.getUserContextFromSession(session)
      setUserContext(context)

      // Get user profile if authenticated
      if (context) {
        const profile = await UserProfileService.getCurrentProfile()
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setUserContext(null)
      setUserProfile(null)
      setClaims(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh profile data
  const refreshProfile = async () => {
    try {
      const profile = await UserProfileService.getCurrentProfile()
      setUserProfile(profile)
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  // Update profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!userContext) throw new Error('Not authenticated')

    try {
      const updatedProfile = await UserProfileService.updateProfile(userContext.userId, data)
      setUserProfile(updatedProfile)
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Refresh session
  const refreshSession = async (): Promise<boolean> => {
    try {
      const success = await JWTClaimsService.refreshSessionIfNeeded()
      if (success) {
        await loadUserData()
      }
      return success
    } catch (error) {
      console.error('Error refreshing session:', error)
      return false
    }
  }

  // Initialize auth data
  useEffect(() => {
    loadUserData()
  }, [])

  // Set up periodic token refresh
  useEffect(() => {
    if (!claims) return

    const interval = setInterval(async () => {
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiration = Math.max(0, claims.exp - now)

      // Refresh if token expires in less than 5 minutes
      if (timeUntilExpiration < 300) {
        await refreshSession()
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [userContext])

  // Permission checks
  const hasPermission = (permission: Permission): boolean => {
    return RBACService.hasPermission(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return RBACService.hasAnyPermission(permissions)
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return RBACService.hasAllPermissions(permissions)
  }

  const canAccessResource = (resource: string, action: string = 'view'): boolean => {
    return RBACService.canAccessResource(resource, action)
  }

  const canManageResource = (resource: string): boolean => {
    return RBACService.canManageResource(resource)
  }

  const canCreateResource = (resource: string): boolean => {
    return RBACService.canCreateResource(resource)
  }

  const canUpdateResource = (resource: string): boolean => {
    return RBACService.canUpdateResource(resource)
  }

  const canDeleteResource = (resource: string): boolean => {
    return RBACService.canDeleteResource(resource)
  }

  // Role checks
  const isSuperAdmin = (): boolean => {
    return RBACService.isPlatformAdmin()
  }

  const isOrgAdmin = (): boolean => {
    return RBACService.isOrgAdmin()
  }

  const isUser = (): boolean => {
    return userContext?.roles.some(r => r.role === 'SELF_USER') || false
  }

  // Organization checks
  const getCurrentOrganizationId = (): string | null => {
    return userContext?.organizationId || null
  }

  const canAccessOrganization = (organizationId: string): boolean => {
    if (!userContext) return false
    if (userContext.isPlatformAdmin) return true
    return userContext.organizationId === organizationId
  }

  // Impersonation
  const isImpersonated = userContext?.isImpersonated || false
  const impersonatedBy = userContext?.impersonatedBy || null
  const impersonatedRole = userContext?.impersonatedRole || null

  const canImpersonate = (): boolean => {
    return isSuperAdmin()
  }

  // Computed values
  const role = (userContext?.roles[0]?.role as Role) || null
  const permissions = userContext ? RBACService.getCurrentUserPermissions() : []
  const isTokenExpired = claims ? (claims.exp < Math.floor(Date.now() / 1000)) : true
  const timeUntilExpiration = claims ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : null

  const value: AuthContextType = {
    // User context
    userContext,
    userProfile,
    isLoading,

    // JWT claims
    claims,
    isTokenExpired,
    timeUntilExpiration,

    // Role and permissions
    role,
    permissions,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    canManageResource,
    canCreateResource,
    canUpdateResource,
    canDeleteResource,

    // Role checks
    isSuperAdmin,
    isOrgAdmin,
    isUser,

    // Organization checks
    getCurrentOrganizationId,
    canAccessOrganization,

    // Impersonation
    isImpersonated,
    impersonatedBy,
    impersonatedRole,
    canImpersonate,

    // Profile management
    refreshProfile,
    updateProfile,

    // Token management
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// Convenience hooks for specific functionality
export function usePermissions() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions } = useAuthContext()
  return { hasPermission, hasAnyPermission, hasAllPermissions, permissions }
}

export function useRole() {
  const { role, isSuperAdmin, isOrgAdmin, isUser } = useAuthContext()
  return { role, isSuperAdmin, isOrgAdmin, isUser }
}

export function useOrganization() {
  const { getCurrentOrganizationId, canAccessOrganization } = useAuthContext()
  return { getCurrentOrganizationId, canAccessOrganization }
}

export function useImpersonation() {
  const { isImpersonated, impersonatedBy, impersonatedRole, canImpersonate } = useAuthContext()
  return { isImpersonated, impersonatedBy, impersonatedRole, canImpersonate }
}

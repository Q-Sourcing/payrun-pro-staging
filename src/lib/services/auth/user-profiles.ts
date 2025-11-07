import { supabase } from '@/integrations/supabase/client'
import { JWTClaimsService, UserContext } from './jwt-claims'

export interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  organization_id: string | null
  role: 'super_admin' | 'org_admin' | 'user'
  created_at: string
  updated_at: string
  organization?: {
    id: string
    name: string
    active: boolean
  }
}

export interface CreateUserProfileData {
  id: string
  email: string
  first_name?: string
  last_name?: string
  organization_id?: string
  role: 'super_admin' | 'org_admin' | 'user'
}

export interface UpdateUserProfileData {
  first_name?: string
  last_name?: string
  organization_id?: string
  role?: 'super_admin' | 'org_admin' | 'user'
}

export class UserProfileService {
  /**
   * Get current user's profile
   */
  static async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const context = JWTClaimsService.getCurrentUserContext()
      if (!context) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          role,
          created_at,
          updated_at,
          organization:organizations(id, name, active)
        `)
        .eq('id', context.userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  /**
   * Get user profile by ID (super admin only)
   */
  static async getProfileById(userId: string): Promise<UserProfile | null> {
    try {
      if (!JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          role,
          created_at,
          updated_at,
          organization:organizations(id, name, active)
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  /**
   * List all user profiles (super admin only)
   */
  static async listProfiles(): Promise<UserProfile[]> {
    try {
      if (!JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          role,
          created_at,
          updated_at,
          organization:organizations(id, name, active)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user profiles:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user profiles:', error)
      return []
    }
  }

  /**
   * List user profiles for a specific organization
   */
  static async listProfilesByOrganization(organizationId: string): Promise<UserProfile[]> {
    try {
      const context = JWTClaimsService.getCurrentUserContext()
      if (!context) throw new Error('Not authenticated')

      // Super admin can see all, others can only see their own org
      if (!JWTClaimsService.canAccessOrganization(organizationId)) {
        throw new Error('Insufficient permissions')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          role,
          created_at,
          updated_at,
          organization:organizations(id, name, active)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user profiles:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user profiles:', error)
      return []
    }
  }

  /**
   * Create user profile (super admin only)
   */
  static async createProfile(data: CreateUserProfileData): Promise<UserProfile> {
    try {
      if (!JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      const { data: result, error } = await supabase
        .from('user_profiles')
        .insert(data)
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          role,
          created_at,
          updated_at,
          organization:organizations(id, name, active)
        `)
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        throw new Error('Failed to create user profile')
      }

      return result
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateUserProfileData): Promise<UserProfile> {
    try {
      const context = JWTClaimsService.getCurrentUserContext()
      if (!context) throw new Error('Not authenticated')

      // Users can only update their own profile, super admin can update any
      if (context.userId !== userId && !JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      // Non-super admins cannot change role or organization
      if (!JWTClaimsService.isSuperAdmin()) {
        delete data.role
        delete data.organization_id
      }

      const { data: result, error } = await supabase
        .from('user_profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          role,
          created_at,
          updated_at,
          organization:organizations(id, name, active)
        `)
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        throw new Error('Failed to update user profile')
      }

      return result
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  /**
   * Delete user profile (super admin only)
   */
  static async deleteProfile(userId: string): Promise<void> {
    try {
      if (!JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Error deleting user profile:', error)
        throw new Error('Failed to delete user profile')
      }
    } catch (error) {
      console.error('Error deleting user profile:', error)
      throw error
    }
  }

  /**
   * Update user role (super admin only)
   */
  static async updateUserRole(userId: string, role: 'super_admin' | 'org_admin' | 'user'): Promise<UserProfile> {
    try {
      if (!JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      return this.updateProfile(userId, { role })
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  /**
   * Assign user to organization (super admin only)
   */
  static async assignToOrganization(userId: string, organizationId: string): Promise<UserProfile> {
    try {
      if (!JWTClaimsService.isSuperAdmin()) {
        throw new Error('Insufficient permissions')
      }

      return this.updateProfile(userId, { organization_id: organizationId })
    } catch (error) {
      console.error('Error assigning user to organization:', error)
      throw error
    }
  }

  /**
   * Get user's full name
   */
  static getUserDisplayName(profile: UserProfile): string {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    if (profile.first_name) {
      return profile.first_name
    }
    if (profile.last_name) {
      return profile.last_name
    }
    return profile.email
  }

  /**
   * Get user's initials for avatar
   */
  static getUserInitials(profile: UserProfile): string {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    if (profile.first_name) {
      return profile.first_name[0].toUpperCase()
    }
    if (profile.last_name) {
      return profile.last_name[0].toUpperCase()
    }
    return profile.email[0].toUpperCase()
  }

  /**
   * Check if user is active (has valid profile and organization)
   */
  static isUserActive(profile: UserProfile): boolean {
    return !!(profile.organization_id && profile.organization?.active)
  }
}

import { supabase } from '@/integrations/supabase/client';
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput, type UsersQueryOptions } from '@/lib/validations/users.schema';
export type { UsersQueryOptions } from '@/lib/validations/users.schema';
import type { User, UserRole } from '@/lib/types/roles';

export interface UserWithRole extends User {
  role: UserRole;
}

export class UsersService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get users with pagination and filters
   */
  static async getUsers(options: UsersQueryOptions = {}): Promise<{
    data: UserWithRole[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      role,
      organization_id,
      department_id,
      is_active,
      search,
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      // Get profiles
      let profilesQuery = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) {
        profilesQuery = profilesQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      console.log('[UsersService] Fetching profiles with options:', options);
      const { data: profiles, error: profilesError, count } = await profilesQuery;
      console.log('[UsersService] Profiles result:', { count: profiles?.length, total: count, error: profilesError });

      if (profilesError) throw profilesError;

      // Get user roles for all profiles
      const profileIds = (profiles || []).map(p => p.id);
      let userRolesMap: Record<string, UserRole> = {};

      if (profileIds.length > 0) {
        console.log('[UsersService] Fetching roles for profiles:', profileIds);
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', profileIds);

        console.log('[UsersService] Roles result:', userRoles?.length, rolesError);

        if (rolesError) throw rolesError;

        userRolesMap = (userRoles || []).reduce((acc, ur) => {
          acc[ur.user_id] = ur.role as UserRole;
          return acc;
        }, {} as Record<string, UserRole>);
      }

      // Get org_users status
      let userStatusMap: Record<string, string> = {};
      if (profileIds.length > 0 && organization_id) {
        console.log('[UsersService] Fetching org_users status for profiles:', profileIds);
        const { data: orgUsers, error: orgUsersError } = await supabase
          .from('org_users')
          .select('user_id, status')
          .in('user_id', profileIds)
          .eq('org_id', organization_id); // Filter by the requested org context

        if (orgUsersError) {
          console.error('[UsersService] Error fetching org_users:', orgUsersError);
        } else {
          userStatusMap = (orgUsers || []).reduce((acc, ou) => {
            acc[ou.user_id] = ou.status;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Filter by role if specified
      let filteredProfiles = profiles || [];
      if (role) {
        filteredProfiles = filteredProfiles.filter(p => userRolesMap[p.id] === role);
      }

      // Transform to UserWithRole format
      const transformedData: UserWithRole[] = filteredProfiles.map(profile => {
        const orgStatus = userStatusMap[profile.id]; // 'active', 'invited', 'inactive'
        const isInvited = orgStatus === 'invited';
        const isActive = orgStatus === 'active' || isInvited; // Treat invited as "active" for visibility, or handle in UI

        return {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          role: (userRolesMap[profile.id] || 'SELF_USER') as UserRole,
          isActive: isActive,
          status: orgStatus || 'active', // Add explicit status field if interface allows, otherwise rely on isActive logic
          createdAt: profile.created_at || new Date().toISOString(),
          updatedAt: profile.updated_at || new Date().toISOString(),
          permissions: [],
          restrictions: [],
          twoFactorEnabled: false,
          sessionTimeout: 480,
        };
      });

      return {
        data: transformedData,
        total: count || 0,
        page,
        limit: safeLimit,
      };
    } catch (error: any) {
      console.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<UserWithRole[]> {
    const result = await this.getUsers({ role, limit: 1000 });
    return result.data;
  }

  /**
   * Get a single user by ID
   */
  static async getUserById(id: string): Promise<UserWithRole | null> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') return null;
        throw profileError;
      }

      // Get user role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();

      if (roleError && roleError.code !== 'PGRST116') throw roleError;

      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        role: (userRole?.role as UserRole) || 'SELF_USER' as UserRole,
        isActive: true,
        createdAt: profile.created_at || new Date().toISOString(),
        updatedAt: profile.updated_at || new Date().toISOString(),
        permissions: [],
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480,
      };
    } catch (error: any) {
      console.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a new user (creates auth user, profile, and role) - Uses Edge Function
   */
  static async createUser(userData: CreateUserInput, password?: string): Promise<UserWithRole> {
    const validatedData = createUserSchema.parse(userData);

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No authenticated session');
    }

    // Get current user's organization ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Current user does not have an organization assigned');
    }

    // Call invite-org-user Edge Function
    const { data, error } = await supabase.functions.invoke('invite-org-user', {
      body: {
        email: validatedData.email,
        firstName: validatedData.first_name,
        lastName: validatedData.last_name,
        orgId: profile.organization_id,
        roles: [validatedData.role],
        companyIds: [], // Defaults to empty
        sendInvite: true
      }
    });

    if (error) {
      console.error('Error inviting user:', error);
      // Try to parse detailed error
      let msg = error.message;
      try {
        if (error.context) {
          const body = await error.context.json();
          if (body.message) msg = body.message;
        }
      } catch (e) { }
      throw new Error(msg || 'Failed to invite user');
    }

    if (!data.success) {
      throw new Error(data.message || 'Failed to invite user');
    }

    // Return mock user object matching the interface
    // verifying that the user was created/invited
    return {
      id: data.userId,
      email: validatedData.email,
      firstName: validatedData.first_name,
      lastName: validatedData.last_name,
      role: validatedData.role as UserRole,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: [],
      restrictions: [],
      twoFactorEnabled: false,
      sessionTimeout: 480
    };
  }

  /**
   * Update an existing user - Uses Edge Function
   */
  static async updateUser(id: string, data: UpdateUserInput): Promise<UserWithRole> {
    try {
      // Validate input
      const validatedData = updateUserSchema.parse({ ...data, id });

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          email: validatedData.email,
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          role: validatedData.role,
          is_active: validatedData.is_active,
          permissions: validatedData.permissions,
          restrictions: validatedData.restrictions,
          two_factor_enabled: validatedData.two_factor_enabled,
          session_timeout: validatedData.session_timeout,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update user');
      }

      return result.user;
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.issues) {
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update user: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a user (soft delete by deactivating) - Uses Edge Function
   */
  static async deleteUser(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          hard_delete: hardDelete,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate a temporary password
   */
  /**
   * Revoke an invitation
   */
  static async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('user_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) {
      console.error('Error revoking invite:', error);
      throw new Error(`Failed to revoke invite: ${error.message}`);
    }
  }

  private static generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}


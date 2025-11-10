import { supabase } from '@/integrations/supabase/client';
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput, type UsersQueryOptions } from '@/lib/validations/users.schema';
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
        .from('profiles')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) {
        profilesQuery = profilesQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: profiles, error: profilesError, count } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Get user roles for all profiles
      const profileIds = (profiles || []).map(p => p.id);
      let userRolesMap: Record<string, UserRole> = {};

      if (profileIds.length > 0) {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', profileIds);

        if (rolesError) throw rolesError;

        userRolesMap = (userRoles || []).reduce((acc, ur) => {
          acc[ur.user_id] = ur.role as UserRole;
          return acc;
        }, {} as Record<string, UserRole>);
      }

      // Filter by role if specified
      let filteredProfiles = profiles || [];
      if (role) {
        filteredProfiles = filteredProfiles.filter(p => userRolesMap[p.id] === role);
      }

      // Transform to UserWithRole format
      const transformedData: UserWithRole[] = filteredProfiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        role: userRolesMap[profile.id] || 'employee',
        isActive: true, // Default - would need to check auth.users table
        createdAt: profile.created_at || new Date().toISOString(),
        updatedAt: profile.updated_at || new Date().toISOString(),
        permissions: [],
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480,
      }));

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
        .from('profiles')
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
        .single();

      if (roleError && roleError.code !== 'PGRST116') throw roleError;

      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        role: (userRole?.role as UserRole) || 'employee',
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
  static async createUser(data: CreateUserInput, password?: string): Promise<UserWithRole> {
    try {
      // Validate input
      const validatedData = createUserSchema.parse(data);

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: validatedData.email,
          password: password || this.generateTemporaryPassword(),
          full_name: `${validatedData.first_name} ${validatedData.last_name}`,
          role: validatedData.role,
          country: 'UG', // Default country - should be configurable
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create user');
      }

      // Fetch the created user
      return await this.getUserById(result.user_id);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.issues) {
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`);
    }
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


/**
 * Platform Admin Service
 * Service functions for platform administrators to manage organizations and users
 */

import { supabase } from '@/integrations/supabase/client';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
  default_company_id?: string;
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
  active?: boolean;
}

export interface PlatformAdminStats {
  totalOrganizations: number;
  totalCompanies: number;
  totalUsers: number;
  activeOrganizations: number;
}

export class PlatformAdminService {
  /**
   * Get all organizations
   */
  static async getAllOrganizations(): Promise<Organization[]> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      return null;
    }
  }

  /**
   * Create a new organization
   */
  static async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    try {
      const { data: result, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          active: data.active !== undefined ? data.active : true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error: any) {
      console.error('Error creating organization:', error);
      throw new Error(`Failed to create organization: ${error.message}`);
    }
  }

  /**
   * Update an organization
   */
  static async updateOrganization(
    id: string,
    data: Partial<CreateOrganizationData>
  ): Promise<Organization> {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.active !== undefined) updateData.active = data.active;

      const { data: result, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error: any) {
      console.error('Error updating organization:', error);
      throw new Error(`Failed to update organization: ${error.message}`);
    }
  }

  /**
   * Delete an organization (soft delete by setting active to false)
   */
  static async deleteOrganization(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }

  /**
   * Get platform-wide statistics
   */
  static async getPlatformStats(): Promise<PlatformAdminStats> {
    try {
      // Get organizations count
      const { count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      const { count: activeOrgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      // Get companies count
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Get users count
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      return {
        totalOrganizations: orgCount || 0,
        totalCompanies: companiesCount || 0,
        totalUsers: usersCount || 0,
        activeOrganizations: activeOrgCount || 0,
      };
    } catch (error: any) {
      console.error('Error fetching platform stats:', error);
      throw new Error(`Failed to fetch platform stats: ${error.message}`);
    }
  }

  /**
   * Get all users across all organizations
   */
  static async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          organization_id,
          created_at,
          organization:organizations(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching all users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Reset user password (platform admin only)
   */
  static async resetUserPassword(userId: string): Promise<void> {
    try {
      // This would typically call a Supabase Edge Function or Admin API
      // For now, we'll throw an error indicating this needs to be implemented
      throw new Error('Password reset functionality needs to be implemented via Supabase Admin API or Edge Function');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Delete a user (platform admin only)
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      // Delete from user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Note: Deleting from auth.users requires Admin API
      // This should be done via an Edge Function with service role
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}


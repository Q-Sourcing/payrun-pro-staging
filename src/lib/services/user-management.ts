import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  UserRole, 
  RoleAssignment, 
  AuditLog,
  ROLE_DEFINITIONS,
  getRoleLevel
} from '@/lib/types/roles';
import { AccessControlService } from './access-control';

export class UserManagementService {
  private accessControl: AccessControlService;

  constructor() {
    this.accessControl = new AccessControlService();
  }

  /**
   * Set current user for access control
   */
  setCurrentUser(user: User): void {
    this.accessControl.setCurrentUser(user);
  }

  /**
   * Create a new user
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<User> {
    // Check if current user can manage users
    const canManage = this.accessControl.canManageUsers();
    if (!canManage.hasPermission) {
      throw new Error(`Cannot create user: ${canManage.reason}`);
    }

    // Validate role assignment
    const currentUser = this.accessControl.getCurrentUser();
    if (!currentUser) {
      throw new Error('No current user found');
    }

    const currentUserLevel = getRoleLevel(currentUser.role);
    const newUserLevel = getRoleLevel(userData.role);

    // Users can only assign roles at or below their level
    if (newUserLevel > currentUserLevel) {
      throw new Error(`Cannot assign role '${userData.role}' - insufficient permissions`);
    }

    try {
      // Create user in database
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          organization_id: userData.organizationId,
          department_id: userData.departmentId,
          manager_id: userData.managerId,
          is_active: userData.isActive,
          two_factor_enabled: userData.twoFactorEnabled,
          session_timeout: userData.sessionTimeout,
          permissions: userData.permissions,
          restrictions: userData.restrictions,
          created_by: createdBy
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      // Create role assignment record
      await this.createRoleAssignment({
        userId: data.id,
        role: userData.role,
        assignedBy: createdBy,
        assignedAt: new Date().toISOString(),
        isActive: true,
        reason: 'Initial role assignment'
      });

      // Log audit event
      await this.logAuditEvent({
        userId: createdBy,
        action: 'create_user',
        resource: 'users',
        details: {
          newUserId: data.id,
          newUserEmail: userData.email,
          newUserRole: userData.role
        },
        result: 'success'
      });

      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        organizationId: data.organization_id,
        departmentId: data.department_id,
        managerId: data.manager_id,
        isActive: data.is_active,
        lastLogin: data.last_login,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        permissions: data.permissions,
        restrictions: data.restrictions,
        twoFactorEnabled: data.two_factor_enabled,
        sessionTimeout: data.session_timeout
      };

    } catch (error) {
      // Log failed audit event
      await this.logAuditEvent({
        userId: createdBy,
        action: 'create_user',
        resource: 'users',
        details: {
          userEmail: userData.email,
          userRole: userData.role,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'failure'
      });

      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updates: Partial<User>, updatedBy: string): Promise<User> {
    // Check if current user can manage users
    const canManage = this.accessControl.canManageUsers();
    if (!canManage.hasPermission) {
      throw new Error(`Cannot update user: ${canManage.reason}`);
    }

    // Check if user can access this specific user
    const canAccess = this.accessControl.canAccessEmployee(userId);
    if (!canAccess.hasPermission) {
      throw new Error(`Cannot access user: ${canAccess.reason}`);
    }

    try {
      const updateData: any = {};
      
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
      if (updates.organizationId !== undefined) updateData.organization_id = updates.organizationId;
      if (updates.departmentId !== undefined) updateData.department_id = updates.departmentId;
      if (updates.managerId !== undefined) updateData.manager_id = updates.managerId;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.twoFactorEnabled !== undefined) updateData.two_factor_enabled = updates.twoFactorEnabled;
      if (updates.sessionTimeout !== undefined) updateData.session_timeout = updates.sessionTimeout;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
      if (updates.restrictions !== undefined) updateData.restrictions = updates.restrictions;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      // Log audit event
      await this.logAuditEvent({
        userId: updatedBy,
        action: 'update_user',
        resource: 'users',
        details: {
          targetUserId: userId,
          updates: updates
        },
        result: 'success'
      });

      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        organizationId: data.organization_id,
        departmentId: data.department_id,
        managerId: data.manager_id,
        isActive: data.is_active,
        lastLogin: data.last_login,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        permissions: data.permissions,
        restrictions: data.restrictions,
        twoFactorEnabled: data.two_factor_enabled,
        sessionTimeout: data.session_timeout
      };

    } catch (error) {
      // Log failed audit event
      await this.logAuditEvent({
        userId: updatedBy,
        action: 'update_user',
        resource: 'users',
        details: {
          targetUserId: userId,
          updates: updates,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'failure'
      });

      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, newRole: UserRole, assignedBy: string, reason: string): Promise<RoleAssignment> {
    // Check if current user can manage users
    const canManage = this.accessControl.canManageUsers();
    if (!canManage.hasPermission) {
      throw new Error(`Cannot assign role: ${canManage.reason}`);
    }

    // Validate role assignment
    const currentUser = this.accessControl.getCurrentUser();
    if (!currentUser) {
      throw new Error('No current user found');
    }

    const currentUserLevel = getRoleLevel(currentUser.role);
    const newRoleLevel = getRoleLevel(newRole);

    // Users can only assign roles at or below their level
    if (newRoleLevel > currentUserLevel) {
      throw new Error(`Cannot assign role '${newRole}' - insufficient permissions`);
    }

    try {
      // Deactivate current role assignment
      await supabase
        .from('role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Create new role assignment
      const roleAssignment = await this.createRoleAssignment({
        userId,
        role: newRole,
        assignedBy,
        assignedAt: new Date().toISOString(),
        isActive: true,
        reason
      });

      // Update user role
      await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Log audit event
      await this.logAuditEvent({
        userId: assignedBy,
        action: 'assign_role',
        resource: 'users',
        details: {
          targetUserId: userId,
          newRole: newRole,
          reason: reason
        },
        result: 'success'
      });

      return roleAssignment;

    } catch (error) {
      // Log failed audit event
      await this.logAuditEvent({
        userId: assignedBy,
        action: 'assign_role',
        resource: 'users',
        details: {
          targetUserId: userId,
          newRole: newRole,
          reason: reason,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'failure'
      });

      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    // Check if current user can access this user
    const canAccess = this.accessControl.canAccessEmployee(userId);
    if (!canAccess.hasPermission) {
      throw new Error(`Cannot access user: ${canAccess.reason}`);
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw new Error(`Failed to get user: ${error.message}`);
      }

      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        organizationId: data.organization_id,
        departmentId: data.department_id,
        managerId: data.manager_id,
        isActive: data.is_active,
        lastLogin: data.last_login,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        permissions: data.permissions,
        restrictions: data.restrictions,
        twoFactorEnabled: data.two_factor_enabled,
        sessionTimeout: data.session_timeout
      };

    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Get users based on current user's access level
   */
  async getUsers(filters?: {
    organizationId?: string;
    departmentId?: string;
    role?: UserRole;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const currentUser = this.accessControl.getCurrentUser();
    if (!currentUser) {
      throw new Error('No current user found');
    }

    const roleDef = ROLE_DEFINITIONS[currentUser.role];
    let query = supabase.from('users').select('*', { count: 'exact' });

    // Apply access restrictions based on role
    switch (roleDef.canAccess.employees) {
      case 'all':
        // Super admin can see all users
        break;
      case 'organization':
        // Organization admin can see users in their organization
        if (currentUser.organizationId) {
          query = query.eq('organization_id', currentUser.organizationId);
        }
        break;
      case 'department':
        // Department manager can see users in their department
        if (currentUser.departmentId) {
          query = query.eq('department_id', currentUser.departmentId);
        }
        break;
      case 'own':
        // Employee can only see themselves
        query = query.eq('id', currentUser.id);
        break;
      default:
        throw new Error('Insufficient permissions to view users');
    }

    // Apply filters
    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }
    if (filters?.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    try {
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get users: ${error.message}`);
      }

      const users: User[] = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        departmentId: user.department_id,
        managerId: user.manager_id,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        permissions: user.permissions,
        restrictions: user.restrictions,
        twoFactorEnabled: user.two_factor_enabled,
        sessionTimeout: user.session_timeout
      }));

      return {
        users,
        total: count || 0
      };

    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string, deactivatedBy: string, reason: string): Promise<void> {
    // Check if current user can manage users
    const canManage = this.accessControl.canManageUsers();
    if (!canManage.hasPermission) {
      throw new Error(`Cannot deactivate user: ${canManage.reason}`);
    }

    try {
      await supabase
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Log audit event
      await this.logAuditEvent({
        userId: deactivatedBy,
        action: 'deactivate_user',
        resource: 'users',
        details: {
          targetUserId: userId,
          reason: reason
        },
        result: 'success'
      });

    } catch (error) {
      // Log failed audit event
      await this.logAuditEvent({
        userId: deactivatedBy,
        action: 'deactivate_user',
        resource: 'users',
        details: {
          targetUserId: userId,
          reason: reason,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'failure'
      });

      throw error;
    }
  }

  /**
   * Create role assignment record
   */
  private async createRoleAssignment(assignment: Omit<RoleAssignment, 'id'>): Promise<RoleAssignment> {
    const { data, error } = await supabase
      .from('role_assignments')
      .insert({
        user_id: assignment.userId,
        role: assignment.role,
        assigned_by: assignment.assignedBy,
        assigned_at: assignment.assignedAt,
        expires_at: assignment.expiresAt,
        is_active: assignment.isActive,
        reason: assignment.reason
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role assignment: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      role: data.role,
      assignedBy: data.assigned_by,
      assignedAt: data.assigned_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
      reason: data.reason
    };
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: event.userId,
          action: event.action,
          resource: event.resource,
          details: event.details,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          timestamp: new Date().toISOString(),
          result: event.result
        });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get user's role assignments
   */
  async getUserRoleAssignments(userId: string): Promise<RoleAssignment[]> {
    const { data, error } = await supabase
      .from('role_assignments')
      .select('*')
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get role assignments: ${error.message}`);
    }

    return (data || []).map(assignment => ({
      id: assignment.id,
      userId: assignment.user_id,
      role: assignment.role,
      assignedBy: assignment.assigned_by,
      assignedAt: assignment.assigned_at,
      expiresAt: assignment.expires_at,
      isActive: assignment.is_active,
      reason: assignment.reason
    }));
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return (data || []).map(log => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.timestamp,
      result: log.result
    }));
  }
}

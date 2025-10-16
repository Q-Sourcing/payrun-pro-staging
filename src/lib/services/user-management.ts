import { User, UserRole, Permission } from '@/lib/types/roles';
import { log, warn, error } from '@/lib/logger';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  departmentId?: string;
  managerId?: string;
  permissions?: Permission[];
  sendInvitation?: boolean;
  temporaryPassword?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  organizationId?: string;
  departmentId?: string;
  managerId?: string;
  permissions?: Permission[];
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  result: 'success' | 'failure' | 'denied';
}

export interface UserManagementResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  auditId?: string;
}

class UserManagementService {
  private baseUrl = '/api/users';
  
  /**
   * Create a new user
   */
  async createUser(
    userData: CreateUserRequest,
    currentUser: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserManagementResponse<User>> {
    try {
      log('Creating new user', { 
        email: userData.email, 
        role: userData.role,
        createdBy: currentUser.email 
      });

      // Validate permissions
      if (!this.canCreateUser(currentUser, userData.role)) {
        await this.logAuditEntry({
          userId: currentUser.id,
          userName: `${currentUser.firstName} ${currentUser.lastName}`,
          userEmail: currentUser.email,
          action: 'create_user',
          resource: 'user',
          details: { attemptedEmail: userData.email, attemptedRole: userData.role },
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          result: 'denied'
        });

        return {
          success: false,
          error: 'Insufficient permissions to create user with this role'
        };
      }

      // Check for duplicate email
      const existingUser = await this.checkEmailExists(userData.email);
      if (existingUser) {
        await this.logAuditEntry({
          userId: currentUser.id,
          userName: `${currentUser.firstName} ${currentUser.lastName}`,
          userEmail: currentUser.email,
          action: 'create_user',
          resource: 'user',
          details: { attemptedEmail: userData.email, reason: 'duplicate_email' },
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          result: 'failure'
        });

        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Create user (mock implementation - replace with actual API call)
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        organizationId: userData.organizationId,
        departmentId: userData.departmentId,
        managerId: userData.managerId,
        isActive: true,
        lastLogin: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: userData.permissions || [],
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480
      };

      // Log successful creation
      const auditId = await this.logAuditEntry({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'create_user',
        resource: 'user',
        details: { 
          createdUserId: newUser.id,
          createdUserEmail: newUser.email,
          createdUserRole: newUser.role,
          sendInvitation: userData.sendInvitation
        },
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        result: 'success'
      });

      // Send invitation if requested
      if (userData.sendInvitation && userData.temporaryPassword) {
        await this.sendUserInvitation(newUser, userData.temporaryPassword, currentUser);
      }

      log('User created successfully', { userId: newUser.id, auditId });

      return {
        success: true,
        data: newUser,
        auditId
      };

    } catch (err: any) {
      error('Failed to create user', err);
      
      await this.logAuditEntry({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'create_user',
        resource: 'user',
        details: { error: err.message },
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        result: 'failure'
      });

      return {
        success: false,
        error: err.message || 'Failed to create user'
      };
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(
    userId: string,
    userData: UpdateUserRequest,
    currentUser: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserManagementResponse<User>> {
    try {
      log('Updating user', { userId, updatedBy: currentUser.email });

      // Get existing user data for audit trail
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Validate permissions
      if (!this.canEditUser(currentUser, existingUser, userData.role)) {
        await this.logAuditEntry({
          userId: currentUser.id,
          userName: `${currentUser.firstName} ${currentUser.lastName}`,
          userEmail: currentUser.email,
          action: 'update_user',
          resource: 'user',
          details: { 
            targetUserId: userId,
            targetUserEmail: existingUser.email,
            attemptedChanges: Object.keys(userData),
            reason: 'insufficient_permissions'
          },
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          result: 'denied'
        });

        return {
          success: false,
          error: 'Insufficient permissions to edit this user'
        };
      }

      // Track changes for audit
      const changes: Record<string, any> = {};
      const previousValues: Record<string, any> = {};

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && value !== existingUser[key as keyof User]) {
          previousValues[key] = existingUser[key as keyof User];
          changes[key] = value;
        }
      });

      // Update user (mock implementation - replace with actual API call)
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date().toISOString()
      };

      // Log successful update
      const auditId = await this.logAuditEntry({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'update_user',
        resource: 'user',
        details: { 
          targetUserId: userId,
          targetUserEmail: existingUser.email,
          changes,
          previousValues
        },
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        result: 'success'
      });

      log('User updated successfully', { userId, auditId });

      return {
        success: true,
        data: updatedUser,
        auditId
      };

    } catch (err: any) {
      error('Failed to update user', err);

      await this.logAuditEntry({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'update_user',
        resource: 'user',
        details: { 
          targetUserId: userId,
          error: err.message 
        },
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        result: 'failure'
      });

      return {
        success: false,
        error: err.message || 'Failed to update user'
      };
    }
  }

  /**
   * Delete/deactivate a user
   */
  async deleteUser(
    userId: string,
    currentUser: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserManagementResponse<void>> {
    try {
      log('Deleting user', { userId, deletedBy: currentUser.email });

      const targetUser = await this.getUserById(userId);
      if (!targetUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Validate permissions
      if (!this.canDeleteUser(currentUser, targetUser)) {
        await this.logAuditEntry({
          userId: currentUser.id,
          userName: `${currentUser.firstName} ${currentUser.lastName}`,
          userEmail: currentUser.email,
          action: 'delete_user',
          resource: 'user',
          details: { 
            targetUserId: userId,
            targetUserEmail: targetUser.email,
            reason: 'insufficient_permissions'
          },
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          result: 'denied'
        });

        return {
          success: false,
          error: 'Insufficient permissions to delete this user'
        };
      }

      // Prevent self-deletion
      if (userId === currentUser.id) {
        await this.logAuditEntry({
          userId: currentUser.id,
          userName: `${currentUser.firstName} ${currentUser.lastName}`,
          userEmail: currentUser.email,
          action: 'delete_user',
          resource: 'user',
          details: { 
            targetUserId: userId,
            reason: 'self_deletion_attempt'
          },
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
          result: 'denied'
        });

        return {
          success: false,
          error: 'Cannot delete your own account'
        };
      }

      // Delete user (mock implementation - replace with actual API call)
      // In real implementation, this would deactivate the user rather than delete

      // Log successful deletion
      const auditId = await this.logAuditEntry({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'delete_user',
        resource: 'user',
        details: { 
          deletedUserId: userId,
          deletedUserEmail: targetUser.email,
          deletedUserRole: targetUser.role
        },
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        result: 'success'
      });

      log('User deleted successfully', { userId, auditId });

      return {
        success: true,
        auditId
      };

    } catch (err: any) {
      error('Failed to delete user', err);

      await this.logAuditEntry({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'delete_user',
        resource: 'user',
        details: { 
          targetUserId: userId,
          error: err.message 
        },
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        result: 'failure'
      });

      return {
        success: false,
        error: err.message || 'Failed to delete user'
      };
    }
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: UserRole,
    status?: 'active' | 'inactive' | 'all'
  ): Promise<UserManagementResponse<{ users: User[]; total: number; page: number; limit: number }>> {
    try {
      // Mock implementation - replace with actual API call
      const mockUsers: User[] = [
        // Mock data would go here
      ];

      return {
        success: true,
        data: {
          users: mockUsers,
          total: mockUsers.length,
          page,
          limit
        }
      };

    } catch (err: any) {
      error('Failed to get users', err);
      return {
        success: false,
        error: err.message || 'Failed to get users'
      };
    }
  }

  /**
   * Get audit log entries
   */
  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    search?: string,
    action?: string,
    result?: string
  ): Promise<UserManagementResponse<{ entries: AuditLogEntry[]; total: number }>> {
    try {
      // Mock implementation - replace with actual API call
      const mockEntries: AuditLogEntry[] = [];

      return {
        success: true,
        data: {
          entries: mockEntries,
          total: mockEntries.length
        }
      };

    } catch (err: any) {
      error('Failed to get audit logs', err);
      return {
        success: false,
        error: err.message || 'Failed to get audit logs'
      };
    }
  }

  /**
   * Permission checking methods
   */
  private canCreateUser(currentUser: User, targetRole: UserRole): boolean {
    // Super admins can create anyone
    if (currentUser.role === 'super_admin') return true;
    
    // Organization admins can create users up to their level
    if (currentUser.role === 'organization_admin') {
      const roleHierarchy = {
        'super_admin': 10,
        'organization_admin': 8,
        'ceo_executive': 7,
        'payroll_manager': 6,
        'finance_controller': 5,
        'hr_business_partner': 4,
        'employee': 1
      };
      
      return (roleHierarchy[targetRole] || 0) <= (roleHierarchy[currentUser.role] || 0);
    }
    
    return false;
  }

  private canEditUser(currentUser: User, targetUser: User, newRole?: UserRole): boolean {
    // Super admins can edit anyone
    if (currentUser.role === 'super_admin') return true;
    
    // Organization admins can edit users in their organization
    if (currentUser.role === 'organization_admin') {
      if (currentUser.organizationId !== targetUser.organizationId) return false;
      
      // Can't promote users to higher roles than themselves
      if (newRole && newRole === 'super_admin') return false;
      
      return true;
    }
    
    return false;
  }

  private canDeleteUser(currentUser: User, targetUser: User): boolean {
    // Super admins can delete anyone
    if (currentUser.role === 'super_admin') return true;
    
    // Organization admins can delete users in their organization (except super admins)
    if (currentUser.role === 'organization_admin') {
      return currentUser.organizationId === targetUser.organizationId && 
             targetUser.role !== 'super_admin';
    }
    
    return false;
  }

  /**
   * Helper methods
   */
  private async getUserById(userId: string): Promise<User | null> {
    // Mock implementation - replace with actual API call
    return null;
  }

  private async checkEmailExists(email: string): Promise<boolean> {
    // Mock implementation - replace with actual API call
    return false;
  }

  private async sendUserInvitation(user: User, password: string, invitedBy: User): Promise<void> {
    log('Sending user invitation', { 
      userEmail: user.email, 
      invitedBy: invitedBy.email 
    });
    
    // Mock implementation - replace with actual email service
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
  }

  private async logAuditEntry(entry: Omit<AuditLogEntry, 'id'>): Promise<string> {
    const auditId = `audit-${Date.now()}`;
    
    log('Audit log entry', { 
      auditId, 
      action: entry.action, 
      user: entry.userEmail,
      result: entry.result 
    });
    
    // Mock implementation - replace with actual database call
    // This would call the log_user_management_action function from the database
    
    return auditId;
  }
}

export const userManagementService = new UserManagementService();



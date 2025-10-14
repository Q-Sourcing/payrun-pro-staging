import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Search,
  Filter,
  Download,
  MoreHorizontal,
  RefreshCw,
  Settings
} from 'lucide-react';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { PermissionManager } from './PermissionManager';
import { ActivityLog } from './ActivityLog';
import { UserManagementGuard } from './UserManagementGuard';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { User, UserRole } from '@/lib/types/roles';
import { ROLE_DEFINITIONS } from '@/lib/types/roles';

interface UserManagementProps {
  currentUser?: User;
}

// Helper function to convert Supabase profile to our User type
const convertProfileToUser = (profile: any, supabaseUser: any): User | null => {
  if (!profile || !supabaseUser) return null;
  
  // Map the first role from the roles array to our UserRole type
  const primaryRole = profile.roles?.[0] as UserRole || 'employee';
  
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    role: primaryRole,
    organizationId: null, // This would come from your database schema
    departmentId: null,
    managerId: null,
    isActive: true,
    lastLogin: supabaseUser.last_sign_in_at,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
    permissions: ROLE_DEFINITIONS[primaryRole]?.permissions || [],
    restrictions: [],
    twoFactorEnabled: false,
    sessionTimeout: 480
  };
};

export function UserManagement({ currentUser }: UserManagementProps) {
  const { user, profile } = useSupabaseAuth();
  
  // Convert Supabase profile to our User type
  const convertedUser = convertProfileToUser(profile, user);
  
  // Debug logging
  console.log('UserManagement Debug:', {
    user: user?.email,
    profile: profile,
    convertedUser: convertedUser,
    hasAuth: !!user,
    hasProfile: !!profile
  });
  
  const [activeTab, setActiveTab] = useState('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'nalungukevin@gmail.com',
        firstName: 'Nalungu',
        lastName: 'Kevin',
        role: 'super_admin' as UserRole,
        organizationId: null,
        departmentId: null,
        managerId: null,
        isActive: true,
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        updatedAt: new Date().toISOString(),
        permissions: ROLE_DEFINITIONS.super_admin.permissions,
        restrictions: [],
        twoFactorEnabled: true,
        sessionTimeout: 480
      },
      {
        id: '2',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'organization_admin' as UserRole,
        organizationId: 'org-1',
        departmentId: 'hr',
        managerId: '1',
        isActive: true,
        lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        updatedAt: new Date().toISOString(),
        permissions: ROLE_DEFINITIONS.organization_admin.permissions,
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480
      },
      {
        id: '3',
        email: 'jane.smith@company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'payroll_manager' as UserRole,
        organizationId: 'org-1',
        departmentId: 'payroll',
        managerId: '2',
        isActive: true,
        lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        updatedAt: new Date().toISOString(),
        permissions: ROLE_DEFINITIONS.payroll_manager.permissions,
        restrictions: [],
        twoFactorEnabled: true,
        sessionTimeout: 480
      },
      {
        id: '4',
        email: 'mike.wilson@company.com',
        firstName: 'Mike',
        lastName: 'Wilson',
        role: 'employee' as UserRole,
        organizationId: 'org-1',
        departmentId: 'sales',
        managerId: '2',
        isActive: false,
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        updatedAt: new Date().toISOString(),
        permissions: ROLE_DEFINITIONS.employee.permissions,
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480
      }
    ];
    
    setUsers(mockUsers);
    setIsLoading(false);
  }, []);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setShowUserForm(true);
  };

  const handleUserFormClose = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleUserSaved = (savedUser: User) => {
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
    } else {
      setUsers(prev => [...prev, savedUser]);
    }
    setShowUserForm(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && user.isActive) ||
      (selectedStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const userStats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    admins: users.filter(u => u.role === 'organization_admin').length,
    managers: users.filter(u => u.role === 'payroll_manager').length,
    employees: users.filter(u => u.role === 'employee').length
  };

  // Show loading state if we don't have user data yet
  if (!user || !profile || !convertedUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <UserManagementGuard>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateUser} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
                <p className="text-2xl font-bold text-red-600">{userStats.inactive}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-red-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.superAdmins + userStats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserList
            users={filteredUsers}
            isLoading={isLoading}
            onEditUser={handleEditUser}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionManager currentUser={convertedUser} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityLog currentUser={convertedUser} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure user management preferences, security settings, and system defaults.
              </p>
              {/* Settings content will be implemented here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          onClose={handleUserFormClose}
          onSave={handleUserSaved}
          currentUser={convertedUser}
        />
      )}
    </div>
    </UserManagementGuard>
  );
}

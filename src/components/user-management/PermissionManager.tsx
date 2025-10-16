import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import { User, UserRole, Permission } from '@/lib/types/roles';
import { ROLE_DEFINITIONS, PERMISSION_MATRIX } from '@/lib/types/roles';

interface PermissionManagerProps {
  currentUser?: User | null;
}

interface PermissionGroup {
  name: string;
  permissions: Permission[];
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function PermissionManager({ currentUser }: PermissionManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [customPermissions, setCustomPermissions] = useState<Record<UserRole, Permission[]>>({
    super_admin: [],
    organization_admin: [],
    ceo_executive: [],
    payroll_manager: [],
    employee: [],
    hr_business_partner: [],
    finance_controller: []
  });
  const [isEditing, setIsEditing] = useState(false);

  const permissionGroups: PermissionGroup[] = [
    {
      name: 'Employee Management',
      permissions: [
        'view_all_employees',
        'view_organization_employees',
        'view_department_employees',
        'view_own_data',
        'edit_all_employees',
        'edit_organization_employees',
        'edit_department_employees',
        'edit_own_data'
      ],
      description: 'Permissions related to viewing and managing employee data',
      icon: Users
    },
    {
      name: 'Payroll Processing',
      permissions: [
        'process_payroll',
        'approve_payroll'
      ],
      description: 'Permissions for payroll processing and approval',
      icon: Settings
    },
    {
      name: 'Reports & Analytics',
      permissions: [
        'view_financial_reports',
        'view_executive_reports',
        'view_department_reports',
        'view_own_reports'
      ],
      description: 'Permissions for viewing various types of reports',
      icon: Eye
    },
    {
      name: 'User Management',
      permissions: [
        'manage_users',
        'manage_organization_users',
        'manage_department_users'
      ],
      description: 'Permissions for managing user accounts and roles',
      icon: Shield
    },
    {
      name: 'System Configuration',
      permissions: [
        'system_configuration',
        'organization_configuration',
        'manage_integrations',
        'view_system_health'
      ],
      description: 'Permissions for system and organization configuration',
      icon: Settings
    },
    {
      name: 'Audit & Compliance',
      permissions: [
        'view_audit_logs',
        'view_sensitive_data'
      ],
      description: 'Permissions for audit trails and sensitive data access',
      icon: Lock
    },
    {
      name: 'Approvals & Workflow',
      permissions: [
        'approve_expenses',
        'approve_leave',
        'approve_overtime'
      ],
      description: 'Permissions for approving various requests',
      icon: CheckCircle
    },
    {
      name: 'Financial Management',
      permissions: [
        'manage_budgets'
      ],
      description: 'Permissions for budget management',
      icon: Settings
    },
    {
      name: 'Data Operations',
      permissions: [
        'export_data',
        'export_bank_schedule',
        'bulk_operations',
        'delete_records'
      ],
      description: 'Permissions for data export and bulk operations',
      icon: RefreshCw
    }
  ];

  const roleDefinition = ROLE_DEFINITIONS[selectedRole];
  const currentPermissions = customPermissions[selectedRole] || roleDefinition.permissions;

  const handlePermissionToggle = (permission: Permission) => {
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setCustomPermissions(prev => ({
      ...prev,
      [selectedRole]: newPermissions
    }));
    setIsEditing(true);
  };

  const handleGroupToggle = (group: PermissionGroup, enabled: boolean) => {
    const newPermissions = enabled
      ? [...currentPermissions, ...group.permissions.filter(p => !currentPermissions.includes(p))]
      : currentPermissions.filter(p => !group.permissions.includes(p));
    
    setCustomPermissions(prev => ({
      ...prev,
      [selectedRole]: newPermissions
    }));
    setIsEditing(true);
  };

  const resetToDefault = () => {
    setCustomPermissions(prev => ({
      ...prev,
      [selectedRole]: roleDefinition.permissions
    }));
    setIsEditing(false);
  };

  const saveChanges = () => {
    // In a real app, this would save to the backend
    console.log('Saving permission changes for role:', selectedRole, currentPermissions);
    setIsEditing(false);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'organization_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ceo_executive':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'payroll_manager':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hr_business_partner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'finance_controller':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'employee':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canManagePermissions = currentUser?.role === 'super_admin';

  if (!canManagePermissions) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Only super administrators can manage role permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Permission Management</h2>
          <p className="text-muted-foreground">
            Configure role-based permissions and access controls
          </p>
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefault}>
              Reset to Default
            </Button>
            <Button onClick={saveChanges}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Role to Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_DEFINITIONS).map(([roleKey, roleDef]) => (
              <Button
                key={roleKey}
                variant={selectedRole === roleKey ? "default" : "outline"}
                onClick={() => setSelectedRole(roleKey as UserRole)}
                className="flex items-center gap-2"
              >
                <Badge 
                  variant="outline" 
                  className={getRoleBadgeColor(roleKey as UserRole)}
                >
                  {roleDef.name}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getRoleBadgeColor(selectedRole)}
            >
              {roleDefinition.name}
            </Badge>
            {isEditing && (
              <Badge variant="destructive" className="animate-pulse">
                Modified
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {roleDefinition.description}
              </p>
              
              <h4 className="font-medium mb-2">Access Level</h4>
              <div className="space-y-2">
                {Object.entries(roleDefinition.canAccess).map(([resource, access]) => (
                  <div key={resource} className="flex justify-between text-sm">
                    <span className="capitalize">{resource}:</span>
                    <Badge variant="outline" className="text-xs">
                      {access}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Permission Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Permissions:</span>
                  <span className="font-medium">{currentPermissions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Permission Groups:</span>
                  <span className="font-medium">
                    {permissionGroups.filter(group => 
                      group.permissions.some(p => currentPermissions.includes(p))
                    ).length} / {permissionGroups.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Role Level:</span>
                  <Badge variant="outline" className="text-xs">
                    Level {roleDefinition.level}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Groups */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {permissionGroups.map((group) => {
              const groupPermissions = group.permissions;
              const enabledCount = groupPermissions.filter(p => currentPermissions.includes(p)).length;
              const allEnabled = enabledCount === groupPermissions.length;
              const someEnabled = enabledCount > 0 && enabledCount < groupPermissions.length;
              const GroupIcon = group.icon;

              return (
                <div key={group.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <GroupIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {enabledCount}/{groupPermissions.length}
                      </span>
                      <Checkbox
                        checked={allEnabled}
                        ref={(el) => {
                          if (el && 'indeterminate' in el) {
                            (el as any).indeterminate = someEnabled;
                          }
                        }}
                        onCheckedChange={(checked) => 
                          handleGroupToggle(group, checked as boolean)
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {groupPermissions.map((permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${selectedRole}-${permission}`}
                          checked={currentPermissions.includes(permission)}
                          onCheckedChange={() => handlePermissionToggle(permission)}
                        />
                        <Label 
                          htmlFor={`${selectedRole}-${permission}`} 
                          className="text-sm flex-1"
                        >
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Individual Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>All Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.values(ROLE_DEFINITIONS)
              .flatMap(role => role.permissions)
              .filter((permission, index, array) => array.indexOf(permission) === index)
              .sort()
              .map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={`all-${permission}`}
                    checked={currentPermissions.includes(permission)}
                    onCheckedChange={() => handlePermissionToggle(permission)}
                  />
                  <Label 
                    htmlFor={`all-${permission}`} 
                    className="text-sm flex-1"
                  >
                    {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Restrictions */}
      {roleDefinition.restrictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Role Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roleDefinition.restrictions.map((restriction, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{restriction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

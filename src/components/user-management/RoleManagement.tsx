import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Lock,
  Unlock,
  Crown,
  User,
  Briefcase,
  DollarSign,
  BarChart3,
  Settings
} from "lucide-react";
import { UserRole, ROLE_DEFINITIONS, Permission } from "@/lib/types/roles";
import { AccessControlService } from "@/lib/services/access-control";

interface RoleManagementProps {
  currentUser: any; // User type
}

export const RoleManagement = ({ currentUser }: RoleManagementProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const accessControl = new AccessControlService(currentUser);

  const getRoleIcon = (role: UserRole) => {
    if (role.startsWith('PLATFORM_SUPER')) return Crown;
    if (role.includes('ADMIN')) return Shield;
    if (role.includes('AUDITOR')) return Eye;
    if (role.includes('MANAGER')) return Briefcase;
    if (role.includes('PAYROLL')) return DollarSign;
    if (role.includes('FINANCE')) return BarChart3;
    if (role.includes('USER') || role.includes('CONTRACTOR')) return User;
    return User;
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const roleDef = ROLE_DEFINITIONS[role];
    if (roleDef.level >= 90) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    if (roleDef.level >= 70) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    if (roleDef.level >= 40) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    if (roleDef.level >= 10) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
  };

  const getPermissionCategory = (permission: Permission): string => {
    if (permission.includes('view')) return 'View';
    if (permission.includes('edit')) return 'Edit';
    if (permission.includes('process')) return 'Process';
    if (permission.includes('approve')) return 'Approve';
    if (permission.includes('manage')) return 'Manage';
    if (permission.includes('system')) return 'System';
    if (permission.includes('export')) return 'Export';
    if (permission.includes('bulk')) return 'Bulk Operations';
    if (permission.includes('delete')) return 'Delete';
    return 'Other';
  };

  const getPermissionIcon = (permission: Permission) => {
    if (permission.includes('view')) return Eye;
    if (permission.includes('edit')) return Edit;
    if (permission.includes('process')) return DollarSign;
    if (permission.includes('approve')) return CheckCircle;
    if (permission.includes('manage')) return Settings;
    if (permission.includes('system')) return Shield;
    if (permission.includes('export')) return BarChart3;
    if (permission.includes('bulk')) return Users;
    if (permission.includes('delete')) return Trash2;
    return Info;
  };

  const canManageRoles = accessControl.canManageUsers().hasPermission;

  if (!canManageRoles) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage roles and permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(ROLE_DEFINITIONS).map((role) => {
              const Icon = getRoleIcon(role.id);
              return (
                <Card key={role.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">LVL {role.level}</p>
                        </div>
                      </div>
                      <Badge className={getRoleBadgeColor(role.id)}>
                        {role.level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {role.description}
                    </p>
                    {role.canAccess && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Employees:</span>
                          <span className="capitalize">{role.canAccess.employees}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Payroll:</span>
                          <span className="capitalize">{role.canAccess.payroll}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role.id);
                          setShowRoleDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role.id);
                          setShowPermissionDialog(true);
                        }}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Permissions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Category</TableHead>
                      {Object.values(ROLE_DEFINITIONS).map(role => (
                        <TableHead key={role.id} className="text-center">
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(ROLE_DEFINITIONS).flatMap(role => role.permissions).filter((permission, index, self) =>
                      self.indexOf(permission) === index
                    ).map(permission => {
                      const Icon = getPermissionIcon(permission);
                      const category = getPermissionCategory(permission);

                      return (
                        <TableRow key={permission}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{permission}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{category}</Badge>
                          </TableCell>
                          {Object.values(ROLE_DEFINITIONS).map(role => (
                            <TableCell key={role.id} className="text-center">
                              {role.permissions.includes(permission) ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(ROLE_DEFINITIONS)
                  .sort((a, b) => b.level - a.level)
                  .map((role, index) => {
                    const Icon = getRoleIcon(role.id);
                    return (
                      <div key={role.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{role.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Level {role.level} • {role.permissions.length} permissions
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleBadgeColor(role.id)}>
                              Level {role.level}
                            </Badge>
                            {role.level === 10 && (
                              <Badge variant="destructive">
                                <Crown className="h-3 w-3 mr-1" />
                                Tier 1
                              </Badge>
                            )}
                            {role.level < 10 && (
                              <Badge variant="secondary">
                                <User className="h-3 w-3 mr-1" />
                                Self Service
                              </Badge>
                            )}
                          </div>
                        </div>
                        {index < Object.values(ROLE_DEFINITIONS).length - 1 && (
                          <div className="text-muted-foreground">
                            ↓
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Details Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRole && ROLE_DEFINITIONS[selectedRole].name}
            </DialogTitle>
            <DialogDescription>
              {selectedRole && ROLE_DEFINITIONS[selectedRole].description}
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role Level</Label>
                  <div className="p-2 border rounded">
                    {ROLE_DEFINITIONS[selectedRole].level}/10
                  </div>
                </div>
                <div>
                  <Label>Permissions Count</Label>
                  <div className="p-2 border rounded">
                    {ROLE_DEFINITIONS[selectedRole].permissions.length}
                  </div>
                </div>
              </div>

              <div>
                <Label>Scopes</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Employees</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {ROLE_DEFINITIONS[selectedRole].canAccess.employees}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Payroll</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {ROLE_DEFINITIONS[selectedRole].canAccess.payroll}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Reports</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {ROLE_DEFINITIONS[selectedRole].canAccess.reports}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">System</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {ROLE_DEFINITIONS[selectedRole].canAccess.system}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-2">
                  {ROLE_DEFINITIONS[selectedRole].permissions.map(permission => (
                    <div key={permission} className="flex items-center gap-2 p-2 border rounded">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              {ROLE_DEFINITIONS[selectedRole].restrictions.length > 0 && (
                <div>
                  <Label>Restrictions</Label>
                  <div className="mt-2 space-y-1">
                    {ROLE_DEFINITIONS[selectedRole].restrictions.map((restriction, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded bg-yellow-50 dark:bg-yellow-900/20">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{restriction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Details Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Permissions for {selectedRole && ROLE_DEFINITIONS[selectedRole].name}
            </DialogTitle>
            <DialogDescription>
              Detailed view of all permissions assigned to this role
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(
                  ROLE_DEFINITIONS[selectedRole].permissions.reduce((acc, permission) => {
                    const category = getPermissionCategory(permission);
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, permissions]) => (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {permissions.map(permission => {
                          const Icon = getPermissionIcon(permission);
                          return (
                            <div key={permission} className="flex items-center gap-2 p-2 border rounded">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="text-sm">{permission}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

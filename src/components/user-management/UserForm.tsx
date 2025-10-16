import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Shield, 
  Settings, 
  Key, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  UserPlus,
  Save
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User as UserType, UserRole, Permission } from '@/lib/types/roles';
import { ROLE_DEFINITIONS } from '@/lib/types/roles';

interface UserFormProps {
  user?: UserType | null;
  onClose: () => void;
  onSave: (user: UserType) => void;
  currentUser?: UserType | null;
}

const userFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum([
    'super_admin',
    'organization_admin',
    'ceo_executive',
    'payroll_manager',
    'employee',
    'hr_business_partner',
    'finance_controller'
  ] as const),
  organizationId: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().default(true),
  twoFactorEnabled: z.boolean().default(false),
  sessionTimeout: z.number().min(30).max(1440).default(480),
  permissions: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
  sendInvitation: z.boolean().default(true),
  temporaryPassword: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UserForm({ user, onClose, onSave, currentUser }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatePassword, setGeneratePassword] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [customPermissions, setCustomPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      role: user?.role || 'employee',
      organizationId: user?.organizationId || '',
      departmentId: user?.departmentId || '',
      managerId: user?.managerId || '',
      isActive: user?.isActive ?? true,
      twoFactorEnabled: user?.twoFactorEnabled ?? false,
      sessionTimeout: user?.sessionTimeout || 480,
      permissions: user?.permissions || [],
      restrictions: user?.restrictions || [],
      sendInvitation: !isEditing,
      temporaryPassword: '',
    },
  });

  const selectedRole = form.watch('role');
  const roleDefinition = ROLE_DEFINITIONS[selectedRole];

  useEffect(() => {
    if (selectedRole) {
      // Set default permissions for the role
      const defaultPermissions = roleDefinition.permissions;
      form.setValue('permissions', defaultPermissions);
      setCustomPermissions(defaultPermissions);
    }
  }, [selectedRole, form, roleDefinition]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    form.setValue('temporaryPassword', newPassword);
  };

  const handlePermissionToggle = (permission: Permission) => {
    const currentPermissions = form.getValues('permissions');
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    form.setValue('permissions', newPermissions);
    setCustomPermissions(newPermissions);
  };

  const canManageSuperAdmins = currentUser?.role === 'super_admin';
  const canEditUser = (targetUser: UserType | null) => {
    if (!targetUser) return true; // Creating new user
    if (!currentUser) return false;
    
    // Super admins can edit anyone
    if (currentUser.role === 'super_admin') return true;
    
    // Organization admins can edit users in their organization
    if (currentUser.role === 'organization_admin') {
      return currentUser.organizationId === targetUser.organizationId;
    }
    
    return false;
  };

  const onSubmit = async (values: UserFormValues) => {
    if (!canEditUser(user)) {
      setError('You do not have permission to edit this user');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userData: UserType = {
        id: user?.id || `user-${Date.now()}`,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
        organizationId: values.organizationId || undefined,
        departmentId: values.departmentId || undefined,
        managerId: values.managerId || undefined,
        isActive: values.isActive,
        lastLogin: user?.lastLogin,
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: values.permissions,
        restrictions: values.restrictions,
        twoFactorEnabled: values.twoFactorEnabled,
        sessionTimeout: values.sessionTimeout,
      };

      onSave(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
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

  const availableRoles = Object.entries(ROLE_DEFINITIONS).filter(([roleKey]) => {
    if (roleKey === 'super_admin') {
      return canManageSuperAdmins;
    }
    return true;
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <User className="h-5 w-5" />
                Edit User
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Create New User
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update user information, role, and permissions'
              : 'Create a new user account and send invitation email'
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissions
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input 
                            placeholder="Enter email address" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableRoles.map(([roleKey, roleDef]) => (
                              <SelectItem key={roleKey} value={roleKey}>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={getRoleBadgeColor(roleKey as UserRole)}
                                  >
                                    {roleDef.name}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {roleDefinition.description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sessionTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Timeout (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="30" 
                            max="1440" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum session duration in minutes (30-1440)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="organizationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter organization ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter department ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active User</FormLabel>
                          <FormDescription>
                            Enable or disable this user account
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Default Role Permissions</h4>
                    <Badge variant="outline" className={getRoleBadgeColor(selectedRole)}>
                      {roleDefinition.name}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      {roleDefinition.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Custom Permissions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roleDefinition.permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={customPermissions.includes(permission)}
                            onCheckedChange={() => handlePermissionToggle(permission)}
                          />
                          <Label htmlFor={permission} className="text-sm">
                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="twoFactorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Two-Factor Authentication</FormLabel>
                          <FormDescription>
                            Require 2FA for additional security
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {!isEditing && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={generatePassword}
                        onCheckedChange={setGeneratePassword}
                      />
                      <Label>Generate temporary password</Label>
                    </div>

                    {generatePassword && (
                      <FormField
                        control={form.control}
                        name="temporaryPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temporary Password</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Temporary password"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleGeneratePassword}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              A temporary password for initial login
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="sendInvitation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Send invitation email</FormLabel>
                              <FormDescription>
                                Send an email invitation to the user
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update User
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Create & Send Invitation
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}



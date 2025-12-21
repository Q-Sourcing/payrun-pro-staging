import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
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
import { ROLE_DEFINITIONS, ORG_SUPER_ADMIN } from '@/lib/types/roles';
import { AuditLogger } from '@/lib/services/audit-logger';

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
  // Role is now derived or primary, but we validate that at least one is selected in the UI state
  // We keep 'role' in schema for legacy compatibility but make it optional or derived
  role: z.string().optional(),
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
      role: user?.role || 'SELF_USER',
      managerId: user?.managerId || '',
      isActive: user?.isActive ?? true,
      twoFactorEnabled: user?.twoFactorEnabled ?? false,
      sessionTimeout: user?.sessionTimeout || 480,
      permissions: user?.permissions || [],
      restrictions: user?.restrictions || [],
      sendInvitation: !isEditing,
    },
  });

  // Multi-Role State
  const [availableOrgRoles, setAvailableOrgRoles] = useState<{ id: string; key: string; name: string; description: string | null; org_id?: string }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]); // Array of role IDs
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch Companies Logic
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    const fetchRolesAndCompanies = async () => {
      setLoadingRoles(true);
      setLoadingCompanies(true);
      try {
        // Fetch Roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('org_roles')
          .select('id, key, name, description, org_id')
          .order('name');

        if (rolesError) throw rolesError;
        setAvailableOrgRoles(rolesData || []);

        // Fetch Companies
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');

        if (companiesError) throw companiesError;
        setCompanies(companiesData || []);

      } catch (err) {
        console.error('Failed to fetch dependencies', err);
      } finally {
        setLoadingRoles(false);
        setLoadingCompanies(false);
      }
    };
    fetchRolesAndCompanies();
  }, []);

  // Hydrate user data (roles & companies)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      // 1. Companies
      const { data: companyData } = await supabase
        .from('user_company_memberships')
        .select('company_id')
        .eq('user_id', user.id);
      if (companyData) {
        setSelectedCompanies(companyData.map(d => d.company_id));
      }

      // 2. Roles (via org_user_roles -> org_users)
      // First find existing org_user record
      const { data: orgUserData } = await supabase
        .from('org_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (orgUserData) {
        const { data: userRolesData } = await supabase
          .from('org_user_roles')
          .select('role_id')
          .eq('org_user_id', orgUserData.id);

        if (userRolesData) {
          setSelectedRoles(userRolesData.map(r => r.role_id));
        }
      } else {
        // Fallback: If no org_user_roles, map legacy role to new roles if possible
        // This is a heuristic if the user hasn't been migrated yet
      }
    };

    if (isEditing) {
      fetchUserData();
    }
  }, [user, isEditing]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };


  const toggleCompany = (companyId: string) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId) ? prev.filter(c => c !== companyId) : [...prev, companyId]
    );
  };

  const toggleAllCompanies = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.id));
    }
  };

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
    setCustomPermissions(newPermissions as Permission[]);
  };

  const canManageSuperAdmins = currentUser?.role === 'PLATFORM_SUPER_ADMIN';
  const canEditUser = (targetUser: UserType | null) => {
    if (!targetUser) return true; // Creating new user
    if (!currentUser) return false;

    // Platform super admins can edit anyone
    if (currentUser.role === 'PLATFORM_SUPER_ADMIN') return true;

    // Organization admins can edit users in their organization
    if (currentUser.role === 'ORG_ADMIN') {
      return currentUser.organizationId === targetUser.organizationId;
    }

    return false;
  };

  const onSubmit = async (values: UserFormValues) => {
    if (!canEditUser(user)) {
      setError('You do not have permission to edit this user');
      return;
    }

    if (selectedCompanies.length === 0) {
      setError('Please assign access to at least one company.');
      return;
    }

    if (selectedRoles.length === 0) {
      setError('Please assign at least one role.');
      return;
    }

    // Determine primary role for legacy compatibility (highest privilege or first selected)
    // Simple heuristic: just pick the first one's key for now, or default to 'employee'
    // In a real scenario, we'd rank them.
    const primaryRoleObj = availableOrgRoles.find(r => r.id === selectedRoles[0]);
    const legacyRole = (primaryRoleObj?.key.toUpperCase() as UserRole) || 'SELF_USER';
    // Note: This casting might be rough if keys don't match exactly. 
    // Ideally we map ORG_ADMIN -> org_admin.
    // For now, we assume keys are somewhat compatible or we default safe.

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        // Simulate API call for Editing
        await new Promise(resolve => setTimeout(resolve, 1000));

        const userData: UserType = {
          id: user?.id || `user-${Date.now()}`,
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          role: legacyRole,
          managerId: values.managerId || undefined,
          isActive: values.isActive,
          lastLogin: user?.lastLogin,
          createdAt: user?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: values.permissions as Permission[],
          restrictions: values.restrictions,
          twoFactorEnabled: values.twoFactorEnabled,
          sessionTimeout: values.sessionTimeout,
        };

        onSave(userData);

        // 1. Update Companies
        const { error: deleteError } = await supabase
          .from('user_company_memberships')
          .delete()
          .eq('user_id', user!.id);

        if (deleteError) throw deleteError;

        const memberships = selectedCompanies.map(companyId => ({
          user_id: user!.id,
          company_id: companyId,
          role: legacyRole
        }));

        const { error: insertError } = await supabase
          .from('user_company_memberships')
          .insert(memberships);

        if (insertError) throw insertError;

        // 2. Update Roles (Sync org_user_roles)
        // Ensure org_user exists
        const { data: orgUser, error: orgUserError } = await supabase
          .from('org_users')
          .select('id')
          .eq('user_id', user!.id)
          .maybeSingle(); // Use maybeSingle to avoid 406 if not found

        let orgUserId = orgUser?.id;

        if (!orgUserId) {
          // Create org_user if missing (though it should exist via migration or trigger)
          // We need organization_id. Assuming current user's org or fetching from profile.
          // For this scope, we assume it exists or we skip.
          // Best effort:
          const { data: newOrgUser, error: createOrgUserError } = await supabase
            .from('org_users')
            .insert({
              user_id: user!.id,
              org_id: currentUser?.organizationId || '', // Fallback
              status: 'active'
            })
            .select('id')
            .single();
          if (newOrgUser) orgUserId = newOrgUser.id;
        }

        if (orgUserId) {
          // Sync Roles
          await supabase.from('org_user_roles').delete().eq('org_user_id', orgUserId);

          const roleAssignments = selectedRoles.map(roleId => ({
            org_user_id: orgUserId!,
            role_id: roleId
          }));

          await supabase.from('org_user_roles').insert(roleAssignments);
        }

        // Audit Log for Updates
        await AuditLogger.log(
          'user.update',
          'user',
          {
            id: user?.id,
            email: values.email,
            roles: selectedRoles,
            companies: selectedCompanies
          },
          {
            privileged: selectedRoles.some(r => {
              const role = availableOrgRoles.find(ar => ar.id === r);
              return role?.key === 'ORG_OWNER' || role?.key === 'ORG_ADMIN';
            })
          }
        );
      } else {
        // Create User via Edge Function (Enterprise Invite Flow)
        // 1. Map Role IDs to Keys
        const roleKeys = selectedRoles.map(rId => {
          const r = availableOrgRoles.find(ar => ar.id === rId);
          return r?.key || 'EMPLOYEE';
        });

        // 2. Prepare Payload
        // We assume the current user's organization is the target, or fallback to the first role's org
        const targetOrgId = currentUser?.organizationId || (availableOrgRoles[0] as any)?.org_id;

        if (!targetOrgId) {
          throw new Error("Could not determine organization context.");
        }

        const payload = {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          orgId: targetOrgId,
          roles: roleKeys,
          companyIds: selectedCompanies,
          sendInvite: values.sendInvitation
        };

        const { data, error: invokeError } = await supabase.functions.invoke('invite-org-user', {
          body: payload
        });

        if (invokeError) {
          // Try to parse detailed error
          let msg = invokeError.message;
          try {
            const body = await invokeError.context.json();
            if (body.message) msg = body.message;
          } catch (e) { }
          throw new Error(msg || "Failed to invite user");
        }

        if (!data.success) throw new Error(data.message || "Failed to create user invitation");

        // Success - Optimistic UI Update or just close
        // The user is not "Active" yet, they are "Invited". 
        // We return a placeholder user object so the UI might update or just rely on invalidation.
        const newUser: UserType = {
          id: data.inviteId || `pending-${Date.now()}`,
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          role: roleKeys[0] as UserRole, // Approximation
          managerId: values.managerId || undefined,
          isActive: false, // Pending
          lastLogin: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: [],
          restrictions: [],
          twoFactorEnabled: values.twoFactorEnabled,
          sessionTimeout: values.sessionTimeout,
        };

        onSave(newUser);

        // Log Audit
        await AuditLogger.log(
          'user.invite',
          'user',
          { email: values.email, roles: roleKeys, companies: selectedCompanies },
          { privileged: roleKeys.some(k => k.includes('ADMIN') || k.includes('OWNER')) }
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    if (role.startsWith('PLATFORM_')) return 'bg-red-100 text-red-800 border-red-200';
    if (role.startsWith('ORG_')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (role.startsWith('COMPANY_')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (role.startsWith('PROJECT_')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const availableRoles = Object.entries(ROLE_DEFINITIONS).filter(([roleKey]) => {
    if (roleKey === 'PLATFORM_SUPER_ADMIN') {
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

                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium">Roles & Responsibilities</h4>
                      <p className="text-xs text-muted-foreground">Assign multiple roles to define user access.</p>
                    </div>
                  </div>

                  {loadingRoles ? (
                    <div className="text-sm">Loading roles...</div>
                  ) : (
                    <div className="space-y-3">
                      {['Administration', 'HR & People', 'Payroll', 'Finance', 'Projects', 'Other'].map(category => {
                        const categoryRoles = availableOrgRoles.filter(r => {
                          // Heuristic mapping based on keys
                          const k = r.key;
                          if (category === 'Administration') return k.includes('OWNER') || k.includes('ADMIN') && !k.includes('PAYROLL');
                          if (category === 'HR & People') return k.includes('HR');
                          if (category === 'Payroll') return k.includes('PAYROLL');
                          if (category === 'Finance') return k.includes('FINANCE') || k.includes('APPROVER');
                          if (category === 'Projects') return k.includes('PROJECT');
                          if (category === 'Other') return k.includes('VIEWER') || !k.match(/OWNER|ADMIN|HR|PAYROLL|FINANCE|PROJECT/);
                          return false;
                        });

                        if (categoryRoles.length === 0) return null;

                        return (
                          <div key={category}>
                            <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{category}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {categoryRoles.map(role => (
                                <div key={role.id} className={`flex items-start space-x-2 border p-2 rounded transition-colors ${selectedRoles.includes(role.id) ? 'bg-background border-primary' : 'hover:bg-muted/50'}`}>
                                  <Checkbox
                                    id={`role-${role.id}`}
                                    checked={selectedRoles.includes(role.id)}
                                    onCheckedChange={() => toggleRole(role.id)}
                                    className="mt-1"
                                  />
                                  <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor={`role-${role.id}`} className="cursor-pointer text-sm font-medium leading-none">
                                      {role.name}
                                    </Label>
                                    <p className="text-xs text-muted-foreground pr-2">
                                      {role.description}
                                    </p>
                                    {(role.key === 'ORG_OWNER' || role.key === 'ORG_ADMIN') && (
                                      <div className="flex items-center text-amber-600 text-[10px] mt-1">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        High Privilege
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Selected: <span className="font-medium text-foreground">{selectedRoles.length}</span> roles
                  </div>
                </div>

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




                {/* Company Access Section */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Company Access Scope</h4>
                      <p className="text-xs text-muted-foreground">Select which companies this user can access.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCompanies([])} className="text-xs h-8">
                        Clear
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={toggleAllCompanies} className="text-xs h-8">
                        {selectedCompanies.length === companies.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>

                  {loadingCompanies ? (
                    <div className="text-sm text-muted-foreground p-2">Loading companies...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                      {companies.map(company => (
                        <div key={company.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={`company-${company.id}`}
                            checked={selectedCompanies.includes(company.id)}
                            onCheckedChange={() => toggleCompany(company.id)}
                          />
                          <Label htmlFor={`company-${company.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                            {company.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{selectedCompanies.length}</span> of {companies.length} companies
                  </p>
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
                    <p className="text-sm text-muted-foreground mt-2">
                      Permissions are derived from the selected roles above.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Custom Permissions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Custom permissions support to be re-evaluated with multi-role */}
                      <div className="text-sm text-muted-foreground">Custom permissions editing is temporarily disabled while multiple roles are active.</div>
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
                      <FormField
                        control={form.control}
                        name="sendInvitation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled // Always send invitation for now
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Send invitation email</FormLabel>
                              <FormDescription>
                                An invitation email will be sent to the user to set their password.
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
    </Dialog >
  );
}



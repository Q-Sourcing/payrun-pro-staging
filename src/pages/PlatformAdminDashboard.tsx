import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Settings, Shield, ArrowRight, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformUserManagement } from '@/components/platform-admin/PlatformUserManagement';
import { PlatformEmailSettings } from '@/components/platform-admin/email/PlatformEmailSettings';
import { PlatformTemplateManager } from '@/components/platform-admin/email/PlatformTemplateManager';
import { PlatformEmailLogs } from '@/components/platform-admin/email/PlatformEmailLogs';

interface Organization {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  companies_count?: number;
  users_count?: number;
}

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useSupabaseAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalCompanies: 0,
    totalUsers: 0,
    activeOrganizations: 0,
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      // Load organizations with counts
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          description,
          active,
          created_at,
          companies:companies(count),
          user_profiles:user_profiles(count)
        `)
        .order('created_at', { ascending: false });

      if (orgsError) {
        console.error('Error loading organizations:', orgsError);
        toast({
          title: 'Error',
          description: 'Failed to load organizations',
          variant: 'destructive',
        });
        return;
      }

      const orgs = (orgsData || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        active: org.active,
        created_at: org.created_at,
        companies_count: org.companies?.[0]?.count || 0,
        users_count: org.user_profiles?.[0]?.count || 0,
      }));

      setOrganizations(orgs);

      // Calculate stats
      const totalCompanies = orgs.reduce((sum, org) => sum + (org.companies_count || 0), 0);
      const totalUsers = orgs.reduce((sum, org) => sum + (org.users_count || 0), 0);
      setStats({
        totalOrganizations: orgs.length,
        totalCompanies,
        totalUsers,
        activeOrganizations: orgs.filter((o) => o.active).length,
      });
    } catch (error) {
      console.error('Exception loading organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToOrganization = (orgId: string) => {
    localStorage.setItem('login_mode', 'organization');
    localStorage.setItem('active_organization_id', orgId);
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('login_mode');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading platform admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Platform Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Manage all organizations and platform settings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeOrganizations} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">Across all organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Platform-wide</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/platform-admin/settings')}
              >
                Platform Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="organizations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="email">Email System</TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>
                  Manage and switch between organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No organizations found. Create your first organization to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Companies</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>
                            <Badge variant={org.active ? 'default' : 'secondary'}>
                              {org.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{org.companies_count || 0}</TableCell>
                          <TableCell>{org.users_count || 0}</TableCell>
                          <TableCell>
                            {new Date(org.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSwitchToOrganization(org.id)}
                            >
                              Switch to
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <PlatformUserManagement />
          </TabsContent>

          <TabsContent value="email">
            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList>
                <TabsTrigger value="settings">Global Settings</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>
              <TabsContent value="settings"><PlatformEmailSettings /></TabsContent>
              <TabsContent value="templates"><PlatformTemplateManager /></TabsContent>
              <TabsContent value="logs"><PlatformEmailLogs /></TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


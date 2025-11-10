import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  Building2, 
  Settings, 
  Shield, 
  Database, 
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Server,
  CreditCard,
  TrendingUp,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { useUsers } from '@/hooks/use-users';
import { useEmployees } from '@/hooks/use-employees';
import { usePayGroups } from '@/hooks/use-paygroups';
import { usePayRuns } from '@/hooks/use-payruns';
import { ROLE_DEFINITIONS } from '@/lib/types/roles';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { SuperAdminBadge } from '@/components/admin/SuperAdminBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminPage() {
  const { role, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Fetch data (with error handling)
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 1000 });
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ limit: 1000 });
  const { data: payGroupsData, isLoading: payGroupsLoading } = usePayGroups({ limit: 1000 });
  const { data: payRunsData, isLoading: payRunsLoading } = usePayRuns({ limit: 1000 });

  // Check if user is super admin
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You need Super Admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your current role: {role && <RoleBadge role={role} />}
            </p>
            <Button onClick={() => window.history.back()} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const checkSystemHealth = async () => {
    setLoadingHealth(true);
    try {
      // Check database connectivity
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
      
      // Check auth service
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check storage (if applicable)
      const { data: storageData, error: storageError } = await supabase.storage.listBuckets();

      setSystemHealth({
        database: !dbError ? 'healthy' : 'unhealthy',
        auth: user ? 'healthy' : 'unhealthy',
        storage: !storageError ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });

      toast({
        title: 'System Health Check Complete',
        description: 'System status updated',
      });
    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to check system health',
        variant: 'destructive',
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  // Calculate statistics (with safe defaults)
  const userStats = {
    total: usersData?.data?.length || 0,
    byRole: (usersData?.data || []).reduce((acc: Record<string, number>, user: any) => {
      const role = user.role || 'employee';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {}),
  };

  const employeeStats = {
    total: employeesData?.total || 0,
    active: (employeesData?.data || []).filter((e: any) => e.status === 'active').length,
    byType: (employeesData?.data || []).reduce((acc: Record<string, number>, emp: any) => {
      const type = emp.employee_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
  };

  const payGroupStats = {
    total: payGroupsData?.total || 0,
    active: (payGroupsData?.data || []).filter((pg: any) => pg.status === 'active').length,
    byType: (payGroupsData?.data || []).reduce((acc: Record<string, number>, pg: any) => {
      const type = pg.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
  };

  const payRunStats = {
    total: payRunsData?.total || 0,
    draft: (payRunsData?.data || []).filter((pr: any) => pr.status === 'draft').length,
    pending: (payRunsData?.data || []).filter((pr: any) => pr.status === 'pending_approval').length,
    approved: (payRunsData?.data || []).filter((pr: any) => pr.status === 'approved').length,
    processed: (payRunsData?.data || []).filter((pr: any) => pr.status === 'processed').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
              <SuperAdminBadge />
            </div>
            <p className="text-slate-600">System-wide administration and monitoring</p>
          </div>
          <Button onClick={checkSystemHealth} disabled={loadingHealth}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingHealth ? 'animate-spin' : ''}`} />
            Check System Health
          </Button>
        </div>

        {/* System Health Status */}
        {systemHealth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Health
              </CardTitle>
              <CardDescription>Last checked: {new Date(systemHealth.timestamp).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <span className="font-medium">Database</span>
                  </div>
                  {systemHealth.database === 'healthy' ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Unhealthy
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Authentication</span>
                  </div>
                  {systemHealth.auth === 'healthy' ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Unhealthy
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    <span className="font-medium">Storage</span>
                  </div>
                  {systemHealth.storage === 'healthy' ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Unhealthy
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total}</div>
              <p className="text-xs text-muted-foreground">Across all organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeeStats.total}</div>
              <p className="text-xs text-muted-foreground">{employeeStats.active} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pay Groups</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payGroupStats.total}</div>
              <p className="text-xs text-muted-foreground">{payGroupStats.active} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pay Runs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payRunStats.total}</div>
              <p className="text-xs text-muted-foreground">{payRunStats.processed} processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="system">System Config</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(userStats.byRole).length > 0 ? (
                      Object.entries(userStats.byRole).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between">
                          <RoleBadge role={role as any} variant="outline" />
                          <span className="font-semibold">{count as number}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No user data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Employee Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Distribution by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(employeeStats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pay Run Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Pay Run Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Draft</span>
                      <Badge variant="outline">{payRunStats.draft}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending Approval</span>
                      <Badge variant="outline" className="bg-yellow-50">{payRunStats.pending}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Approved</span>
                      <Badge variant="outline" className="bg-blue-50">{payRunStats.approved}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Processed</span>
                      <Badge variant="outline" className="bg-green-50">{payRunStats.processed}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pay Group Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Pay Group Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(payGroupStats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage all users across the system</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  User management interface will be integrated here. Total users: {userStats.total}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Management</CardTitle>
                <CardDescription>Manage organizations and tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Organization management interface will be integrated here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Global system settings and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  System configuration interface will be integrated here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>Global analytics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Analytics dashboard will be integrated here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


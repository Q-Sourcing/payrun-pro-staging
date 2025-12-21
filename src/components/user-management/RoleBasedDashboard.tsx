import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  DollarSign,
  TrendingUp,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  FileText,
  Settings,
  Database,
  Bell,
  UserCheck,
  UserX,
  Calendar,
  CreditCard
} from "lucide-react";
import { User, UserRole, ROLE_DEFINITIONS } from "@/lib/types/roles";
import { AccessControlService } from "@/lib/services/access-control";

interface RoleBasedDashboardProps {
  currentUser: User;
}

export const RoleBasedDashboard = ({ currentUser }: RoleBasedDashboardProps) => {
  const [accessControl] = useState(new AccessControlService(currentUser));
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate loading dashboard data based on user role
      const data = await getRoleBasedData(currentUser.role);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBasedData = async (role: UserRole) => {
    // Simulate API call to get role-specific data
    return new Promise((resolve) => {
      setTimeout(() => {
        const roleDef = ROLE_DEFINITIONS[role];
        resolve({
          role: roleDef,
          metrics: getRoleMetrics(role),
          recentActivity: getRecentActivity(role),
          alerts: getRoleAlerts(role),
          quickActions: getQuickActions(role)
        });
      }, 1000);
    });
  };

  const getRoleMetrics = (role: UserRole) => {
    switch (role) {
      case 'PLATFORM_SUPER_ADMIN':
        return {
          totalUsers: 1250,
          activeUsers: 1180,
          totalOrganizations: 15,
          systemHealth: 99.8,
          lastSync: '2 minutes ago'
        };
      case 'ORG_ADMIN':
        return {
          totalEmployees: 450,
          activeEmployees: 425,
          pendingPayroll: 2,
          totalCost: 125000,
          lastPayroll: '1 week ago'
        };
      case 'COMPANY_PAYROLL_ADMIN':
        return {
          teamSize: 25,
          pendingApprovals: 8,
          processedThisMonth: 125,
          overtimeHours: 45,
          attendanceRate: 96.2
        };
      case 'SELF_USER':
        return {
          currentPay: 3500,
          ytdEarnings: 42000,
          leaveBalance: 15,
          nextPayday: '2024-01-15',
          taxWithholding: 850
        };
      case 'ORG_HR_ADMIN':
        return {
          totalEmployees: 450,
          newHires: 12,
          terminations: 3,
          pendingReviews: 25,
          complianceScore: 98.5
        };
      case 'ORG_FINANCE_CONTROLLER':
        return {
          totalPayroll: 2500000,
          taxLiabilities: 125000,
          pendingApprovals: 5,
          budgetVariance: -2.5,
          auditScore: 100
        };
      default:
        return {};
    }
  };

  const getRecentActivity = (role: UserRole) => {
    const baseActivities = [
      { id: 1, type: 'login', message: 'User logged in', timestamp: '2 hours ago' },
      { id: 2, type: 'update', message: 'Profile updated', timestamp: '4 hours ago' }
    ];

    switch (role) {
      case 'PLATFORM_SUPER_ADMIN':
        return [
          ...baseActivities,
          { id: 3, type: 'system', message: 'System backup completed', timestamp: '1 hour ago' },
          { id: 4, type: 'user', message: 'New user created', timestamp: '3 hours ago' }
        ];
      case 'ORG_ADMIN':
        return [
          ...baseActivities,
          { id: 3, type: 'payroll', message: 'Payroll processed', timestamp: '1 hour ago' },
          { id: 4, type: 'employee', message: 'New employee added', timestamp: '2 hours ago' }
        ];
      case 'COMPANY_PAYROLL_ADMIN':
        return [
          ...baseActivities,
          { id: 3, type: 'approval', message: 'Overtime approved', timestamp: '1 hour ago' },
          { id: 4, type: 'timesheet', message: 'Timesheet submitted', timestamp: '2 hours ago' }
        ];
      default:
        return baseActivities;
    }
  };

  const getRoleAlerts = (role: UserRole) => {
    switch (role) {
      case 'PLATFORM_SUPER_ADMIN':
        return [
          { id: 1, type: 'warning', message: 'System maintenance scheduled for tonight', priority: 'medium' },
          { id: 2, type: 'info', message: 'New integration available', priority: 'low' }
        ];
      case 'ORG_ADMIN':
        return [
          { id: 1, type: 'warning', message: 'Payroll deadline approaching', priority: 'high' },
          { id: 2, type: 'info', message: 'New employee onboarding required', priority: 'medium' }
        ];
      case 'COMPANY_PAYROLL_ADMIN':
        return [
          { id: 1, type: 'warning', message: 'Overtime approval pending', priority: 'high' },
          { id: 2, type: 'info', message: 'Timesheet submission reminder', priority: 'medium' }
        ];
      default:
        return [];
    }
  };

  const getQuickActions = (role: UserRole) => {
    switch (role) {
      case 'PLATFORM_SUPER_ADMIN':
        return [
          { id: 1, label: 'System Settings', icon: Settings, action: '/settings' },
          { id: 2, label: 'User Management', icon: Users, action: '/users' },
          { id: 3, label: 'System Health', icon: Activity, action: '/health' },
          { id: 4, label: 'Audit Logs', icon: FileText, action: '/audit' }
        ];
      case 'ORG_ADMIN':
        return [
          { id: 1, label: 'Process Payroll', icon: DollarSign, action: '/payroll' },
          { id: 2, label: 'Add Employee', icon: UserCheck, action: '/employees' },
          { id: 3, label: 'Reports', icon: BarChart3, action: '/reports' },
          { id: 4, label: 'Settings', icon: Settings, action: '/settings' }
        ];
      case 'COMPANY_PAYROLL_ADMIN':
        return [
          { id: 1, label: 'Approve Overtime', icon: Clock, action: '/approvals' },
          { id: 2, label: 'Team Timesheets', icon: Calendar, action: '/timesheets' },
          { id: 3, label: 'Department Reports', icon: PieChart, action: '/reports' },
          { id: 4, label: 'Leave Requests', icon: Calendar, action: '/leave' }
        ];
      case 'SELF_USER':
        return [
          { id: 1, label: 'View Payslip', icon: FileText, action: '/payslip' },
          { id: 2, label: 'Submit Timesheet', icon: Clock, action: '/timesheet' },
          { id: 3, label: 'Request Leave', icon: Calendar, action: '/leave' },
          { id: 4, label: 'Update Profile', icon: Users, action: '/profile' }
        ];
      default:
        return [];
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const roleDef = ROLE_DEFINITIONS[role];
    switch (roleDef.level) {
      case 100:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case 80:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case 75:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case 70:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case 50:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case 1:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'low':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data.
        </AlertDescription>
      </Alert>
    );
  }

  const { role, metrics, recentActivity, alerts, quickActions } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {currentUser.firstName} {currentUser.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRoleBadgeColor(currentUser.role)}>
            {role.name}
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any) => (
            <Alert key={alert.id} className={getAlertColor(alert.priority)}>
              {getAlertIcon(alert.type)}
              <AlertDescription>
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action: any) => (
              <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <action.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{action.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {accessControl.getAccessibleDashboardSections().includes('reports') && (
            <TabsTrigger value="reports">Reports</TabsTrigger>
          )}
          {accessControl.getAccessibleDashboardSections().includes('analytics') && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
          {accessControl.getAccessibleDashboardSections().includes('activity') && (
            <TabsTrigger value="activity">Activity</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Role Level</p>
                  <p className="text-lg font-bold">{role.level}/100</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Scope</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Employees:</span>
                      <span className="capitalize">{role.canAccess.employees}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Payroll:</span>
                      <span className="capitalize">{role.canAccess.payroll}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Reports:</span>
                      <span className="capitalize">{role.canAccess.reports}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accessControl.canView('reports').hasPermission && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">Financial Reports</p>
                          <p className="text-sm text-muted-foreground">View financial summaries</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {accessControl.canView('employees').hasPermission && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">Employee Reports</p>
                          <p className="text-sm text-muted-foreground">View employee data</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics charts would be displayed here based on user role and permissions.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

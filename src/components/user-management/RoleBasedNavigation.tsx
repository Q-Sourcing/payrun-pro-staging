import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  FileText, 
  Settings, 
  Shield,
  BarChart3,
  Activity,
  Database,
  Bell,
  UserCheck,
  Clock,
  CreditCard,
  PieChart,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { User, UserRole, ROLE_DEFINITIONS } from "@/lib/types/roles";
import { AccessControlService } from "@/lib/services/access-control";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredPermission?: string;
  requiredRole?: UserRole[];
  badge?: string;
  children?: NavigationItem[];
}

interface RoleBasedNavigationProps {
  currentUser: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const RoleBasedNavigation = ({ 
  currentUser, 
  activeTab, 
  onTabChange 
}: RoleBasedNavigationProps) => {
  const [accessControl] = useState(new AccessControlService(currentUser));

  // Define navigation items based on roles
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: Activity,
        path: "/dashboard"
      }
    ];

    // Add role-specific items
    const roleDef = ROLE_DEFINITIONS[currentUser.role];
    
    // Employee management
    if (accessControl.canView('employees').hasPermission) {
      baseItems.push({
        id: "employees",
        label: "Employees",
        icon: Users,
        path: "/employees",
        requiredPermission: "view_organization_employees",
        children: accessControl.canEdit('employees').hasPermission ? [
          {
            id: "employee-list",
            label: "Employee List",
            icon: Users,
            path: "/employees/list"
          },
          {
            id: "add-employee",
            label: "Add Employee",
            icon: UserCheck,
            path: "/employees/add"
          }
        ] : undefined
      });
    }

    // Payroll management
    if (accessControl.canView('payroll').hasPermission) {
      baseItems.push({
        id: "payroll",
        label: "Payroll",
        icon: DollarSign,
        path: "/payroll",
        requiredPermission: "process_payroll",
        children: [
          {
            id: "payruns",
            label: "Pay Runs",
            icon: Calendar,
            path: "/payroll/runs"
          },
          {
            id: "paygroups",
            label: "Pay Groups",
            icon: Users,
            path: "/payroll/groups"
          },
          ...(accessControl.canApprove('payroll').hasPermission ? [{
            id: "approvals",
            label: "Approvals",
            icon: Shield,
            path: "/payroll/approvals",
            badge: "3"
          }] : [])
        ]
      });
    }

    // Reports
    if (accessControl.canView('reports').hasPermission) {
      baseItems.push({
        id: "reports",
        label: "Reports",
        icon: BarChart3,
        path: "/reports",
        requiredPermission: "view_financial_reports",
        children: [
          {
            id: "financial-reports",
            label: "Financial Reports",
            icon: DollarSign,
            path: "/reports/financial"
          },
          {
            id: "employee-reports",
            label: "Employee Reports",
            icon: Users,
            path: "/reports/employees"
          },
          ...(accessControl.hasPermission('view_executive_reports').hasPermission ? [{
            id: "executive-reports",
            label: "Executive Reports",
            icon: TrendingUp,
            path: "/reports/executive"
          }] : [])
        ]
      });
    }

    // User management (for admins)
    if (accessControl.canManageUsers().hasPermission) {
      baseItems.push({
        id: "user-management",
        label: "User Management",
        icon: Shield,
        path: "/users",
        requiredPermission: "manage_users",
        children: [
          {
            id: "users",
            label: "Users",
            icon: Users,
            path: "/users/list"
          },
          {
            id: "roles",
            label: "Roles & Permissions",
            icon: Shield,
            path: "/users/roles"
          },
          {
            id: "audit-logs",
            label: "Audit Logs",
            icon: FileText,
            path: "/users/audit"
          }
        ]
      });
    }

    // System settings (for admins)
    if (accessControl.hasPermission('system_configuration').hasPermission) {
      baseItems.push({
        id: "settings",
        label: "Settings",
        icon: Settings,
        path: "/settings",
        requiredPermission: "system_configuration",
        children: [
          {
            id: "general-settings",
            label: "General",
            icon: Settings,
            path: "/settings/general"
          },
          {
            id: "integrations",
            label: "Integrations",
            icon: Database,
            path: "/settings/integrations"
          },
          {
            id: "notifications",
            label: "Notifications",
            icon: Bell,
            path: "/settings/notifications"
          }
        ]
      });
    }

    // Personal items for employees
    if (currentUser.role === 'employee') {
      baseItems.push(
        {
          id: "payslips",
          label: "Payslips",
          icon: FileText,
          path: "/payslips"
        },
        {
          id: "timesheet",
          label: "Timesheet",
          icon: Clock,
          path: "/timesheet"
        },
        {
          id: "leave",
          label: "Leave",
          icon: Calendar,
          path: "/leave"
        },
        {
          id: "profile",
          label: "Profile",
          icon: UserCheck,
          path: "/profile"
        }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const getRoleBadgeColor = (role: UserRole) => {
    const roleDef = ROLE_DEFINITIONS[role];
    switch (roleDef.level) {
      case 10:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case 8:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case 7:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case 6:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case 5:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case 4:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case 1:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const canAccessItem = (item: NavigationItem): boolean => {
    // Check if user has required permission
    if (item.requiredPermission) {
      const permissionCheck = accessControl.hasPermission(item.requiredPermission as any);
      if (!permissionCheck.hasPermission) {
        return false;
      }
    }

    // Check if user has required role
    if (item.requiredRole && !item.requiredRole.includes(currentUser.role)) {
      return false;
    }

    return true;
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    if (!canAccessItem(item)) {
      return null;
    }

    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="space-y-1">
        <Button
          variant={isActive ? "default" : "ghost"}
          className={`w-full justify-start ${level > 0 ? 'ml-4' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <Icon className="h-4 w-4 mr-2" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-2">
              {item.badge}
            </Badge>
          )}
        </Button>
        
        {hasChildren && (
          <div className="ml-4 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium">
              {currentUser.firstName} {currentUser.lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentUser.email}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <Badge className={getRoleBadgeColor(currentUser.role)}>
            {ROLE_DEFINITIONS[currentUser.role].name}
          </Badge>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="space-y-1">
        {navigationItems.map(item => renderNavigationItem(item))}
      </div>

      {/* Role Restrictions */}
      {accessControl.getUserRestrictions().length > 0 && (
        <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Role Restrictions
            </span>
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            {accessControl.getUserRestrictions().map((restriction, index) => (
              <div key={index}>• {restriction}</div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-3 border rounded-lg">
        <div className="text-sm font-medium mb-2">Quick Actions</div>
        <div className="space-y-1">
          {currentUser.role === 'employee' && (
            <>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                View Payslip
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Submit Timesheet
              </Button>
            </>
          )}
          
          {accessControl.canView('employees').hasPermission && (
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              View Employees
            </Button>
          )}
          
          {accessControl.canView('reports').hasPermission && (
            <Button variant="outline" size="sm" className="w-full justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

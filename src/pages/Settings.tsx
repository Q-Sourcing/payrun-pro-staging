import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { CompanySettingsSection } from "@/components/settings/CompanySettingsSection";
import { EmployeeSettingsSection } from "@/components/settings/EmployeeSettingsSection";
import { AboutSection } from "@/components/settings/AboutSection";
import { PayrollSettingsSection } from "@/components/settings/PayrollSettingsSection";
import { SecuritySettingsSection } from "@/components/settings/SecuritySettingsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { PayslipDesignerSection } from "@/components/settings/PayslipDesignerSection";
import { SystemSettingsSection } from "@/components/settings/SystemSettingsSection";
import { EmailSettingsSection } from "@/components/settings/EmailSettingsSection";
import { UserManagement } from "@/components/user-management/UserManagement";
import { AdminAccessSection } from "@/components/settings/AdminAccessSection";
import { SettingsSectionGuard } from "@/components/settings/SettingsSectionGuard";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import {
  Building2,
  Users,
  DollarSign,
  Palette,
  Shield,
  Bell,
  RefreshCw,
  Database,
  Info,
  Settings as SettingsIcon,
  Mail,
  FileText
} from "lucide-react";

const Settings = () => {
  const [activeSection, setActiveSection] = useState("theme");
  const { role, isSuperAdmin } = useUserRole();

  // Define menu items with role requirements
  const allMenuItems = [
    {
      id: "company",
      label: "Company Settings",
      icon: Building2,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'organization_configuration'
    },
    {
      id: "employee",
      label: "Employee Settings",
      icon: Users,
      requiredRole: 'ORG_HR_ADMIN' as const,
      requiredPermission: 'view_organization_employees'
    },
    {
      id: "payroll",
      label: "Payroll Settings",
      icon: DollarSign,
      requiredRole: 'COMPANY_PAYROLL_ADMIN' as const,
      requiredPermission: 'process_payroll'
    },
    {
      id: "payslip-designer",
      label: "Payslip Designer",
      icon: FileText,
      requiredRole: 'COMPANY_PAYROLL_ADMIN' as const,
      requiredPermission: 'process_payroll'
    },
    {
      id: "theme",
      label: "Display & Theme",
      icon: Palette,
      requiredRole: 'SELF_USER' as const // Everyone can access theme
    },
    {
      id: "security",
      label: "Security & Access",
      icon: Shield,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'organization_configuration'
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      requiredRole: 'SELF_USER' as const // Everyone can access notifications
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: RefreshCw,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'manage_integrations'
    },
    {
      id: "user-management",
      label: "User Management",
      icon: Users,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'manage_organization_users'
    },
    {
      id: "admin-obac",
      label: "Admin (Access Control)",
      icon: Shield,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'manage_organization_users'
    },
    {
      id: "emails",
      label: "Email & Logic",
      icon: Mail,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'organization_configuration'
    },
    {
      id: "system",
      label: "System Settings",
      icon: SettingsIcon,
      requiredRole: 'PLATFORM_SUPER_ADMIN' as const,
      requiredPermission: 'system_configuration'
    },
    {
      id: "data",
      label: "Data Management",
      icon: Database,
      requiredRole: 'ORG_ADMIN' as const,
      requiredPermission: 'export_data'
    },
    {
      id: "about",
      label: "About & Help",
      icon: Info,
      requiredRole: 'SELF_USER' as const // Everyone can access about
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (isSuperAdmin) return true; // Super admin sees everything

    if (!role) return false;

    const roleDef = ROLE_DEFINITIONS[role];
    const requiredRoleDef = ROLE_DEFINITIONS[item.requiredRole];

    // Check role level
    if (roleDef.level < requiredRoleDef.level) {
      return false;
    }

    // Check permission if specified
    if (item.requiredPermission && !roleDef.permissions.includes(item.requiredPermission as any)) {
      return false;
    }

    return true;
  });

  const renderSection = () => {
    switch (activeSection) {
      case "company":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
            <CompanySettingsSection />
          </SettingsSectionGuard>
        );
      case "employee":
        return (
          <SettingsSectionGuard requiredRole="ORG_HR_ADMIN" requiredPermission="view_organization_employees">
            <EmployeeSettingsSection />
          </SettingsSectionGuard>
        );
      case "payslip-designer":
        return (
          <SettingsSectionGuard requiredRole="COMPANY_PAYROLL_ADMIN" requiredPermission="process_payroll">
            <PayslipDesignerSection />
          </SettingsSectionGuard>
        );
      case "theme":
        return <ThemeSettings />;
      case "about":
        return <AboutSection />;
      case "payroll":
        return (
          <SettingsSectionGuard requiredRole="COMPANY_PAYROLL_ADMIN" requiredPermission="process_payroll">
            <PayrollSettingsSection />
          </SettingsSectionGuard>
        );
      case "security":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
            <div className="space-y-4">
              <SecuritySettingsSection />
              <Card>
                <CardHeader>
                  <CardTitle>Account Security & Lockout</CardTitle>
                  <CardDescription>
                    Manage account lockout settings and view security events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a href="/settings/security">
                    <Button variant="outline" className="w-full">
                      Open Security Dashboard
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          </SettingsSectionGuard>
        );
      case "notifications":
        return <NotificationsSection />;
      case "integrations":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="manage_integrations">
            <IntegrationsSection />
          </SettingsSectionGuard>
        );
      case "user-management":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="manage_organization_users">
            <UserManagement />
          </SettingsSectionGuard>
        );
      case "admin-obac":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="manage_organization_users">
            <AdminAccessSection />
          </SettingsSectionGuard>
        );
      case "system":
        return (
          <SettingsSectionGuard requiredRole="PLATFORM_SUPER_ADMIN" requiredPermission="system_configuration">
            <SystemSettingsSection />
          </SettingsSectionGuard>
        );
      case "data":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="export_data">
            <DataManagementSection />
          </SettingsSectionGuard>
        );
      case "emails":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
            <EmailSettingsSection />
          </SettingsSectionGuard>
        );
      default:
        return <ThemeSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your Q-Payroll preferences and configuration</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`settings-nav-item ${activeSection === item.id
                          ? "settings-nav-item-selected"
                          : "settings-nav-item-unselected"
                          }`}
                        style={activeSection === item.id ? {
                          backgroundColor: 'hsl(192 78% 30%)',
                          color: 'white'
                        } : {}}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

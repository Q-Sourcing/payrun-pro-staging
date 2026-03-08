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
import { EmailSettingsSection } from "@/components/settings/EmailSettingsSection";
import UsersManagement from "@/pages/UsersManagement";
import { AdminAccessSection } from "@/components/settings/AdminAccessSection";
import { SettingsSectionGuard } from "@/components/settings/SettingsSectionGuard";
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";
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
  FileText,
  ScrollText,
  ChevronRight
} from "lucide-react";

const Settings = () => {
  const [activeSection, setActiveSection] = useState("theme");
  const { role, isSuperAdmin } = useUserRole();

  const allMenuItems = [
    { id: "company", label: "Company", icon: Building2, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'organization_configuration' },
    { id: "employee", label: "Employees", icon: Users, requiredRole: 'ORG_HR_ADMIN' as const, requiredPermission: 'view_organization_employees' },
    { id: "payroll", label: "Payroll", icon: DollarSign, requiredRole: 'COMPANY_PAYROLL_ADMIN' as const, requiredPermission: 'process_payroll' },
    { id: "contracts", label: "Contracts", icon: ScrollText, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'organization_configuration' },
    { id: "payslip-designer", label: "Payslip Designer", icon: FileText, requiredRole: 'COMPANY_PAYROLL_ADMIN' as const, requiredPermission: 'process_payroll' },
    { id: "theme", label: "Display & Theme", icon: Palette, requiredRole: 'SELF_USER' as const },
    { id: "security", label: "Security", icon: Shield, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'organization_configuration' },
    { id: "notifications", label: "Notifications", icon: Bell, requiredRole: 'SELF_USER' as const },
    { id: "integrations", label: "Integrations", icon: RefreshCw, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'manage_integrations' },
    { id: "emails", label: "Email & Logic", icon: Mail, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'organization_configuration' },
    { id: "system", label: "System", icon: SettingsIcon, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'manage_organization_users' },
    { id: "data", label: "Data Management", icon: Database, requiredRole: 'ORG_ADMIN' as const, requiredPermission: 'export_data' },
    { id: "about", label: "About & Help", icon: Info, requiredRole: 'SELF_USER' as const },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (isSuperAdmin) return true;
    if (!role) return false;
    const roleDef = ROLE_DEFINITIONS[role];
    const requiredRoleDef = ROLE_DEFINITIONS[item.requiredRole];
    if (roleDef.level < requiredRoleDef.level) return false;
    if (item.requiredPermission && !roleDef.permissions.includes(item.requiredPermission as any)) return false;
    return true;
  });

  const renderSection = () => {
    switch (activeSection) {
      case "company":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration"><CompanySettingsSection /></SettingsSectionGuard>;
      case "employee":
        return <SettingsSectionGuard requiredRole="ORG_HR_ADMIN" requiredPermission="view_organization_employees"><EmployeeSettingsSection /></SettingsSectionGuard>;
      case "contracts":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration"><ContractTemplateManager /></SettingsSectionGuard>;
      case "payslip-designer":
        return <SettingsSectionGuard requiredRole="COMPANY_PAYROLL_ADMIN" requiredPermission="process_payroll"><PayslipDesignerSection /></SettingsSectionGuard>;
      case "theme":
        return <ThemeSettings />;
      case "about":
        return <AboutSection />;
      case "payroll":
        return <SettingsSectionGuard requiredRole="COMPANY_PAYROLL_ADMIN" requiredPermission="process_payroll"><PayrollSettingsSection /></SettingsSectionGuard>;
      case "security":
        return (
          <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
            <div className="space-y-6">
              <SecuritySettingsSection />
              <Card>
                <CardHeader>
                  <CardTitle>Account Security & Lockout</CardTitle>
                  <CardDescription>Manage account lockout settings and view security events</CardDescription>
                </CardHeader>
                <CardContent>
                  <a href="/settings/security">
                    <Button variant="outline" className="w-full">Open Security Dashboard</Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          </SettingsSectionGuard>
        );
      case "notifications":
        return <NotificationsSection />;
      case "integrations":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="manage_integrations"><IntegrationsSection /></SettingsSectionGuard>;
      case "system":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="manage_organization_users"><UsersManagement /></SettingsSectionGuard>;
      case "data":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="export_data"><DataManagementSection /></SettingsSectionGuard>;
      case "emails":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration"><EmailSettingsSection /></SettingsSectionGuard>;
      default:
        return <ThemeSettings />;
    }
  };

  const activeItem = menuItems.find(i => i.id === activeSection);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your Q-Payroll preferences and configuration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <nav className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="min-w-0">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

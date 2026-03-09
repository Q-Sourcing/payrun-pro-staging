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
import { AttendanceSettingsSection } from "@/components/settings/AttendanceSettingsSection";
import UsersManagement from "@/pages/UsersManagement";
import { SettingsSectionGuard } from "@/components/settings/SettingsSectionGuard";
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";
import { AccessControlManager } from "@/components/admin/access-control/AccessControlManager";
import { useRbacPermissions } from "@/hooks/use-rbac-permissions";
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
  Timer,
  ChevronRight,
  KeyRound,
} from "lucide-react";

const Settings = () => {
  const [activeSection, setActiveSection] = useState("theme");
  const { can, isAdmin, isLoading } = useRbacPermissions();

  const allMenuItems = [
    { id: "company",         label: "Company",           icon: Building2,    permission: "settings.manage" },
    { id: "employee",        label: "Employees",         icon: Users,        permission: "employees.view" },
    { id: "payroll",         label: "Payroll",           icon: DollarSign,   permission: "payroll.run" },
    { id: "contracts",       label: "Contracts",         icon: ScrollText,   permission: "contracts.manage" },
    { id: "payslip-designer",label: "Payslip Designer",  icon: FileText,     permission: "payroll.run" },
    { id: "theme",           label: "Display & Theme",   icon: Palette,      permission: null },
    { id: "security",        label: "Security",          icon: Shield,       permission: "settings.manage" },
    { id: "notifications",   label: "Notifications",     icon: Bell,         permission: null },
    { id: "integrations",    label: "Integrations",      icon: RefreshCw,    permission: "settings.manage" },
    { id: "emails",          label: "Email & Logic",     icon: Mail,         permission: "settings.manage" },
    { id: "system",          label: "User Management",   icon: SettingsIcon, permission: "users.view" },
    { id: "access-control",  label: "Roles & Permissions", icon: KeyRound,   permission: "roles.manage" },
    { id: "data",            label: "Data Management",   icon: Database,     permission: "settings.manage" },
    { id: "about",           label: "About & Help",      icon: Info,         permission: null },
    { id: "attendance",      label: "Attendance",        icon: Timer,        permission: "attendance.view" },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (isLoading) return item.permission === null; // show unguarded items while loading
    if (isAdmin) return true;
    if (item.permission === null) return true;
    return can(item.permission);
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
      case "attendance":
        return <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration"><AttendanceSettingsSection /></SettingsSectionGuard>;
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

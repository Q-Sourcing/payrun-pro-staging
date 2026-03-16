import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import UsersManagement from "@/pages/UsersManagement";
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
  KeyRound,
  ArrowLeft,
  X,
} from "lucide-react";

const Settings = () => {
  const [activeSection, setActiveSection] = useState("theme");
  const { can, isAdmin, isLoading } = useRbacPermissions();
  const navigate = useNavigate();

  const allMenuItems = [
    { id: "about",           label: "About & Help",        icon: Info,         permission: null },
    { id: "attendance",      label: "Attendance",          icon: Timer,        permission: "attendance.view" },
    { id: "company",         label: "Company",             icon: Building2,    permission: "settings.manage" },
    { id: "contracts",       label: "Contracts",           icon: ScrollText,   permission: "contracts.manage" },
    { id: "data",            label: "Data Management",     icon: Database,     permission: "settings.manage" },
    { id: "theme",           label: "Display & Theme",     icon: Palette,      permission: null },
    { id: "emails",          label: "Email & Logic",       icon: Mail,         permission: "settings.manage" },
    { id: "employee",        label: "Employees",           icon: Users,        permission: "employees.view" },
    { id: "integrations",    label: "Integrations",        icon: RefreshCw,    permission: "settings.manage" },
    { id: "notifications",   label: "Notifications",       icon: Bell,         permission: null },
    { id: "payroll",         label: "Payroll",             icon: DollarSign,   permission: "payroll.run" },
    { id: "payslip-designer",label: "Payslip Designer",    icon: FileText,     permission: "payroll.run" },
    { id: "access-control",  label: "Roles & Permissions", icon: KeyRound,     permission: "roles.manage" },
    { id: "security",        label: "Security",            icon: Shield,       permission: "settings.manage" },
    { id: "system",          label: "User Management",     icon: SettingsIcon, permission: "users.view" },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (isLoading) return true;
    if (isAdmin) return true;
    if (item.permission === null) return true;
    return can(item.permission);
  });

  const renderSection = () => {
    switch (activeSection) {
      case "company":
        return <CompanySettingsSection />;
      case "employee":
        return <EmployeeSettingsSection />;
      case "contracts":
        return <ContractTemplateManager />;
      case "payslip-designer":
        return <PayslipDesignerSection />;
      case "theme":
        return <ThemeSettings />;
      case "about":
        return <AboutSection />;
      case "payroll":
        return <PayrollSettingsSection />;
      case "security":
        return (
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
        );
      case "notifications":
        return <NotificationsSection />;
      case "integrations":
        return <IntegrationsSection />;
      case "system":
        return <UsersManagement />;
      case "access-control":
        return (
          <div className="h-[calc(100vh-120px)]">
            <AccessControlManager />
          </div>
        );
      case "data":
        return <DataManagementSection />;
      case "emails":
        return <EmailSettingsSection />;
      case "attendance":
        return <AttendanceSettingsSection />;
      default:
        return <ThemeSettings />;
    }
  };

  const activeItem = menuItems.find(i => i.id === activeSection);

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      {/* Top Bar */}
      <header className="flex-shrink-0 h-14 border-b border-border bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          {activeItem && (
            <>
              <div className="h-5 w-px bg-border" />
              <span className="text-sm text-muted-foreground">{activeItem.label}</span>
            </>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0 border-r border-border bg-muted/30 overflow-y-auto py-3 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-left truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;

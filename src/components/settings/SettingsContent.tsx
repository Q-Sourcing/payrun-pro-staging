import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { EmployeeSettingsSection } from "@/components/settings/EmployeeSettingsSection";
import { AboutSection } from "@/components/settings/AboutSection";
import { SecuritySettingsSection } from "@/components/settings/SecuritySettingsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { PayslipDesignerSection } from "@/components/settings/PayslipDesignerSection";
import { SystemSettingsSection } from "@/components/settings/SystemSettingsSection";
import { EmailSettingsSection } from "@/components/settings/EmailSettingsSection";
import { ReminderSettings } from "@/components/settings/ReminderSettings";
import { AttendanceSettingsSection } from "@/components/settings/AttendanceSettingsSection";
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
    Mail,
    FileText,
    ScrollText,
    AlarmClock,
    Timer,
    Settings as SettingsIcon,
    Building2 as BuildingIcon
} from "lucide-react";
import { AdvancedSettingsLayout } from "./AdvancedSettingsLayout";
import { PayrollSettingsSection } from "./PayrollSettingsSection";
import { CompanySettingsSection } from "./CompanySettingsSection";
import PayrollAdvancedSettings from "@/pages/PayrollAdvancedSettings";
import { OrganizationSetupModal } from "../organization-setup/OrganizationSetupModal";
import { OrganizationSetupLayout } from "@/components/organization-setup/OrganizationSetupLayout";

export const SettingsContent = ({ onAdvancedModeChange }: { onAdvancedModeChange?: (isAdvanced: boolean, mode: 'payroll' | 'org' | null) => void }) => {
    const [activeSection, setActiveSection] = useState("theme");
    const [activeAdvancedMode, setActiveAdvancedMode] = useState<'payroll' | 'org' | null>(null);
    const { role, isSuperAdmin } = useUserRole();

    // Trigger external notification when advanced mode changes
    useEffect(() => {
        onAdvancedModeChange?.(!!activeAdvancedMode, activeAdvancedMode);
    }, [activeAdvancedMode, onAdvancedModeChange]);

    // Define menu items with role requirements
    const allMenuItems = [
        {
            id: "about",
            label: "About & Help",
            icon: Info,
            requiredRole: 'SELF_USER' as const
        },
        {
            id: "attendance-settings",
            label: "Attendance",
            icon: Timer,
            requiredRole: 'ORG_ADMIN' as const,
            requiredPermission: 'organization_configuration'
        },
        {
            id: "company",
            label: "Company Settings",
            icon: Building2,
            requiredRole: 'ORG_ADMIN' as const,
            requiredPermission: 'organization_configuration'
        },
        {
            id: "contracts",
            label: "Contract Templates",
            icon: ScrollText,
            requiredRole: 'ORG_ADMIN' as const,
            requiredPermission: 'organization_configuration'
        },
        {
            id: "data",
            label: "Data Management",
            icon: Database,
            requiredRole: 'ORG_ADMIN' as const,
            requiredPermission: 'export_data'
        },
        {
            id: "theme",
            label: "Display & Theme",
            icon: Palette,
            requiredRole: 'SELF_USER' as const
        },
        {
            id: "emails",
            label: "Email & Logic",
            icon: Mail,
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
            id: "integrations",
            label: "Integrations",
            icon: RefreshCw,
            requiredRole: 'ORG_ADMIN' as const,
            requiredPermission: 'manage_integrations'
        },
        {
            id: "notifications",
            label: "Notifications",
            icon: Bell,
            requiredRole: 'SELF_USER' as const
        },
        {
            id: "payroll",
            label: "Payroll Settings",
            icon: DollarSign,
            requiredRole: 'ORG_FINANCE_CONTROLLER' as const,
            requiredPermission: 'process_payroll'
        },
        {
            id: "payslip-designer",
            label: "Payslip Designer",
            icon: FileText,
            requiredRole: 'ORG_FINANCE_CONTROLLER' as const,
            requiredPermission: 'process_payroll'
        },
        {
            id: "reminders",
            label: "Reminders",
            icon: AlarmClock,
            requiredRole: 'ORG_ADMIN' as const,
            requiredPermission: 'organization_configuration'
        },
        {
            id: "security",
            label: "Security & Access",
            icon: Shield,
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
        if (item.requiredPermission && !roleDef.permissions.includes(item.requiredPermission)) {
            return false;
        }

        return true;
    });

    const renderStandardContent = () => {
        switch (activeSection) {
            case "company":
                return (
                    <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
                        <CompanySettingsSection onOpenAdvanced={() => setActiveAdvancedMode('org')} />
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
                    <SettingsSectionGuard requiredRole="ORG_FINANCE_CONTROLLER" requiredPermission="process_payroll">
                        <PayslipDesignerSection />
                    </SettingsSectionGuard>
                );
            case "contracts":
                return (
                    <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
                        <ContractTemplateManager />
                    </SettingsSectionGuard>
                );
            case "theme":
                return <ThemeSettings />;
            case "about":
                return <AboutSection />;
            case "payroll":
                return (
                    <SettingsSectionGuard requiredRole="ORG_FINANCE_CONTROLLER" requiredPermission="process_payroll">
                        <PayrollSettingsSection onOpenAdvanced={() => setActiveAdvancedMode('payroll')} />
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
            case "reminders":
                return (
                    <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
                        <ReminderSettings />
                    </SettingsSectionGuard>
                );
            case "attendance-settings":
                return (
                    <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
                        <AttendanceSettingsSection />
                    </SettingsSectionGuard>
                );
            default:
                return <ThemeSettings />;
        }
    };

    // 2. ADVANCED MODE SWITCHER
    if (activeAdvancedMode === 'payroll') {
        return (
            <AdvancedSettingsLayout
                title="Payroll Settings"
                description="Configure advanced payroll features including approvals, locks, overrides, and compliance settings."
                icon={DollarSign}
                onBack={() => setActiveAdvancedMode(null)}
            >
                <PayrollAdvancedSettings isEmbedded={true} onBack={() => setActiveAdvancedMode(null)} />
            </AdvancedSettingsLayout>
        );
    }

    if (activeAdvancedMode === 'org') {
        return (
            <AdvancedSettingsLayout
                title="Organization Settings"
                description="Configure your organization structure, units, and employee categories for precise payroll management."
                icon={BuildingIcon}
                onBack={() => setActiveAdvancedMode(null)}
                subtitle="Setup"
            >
                <OrganizationSetupLayout onBack={() => setActiveAdvancedMode(null)} />
            </AdvancedSettingsLayout>
        );
    }

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <nav className="w-64 flex-shrink-0 border-r border-border overflow-y-auto py-4 px-3">
                <h3 className="text-sm font-semibold text-foreground mb-3 px-3">Navigation</h3>
                <div className="space-y-0.5">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
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
                </div>
            </nav>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                <div className="max-w-5xl">
                    {renderStandardContent()}
                </div>
            </main>
        </div>
    );
};

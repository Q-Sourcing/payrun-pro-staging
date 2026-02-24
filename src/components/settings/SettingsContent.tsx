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
    Mail,
    FileText,
    ScrollText,
    Settings as SettingsIcon,
    Building2 as BuildingIcon
} from "lucide-react";
import { AdvancedSettingsLayout } from "./AdvancedSettingsLayout";
import { PayrollSettingsSection } from "./PayrollSettingsSection";
import { CompanySettingsSection } from "./CompanySettingsSection";
import PayrollAdvancedSettings from "@/pages/PayrollAdvancedSettings";
import { OrganizationSetupModal } from "../organization-setup/OrganizationSetupModal";
import { OrganizationSetupLayout } from "@/components/organization-setup/OrganizationSetupLayout";
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";

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
            case "contracts":
                return (
                    <SettingsSectionGuard requiredRole="ORG_ADMIN" requiredPermission="organization_configuration">
                        <ContractTemplateManager />
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
                {renderStandardContent()}
            </div>
        </div>
    );
};

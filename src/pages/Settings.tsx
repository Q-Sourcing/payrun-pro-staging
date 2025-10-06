import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { CompanySettingsSection } from "@/components/settings/CompanySettingsSection";
import { EmployeeSettingsSection } from "@/components/settings/EmployeeSettingsSection";
import { AboutSection } from "@/components/settings/AboutSection";
import { PayrollSettingsSection } from "@/components/settings/PayrollSettingsSection";
import { SecuritySettingsSection } from "@/components/settings/SecuritySettingsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { ZohoIntegrationConfig } from "@/components/integrations/ZohoIntegrationConfig";
import { IntegrationDashboard } from "@/components/integrations/IntegrationDashboard";
import { UserManagement } from "@/components/user-management/UserManagement";
import { RoleManagement } from "@/components/user-management/RoleManagement";
import { RoleBasedDashboard } from "@/components/user-management/RoleBasedDashboard";
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
  Activity
} from "lucide-react";

const Settings = () => {
  const [activeSection, setActiveSection] = useState("theme");

  const menuItems = [
    { id: "company", label: "Company Settings", icon: Building2 },
    { id: "employee", label: "Employee Settings", icon: Users },
    { id: "payroll", label: "Payroll Settings", icon: DollarSign },
    { id: "theme", label: "Display & Theme", icon: Palette },
    { id: "security", label: "Security & Access", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: RefreshCw },
    { id: "zoho-config", label: "Zoho Integration", icon: RefreshCw },
    { id: "zoho-dashboard", label: "Integration Dashboard", icon: Activity },
    { id: "user-management", label: "User Management", icon: Users },
    { id: "role-management", label: "Role Management", icon: Shield },
    { id: "role-dashboard", label: "Role Dashboard", icon: Activity },
    { id: "data", label: "Data Management", icon: Database },
    { id: "about", label: "About & Help", icon: Info },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "company":
        return <CompanySettingsSection />;
      case "employee":
        return <EmployeeSettingsSection />;
      case "theme":
        return <ThemeSettings />;
      case "about":
        return <AboutSection />;
      case "payroll":
        return <PayrollSettingsSection />;
      case "security":
        return <SecuritySettingsSection />;
      case "notifications":
        return <NotificationsSection />;
      case "integrations":
        return <IntegrationsSection />;
      case "zoho-config":
        return <ZohoIntegrationConfig />;
      case "zoho-dashboard":
        return <IntegrationDashboard integration={null} />; // Will be properly initialized
      case "user-management":
        return <UserManagement currentUser={null} />; // Will be properly initialized
      case "role-management":
        return <RoleManagement currentUser={null} />; // Will be properly initialized
      case "role-dashboard":
        return <RoleBasedDashboard currentUser={null} />; // Will be properly initialized
      case "data":
        return <DataManagementSection />;
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
                        className={`settings-nav-item ${
                          activeSection === item.id
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

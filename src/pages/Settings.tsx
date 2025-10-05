import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { CompanySettingsSection } from "@/components/settings/CompanySettingsSection";
import { EmployeeSettingsSection } from "@/components/settings/EmployeeSettingsSection";
import { AboutSection } from "@/components/settings/AboutSection";
import { 
  Building2, 
  Users, 
  DollarSign, 
  Palette, 
  Shield, 
  Bell, 
  RefreshCw, 
  Database, 
  Info 
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
        return (
          <Card>
            <CardHeader>
              <CardTitle>Payroll Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Payroll settings coming soon...</p>
            </CardContent>
          </Card>
        );
      case "security":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Security & Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Security settings coming soon...</p>
            </CardContent>
          </Card>
        );
      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Notification settings coming soon...</p>
            </CardContent>
          </Card>
        );
      case "integrations":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Integration settings coming soon...</p>
            </CardContent>
          </Card>
        );
      case "data":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Data management settings coming soon...</p>
            </CardContent>
          </Card>
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
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          activeSection === item.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
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

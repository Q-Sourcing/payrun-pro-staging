import { useState } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, FileText, Settings, Moon, Sun, Palette, Search, Bell, LogOut } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import EmployeesTab from "@/components/payroll/EmployeesTab";
import PayGroupsTab from "@/components/payroll/PayGroupsTab";
import PayRunsTab from "@/components/payroll/PayRunsTab";
import ReportsTab from "@/components/payroll/ReportsTab";
import SettingsPage from "./Settings";
import { ThemeTest } from "@/components/ui/ThemeTest";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/Sidebar";

const Index = () => {
  const [activeTab, setActiveTab] = useState("employees");
  const { theme, setTheme } = useTheme();
  const { logout, profile } = useSupabaseAuth();

  const menuItems = [
    { id: "employees", label: "Employees", icon: Users },
    { id: "payruns", label: "Pay Runs", icon: DollarSign },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "theme-test", label: "Theme Preview", icon: Palette },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "employees":
        return <EmployeesTab />;
      case "paygroups":
        return <PayGroupsTab />;
      case "payruns":
        return <PayRunsTab />;
      case "reports":
        return <ReportsTab />;
      case "theme-test":
        return <ThemeTest />;
      case "settings":
        return <SettingsPage />;
      default:
        return <EmployeesTab />;
    }
  };

  return (
    <div className="app-container">
      {/* Modern Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-logo">Q</div>
            <div>
              <div className="brand-name">Q-Payroll</div>
              <div className="brand-tagline">Professional Payroll</div>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="nav-section">
          <Sidebar 
            activeTab={activeTab}
            onNavigate={setActiveTab}
          />
        </div>

        {/* Settings Section */}
        <div className="nav-section">
          <div className="nav-items">
            <button
              onClick={() => setActiveTab('settings')}
              className={`nav-item ${activeTab === 'settings' ? "active" : ""}`}
            >
              <Settings className="nav-icon" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Header */}
      <div className="header">
        <div className="header-search">
          <Search className="nav-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search employees, pay runs..." 
          />
        </div>

        <div className="header-actions">
          <div className="notification-badge">
            <Bell className="nav-icon" />
            <div className="badge"></div>
          </div>
          
          <div className="user-menu">
            <div className="user-avatar">
              {profile?.first_name?.[0]}{profile?.last_name?.[0] || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="user-email">{profile?.email}</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="flex items-center gap-2"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {menuItems.find(item => item.id === activeTab)?.label}
            </h1>
            <p className="text-muted-foreground">
              {activeTab === 'employees' && 'Manage your workforce and employee data'}
              {activeTab === 'paygroups' && 'Organize employees into pay groups'}
              {activeTab === 'payruns' && 'Process and manage payroll runs'}
              {activeTab === 'reports' && 'View payroll reports and analytics'}
              {activeTab === 'theme-test' && 'Preview the modern theme system with brand colors'}
              {activeTab === 'settings' && 'Configure system settings and preferences'}
            </p>
          </div>
          <div className="page-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center space-x-2"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
          </div>
        </div>
        
        {renderTabContent()}
      </div>
      
      <Toaster />
    </div>
  );
};

export default Index;
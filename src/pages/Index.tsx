import { useState } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, FileText, Settings } from "lucide-react";
import EmployeesTab from "@/components/payroll/EmployeesTab";
import PayGroupsTab from "@/components/payroll/PayGroupsTab";
import PayRunsTab from "@/components/payroll/PayRunsTab";
import ReportsTab from "@/components/payroll/ReportsTab";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  const [activeTab, setActiveTab] = useState("employees");

  const menuItems = [
    { id: "employees", label: "Employees", icon: Users },
    { id: "paygroups", label: "Pay Groups", icon: Settings },
    { id: "payruns", label: "Pay Runs", icon: DollarSign },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "employees":
        return <EmployeesTab />;
      case "paygroups":
        return <PayGroupsTab />;
      case "payruns":
        return <PayRunsTab />;
      case "reports":
        return <ReportsTab />;
      default:
        return <EmployeesTab />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <h1 className="text-xl font-bold text-sidebar-primary">Q-Payroll</h1>
            <p className="text-sm text-sidebar-foreground">Payroll Management</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    isActive={activeTab === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1">
          <header className="border-b border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="text-2xl font-semibold text-card-foreground">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h2>
            </div>
          </header>
          
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};

export default Index;
import { Outlet } from "react-router-dom";
import { NavigationSidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export default function MainLayout() {
  const { user, profile, logout } = useSupabaseAuth();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-30 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <div className="brand">
              <div className="brand-logo">Q</div>
              <div>
                <div className="brand-name">Q-Payroll</div>
                <div className="brand-tagline">Professional Payroll</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Section */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <NavigationSidebar 
            activeTab="employees"
            onNavigate={() => {}}
          />
        </div>

        {/* Fixed Settings Section at Bottom */}
        <div className="flex-shrink-0 border-t border-slate-200">
          <div className="nav-section">
            <div className="nav-items">
              {/* Theme Toggle */}
              <div className="theme-toggle">
                <div className="theme-options">
                  <button className="theme-option active">
                    <span className="theme-icon">🌙</span>
                    <span className="theme-label">Dark</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 overflow-y-auto">
        {/* Header with User Info and Logout */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Q-Payroll</h1>
              <p className="text-sm text-slate-500">Professional Payroll Management</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0] || 'U'}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-slate-900">
                    {profile?.first_name} {profile?.last_name}
                  </div>
                  <div className="text-xs text-slate-500">{profile?.email}</div>
                </div>
              </div>
              
              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Outlet /> {/* This renders the current page */}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

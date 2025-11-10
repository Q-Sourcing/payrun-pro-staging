import { Outlet } from "react-router-dom";
import { NavigationSidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { RoleBadge, RoleBadgeSmall } from "@/components/admin/RoleBadge";
import { SuperAdminBadge } from "@/components/admin/SuperAdminBadge";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function MainLayout() {
  const { user, profile, logout } = useSupabaseAuth();
  const { role, isSuperAdmin } = useUserRole();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 64 : 256;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <motion.aside 
        className="fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-30 flex flex-col overflow-hidden"
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="flex-shrink-0">
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <div className="brand">
              <div className="brand-logo">Q</div>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="brand-name">Q-Payroll</div>
                  <div className="brand-tagline">Professional Payroll</div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Section */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <NavigationSidebar 
            activeTab="employees"
            onNavigate={() => {}}
            collapsed={sidebarCollapsed}
          />
          
          {/* Super Admin Link */}
          {isSuperAdmin && !sidebarCollapsed && (
            <div className="px-4 py-2 border-t border-slate-200">
              <Link
                to="/admin/super-admin"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50 hover:text-blue-700"
              >
                <SuperAdminBadge variant="small" showText={false} />
                <span className="text-sm font-medium">Super Admin</span>
              </Link>
            </div>
          )}
        </div>

        {/* Fixed Settings Section at Bottom */}
        <div className="flex-shrink-0 border-t border-slate-200">
          <div className="nav-section">
            <div className="nav-items">
              {/* Collapse Toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center justify-center px-4 py-3 hover:bg-slate-50 transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                )}
              </button>
              
              {/* Theme Toggle */}
              {!sidebarCollapsed && (
                <div className="theme-toggle">
                  <div className="theme-options">
                    <button className="theme-option active">
                      <span className="theme-icon">🌙</span>
                      <span className="theme-label">Dark</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header with User Info and Logout */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Q-Payroll</h1>
              <p className="text-sm text-slate-500">Professional Payroll Management</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* User Info - Flat Icon Design */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-700 rounded-lg text-sm font-semibold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0] || 'U'}
                </div>
                <div className="hidden md:block">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-slate-900">
                      {profile?.first_name} {profile?.last_name}
                    </div>
                    {isSuperAdmin && <SuperAdminBadge variant="icon-only" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs text-slate-500">{profile?.email}</div>
                    {role && !isSuperAdmin && <RoleBadgeSmall role={role} />}
                  </div>
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

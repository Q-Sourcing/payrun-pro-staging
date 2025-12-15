import { Outlet } from "react-router-dom";
import { NavigationSidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, ChevronRight, Pin, PinOff } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { RoleBadge, RoleBadgeSmall } from "@/components/admin/RoleBadge";
import { SuperAdminBadge } from "@/components/admin/SuperAdminBadge";
import { Link } from "react-router-dom";
import { useOrg } from "@/lib/tenant/OrgContext";
import { useOrgNames } from "@/lib/tenant/useOrgNames";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function MainLayout() {
  const { user, profile, logout } = useSupabaseAuth();
  const { role, isSuperAdmin } = useUserRole();

  // Initialize pinned state from localStorage
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_pinned') === 'true';
    }
    return false;
  });

  // Sidebar is collapsed if NOT pinned AND NOT hovered (we start expanded if pinned)
  // Actually, we use a state for 'collapsed' but drive it via mouse events and pin state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!isPinned);

  const { organizationId, companyId, setCompanyId } = useOrg();
  const { organizationName, companyName } = useOrgNames();
  const [assignedCompanies, setAssignedCompanies] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('user_company_memberships')
          .select('company:companies(id, name)')
          .eq('user_id', user.id);
        if (error) throw error;
        const mapped = (data || []).map((r: any) => r.company).filter(Boolean);
        if (!cancelled) setAssignedCompanies(mapped);
      } catch {
        if (!cancelled) setAssignedCompanies([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Effect to sync sidebarCollapsed with isPinned changes
  useEffect(() => {
    if (isPinned) {
      setSidebarCollapsed(false);
    }
  }, [isPinned]);

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem('sidebar_pinned', String(newPinned));
  };

  const sidebarWidth = sidebarCollapsed ? 64 : 256;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Sidebar */}
      <motion.aside
        className="fixed left-0 top-0 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30 flex flex-col overflow-hidden"
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => {
          if (!isPinned) {
            setSidebarCollapsed(true);
          }
        }}
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
            onNavigate={() => { }}
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
              {/* Pin Toggle - Replaces Collapse Toggle */}
              {!sidebarCollapsed && (
                <button
                  onClick={handleTogglePin}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
                  title={isPinned ? "Unpin Sidebar (Auto-retract)" : "Pin Sidebar"}
                >
                  {isPinned ? (
                    <>
                      <PinOff className="w-4 h-4" />
                      <span className="text-sm">Unpin Sidebar</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4" />
                      <span className="text-sm">Pin Sidebar</span>
                    </>
                  )}
                </button>
              )}

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
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header with User Info and Logout */}
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-4">
              {/* Organization | Company context */}
              <div className="hidden md:flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Org:</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {organizationName || 'Organization'}
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Company:</span>
                  <div className="min-w-[180px]">
                    <Select
                      value={companyId || undefined}
                      onValueChange={(val) => {
                        setCompanyId(val);
                        if (typeof window !== 'undefined') localStorage.setItem('active_company_id', val);
                      }}
                    >
                      <SelectTrigger className="h-7 py-0 px-2 text-xs">
                        <SelectValue placeholder={companyName || 'Select company'} />
                      </SelectTrigger>
                      <SelectContent>
                        {assignedCompanies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* User Info - Flat Icon Design */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-100 rounded-lg text-sm font-semibold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0] || 'U'}
                </div>
                <div className="block">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {profile?.first_name} {profile?.last_name}
                    </div>
                    {isSuperAdmin && <SuperAdminBadge variant="icon-only" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</div>
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

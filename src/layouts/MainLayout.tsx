import { ReactNode } from "react";
import { NavigationSidebar } from "@/components/Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-30">
        <div className="h-full flex flex-col">
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

          {/* Main Navigation */}
          <div className="nav-section">
            <NavigationSidebar 
              activeTab="employees"
              onNavigate={() => {}}
            />
          </div>

          {/* Settings Section */}
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
      <main className="ml-64 flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}

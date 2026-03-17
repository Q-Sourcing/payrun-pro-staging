import { NavigationSidebar } from "@/components/Sidebar";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import { Sun, Moon, Pin, PinOff } from "lucide-react";

const Layout = () => {
  const [activeTab, setActiveTab] = useState("employees");
  const { theme, setTheme } = useTheme();
  const [pinned, setPinned] = useState(true);

  const isDark = theme === "dark";

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
          <NavigationSidebar 
            activeTab={activeTab}
            onNavigate={setActiveTab}
            pendingPayRuns={2}
            pendingApprovals={1}
            anomaliesCount={4}
          />
        </div>

        {/* Footer Controls */}
        <div className="sidebar-footer">
          {/* Pin Sidebar */}
          <button
            onClick={() => setPinned(!pinned)}
            className="sidebar-footer-btn"
            title={pinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            <span>Pin Sidebar</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="sidebar-footer-btn"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className={`theme-toggle-pill ${isDark ? 'dark' : 'light'}`}>
              <div className="theme-toggle-thumb">
                {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              </div>
            </div>
            <span>{isDark ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

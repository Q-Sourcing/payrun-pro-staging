import { NavigationSidebar } from "@/components/Sidebar";
import { useState } from "react";
import { Outlet } from "react-router-dom";

const Layout = () => {
  const [activeTab, setActiveTab] = useState("employees");

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

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

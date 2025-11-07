import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/data/query-client";
import { RealtimeService } from "@/lib/data/realtime.service";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/hooks/use-supabase-auth";
import Settings from "./pages/Settings";
import EnvBanner from "@/components/EnvBanner";

// Import existing tab components as pages
import EmployeesTab from "@/components/payroll/EmployeesTab";
import PayGroupsTab from "@/components/payroll/PayGroupsTab";
import PayRunsTab from "@/components/payroll/PayRunsTab";
import ReportsTab from "@/components/payroll/ReportsTab";

// Import new placeholder pages (will create these)
import MyEmployees from "./pages/MyDashboard/Employees";
import MyPayGroups from "./pages/MyDashboard/PayGroups";
import MyPayRuns from "./pages/MyDashboard/PayRuns";

// Import Pay Groups filtered pages
import {
  HeadOfficeRegularPage,
  HeadOfficeExpatriatePage,
  HeadOfficeInternsPage,
  ProjectsManpowerDailyPage,
  ProjectsManpowerBiWeeklyPage,
  ProjectsManpowerMonthlyPage,
  ProjectsIppmsPage,
  ProjectsExpatriatePage
} from "./pages/paygroups/FilteredPayGroupsPage";

// Import Pay Runs filtered pages
import {
  HeadOfficeRegularPayRunsPage,
  HeadOfficeExpatriatePayRunsPage,
  HeadOfficeInternsPayRunsPage,
  ProjectsManpowerDailyPayRunsPage,
  ProjectsManpowerBiWeeklyPayRunsPage,
  ProjectsManpowerMonthlyPayRunsPage,
  ProjectsIppmsPayRunsPage,
  ProjectsExpatriatePayRunsPage
} from "./pages/payruns/FilteredPayRunsPage";

// Import Local Payroll subcategory pages (will create these)
import LocalPayrollMonthly from "./pages/payruns/local/Monthly";
import LocalPayrollTemporary from "./pages/payruns/local/Temporary";
import LocalPayrollIntern from "./pages/payruns/local/Intern";
import LocalPayrollTrainee from "./pages/payruns/local/Trainee";
import LocalPayrollCasual from "./pages/payruns/local/Casual";

// Import Expatriate Payroll page
import ExpatriatePayrollPage from "./pages/ExpatriatePayrollPage";

// Import Admin page
import { Admin } from "./pages/Admin";

// Import MainLayout component
import MainLayout from "./layouts/MainLayout";
import { OrgProvider } from '@/lib/tenant/OrgContext';
import Dashboard from "./pages/Dashboard";

// Query client is now imported from optimized configuration

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const App = () => {
  // Initialize realtime subscriptions when app starts
  useEffect(() => {
    // Environment verification logging
    console.log('🌿 Environment:', import.meta.env.VITE_ENVIRONMENT || import.meta.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown');
    console.log('🔗 Supabase URL:', import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'not configured');
    console.log('🔧 Vite Mode:', import.meta.env.MODE);
    
    RealtimeService.initializeRealtimeSubscriptions();
    
    // Cleanup on unmount
    return () => {
      RealtimeService.cleanupSubscriptions();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SupabaseAuthProvider>
          <TooltipProvider>
            <EnvBanner />
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Admin Dashboard */}
              <Route path="/admin/*" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              
              {/* Main Layout with Sidebar */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <OrgProvider>
                    <MainLayout />
                    </OrgProvider>
                  </ProtectedRoute>
                }
              >
                {/* Default redirect to dashboard */}
                <Route index element={<Dashboard />} />
                {/* Explicit dashboard route */}
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* My Dashboard Routes */}
                <Route path="my/employees" element={<MyEmployees />} />
                <Route path="my/paygroups" element={<MyPayGroups />} />
                <Route path="my/payruns" element={<MyPayRuns />} />

                {/* Core Module Routes */}
                <Route path="employees" element={<EmployeesTab />} />
                <Route path="paygroups" element={<PayGroupsTab />} />
                
                {/* Pay Groups Filtered Routes */}
                <Route path="paygroups/head-office/regular" element={<HeadOfficeRegularPage />} />
                <Route path="paygroups/head-office/expatriate" element={<HeadOfficeExpatriatePage />} />
                <Route path="paygroups/head-office/interns" element={<HeadOfficeInternsPage />} />
                <Route path="paygroups/projects/manpower/daily" element={<ProjectsManpowerDailyPage />} />
                <Route path="paygroups/projects/manpower/bi-weekly" element={<ProjectsManpowerBiWeeklyPage />} />
                <Route path="paygroups/projects/manpower/monthly" element={<ProjectsManpowerMonthlyPage />} />
                <Route path="paygroups/projects/ippms/piece-rate" element={<ProjectsIppmsPage />} />
                <Route path="paygroups/projects/expatriate" element={<ProjectsExpatriatePage />} />
                
                <Route path="payruns" element={<PayRunsTab />} />
                
                {/* Pay Runs Filtered Routes */}
                <Route path="payruns/head-office/regular" element={<HeadOfficeRegularPayRunsPage />} />
                <Route path="payruns/head-office/expatriate" element={<HeadOfficeExpatriatePayRunsPage />} />
                <Route path="payruns/head-office/interns" element={<HeadOfficeInternsPayRunsPage />} />
                <Route path="payruns/projects/manpower/daily" element={<ProjectsManpowerDailyPayRunsPage />} />
                <Route path="payruns/projects/manpower/bi-weekly" element={<ProjectsManpowerBiWeeklyPayRunsPage />} />
                <Route path="payruns/projects/manpower/monthly" element={<ProjectsManpowerMonthlyPayRunsPage />} />
                <Route path="payruns/projects/ippms" element={<ProjectsIppmsPayRunsPage />} />
                <Route path="payruns/projects/expatriate" element={<ProjectsExpatriatePayRunsPage />} />
                
                <Route path="reports" element={<ReportsTab />} />
                <Route path="settings" element={<Settings />} />

                {/* Expatriate Payroll Route */}
                <Route path="payruns/expatriate" element={<ExpatriatePayrollPage />} />

                {/* Local Payroll Subroutes */}
                <Route path="payruns/local/monthly" element={<LocalPayrollMonthly />} />
                <Route path="payruns/local/temporary" element={<LocalPayrollTemporary />} />
                <Route path="payruns/local/intern" element={<LocalPayrollIntern />} />
                <Route path="payruns/local/trainee" element={<LocalPayrollTrainee />} />
                <Route path="payruns/local/casual" element={<LocalPayrollCasual />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </SupabaseAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

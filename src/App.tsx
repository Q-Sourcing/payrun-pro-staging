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

// Import existing tab components as pages
import EmployeesTab from "@/components/payroll/EmployeesTab";
import PayGroupsTab from "@/components/payroll/PayGroupsTab";
import PayRunsTab from "@/components/payroll/PayRunsTab";
import ReportsTab from "@/components/payroll/ReportsTab";

// Import new placeholder pages (will create these)
import MyEmployees from "./pages/MyEmployees";
import MyPayGroups from "./pages/MyPayGroups";
import MyPayRuns from "./pages/MyPayRuns";

// Import Local Payroll subcategory pages (will create these)
import LocalPayrollMonthly from "./pages/payruns/local/Monthly";
import LocalPayrollTemporary from "./pages/payruns/local/Temporary";
import LocalPayrollIntern from "./pages/payruns/local/Intern";
import LocalPayrollTrainee from "./pages/payruns/local/Trainee";
import LocalPayrollCasual from "./pages/payruns/local/Casual";

// Import MainLayout component
import MainLayout from "./layouts/MainLayout";

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
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Main Layout with Sidebar */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                {/* Default redirect to employees */}
                <Route index element={<EmployeesTab />} />
                
                {/* My Dashboard Routes */}
                <Route path="my/employees" element={<MyEmployees />} />
                <Route path="my/paygroups" element={<MyPayGroups />} />
                <Route path="my/payruns" element={<MyPayRuns />} />

                {/* Core Module Routes */}
                <Route path="employees" element={<EmployeesTab />} />
                <Route path="paygroups" element={<PayGroupsTab />} />
                <Route path="payruns" element={<PayRunsTab />} />
                <Route path="reports" element={<ReportsTab />} />
                <Route path="settings" element={<Settings />} />

                {/* Expatriate Payroll Route */}
                <Route path="payruns/expatriate" element={<PayRunsTab />} />

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

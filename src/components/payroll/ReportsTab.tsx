import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, DollarSign, Users, TrendingUp, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencyByCode, getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { ApprovalAuditReport } from "./ApprovalAuditReport";

interface AnalyticsData {
  activeEmployees: number;
  monthlyPayroll: number;
  payRunsThisMonth: number;
  avgPayPerEmployee: number;
  currency: string;
}

const ReportsTab = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    activeEmployees: 0,
    monthlyPayroll: 0,
    payRunsThisMonth: 0,
    avgPayPerEmployee: 0,
    currency: 'UGX'
  });
  const [loading, setLoading] = useState(true);
  const [selectedPayGroup, setSelectedPayGroup] = useState<string>("all");
  const [payGroups, setPayGroups] = useState<{ id: string; name: string; country: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
    fetchPayGroups();
  }, [selectedPayGroup]);

  const fetchPayGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .select("id, name, country")
        .order("name");

      if (error) throw error;
      setPayGroups(data || []);
    } catch (error) {
      console.error("Error fetching pay groups:", error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get employees count
      let employeesQuery = supabase
        .from("employees")
        .select("id, country", { count: "exact" })
        .eq("status", "active");

      if (selectedPayGroup !== "all") {
        employeesQuery = employeesQuery.eq("pay_group_id", selectedPayGroup);
      }

      const { count: activeEmployees, data: employeesData } = await employeesQuery;

      // Get currency from first employee or default
      const defaultCountry = employeesData?.[0]?.country || "Uganda";
      const currency = getCurrencyCodeFromCountry(defaultCountry);

      // Get pay runs for this month
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());

      let payRunsQuery = supabase
        .from("pay_runs")
        .select("total_net_pay", { count: "exact" })
        .gte("pay_run_date", startDate.toISOString())
        .lte("pay_run_date", endDate.toISOString())
        .eq("status", "processed");

      if (selectedPayGroup !== "all") {
        payRunsQuery = payRunsQuery.eq("pay_group_id", selectedPayGroup);
      }

      const { count: payRunsCount, data: payRunsData } = await payRunsQuery;

      // Calculate monthly payroll
      const monthlyPayroll = payRunsData?.reduce((sum, run) => sum + (run.total_net_pay || 0), 0) || 0;

      // Calculate average pay per employee
      const avgPayPerEmployee = activeEmployees && activeEmployees > 0
        ? monthlyPayroll / activeEmployees
        : 0;

      setAnalytics({
        activeEmployees: activeEmployees || 0,
        monthlyPayroll,
        payRunsThisMonth: payRunsCount || 0,
        avgPayPerEmployee,
        currency
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currencyInfo = getCurrencyByCode(analytics.currency);
    const symbol = currencyInfo?.symbol || analytics.currency;
    const decimals = currencyInfo?.decimalPlaces ?? 2;

    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  const generateReport = async (reportType: string, period: 'monthly' | 'quarterly' | 'annual') => {
    try {
      let startDate: Date;
      let endDate = new Date();

      switch (period) {
        case 'monthly':
          startDate = subMonths(endDate, 1);
          break;
        case 'quarterly':
          startDate = subMonths(endDate, 3);
          break;
        case 'annual':
          startDate = subYears(endDate, 1);
          break;
      }

      // Fetch pay runs for the period
      let query = supabase
        .from("pay_runs")
        .select(`
          *,
          pay_groups (name, country),
          pay_items (
            *,
            employees (first_name, middle_name, last_name, email, department)
          )
        `)
        .gte("pay_run_date", startDate.toISOString())
        .lte("pay_run_date", endDate.toISOString())
        .order("pay_run_date", { ascending: false });

      if (selectedPayGroup !== "all") {
        query = query.eq("pay_group_id", selectedPayGroup);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Generate CSV content
      const csvContent = generateCSV(data, reportType);

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${period}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: `${reportType} ${period} report downloaded successfully`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  const generateCSV = (data: any[], reportType: string) => {
    if (!data || data.length === 0) {
      return "No data available for the selected period";
    }

    let headers: string[];
    let rows: string[][];

    if (reportType === 'payroll_summary') {
      headers = ['Pay Run Date', 'Pay Group', 'Period Start', 'Period End', 'Employees', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'];
      rows = data.map(run => [
        format(new Date(run.pay_run_date), 'yyyy-MM-dd'),
        run.pay_groups?.name || '',
        format(new Date(run.pay_period_start), 'yyyy-MM-dd'),
        format(new Date(run.pay_period_end), 'yyyy-MM-dd'),
        run.pay_items?.length?.toString() || '0',
        run.total_gross_pay?.toString() || '0',
        run.total_deductions?.toString() || '0',
        run.total_net_pay?.toString() || '0',
        run.status
      ]);
    } else if (reportType === 'employee_summary') {
      headers = ['Employee Name', 'Email', 'Department', 'Pay Date', 'Gross Pay', 'Tax Deduction', 'Net Pay'];
      rows = data.flatMap(run =>
        (run.pay_items || []).map((item: any) => [
          `${item.employees?.first_name || ''} ${item.employees?.middle_name || ''} ${item.employees?.last_name || ''}`.trim(),
          item.employees?.email || '',
          item.employees?.department || '',
          format(new Date(run.pay_run_date), 'yyyy-MM-dd'),
          item.gross_pay?.toString() || '0',
          item.tax_deduction?.toString() || '0',
          item.net_pay?.toString() || '0'
        ])
      );
    } else {
      headers = ['Type', 'Value'];
      rows = [['Total Runs', data.length.toString()]];
    }

    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];

    return csvRows.join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Reports & Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Generate payroll reports and view analytics
          </p>
        </div>
        <div className="w-64">
          <Label>Filter by Pay Group</Label>
          <Select value={selectedPayGroup} onValueChange={setSelectedPayGroup}>
            <SelectTrigger>
              <SelectValue placeholder="All Pay Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pay Groups</SelectItem>
              {payGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.country})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{loading ? "..." : analytics.activeEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-bold">{loading ? "..." : formatCurrency(analytics.monthlyPayroll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pay Runs This Month</p>
                <p className="text-2xl font-bold">{loading ? "..." : analytics.payRunsThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Pay/Employee</p>
                <p className="text-2xl font-bold">{loading ? "..." : formatCurrency(analytics.avgPayPerEmployee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Payroll Summary</CardTitle>
                <CardDescription>Detailed payroll reports by period</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('payroll_summary', 'monthly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Monthly Report
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('payroll_summary', 'quarterly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Quarterly Report
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('payroll_summary', 'annual')}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Annual Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Employee Reports</CardTitle>
                <CardDescription>Individual employee pay statements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('employee_summary', 'monthly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Pay Stubs
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('employee_summary', 'quarterly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Employee Summary
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('employee_summary', 'annual')}
              >
                <Download className="h-4 w-4 mr-2" />
                Tax Summary by Employee
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Analytics</CardTitle>
                <CardDescription>Payroll trends and insights</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('cost_analysis', 'monthly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Cost Analysis
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('department_breakdown', 'monthly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Department Breakdown
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateReport('country_comparison', 'monthly')}
              >
                <Download className="h-4 w-4 mr-2" />
                Country Comparison
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApprovalAuditReport />

      {/* Recent Reports Info */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
          <CardDescription>
            Click any button above to generate and download reports as CSV files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• All reports are generated based on your selected pay group filter</p>
            <p>• Monthly reports cover the last 30 days</p>
            <p>• Quarterly reports cover the last 90 days</p>
            <p>• Annual reports cover the last 365 days</p>
            <p>• Reports are downloaded as CSV files for easy import into Excel or other tools</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsTab;
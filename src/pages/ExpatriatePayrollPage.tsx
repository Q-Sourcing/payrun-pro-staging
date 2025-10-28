import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { log, warn, error, debug } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign, Trash2, FileSpreadsheet, Globe } from "lucide-react";
import { getCurrencyByCode, getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBankSchedulePermissions } from "@/hooks/use-bank-schedule-permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CreatePayRunDialog from "@/components/payroll/CreatePayRunDialog";
import PayRunDetailsDialog from "@/components/payroll/PayRunDetailsDialog";
import BankScheduleExportDialog from "@/components/payroll/BankScheduleExportDialog";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PayRun {
  id: string;
  pay_run_date: string;
  pay_period_start: string;
  pay_period_end: string;
  status: string;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  pay_group_master: {
    name: string;
    country: string;
    currency: string;
    code?: string;
    type: string;
  };
  pay_items_count?: number;
}

const ExpatriatePayrollPage = () => {
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showBankScheduleDialog, setShowBankScheduleDialog] = useState(false);
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [payRunToDelete, setPayRunToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { canExportBankSchedule } = useBankSchedulePermissions();

  const fetchExpatriatePayRuns = async (preserveScroll = false) => {
    try {
      console.log("🔍 Fetching expatriate pay runs...");
      const prevScroll = window.scrollY;
      setLoading(true);
      
      // Fetch expatriate pay runs using pay_group_master table
      const { data, error } = await supabase
        .from("pay_runs")
        .select(`
          *,
          pay_group_master:pay_group_master_id (
            id,
            name,
            country,
            currency,
            code,
            type,
            source_id,
            source_table
          ),
          expatriate_pay_run_items (
            gross_local,
            net_local,
            employee_id
          )
        `)
        .eq("payroll_type", "expatriate")
        .order("pay_run_date", { ascending: false });

      if (error) {
        console.error("❌ Error fetching pay runs:", error);
        throw error;
      }
      
      console.log("✅ Fetched Expatriate PayRuns:", data);
      
      // Fetch default daily rates for expatriate pay groups
      const expatriateGroupIds = data?.map(run => run.pay_group_master?.source_id).filter(Boolean) || [];
      const { data: expatriateGroups } = await supabase
        .from("expatriate_pay_groups")
        .select("id, default_daily_rate, currency")
        .in("id", expatriateGroupIds);

      const payRunsWithCount = data?.map(run => {
        // Calculate gross and net pay from expatriate pay run items
        const grossPay = run.expatriate_pay_run_items?.reduce((sum: number, item: any) => sum + (item.gross_local || 0), 0) || 0;
        const netPay = run.expatriate_pay_run_items?.reduce((sum: number, item: any) => sum + (item.net_local || 0), 0) || 0;
        const employeeCount = run.expatriate_pay_run_items?.length || 0;
        
        // Find the corresponding expatriate group for default daily rate
        const expatriateGroup = expatriateGroups?.find(eg => eg.id === run.pay_group_master?.source_id);
        const defaultDailyRate = expatriateGroup?.default_daily_rate || 0;
        
        return {
          ...run,
          total_gross_pay: grossPay,
          total_net_pay: netPay,
          pay_items_count: employeeCount,
          default_daily_rate: defaultDailyRate
        };
      }) || [];
      
      setPayRuns(payRunsWithCount);
      
      // Restore scroll position if requested
      if (preserveScroll) {
        window.scrollTo({ top: prevScroll });
      }
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to fetch expatriate pay runs",
        variant: "destructive",
      });
      setPayRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpatriatePayRuns();
    
    // Set up real-time updates for expatriate pay runs
    const channel = supabase
      .channel("expatriate-payrun-updates")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "expatriate_pay_run_items" }, 
        () => {
          console.log("🔄 Real-time update: expatriate pay run items changed");
          fetchExpatriatePayRuns(true); // preserveScroll = true
        }
      )
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "pay_runs" }, 
        (payload) => {
          if (payload.new?.payroll_type === "expatriate" || payload.old?.payroll_type === "expatriate") {
            console.log("🔄 Real-time update: expatriate pay run changed");
            fetchExpatriatePayRuns(true); // preserveScroll = true
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
      case "pending_approval":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-200 dark:border-orange-800";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "processed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "pending_approval":
        return "Pending Approval";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatCurrency = (amount: number, payRun?: PayRun) => {
    const country = payRun?.pay_group_master?.country || 'Uganda';
    const currencyCode = payRun?.pay_group_master?.currency || getCurrencyCodeFromCountry(country);
    
    const currencyInfo = getCurrencyByCode(currencyCode);
    const symbol = currencyInfo?.symbol || currencyCode;
    const decimals = currencyInfo?.decimalPlaces ?? 2;
    
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleDeletePayRun = async () => {
    if (!payRunToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("pay_runs")
        .delete()
        .eq("id", payRunToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pay run deleted successfully",
      });

      await fetchExpatriatePayRuns();
      setShowDeleteDialog(false);
      setPayRunToDelete(null);
    } catch (error: any) {
      console.error("Error deleting pay run:", error);
      toast({
        title: "Error",
        description: "Failed to delete pay run",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading expatriate payroll...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Globe className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expatriate Payroll</h1>
            <p className="text-muted-foreground">Manage international employee payroll</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Pay Run
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium text-muted-foreground">Draft</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {payRuns.filter(run => run.status === 'draft').length}
                </div>
              </div>
              <div className="h-12 w-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-medium text-muted-foreground">Pending</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {payRuns.filter(run => run.status === 'pending_approval').length}
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-muted-foreground">Approved</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {payRuns.filter(run => run.status === 'approved').length}
                </div>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Total Processed</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {formatCurrency(
                    payRuns
                      .filter(run => run.status === 'processed')
                      .reduce((sum, run) => sum + run.total_net_pay, 0)
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Run History Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Expatriate Pay Run History</h3>
            <p className="text-sm text-muted-foreground">
              Track and manage your international payroll processing history
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {payRuns.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                <Globe className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No expatriate pay runs found</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Get started by creating your first expatriate pay run to process international employee payments.
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Expatriate Pay Run
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-muted/50">
                  <TableRow className="border-b-2 border-gray-200 dark:border-border">
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Pay Run Date</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Pay Group</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Pay Period</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Employees</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Gross Pay</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Net Pay</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Status</TableHead>
                    <TableHead className="h-12 px-6 font-semibold text-gray-900 dark:text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payRuns.map((payRun, index) => (
                    <TableRow 
                      key={payRun.id} 
                      className={`border-b border-gray-200 dark:border-border hover:bg-blue-50 dark:hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-gray-50 dark:bg-muted/20'
                      }`}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-foreground">
                          {formatDate(payRun.pay_run_date)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 dark:text-foreground">{payRun.pay_group_master.name}</div>
                          <div className="text-sm text-gray-600 dark:text-muted-foreground">
                            {payRun.pay_group_master.country}
                            {payRun.pay_group_master.code && ` (${payRun.pay_group_master.code})`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-muted-foreground">
                          {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="secondary" className="font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                          {payRun.pay_items_count} employees
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-foreground">
                          {formatCurrency(payRun.total_gross_pay, payRun)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-foreground">
                          {formatCurrency(payRun.total_net_pay, payRun)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className={`${getStatusColor(payRun.status)} font-medium px-3 py-1`}>
                          {formatStatus(payRun.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-3 text-xs font-medium border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            onClick={() => {
                              setSelectedPayRun(payRun);
                              setShowDetailsDialog(true);
                            }}
                          >
                            View Details
                          </Button>
                          {(payRun.status === 'approved' || payRun.status === 'processed') && canExportBankSchedule && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs font-medium border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
                              onClick={() => {
                                setSelectedPayRun(payRun);
                                setShowBankScheduleDialog(true);
                              }}
                            >
                              <FileSpreadsheet className="h-3 w-3 mr-1" />
                              Bank Schedule
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            onClick={() => {
                              setPayRunToDelete(payRun.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <CreatePayRunDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onPayRunCreated={fetchExpatriatePayRuns}
        payrollType="Expatriate"
      />

      {selectedPayRun && (
        <>
          <PayRunDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            payRunId={selectedPayRun.id}
            payRunDate={selectedPayRun.pay_run_date}
            payPeriod={{
              start: selectedPayRun.pay_period_start,
              end: selectedPayRun.pay_period_end
            }}
            onPayRunUpdated={fetchExpatriatePayRuns}
          />
          
          <BankScheduleExportDialog
            open={showBankScheduleDialog}
            onOpenChange={setShowBankScheduleDialog}
            payRunId={selectedPayRun.id}
            payRunDate={selectedPayRun.pay_run_date}
            payPeriod={`${selectedPayRun.pay_period_start} to ${selectedPayRun.pay_period_end}`}
          />
        </>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pay Run</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pay run? This action cannot be undone and will also delete all associated pay items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePayRun} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpatriatePayrollPage;

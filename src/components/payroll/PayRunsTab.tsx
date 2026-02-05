import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { log, warn, error, debug } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign, Trash2, FileSpreadsheet } from "lucide-react";
import { getCurrencyByCode, getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBankSchedulePermissions } from "@/hooks/use-bank-schedule-permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CreatePayRunDialog from "./CreatePayRunDialog";
import PayRunDetailsDialog from "./PayRunDetailsDialog";
import BankScheduleExportDialog from "./BankScheduleExportDialog";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserPlus, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProjectsService } from "@/lib/services/projects.service";
import { useQuery } from "@tanstack/react-query";

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
    currency?: string;
    code?: string;
    type: string;
  };
  pay_items_count?: number;
  category?: string;
  employee_type?: string;
  pay_frequency?: string;
  project_id?: string;
  projects?: {
    name: string;
  };
}

const PayRunsTab = () => {
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

  const fetchPayRuns = async () => {
    setLoading(true);
    try {
      // Add retry logic for network failures
      let attempts = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempts < maxAttempts) {
        try {
          // Check if we're on the expatriate page
          const isExpatriatePage = window.location.pathname.includes('/expatriate');

          let data, error;

          if (isExpatriatePage) {
            // For expatriate page, fetch pay runs with expatriate pay groups
            const result = await (supabase
              .from("pay_runs" as any)
              .select(`
                *,
                pay_group_master:pay_group_master_id (
                  name,
                  country,
                  currency,
                  code,
                  type
                ),
                pay_items (count)
              `)
              .eq("payroll_type", "expatriate")
              .order("pay_run_date", { ascending: false }) as any);

            data = result.data;
            error = result.error;
          } else {
            // Regular query for all pay runs using pay_group_master
            const result = await (supabase
              .from("pay_runs" as any)
              .select(`
                *,
                pay_group_master:pay_group_master_id (
                  name,
                  country,
                  currency,
                  code,
                  type
                ),
                pay_items (count),
                projects (name)
              `)
              .order("pay_run_date", { ascending: false }) as any);

            data = result.data;
            error = result.error;
          }

          if (error) throw error;

          const payRunsWithCount = data?.map(run => ({
            ...run,
            pay_items_count: run.pay_items?.[0]?.count || 0
          })) || [];

          setPayRuns(payRunsWithCount);
          return; // Success, exit retry loop
        } catch (err: any) {
          lastError = err;
          attempts++;

          // Only retry on network errors (Failed to fetch or network changed)
          const isNetworkError = err.message?.includes("Failed to fetch") || err.name === "TypeError" || err.message?.includes("network");
          if (isNetworkError && attempts < maxAttempts) {
            console.warn(`🔄 Retrying fetchPayRuns (attempt ${attempts + 1}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Backoff
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    } catch (err: any) {
      error("Error fetching pay runs:", err);
      toast({
        title: "Connection Issue",
        description: err.message?.includes("Failed to fetch") || err.name === "TypeError"
          ? "Network error. Please check your connection."
          : "Failed to fetch pay runs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPayRuns();
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
      case "processed":
        return "Processed";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getCategoryLabel = (category?: string) => {
    if (category === 'head_office') return 'Head Office';
    if (category === 'projects') return 'Projects';
    return 'Other';
  };

  const getTypeLabel = (type?: string) => {
    if (!type) return 'Regular';
    if (type === 'regular' || type === 'local') return 'Regular';
    return type.charAt(0).toUpperCase() + type.slice(1);
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
      // Add retry logic for network failures
      let attempts = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempts < maxAttempts) {
        try {
          const { error } = await (supabase
            .from("pay_runs" as any)
            .delete()
            .eq("id", payRunToDelete) as any);

          if (error) throw error;

          toast({
            title: "Success",
            description: "Pay run deleted successfully",
          });

          await fetchPayRuns();
          setShowDeleteDialog(false);
          setPayRunToDelete(null);
          return;
        } catch (err: any) {
          lastError = err;
          attempts++;

          // Only retry on network errors
          if (err.message?.includes("Failed to fetch") && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
          }
          throw err;
        }
      }

      throw lastError;
    } catch (err: any) {
      error("Error deleting pay run:", err);
      toast({
        title: "Error",
        description: err.message?.includes("Failed to fetch")
          ? "Network error. Please check your connection and try again."
          : "Failed to delete pay run",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pay runs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
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

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold text-foreground">Pay Run History</h3>
          <p className="text-sm text-muted-foreground">
            Track and manage your payroll processing history across different categories.
          </p>
        </div>

        {payRuns.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-lg">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No pay runs found</h3>
            <p className="text-muted-foreground mb-6">Create your first pay run to get started.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Pay Run
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={['head_office', 'projects']} className="space-y-4">
            {/* Head Office Section */}
            <AccordionItem value="head_office" className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">Head Office Payrolls</div>
                    <div className="text-xs text-muted-foreground">
                      {payRuns.filter(r => r.category === 'head_office').length} runs recorded
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="px-6 py-3 font-semibold">Date</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Pay Group / Type</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Period</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Employees</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Net Pay</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Status</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payRuns.filter(r => r.category === 'head_office').map((run) => (
                        <TableRow key={run.id} className="hover:bg-muted/50">
                          <TableCell className="px-6 py-4 font-medium">{formatDate(run.pay_run_date)}</TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="font-medium">{run.pay_group_master?.name}</div>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                                {getTypeLabel(run.employee_type)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(run.pay_period_start)} - {formatDate(run.pay_period_end)}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="secondary" className="font-normal text-xs">
                              {run.pay_items_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-semibold">{formatCurrency(run.total_net_pay, run)}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={`${getStatusColor(run.status)} text-[10px] px-2 py-0.5`}>
                              {formatStatus(run.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedPayRun(run);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setPayRunToDelete(run.id);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {payRuns.filter(r => r.category === 'head_office').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                            No head office pay runs recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Projects Section */}
            <AccordionItem value="projects" className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">Project Payrolls</div>
                    <div className="text-xs text-muted-foreground">
                      {payRuns.filter(r => r.category === 'projects' || (!r.category && r.project_id)).length} runs recorded
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="px-6 py-3 font-semibold">Date</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Project / Pay Group</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Type</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Period</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Net Pay</TableHead>
                        <TableHead className="px-6 py-3 font-semibold">Status</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payRuns.filter(r => r.category === 'projects' || (!r.category && r.project_id)).map((run) => (
                        <TableRow key={run.id} className="hover:bg-muted/50">
                          <TableCell className="px-6 py-4 font-medium whitespace-nowrap">{formatDate(run.pay_run_date)}</TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="font-medium">{run.projects?.name || 'Unlinked Project'}</div>
                              <div className="text-xs text-muted-foreground">{run.pay_group_master?.name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                              {getTypeLabel(run.employee_type)}
                              {run.pay_frequency && ` (${run.pay_frequency})`}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(run.pay_period_start)} - {formatDate(run.pay_period_end)}
                          </TableCell>
                          <TableCell className="px-6 py-4 font-semibold">{formatCurrency(run.total_net_pay, run)}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={`${getStatusColor(run.status)} text-[10px] px-2 py-0.5`}>
                              {formatStatus(run.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedPayRun(run);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setPayRunToDelete(run.id);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {payRuns.filter(r => r.category === 'projects' || (!r.category && r.project_id)).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                            No project pay runs recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      <CreatePayRunDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onPayRunCreated={fetchPayRuns}
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
            onPayRunUpdated={fetchPayRuns}
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

export default PayRunsTab;
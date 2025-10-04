import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CreatePayRunDialog from "./CreatePayRunDialog";
import PayRunDetailsDialog from "./PayRunDetailsDialog";
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
  pay_groups: {
    name: string;
    country: string;
  };
  pay_items_count?: number;
}

const PayRunsTab = () => {
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [payRunToDelete, setPayRunToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchPayRuns = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_runs")
        .select(`
          *,
          pay_groups (
            name,
            country
          ),
          pay_items (count)
        `)
        .order("pay_run_date", { ascending: false });

      if (error) throw error;
      
      const payRunsWithCount = data?.map(run => ({
        ...run,
        pay_items_count: run.pay_items?.[0]?.count || 0
      })) || [];
      
      setPayRuns(payRunsWithCount);
    } catch (error) {
      console.error("Error fetching pay runs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pay runs",
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
        return "bg-status-draft text-white";
      case "pending_approval":
        return "bg-status-pending text-white";
      case "approved":
        return "bg-status-approved text-white";
      case "processed":
        return "bg-status-processed text-white";
      default:
        return "bg-gray-100 text-gray-800";
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
          const { error } = await supabase
            .from("pay_runs")
            .delete()
            .eq("id", payRunToDelete);

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
    } catch (error: any) {
      console.error("Error deleting pay run:", error);
      toast({
        title: "Error",
        description: error.message?.includes("Failed to fetch") 
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Pay Runs</h3>
          <p className="text-sm text-muted-foreground">
            Process payroll for your pay groups
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pay Run
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-status-draft"></div>
              <span className="text-sm font-medium">Draft</span>
            </div>
            <div className="text-2xl font-bold">
              {payRuns.filter(run => run.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-status-pending"></div>
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold">
              {payRuns.filter(run => run.status === 'pending_approval').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-status-approved"></div>
              <span className="text-sm font-medium">Approved</span>
            </div>
            <div className="text-2xl font-bold">
              {payRuns.filter(run => run.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Processed</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payRuns
                  .filter(run => run.status === 'processed')
                  .reduce((sum, run) => sum + run.total_net_pay, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Run History</CardTitle>
          <CardDescription>
            Track and manage your payroll processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payRuns.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No pay runs found</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Pay Run
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Run Date</TableHead>
                  <TableHead>Pay Group</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payRuns.map((payRun) => (
                  <TableRow key={payRun.id}>
                    <TableCell className="font-medium">
                      {formatDate(payRun.pay_run_date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payRun.pay_groups.name}</div>
                        <div className="text-sm text-muted-foreground">{payRun.pay_groups.country}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payRun.pay_items_count} employees
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(payRun.total_gross_pay)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payRun.total_net_pay)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payRun.status)}>
                        {formatStatus(payRun.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedPayRun(payRun);
                            setShowDetailsDialog(true);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPayRunToDelete(payRun.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreatePayRunDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onPayRunCreated={fetchPayRuns}
      />

      {selectedPayRun && (
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
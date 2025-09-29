import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CreatePayRunDialog from "./CreatePayRunDialog";
import { format } from "date-fns";

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
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
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
    </div>
  );
};

export default PayRunsTab;
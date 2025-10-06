import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, Pencil, UserPlus, DollarSign } from "lucide-react";
import { getCurrencyByCode, formatCurrency as formatCurrencyUtil } from "@/lib/constants/countries";
import { format } from "date-fns";

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  pay_type: string;
  pay_rate: number;
  status: string;
  created_at: string;
  currency: string;
  department?: string | null;
}

interface PayGroup {
  id: string;
  name: string;
  country: string;
  pay_frequency: string;
  default_tax_percentage: number;
  description?: string | null;
}

interface PayGroupDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payGroupId: string | null;
  onEditPayGroup?: () => void;
  onRunPayroll?: () => void;
}

const PayGroupDetailsDialog = ({ 
  open, 
  onOpenChange, 
  payGroupId,
  onEditPayGroup,
  onRunPayroll 
}: PayGroupDetailsDialogProps) => {
  const [payGroup, setPayGroup] = useState<PayGroup | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && payGroupId) {
      fetchPayGroupDetails();
    }
  }, [open, payGroupId]);

  const fetchPayGroupDetails = async () => {
    if (!payGroupId) return;

    setLoading(true);
    try {
      // Fetch pay group details
      const { data: pgData, error: pgError } = await supabase
        .from("pay_groups")
        .select("*")
        .eq("id", payGroupId)
        .single();

      if (pgError) throw pgError;
      setPayGroup(pgData);

      // Fetch employees in this pay group
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("pay_group_id", payGroupId)
        .order("first_name");

      if (empError) throw empError;
      setEmployees(empData || []);
    } catch (error) {
      console.error("Error fetching pay group details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pay group details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (employee: Employee) => {
    const parts = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean);
    return parts.join(" ");
  };

  const formatPayType = (payType: string) => {
    switch (payType) {
      case "piece_rate":
        return "Piece Rate";
      default:
        return payType.charAt(0).toUpperCase() + payType.slice(1);
    }
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "Weekly";
      case "bi_weekly":
        return "Bi-Weekly";
      case "monthly":
        return "Monthly";
      case "semi_monthly":
        return "Semi-Monthly";
      default:
        return frequency;
    }
  };

  const formatPayRate = (rate: number, payType: string, currencyCode: string) => {
    const currency = getCurrencyByCode(currencyCode);
    const symbol = currency?.symbol || currencyCode;
    const decimals = currency?.decimalPlaces ?? 2;
    
    const formattedRate = rate.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    switch (payType) {
      case "hourly":
        return `${symbol}${formattedRate}/hr`;
      case "salary":
        return `${symbol}${formattedRate}/mo`;
      case "piece_rate":
        return `${symbol}${formattedRate}/piece`;
      default:
        return `${symbol}${formattedRate}`;
    }
  };

  if (loading || !payGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading pay group details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="modern-dialog-title">{payGroup.name}</DialogTitle>
              <DialogDescription className="modern-dialog-description">
                {payGroup.country} • {formatFrequency(payGroup.pay_frequency)} • {employees.length} employees
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEditPayGroup} className="modern-dialog-button-secondary">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button size="sm" onClick={onRunPayroll} className="modern-dialog-button">
                <DollarSign className="h-4 w-4 mr-2" />
                Run Payroll
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="modern-dialog-content">
          <div className="grid grid-cols-4 gap-4 my-4">
            <div className="modern-dialog-card">
              <div className="pb-2">
                <div className="text-sm text-muted-foreground">Total Employees</div>
                <div className="text-3xl font-bold">{employees.length}</div>
              </div>
            </div>
            <div className="modern-dialog-card">
              <div className="pb-2">
                <div className="text-sm text-muted-foreground">Active</div>
                <div className="text-3xl font-bold text-green-600">
                  {employees.filter(e => e.status === 'active').length}
                </div>
              </div>
            </div>
            <div className="modern-dialog-card">
              <div className="pb-2">
                <div className="text-sm text-muted-foreground">Pay Frequency</div>
                <div className="text-lg font-bold">{formatFrequency(payGroup.pay_frequency)}</div>
              </div>
            </div>
            <div className="modern-dialog-card">
              <div className="pb-2">
                <div className="text-sm text-muted-foreground">Default Tax</div>
                <div className="text-lg font-bold">{payGroup.default_tax_percentage}%</div>
              </div>
            </div>
          </div>

          {payGroup.description && (
            <div className="modern-dialog-card mb-4">
              <p className="text-sm text-muted-foreground">{payGroup.description}</p>
            </div>
          )}

          {/* Employees Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Employees in this Pay Group</h3>
              <Button variant="outline" size="sm" className="modern-dialog-button-secondary">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employees to Group
              </Button>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-8 modern-dialog-card">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No employees in this pay group yet</p>
                <Button variant="outline" size="sm" className="modern-dialog-button-secondary">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Employee
                </Button>
              </div>
            ) : (
              <div className="modern-dialog-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Pay Type</TableHead>
                      <TableHead>Pay Rate</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{getFullName(employee)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatPayType(employee.pay_type)}</Badge>
                        </TableCell>
                        <TableCell>{formatPayRate(employee.pay_rate, employee.pay_type, employee.currency)}</TableCell>
                        <TableCell>{employee.department || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(employee.created_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayGroupDetailsDialog;

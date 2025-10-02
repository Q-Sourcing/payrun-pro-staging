import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface PayItem {
  id: string;
  employee_id: string;
  gross_pay: number;
  tax_deduction: number;
  benefit_deductions: number;
  total_deductions: number;
  net_pay: number;
  hours_worked: number | null;
  pieces_completed: number | null;
  employees: {
    first_name: string;
    middle_name: string | null;
    last_name: string | null;
    email: string;
    pay_type: string;
    pay_rate: number;
  };
}

interface PayRunDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payRunId: string | null;
  payRunDate: string;
  payPeriod: { start: string; end: string };
}

const PayRunDetailsDialog = ({ open, onOpenChange, payRunId, payRunDate, payPeriod }: PayRunDetailsDialogProps) => {
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItems, setEditingItems] = useState<Record<string, Partial<PayItem>>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open && payRunId) {
      fetchPayItems();
    }
  }, [open, payRunId]);

  const fetchPayItems = async () => {
    if (!payRunId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pay_items")
        .select(`
          *,
          employees (
            first_name,
            middle_name,
            last_name,
            email,
            pay_type,
            pay_rate
          )
        `)
        .eq("pay_run_id", payRunId)
        .order("employees(first_name)");

      if (error) throw error;
      setPayItems(data || []);
    } catch (error) {
      console.error("Error fetching pay items:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pay run details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFullName = (employee: PayItem['employees']) => {
    const parts = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const handleFieldChange = (itemId: string, field: keyof PayItem, value: number) => {
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      }
    }));
  };

  const calculatePay = (item: PayItem, edits: Partial<PayItem>) => {
    const hoursWorked = edits.hours_worked ?? item.hours_worked ?? 0;
    const piecesCompleted = edits.pieces_completed ?? item.pieces_completed ?? 0;
    const payRate = item.employees.pay_rate;
    
    let grossPay = 0;
    if (item.employees.pay_type === 'hourly') {
      grossPay = hoursWorked * payRate;
    } else if (item.employees.pay_type === 'piece_rate') {
      grossPay = piecesCompleted * payRate;
    } else {
      grossPay = payRate;
    }

    const taxDeduction = edits.tax_deduction ?? item.tax_deduction ?? 0;
    const benefitDeductions = edits.benefit_deductions ?? item.benefit_deductions ?? 0;
    const totalDeductions = taxDeduction + benefitDeductions;
    const netPay = grossPay - totalDeductions;

    return { grossPay, totalDeductions, netPay };
  };

  const handleSave = async (item: PayItem) => {
    const edits = editingItems[item.id] || {};
    const { grossPay, totalDeductions, netPay } = calculatePay(item, edits);

    try {
      const { error } = await supabase
        .from("pay_items")
        .update({
          hours_worked: edits.hours_worked ?? item.hours_worked,
          pieces_completed: edits.pieces_completed ?? item.pieces_completed,
          tax_deduction: edits.tax_deduction ?? item.tax_deduction,
          benefit_deductions: edits.benefit_deductions ?? item.benefit_deductions,
          gross_pay: grossPay,
          total_deductions: totalDeductions,
          net_pay: netPay,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pay item updated successfully",
      });

      setEditingItems(prev => {
        const newState = { ...prev };
        delete newState[item.id];
        return newState;
      });

      fetchPayItems();
    } catch (error) {
      console.error("Error updating pay item:", error);
      toast({
        title: "Error",
        description: "Failed to update pay item",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading pay run details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Run Details</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Pay Run Date: {format(new Date(payRunDate), 'MMM dd, yyyy')} | 
            Pay Period: {format(new Date(payPeriod.start), 'MMM dd')} - {format(new Date(payPeriod.end), 'MMM dd, yyyy')}
          </div>
        </DialogHeader>

        {payItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pay items found for this pay run
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Pay Type</TableHead>
                <TableHead>Hours/Pieces</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Benefits</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payItems.map((item) => {
                const edits = editingItems[item.id] || {};
                const calculated = calculatePay(item, edits);
                const isEditing = !!editingItems[item.id];

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getFullName(item.employees)}</div>
                        <div className="text-sm text-muted-foreground">{item.employees.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.employees.pay_type === 'hourly' ? 'Hourly' : 
                         item.employees.pay_type === 'piece_rate' ? 'Piece Rate' : 'Salary'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.employees.pay_type === 'hourly' ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-20"
                          value={edits.hours_worked ?? item.hours_worked ?? 0}
                          onChange={(e) => handleFieldChange(item.id, 'hours_worked', parseFloat(e.target.value) || 0)}
                        />
                      ) : item.employees.pay_type === 'piece_rate' ? (
                        <Input
                          type="number"
                          className="w-20"
                          value={edits.pieces_completed ?? item.pieces_completed ?? 0}
                          onChange={(e) => handleFieldChange(item.id, 'pieces_completed', parseInt(e.target.value) || 0)}
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(calculated.grossPay)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={edits.tax_deduction ?? item.tax_deduction ?? 0}
                        onChange={(e) => handleFieldChange(item.id, 'tax_deduction', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={edits.benefit_deductions ?? item.benefit_deductions ?? 0}
                        onChange={(e) => handleFieldChange(item.id, 'benefit_deductions', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(calculated.totalDeductions)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(calculated.netPay)}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Button size="sm" onClick={() => handleSave(item)}>
                          Save
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingItems({ [item.id]: {} })}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayRunDetailsDialog;

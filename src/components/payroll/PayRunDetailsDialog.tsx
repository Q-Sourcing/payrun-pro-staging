import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { getCountryDeductions, calculateDeduction } from "@/lib/constants/deductions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CustomDeduction {
  id?: string;
  name: string;
  amount: number;
}

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
    country: string;
  };
  customDeductions?: CustomDeduction[];
}

interface PayRunDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payRunId: string | null;
  payRunDate: string;
  payPeriod: { start: string; end: string };
  onPayRunUpdated?: () => void;
}

interface PayGroup {
  country: string;
}

const PayRunDetailsDialog = ({ open, onOpenChange, payRunId, payRunDate, payPeriod, onPayRunUpdated }: PayRunDetailsDialogProps) => {
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItems, setEditingItems] = useState<Record<string, Partial<PayItem>>>({});
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [newCustomDeduction, setNewCustomDeduction] = useState<Record<string, { name: string; amount: string }>>({});
  const [payGroupCountry, setPayGroupCountry] = useState<string>("");
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
      // Fetch pay group country
      const { data: payRunData, error: payRunError } = await supabase
        .from("pay_runs")
        .select("pay_groups(country)")
        .eq("id", payRunId)
        .single();

      if (payRunError) throw payRunError;
      setPayGroupCountry((payRunData?.pay_groups as unknown as PayGroup)?.country || "");

      // Fetch pay items
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
            pay_rate,
            country
          )
        `)
        .eq("pay_run_id", payRunId)
        .order("employees(first_name)");

      if (error) throw error;

      // Fetch custom deductions for each pay item
      const payItemsWithDeductions = await Promise.all(
        (data || []).map(async (item) => {
          const { data: customDeductions } = await supabase
            .from("pay_item_custom_deductions")
            .select("*")
            .eq("pay_item_id", item.id);

          return {
            ...item,
            customDeductions: customDeductions || [],
          };
        })
      );

      setPayItems(payItemsWithDeductions);
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

  const calculatePay = (item: PayItem, edits: Partial<PayItem> = {}) => {
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

    // Recalculate country-specific deductions (non-editable)
    const deductionRules = getCountryDeductions(item.employees.country);
    const calculatedTaxDeduction = deductionRules
      .filter(rule => rule.mandatory)
      .reduce((total, rule) => total + calculateDeduction(grossPay, rule), 0);

    // Custom deductions
    const customDeductionsTotal = (item.customDeductions || []).reduce(
      (sum, d) => sum + d.amount,
      0
    );

    const benefitDeductions = edits.benefit_deductions ?? item.benefit_deductions ?? 0;
    const totalDeductions = calculatedTaxDeduction + benefitDeductions + customDeductionsTotal;
    const netPay = grossPay - totalDeductions;

    return { 
      grossPay, 
      taxDeduction: calculatedTaxDeduction, 
      totalDeductions, 
      netPay,
      customDeductionsTotal 
    };
  };

  const handleSave = async (item: PayItem) => {
    const edits = editingItems[item.id] || {};
    const { grossPay, taxDeduction, totalDeductions, netPay } = calculatePay(item, edits);

    try {
      const { error } = await supabase
        .from("pay_items")
        .update({
          hours_worked: edits.hours_worked ?? item.hours_worked,
          pieces_completed: edits.pieces_completed ?? item.pieces_completed,
          tax_deduction: taxDeduction,
          benefit_deductions: edits.benefit_deductions ?? item.benefit_deductions,
          gross_pay: grossPay,
          total_deductions: totalDeductions,
          net_pay: netPay,
        })
        .eq("id", item.id);

      if (error) throw error;

      // Recalculate pay run totals
      await updatePayRunTotals();

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

  const updatePayRunTotals = async () => {
    if (!payRunId) return;

    const { data: allPayItems } = await supabase
      .from("pay_items")
      .select("gross_pay, total_deductions, net_pay")
      .eq("pay_run_id", payRunId);

    if (allPayItems) {
      const totals = allPayItems.reduce(
        (acc, item) => ({
          gross: acc.gross + item.gross_pay,
          deductions: acc.deductions + item.total_deductions,
          net: acc.net + item.net_pay,
        }),
        { gross: 0, deductions: 0, net: 0 }
      );

      await supabase
        .from("pay_runs")
        .update({
          total_gross_pay: totals.gross,
          total_deductions: totals.deductions,
          total_net_pay: totals.net,
        })
        .eq("id", payRunId);
    }
  };

  const handleAddCustomDeduction = async (payItemId: string) => {
    const deduction = newCustomDeduction[payItemId];
    if (!deduction?.name || !deduction?.amount) {
      toast({
        title: "Error",
        description: "Please enter both name and amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("pay_item_custom_deductions")
        .insert({
          pay_item_id: payItemId,
          name: deduction.name,
          amount: parseFloat(deduction.amount),
        });

      if (error) throw error;

      setNewCustomDeduction(prev => {
        const updated = { ...prev };
        delete updated[payItemId];
        return updated;
      });

      toast({
        title: "Success",
        description: "Custom deduction added",
      });

      fetchPayItems();
    } catch (error) {
      console.error("Error adding custom deduction:", error);
      toast({
        title: "Error",
        description: "Failed to add custom deduction",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomDeduction = async (deductionId: string) => {
    try {
      const { error } = await supabase
        .from("pay_item_custom_deductions")
        .delete()
        .eq("id", deductionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom deduction removed",
      });

      fetchPayItems();
    } catch (error) {
      console.error("Error deleting custom deduction:", error);
      toast({
        title: "Error",
        description: "Failed to delete custom deduction",
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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Run Details</DialogTitle>
          <DialogDescription>
            Pay Run Date: {format(new Date(payRunDate), 'MMM dd, yyyy')} | 
            Pay Period: {format(new Date(payPeriod.start), 'MMM dd')} - {format(new Date(payPeriod.end), 'MMM dd, yyyy')}
          </DialogDescription>
        </DialogHeader>

        {payItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pay items found for this pay run
          </div>
        ) : (
          <div className="space-y-4">
            {payItems.map((item) => {
              const edits = editingItems[item.id] || {};
              const calculated = calculatePay(item, edits);
              const isEditing = !!editingItems[item.id];
              const isExpanded = expandedEmployee === item.id;
              const countryDeductions = getCountryDeductions(item.employees.country);

              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{getFullName(item.employees)}</CardTitle>
                        <CardDescription>{item.employees.email}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {item.employees.pay_type === 'hourly' ? 'Hourly' : 
                         item.employees.pay_type === 'piece_rate' ? 'Piece Rate' : 'Salary'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {item.employees.pay_type === 'hourly' && (
                        <div>
                          <Label>Hours Worked</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={edits.hours_worked ?? item.hours_worked ?? 0}
                            onChange={(e) => handleFieldChange(item.id, 'hours_worked', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      )}
                      {item.employees.pay_type === 'piece_rate' && (
                        <div>
                          <Label>Pieces Completed</Label>
                          <Input
                            type="number"
                            value={edits.pieces_completed ?? item.pieces_completed ?? 0}
                            onChange={(e) => handleFieldChange(item.id, 'pieces_completed', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      )}
                      <div>
                        <Label>Gross Pay</Label>
                        <div className="text-xl font-bold">{formatCurrency(calculated.grossPay)}</div>
                      </div>
                      <div>
                        <Label>Benefits Deduction</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={edits.benefit_deductions ?? item.benefit_deductions ?? 0}
                          onChange={(e) => handleFieldChange(item.id, 'benefit_deductions', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Net Pay</Label>
                        <div className="text-xl font-bold text-primary">{formatCurrency(calculated.netPay)}</div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEmployee(isExpanded ? null : item.id)}
                      >
                        {isExpanded ? 'Hide' : 'Show'} Deductions Breakdown
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                        <div>
                          <h4 className="font-semibold mb-2">Country-Specific Deductions (Auto-calculated)</h4>
                          <div className="space-y-2">
                            {countryDeductions
                              .filter(rule => rule.mandatory)
                              .map((rule, idx) => {
                                const amount = calculateDeduction(calculated.grossPay, rule);
                                return (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span>{rule.name}</span>
                                    <span className="font-medium">{formatCurrency(amount)}</span>
                                  </div>
                                );
                              })}
                            <div className="flex justify-between font-semibold pt-2 border-t">
                              <span>Total Tax Deductions</span>
                              <span>{formatCurrency(calculated.taxDeduction)}</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">Custom Deductions</h4>
                          </div>
                          {item.customDeductions && item.customDeductions.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {item.customDeductions.map((deduction) => (
                                <div key={deduction.id} className="flex justify-between items-center text-sm bg-background p-2 rounded">
                                  <span>{deduction.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{formatCurrency(deduction.amount)}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteCustomDeduction(deduction.id!)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Deduction name"
                              value={newCustomDeduction[item.id]?.name || ""}
                              onChange={(e) =>
                                setNewCustomDeduction((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], name: e.target.value },
                                }))
                              }
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              className="w-32"
                              value={newCustomDeduction[item.id]?.amount || ""}
                              onChange={(e) =>
                                setNewCustomDeduction((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], amount: e.target.value },
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddCustomDeduction(item.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Benefits Deduction</span>
                            <span className="font-medium">{formatCurrency(edits.benefit_deductions ?? item.benefit_deductions ?? 0)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-base pt-2 border-t">
                            <span>Total Deductions</span>
                            <span>{formatCurrency(calculated.totalDeductions)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
                      {isEditing ? (
                        <Button onClick={() => handleSave(item)}>
                          Save Changes
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          onClick={() => setEditingItems({ [item.id]: {} })}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayRunDetailsDialog;

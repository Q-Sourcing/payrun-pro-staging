import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Globe, Calculator, DollarSign, ArrowRightLeft, Plus } from "lucide-react";
import { ExpatriatePayrollService } from "@/lib/services/expatriate-payroll";
import type { ExpatriateCalculationInput, ExpatriateCalculationResult } from "@/lib/types/expatriate-payroll";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface ExpatriatePayRunDetailsProps {
  payRunId: string;
  expatriatePayGroup: {
    id: string;
    name: string;
    currency: string;
    exchange_rate_to_local: number;
    tax_country: string;
    default_daily_rate: number;
  };
  payRunData?: {
    days_worked: number;
    exchange_rate: number;
  };
  employees: Array<{
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  }>;
  onUpdate: () => void;
}

interface ExpatriatePayRunItem {
  id?: string;
  employee_id: string;
  pay_run_id: string;
  daily_rate: number;
  days_worked: number;
  allowances_foreign: number;
  gross_foreign: number;
  net_foreign: number;
  gross_local: number;
  net_local: number;
  currency: string;
  exchange_rate: number;
  tax_country: string;
  employee?: {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  };
}

export const ExpatriatePayRunDetails: React.FC<ExpatriatePayRunDetailsProps> = ({
  payRunId,
  expatriatePayGroup,
  payRunData,
  employees,
  onUpdate
}) => {
  const [payRunItems, setPayRunItems] = useState<ExpatriatePayRunItem[]>([]);
  const [editingItems, setEditingItems] = useState<Record<string, Partial<ExpatriatePayRunItem>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const daysWorked = payRunData?.days_worked ?? 0;
  const exchangeRate = payRunData?.exchange_rate ?? expatriatePayGroup.exchange_rate_to_local;

  useEffect(() => {
    loadExpatriatePayRunItems();
    
    // Set up real-time updates for this specific pay run
    const channel = supabase
      .channel(`expatriate-payrun-details-${payRunId}`)
      .on("postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "expatriate_pay_run_items",
          filter: `pay_run_id=eq.${payRunId}`
        }, 
        () => {
          console.log("🔄 Real-time update: expatriate pay run items changed for this pay run");
          loadExpatriatePayRunItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [payRunId]);

  const loadExpatriatePayRunItems = async () => {
    try {
      setIsLoading(true);
      const items = await ExpatriatePayrollService.getExpatriatePayRunItems(payRunId);
      setPayRunItems(items);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load expatriate pay run items',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializePayRunItem = (employee: any): ExpatriatePayRunItem => {
    return {
      employee_id: employee.id,
      pay_run_id: payRunId,
      daily_rate: expatriatePayGroup.default_daily_rate,
      days_worked: 0, // Default to 0, user will input
      allowances_foreign: 0,
      gross_foreign: 0,
      net_foreign: 0,
      net_local: 0,
      gross_local: 0,
      currency: expatriatePayGroup.currency,
      exchange_rate: 0, // Default to 0, user will input
      tax_country: expatriatePayGroup.tax_country,
      employee
    };
  };

  const calculateExpatriatePay = async (item: ExpatriatePayRunItem, edits: Partial<ExpatriatePayRunItem> = {}) => {
    const updatedItem = { ...item, ...edits };
    
    try {
      setIsCalculating(prev => ({ ...prev, [updatedItem.employee_id]: true }));

      const input: ExpatriateCalculationInput = {
        employee_id: updatedItem.employee_id,
        daily_rate: updatedItem.daily_rate,
        days_worked: updatedItem.days_worked,
        allowances: updatedItem.allowances_foreign,
        currency: updatedItem.currency,
        exchange_rate_to_local: updatedItem.exchange_rate,
        tax_country: updatedItem.tax_country
      };

      const result: ExpatriateCalculationResult = await ExpatriatePayrollService.calculateExpatriatePay(input);

      // Calculate gross_foreign manually since it's not in the result
      const gross_foreign = (updatedItem.daily_rate * updatedItem.days_worked) + updatedItem.allowances_foreign;
      
      const calculatedItem: ExpatriatePayRunItem = {
        ...updatedItem,
        gross_foreign: gross_foreign,
        net_foreign: result.net_foreign,
        net_local: result.net_local,
        gross_local: result.gross_local
      };

      return calculatedItem;
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate expatriate pay',
        variant: 'destructive'
      });
      return updatedItem;
    } finally {
      setIsCalculating(prev => ({ ...prev, [updatedItem.employee_id]: false }));
    }
  };

  const handleFieldChange = async (employeeId: string, field: keyof ExpatriatePayRunItem, value: any) => {
    const currentItem = payRunItems.find(item => item.employee_id === employeeId);
    if (!currentItem) return;

    // Handle empty string values - convert to 0 for calculations
    const processedValue = value === '' ? 0 : value;
    const edits = { ...editingItems[employeeId], [field]: processedValue };
    setEditingItems(prev => ({ ...prev, [employeeId]: edits }));

    // Auto-calculate when relevant fields change and all required fields have values
    if (['daily_rate', 'days_worked', 'allowances_foreign', 'exchange_rate'].includes(field)) {
      const updatedItem = { ...currentItem, ...edits };
      
      // Only calculate if we have the minimum required fields
      if (updatedItem.daily_rate > 0 && updatedItem.days_worked > 0 && updatedItem.exchange_rate > 0) {
        const calculatedItem = await calculateExpatriatePay(updatedItem);
        setEditingItems(prev => ({ 
          ...prev, 
          [employeeId]: { 
            ...edits, 
            gross_foreign: calculatedItem.gross_foreign,
            net_foreign: calculatedItem.net_foreign,
            net_local: calculatedItem.net_local,
            gross_local: calculatedItem.gross_local
          }
        }));
      }
    }
  };

  const saveExpatriatePayRunItem = async (employeeId: string) => {
    try {
      const currentItem = payRunItems.find(item => item.employee_id === employeeId);
      const edits = editingItems[employeeId];
      
      if (!currentItem || !edits) return;

      const updatedItem = { ...currentItem, ...edits };
      
      // Ensure calculations are up to date
      const calculatedItem = await calculateExpatriatePay(updatedItem);
      
      await ExpatriatePayrollService.upsertExpatriatePayRunItem(calculatedItem);
      
      // Refresh items to update totals and summary cards
      await loadExpatriatePayRunItems();
      
      // Clear editing state
      setEditingItems(prev => {
        const newState = { ...prev };
        delete newState[employeeId];
        return newState;
      });

      toast({
        title: 'Success',
        description: 'Expatriate pay run item updated successfully'
      });

      // Notify parent to refresh pay run list
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save expatriate pay run item',
        variant: 'destructive'
      });
    }
  };

  const addEmployeeToPayRun = async (employee: any) => {
    try {
      const newItem = initializePayRunItem(employee);
      const calculatedItem = await calculateExpatriatePay(newItem);
      
      await ExpatriatePayrollService.upsertExpatriatePayRunItem(calculatedItem);
      
      setPayRunItems(prev => [...prev, calculatedItem]);
      
      toast({
        title: 'Success',
        description: 'Employee added to expatriate pay run'
      });

      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add employee to pay run',
        variant: 'destructive'
      });
    }
  };

  const summaryTotals = useMemo(() => {
    const items = payRunItems.map(item => {
      const edits = editingItems[item.employee_id] || {};
      const currency = item.currency || expatriatePayGroup.currency;
      const rate = edits.daily_rate ?? item.daily_rate ?? expatriatePayGroup.default_daily_rate;
      const days = edits.days_worked ?? item.days_worked ?? 0;
      const allowances = edits.allowances_foreign ?? item.allowances_foreign ?? 0;
      const exchange = item.exchange_rate || expatriatePayGroup.exchange_rate_to_local || 1;

      const baseEarningsFX = rate * days;
      const totalPayFX = baseEarningsFX + allowances;
      const totalPayLocal = totalPayFX * exchange;
      const grossLocal = totalPayLocal;
      const grossFX = totalPayFX;

      return { 
        ...item, 
        ...edits,
        totalPayFX,
        totalPayLocal,
        grossLocal,
        grossFX
      };
    });

    return {
      totalGrossForeign: items.reduce((sum, item) => sum + (item.grossFX || 0), 0),
      totalNetForeign: items.reduce((sum, item) => sum + (item.totalPayFX || 0), 0),
      totalNetLocal: items.reduce((sum, item) => sum + (item.totalPayLocal || 0), 0),
      totalGrossLocal: items.reduce((sum, item) => sum + (item.grossLocal || 0), 0),
      employeeCount: items.length
    };
  }, [payRunItems, editingItems, expatriatePayGroup]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-h-0">
      {/* Compact Header with PayGroup Info */}
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{expatriatePayGroup.name}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {expatriatePayGroup.currency} → Local
            </Badge>
          </div>
          <CardDescription className="text-sm">
            Expatriate PayRun: Daily rate payroll with dual currency calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-muted-foreground text-xs">Default Daily Rate</Label>
              <p className="font-medium text-sm">{ExpatriatePayrollService.formatCurrency(expatriatePayGroup.default_daily_rate, expatriatePayGroup.currency)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Currency</Label>
              <p className="font-medium text-sm">{expatriatePayGroup.currency}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Tax Country</Label>
              <p className="font-medium text-sm">{expatriatePayGroup.tax_country}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Employees</Label>
              <p className="font-medium text-sm">{summaryTotals.employeeCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Summary Cards - Single Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3">
        <Card className="border border-border rounded-lg shadow-sm">
          <CardContent className="p-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Gross (Foreign)</span>
              <span className="font-semibold text-sm mt-1">
                {ExpatriatePayrollService.formatCurrency(summaryTotals.totalGrossForeign, expatriatePayGroup.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-lg shadow-sm">
          <CardContent className="p-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Net (Foreign)</span>
              <span className="font-semibold text-sm mt-1">
                {ExpatriatePayrollService.formatCurrency(summaryTotals.totalNetForeign, expatriatePayGroup.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-lg shadow-sm">
          <CardContent className="p-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Net (Local)</span>
              <span className="font-semibold text-sm mt-1">
                {ExpatriatePayrollService.formatCurrency(summaryTotals.totalNetLocal, 'UGX')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-lg shadow-sm">
          <CardContent className="p-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Gross (Local)</span>
              <span className="font-semibold text-sm mt-1">
                {ExpatriatePayrollService.formatCurrency(summaryTotals.totalGrossLocal, 'UGX')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-lg shadow-sm">
          <CardContent className="p-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Employees</span>
              <span className="font-semibold text-sm mt-1">{summaryTotals.employeeCount}</span>
            </div>
          </CardContent>
        </Card>

      {/* Pay Run Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expatriate Pay Run Items</CardTitle>
          <CardDescription className="text-sm">
            Manage daily rates, days worked, and allowances for each employee
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] rounded-md">
            <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Normal Rate ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Days Worked</TableHead>
                  <TableHead>Base Earnings ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Allowances ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Net ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Net (UGX)</TableHead>
                  <TableHead>Gross (UGX)</TableHead>
                  <TableHead>Gross ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Payroll Adjustments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {payRunItems.map((item) => {
                    const edits = editingItems[item.employee_id] || {};
                    const isItemCalculating = isCalculating[item.employee_id] || false;
                    const hasUnsavedChanges = Object.keys(edits).length > 0;
                    
                    // Professional calculations
                    const currency = item.currency || expatriatePayGroup.currency;
                    const rate = (edits.daily_rate ?? item.daily_rate ?? expatriatePayGroup.default_daily_rate) || 0;
                    const days = (edits.days_worked ?? item.days_worked ?? 0) || 0;
                    const allowances = (edits.allowances_foreign ?? item.allowances_foreign ?? 0) || 0;
                    const exchange = item.exchange_rate || expatriatePayGroup.exchange_rate_to_local || 1;

                    const baseEarningsFX = rate * days;
                    const totalPayFX = baseEarningsFX + allowances;
                    const totalPayLocal = totalPayFX * exchange;
                    const grossLocal = totalPayLocal; // Keep simple for now
                    const grossFX = totalPayFX;

                    return (
                      <motion.tr
                        key={item.employee_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="border-b border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-muted/50"
                      >
                        {/* Employee Name */}
                        <TableCell className="font-medium">
                          {item.employee?.first_name} {item.employee?.last_name}
                        </TableCell>

                        {/* Normal Rate */}
                        <TableCell>
                          <div className="font-medium text-gray-900 dark:text-foreground">
                            {ExpatriatePayrollService.formatCurrency(rate, currency)}
                          </div>
                        </TableCell>

                        {/* Days Worked */}
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={edits.days_worked !== undefined ? edits.days_worked.toString() : (item.days_worked || '').toString()}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^\d.]/g, '');
                              handleFieldChange(
                                item.employee_id,
                                'days_worked',
                                Number(sanitized || 0)
                              );
                            }}
                            className="w-20"
                            placeholder="0"
                          />
                        </TableCell>

                        {/* Base Earnings */}
                        <TableCell>
                          <div className="font-medium text-gray-900 dark:text-foreground">
                            {ExpatriatePayrollService.formatCurrency(baseEarningsFX, currency)}
                          </div>
                        </TableCell>

                        {/* Allowances */}
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={edits.allowances_foreign !== undefined ? edits.allowances_foreign.toString() : (item.allowances_foreign || '').toString()}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^\d.]/g, '');
                              handleFieldChange(
                                item.employee_id,
                                'allowances_foreign',
                                Number(sanitized || 0)
                              );
                            }}
                            className="w-24"
                            placeholder="0.00"
                          />
                        </TableCell>

                        {/* Net (Foreign) */}
                        <TableCell>
                          <div className="font-semibold text-blue-600">
                            {ExpatriatePayrollService.formatCurrency(totalPayFX, currency)}
                          </div>
                        </TableCell>

                        {/* Net (Local) */}
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            {ExpatriatePayrollService.formatCurrency(totalPayLocal, 'UGX')}
                          </div>
                        </TableCell>

                        {/* Gross (Local) */}
                        <TableCell>
                          <div className="font-semibold text-purple-600">
                            {ExpatriatePayrollService.formatCurrency(grossLocal, 'UGX')}
                          </div>
                        </TableCell>

                        {/* Gross (Foreign) */}
                        <TableCell>
                          <div className="font-semibold text-orange-600">
                            {ExpatriatePayrollService.formatCurrency(grossFX, currency)}
                          </div>
                        </TableCell>

                        {/* Payroll Adjustments */}
                        <TableCell className="italic text-muted-foreground text-xs">
                          Pending
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={!hasUnsavedChanges}
                            onClick={() => saveExpatriatePayRunItem(item.employee_id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Save
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Add Employee Button */}
          <div className="mt-4">
            <Button
              onClick={() => {
                // This would open a dialog to select employees to add
                toast({
                  title: 'Coming Soon',
                  description: 'Employee selection dialog will be implemented'
                });
              }}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpatriatePayRunDetails;

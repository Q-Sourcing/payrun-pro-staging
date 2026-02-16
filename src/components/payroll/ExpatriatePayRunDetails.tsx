import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Globe, Calculator, DollarSign, ArrowRightLeft, Plus, Settings, ChevronDown, PlusCircle, MinusCircle, FileText, Edit2, X } from "lucide-react";
import { GeneratePayslipsDialog } from "./GeneratePayslipsDialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpatriatePayrollService } from "@/lib/services/expatriate-payroll";
import type { ExpatriateCalculationInput, ExpatriateCalculationResult, ExpatriateAllowance, ExpatriatePayGroupFormData } from "@/lib/types/expatriate-payroll";
import { EXPATRIATE_CURRENCIES, SUPPORTED_TAX_COUNTRIES } from "@/lib/types/expatriate-payroll";
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
  allowances_foreign: number; // Deprecated - use allowances array
  gross_foreign: number;
  net_foreign: number;
  gross_local: number;
  net_local: number;
  currency: string;
  exchange_rate_to_local: number;
  tax_country: string;
  notes?: string;
  allowances?: ExpatriateAllowance[];
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAddAllowanceDialogOpen, setBulkAddAllowanceDialogOpen] = useState(false);
  const [bulkDaysWorkedDialogOpen, setBulkDaysWorkedDialogOpen] = useState(false);
  const [payRunExchangeRateDialogOpen, setPayRunExchangeRateDialogOpen] = useState(false);
  const [payGroupDialogOpen, setPayGroupDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [generatePayslipsDialogOpen, setGeneratePayslipsDialogOpen] = useState(false);
  const [generatePayslipsForSelected, setGeneratePayslipsForSelected] = useState(false);
  const [notesEmployeeId, setNotesEmployeeId] = useState<string | null>(null);
  const [editingAllowances, setEditingAllowances] = useState<Record<string, Record<string, number>>>({});
  const { toast } = useToast();

  // Generate dynamic columns for allowances
  const customAllowanceColumns = useMemo(() => {
    const columnNames = new Set<string>();
    payRunItems.forEach(item => {
      (item.allowances || []).forEach(allowance => {
        columnNames.add(allowance.name);
      });
    });
    return Array.from(columnNames).sort();
  }, [payRunItems]);

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
      .on("postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expatriate_pay_run_item_allowances"
        },
        () => {
          console.log("🔄 Real-time update: allowances changed");
          loadExpatriatePayRunItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [payRunId]);

  useEffect(() => {
    // if there are no items yet but we have assigned employees, seed minimal rows
    if (!isLoading && payRunItems.length === 0 && employees && employees.length > 0) {
      (async () => {
        try {
          // read organization_id from pay_runs
          const { data: pr } = await supabase
            .from('pay_runs')
            .select('organization_id')
            .eq('id', payRunId)
            .single();
          const orgId = (pr as any)?.organization_id || null;

          // create initial items for each assigned employee
          const baseItems = employees.map((emp:any) => ({
            organization_id: orgId,
            pay_run_id: payRunId,
            employee_id: emp.id,
            daily_rate: emp.pay_rate || 0,
            days_worked: 0,
            allowances_foreign: 0,
            gross_foreign: 0,
            net_foreign: 0,
            gross_local: 0,
            net_local: 0,
            currency: expatriatePayGroup.currency,
            exchange_rate_to_local: Number(payRunData?.exchange_rate || expatriatePayGroup.exchange_rate_to_local || 1),
            tax_country: expatriatePayGroup.tax_country,
          }));

          for (const item of baseItems) {
            try {
              await ExpatriatePayrollService.upsertExpatriatePayRunItem(item);
            } catch (e) {
              console.error('Seed upsert failed for', item.employee_id, e);
            }
          }
          await loadExpatriatePayRunItems();
        } catch (e) {
          console.error('Auto-seed failed:', e);
        }
      })();
    }
  }, [isLoading, payRunItems.length, employees]);

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
      daily_rate: (employee as any).pay_rate || 0,
      days_worked: 0, // Default to 0, user will input
      allowances_foreign: 0,
      gross_foreign: 0,
      net_foreign: 0,
      net_local: 0,
      gross_local: 0,
      currency: expatriatePayGroup.currency,
      exchange_rate_to_local: 0, // Default to 0, user will input
      tax_country: expatriatePayGroup.tax_country,
      employee
    };
  };

  // Helper function to calculate total allowances from array
  const calculateTotalAllowances = (item: ExpatriatePayRunItem): number => {
    if (item.allowances && item.allowances.length > 0) {
      return item.allowances.reduce((sum, allowance) => sum + (allowance.amount || 0), 0);
    }
    // Fallback to deprecated allowances_foreign for backward compatibility
    return item.allowances_foreign || 0;
  };

  const calculateExpatriatePay = async (item: ExpatriatePayRunItem, edits: Partial<ExpatriatePayRunItem> = {}) => {
    const updatedItem = { ...item, ...edits };
    
    try {
      setIsCalculating(prev => ({ ...prev, [updatedItem.employee_id]: true }));

      // Ensure exchange_rate_to_local is set
      const exchangeRate = (updatedItem as any).exchange_rate_to_local ?? 
                          expatriatePayGroup.exchange_rate_to_local ?? 
                          1;

      // Calculate total allowances from array
      const totalAllowances = calculateTotalAllowances(updatedItem);

      // Get currency and tax_country with proper fallbacks
      const currency = updatedItem.currency || expatriatePayGroup.currency;
      const taxCountry = updatedItem.tax_country || expatriatePayGroup.tax_country;

      // Validate required fields before calling edge function
      if (!updatedItem.employee_id) {
        throw new Error('Employee ID is required');
      }
      if (!currency) {
        throw new Error('Currency is required. Please set it in the pay group or pay run item.');
      }
      if (!taxCountry) {
        throw new Error('Tax country is required. Please set it in the pay group or pay run item.');
      }

      // Ensure all numeric values are numbers (not strings)
      const dailyRate = Number(updatedItem.daily_rate) || 0;
      const daysWorked = Number(updatedItem.days_worked) || 0;
      const allowancesAmount = Number(totalAllowances) || 0;
      const exchangeRateNum = Number(exchangeRate) || 1;

      const input: ExpatriateCalculationInput = {
        employee_id: updatedItem.employee_id,
        daily_rate: dailyRate,
        days_worked: daysWorked,
        allowances: allowancesAmount,
        currency: currency,
        exchange_rate_to_local: exchangeRateNum,
        tax_country: taxCountry
      };

      console.log('🧮 Calling edge function with input:', input);

      const result: ExpatriateCalculationResult = await ExpatriatePayrollService.calculateExpatriatePay(input);

      console.log('✅ Edge function returned:', result);

      // Calculate gross_foreign manually since it's not in the result
      const gross_foreign = ((updatedItem.daily_rate ?? 0) * (updatedItem.days_worked ?? 0)) + totalAllowances;
      
      const calculatedItem: ExpatriatePayRunItem = {
        ...updatedItem,
        exchange_rate_to_local: exchangeRate,
        gross_foreign: gross_foreign,
        net_foreign: result.net_foreign,
        net_local: result.net_local,
        gross_local: result.gross_local
      };

      return calculatedItem;
    } catch (error: any) {
      console.error('❌ Calculation error:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Fallback to manual calculation if edge function fails
      const exchangeRate = (updatedItem as any).exchange_rate_to_local ?? 
                          expatriatePayGroup.exchange_rate_to_local ?? 
                          1;
      const dailyRate = updatedItem.daily_rate ?? 0;
      const daysWorked = updatedItem.days_worked ?? 0;
      const totalAllowances = calculateTotalAllowances(updatedItem);
      
      const gross_foreign = (dailyRate * daysWorked) + totalAllowances;
      const tax_rate = 0.20; // 20% tax rate as fallback
      const tax_amount = gross_foreign * tax_rate;
      const net_foreign = gross_foreign - tax_amount;
      const gross_local = gross_foreign * exchangeRate;
      const net_local = net_foreign * exchangeRate;
      
      toast({
        title: 'Calculation Warning',
        description: error.message || 'Using fallback calculation. Edge function may not be deployed.',
        variant: 'default'
      });
      
      return {
        ...updatedItem,
        exchange_rate_to_local: exchangeRate,
        gross_foreign,
        net_foreign,
        gross_local,
        net_local
      };
    } finally {
      setIsCalculating(prev => ({ ...prev, [updatedItem.employee_id]: false }));
    }
  };

  const handleFieldChange = async (employeeId: string, field: keyof ExpatriatePayRunItem, value: any) => {
    const currentItem = payRunItems.find(item => item.employee_id === employeeId);
    if (!currentItem) return;

    // Handle empty string values - convert to 0 for numeric fields, keep empty string for text fields
    const isNumericField = ['daily_rate', 'days_worked', 'allowances_foreign', 'exchange_rate_to_local', 'gross_foreign', 'net_foreign', 'gross_local', 'net_local'].includes(field);
    const processedValue = isNumericField && value === '' ? 0 : value;
    const edits = { ...editingItems[employeeId], [field]: processedValue };
    setEditingItems(prev => ({ ...prev, [employeeId]: edits }));

    // Auto-calculate when relevant fields change
    if (['daily_rate', 'days_worked', 'allowances_foreign', 'exchange_rate_to_local'].includes(field)) {
      const updatedItem = { ...currentItem, ...edits };
      
      // Ensure exchange_rate_to_local is set (use from edits, item, or pay group default)
      const exchangeRate = (edits as any).exchange_rate_to_local ?? 
                          (updatedItem as any).exchange_rate_to_local ?? 
                          expatriatePayGroup.exchange_rate_to_local ?? 
                          1;
      
      // Calculate whenever exchange_rate > 0
      // Allow daily_rate and days_worked to be 0 (will calculate correctly)
      if (exchangeRate > 0) {
        try {
          const calculatedItem = await calculateExpatriatePay({
            ...updatedItem,
            exchange_rate_to_local: exchangeRate
          } as any);
        setEditingItems(prev => ({ 
          ...prev, 
          [employeeId]: { 
            ...edits, 
              exchange_rate_to_local: exchangeRate,
            gross_foreign: calculatedItem.gross_foreign,
            net_foreign: calculatedItem.net_foreign,
            net_local: calculatedItem.net_local,
            gross_local: calculatedItem.gross_local
          }
        }));
        } catch (error) {
          console.error('Auto-calculation error:', error);
          // Don't show toast for auto-calculation errors, just log
        }
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

  // Handle allowance amount change
  const handleAllowanceAmountChange = async (payRunItemId: string, allowanceId: string, newAmount: number) => {
    try {
      await ExpatriatePayrollService.updateAllowance(allowanceId, newAmount);
      
      // Reload pay run items to get updated allowances
      await loadExpatriatePayRunItems();
      
      // Recalculate for this employee
      const item = payRunItems.find(i => i.id === payRunItemId);
      if (item) {
        await calculateExpatriatePay(item);
        await loadExpatriatePayRunItems();
      }
      
      toast({
        title: 'Success',
        description: 'Allowance updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update allowance',
        variant: 'destructive'
      });
    }
  };

  // Handle allowance deletion
  const handleDeleteAllowance = async (payRunItemId: string, allowanceId: string) => {
    try {
      await ExpatriatePayrollService.deleteAllowance(allowanceId);
      
      // Reload pay run items
      await loadExpatriatePayRunItems();
      
      // Recalculate for this employee
      const item = payRunItems.find(i => i.id === payRunItemId);
      if (item) {
        await calculateExpatriatePay(item);
        await loadExpatriatePayRunItems();
      }
      
      toast({
        title: 'Success',
        description: 'Allowance deleted'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete allowance',
        variant: 'destructive'
      });
    }
  };

  // Calculate effective exchange rate from pay run items
  const effectiveExchangeRate = useMemo(() => {
    if (payRunItems.length === 0) {
      return payRunData?.exchange_rate ?? expatriatePayGroup.exchange_rate_to_local;
    }

    // Get all exchange rates from items (considering edits)
    const rates = payRunItems.map(item => {
      const edits = editingItems[item.employee_id] || {};
      return (edits.exchange_rate_to_local ?? item.exchange_rate_to_local ?? expatriatePayGroup.exchange_rate_to_local);
    });

    // Find the most common rate
    const rateCounts = rates.reduce((acc, rate) => {
      acc[rate] = (acc[rate] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const mostCommonRate = Object.entries(rateCounts).reduce((a, b) => 
      rateCounts[Number(a[0])] > rateCounts[Number(b[0])] ? a : b
    )[0];

    return Number(mostCommonRate);
  }, [payRunItems, editingItems, payRunData, expatriatePayGroup.exchange_rate_to_local]);

  const summaryTotals = useMemo(() => {
    const items = payRunItems.map(item => {
      const edits = editingItems[item.employee_id] || {};
      const currency = item.currency || expatriatePayGroup.currency;
      const rate = edits.daily_rate ?? item.daily_rate ?? 0;
      const days = edits.days_worked ?? item.days_worked ?? 0;
      
      // Calculate total allowances from array
      const itemWithEdits = { ...item, ...edits };
      const totalAllowances = calculateTotalAllowances(itemWithEdits);
      
      const exchange = (item as any).exchange_rate_to_local || expatriatePayGroup.exchange_rate_to_local || 1;

      const baseEarningsFX = rate * days;
      const totalPayFX = baseEarningsFX + totalAllowances;
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
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setPayGroupDialogOpen(true)}
              title="View/Edit pay group details"
            >
              <Settings className="h-3 w-3 mr-1" />
              Edit Pay Group
            </Button>
          </div>
          <CardDescription className="text-sm">
            Expatriate PayRun: Daily rate payroll with dual currency calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-muted-foreground text-xs">Currency</Label>
              <p className="font-medium text-sm">{expatriatePayGroup.currency}</p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-muted-foreground text-xs">Exchange Rate</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setPayRunExchangeRateDialogOpen(true)}
                  title="Edit exchange rate for all employees"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-medium text-sm">
                {effectiveExchangeRate
                  ? `1 ${expatriatePayGroup.currency} = ${effectiveExchangeRate.toLocaleString()} UGX`
                  : 'N/A'}
              </p>
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
      </div>

      {/* Pay Run Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
          <CardTitle className="text-base">Expatriate Pay Run Items</CardTitle>
          <CardDescription className="text-sm">
            Manage daily rates, days worked, and allowances for each employee
          </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <span className="text-sm text-muted-foreground">{selectedItems.size} selected</span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Bulk Actions
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setBulkAddAllowanceDialogOpen(true)} disabled={selectedItems.size === 0} className="gap-2">
                    <PlusCircle className="h-4 w-4 text-green-600" />
                    <span>Add Allowances to Selected</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkDaysWorkedDialogOpen(true)} disabled={selectedItems.size === 0} className="gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span>Set Days Worked for Selected</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setGeneratePayslipsForSelected(true);
                      setGeneratePayslipsDialogOpen(true);
                    }} 
                    disabled={selectedItems.size === 0} 
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span>Generate Payslips for Selected</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setGeneratePayslipsForSelected(false);
                      setGeneratePayslipsDialogOpen(true);
                    }} 
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span>Generate Payslips for All</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] rounded-md">
            <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === payRunItems.length && payRunItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(new Set(payRunItems.map(item => item.employee_id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Normal Rate ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Days Worked</TableHead>
                  <TableHead>Base Earnings ({expatriatePayGroup.currency})</TableHead>
                  {/* Dynamic Allowance Columns */}
                  {customAllowanceColumns.map(columnName => (
                    <TableHead key={columnName} className="text-center">
                      {columnName}
                    </TableHead>
                  ))}
                  <TableHead>Exchange Rate</TableHead>
                  <TableHead>Net ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Net (UGX)</TableHead>
                  <TableHead>Gross (UGX)</TableHead>
                  <TableHead>Gross ({expatriatePayGroup.currency})</TableHead>
                  <TableHead>Notes</TableHead>
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
                    const rate = (edits.daily_rate ?? item.daily_rate) || 0;
                    const days = (edits.days_worked ?? item.days_worked ?? 0) || 0;
                    const itemWithEdits = { ...item, ...edits };
                    const totalAllowances = calculateTotalAllowances(itemWithEdits);
                    const exchange = (item as any).exchange_rate_to_local || expatriatePayGroup.exchange_rate_to_local || 1;

                    const baseEarningsFX = rate * days;
                    // Use edge function results if available (includes tax calculations), otherwise calculate manually
                    const netForeign = edits.net_foreign !== undefined ? edits.net_foreign : (baseEarningsFX + totalAllowances);
                    const netLocal = edits.net_local !== undefined ? edits.net_local : ((baseEarningsFX + totalAllowances) * exchange);
                    const grossLocal = edits.gross_local !== undefined ? edits.gross_local : ((baseEarningsFX + totalAllowances) * exchange);
                    const grossFX = edits.gross_foreign !== undefined ? edits.gross_foreign : (baseEarningsFX + totalAllowances);
                    const totalPayFX = netForeign; // Net foreign (after tax)
                    const totalPayLocal = netLocal; // Net local (after tax)

                    return (
                      <motion.tr
                        key={item.employee_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="border-b border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-muted/50"
                      >
                        {/* Checkbox */}
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedItems.has(item.employee_id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedItems);
                              if (checked) {
                                newSelected.add(item.employee_id);
                              } else {
                                newSelected.delete(item.employee_id);
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                        </TableCell>
                        {/* Employee Name */}
                        <TableCell className="font-medium">
                          {item.employee?.first_name || employees.find(e => e.id === item.employee_id)?.first_name || 'Unknown'} {item.employee?.last_name || employees.find(e => e.id === item.employee_id)?.last_name || ''}
                        </TableCell>

                        {/* Normal Rate */}
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={edits.daily_rate !== undefined ? edits.daily_rate.toString() : (item.daily_rate || '').toString()}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^\d.]/g, '');
                              handleFieldChange(
                                item.employee_id,
                                'daily_rate',
                                Number(sanitized || 0)
                              );
                            }}
                            className="w-24"
                            placeholder="0.00"
                          />
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

                        {/* Dynamic Allowance Columns */}
                        {customAllowanceColumns.map(columnName => {
                          const allowance = (item.allowances || []).find(a => a.name === columnName);
                          const allowanceId = allowance?.id;
                          const hasAllowance = !!allowance;
                          const currentAmount = editingAllowances[item.id || '']?.[allowanceId || 'new_' + columnName] ?? allowance?.amount ?? 0;
                          
                          return (
                            <TableCell key={columnName} className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={currentAmount.toString()}
                                  onChange={(e) => {
                                    const sanitized = e.target.value.replace(/[^\d.]/g, '');
                                    const newAmount = Number(sanitized || 0);
                                    if (item.id) {
                                      const key = allowanceId || `new_${columnName}`;
                                      setEditingAllowances(prev => ({
                                        ...prev,
                                        [item.id!]: {
                                          ...(prev[item.id!] || {}),
                                          [key]: newAmount
                                        }
                                      }));
                                    }
                                  }}
                                  onBlur={async () => {
                                    if (item.id) {
                                      const key = allowanceId || `new_${columnName}`;
                                      const newAmount = editingAllowances[item.id]?.[key];
                                      
                                      if (newAmount !== undefined) {
                                        if (hasAllowance && newAmount !== allowance?.amount) {
                                          // Update existing allowance
                                          await handleAllowanceAmountChange(item.id, allowanceId, newAmount);
                                        } else if (!hasAllowance && newAmount > 0) {
                                          // Create new allowance
                                          try {
                                            await ExpatriatePayrollService.createAllowance(item.id, columnName, newAmount);
                                            await loadExpatriatePayRunItems();
                                            // Recalculate
                                            const updatedItem = payRunItems.find(i => i.id === item.id);
                                            if (updatedItem) {
                                              await calculateExpatriatePay(updatedItem);
                                              await loadExpatriatePayRunItems();
                                            }
                                            toast({
                                              title: 'Success',
                                              description: 'Allowance created'
                                            });
                                          } catch (error: any) {
                                            toast({
                                              title: 'Error',
                                              description: error.message || 'Failed to create allowance',
                                              variant: 'destructive'
                                            });
                                          }
                                        }
                                        
                                        // Clear editing state
                                        setEditingAllowances(prev => {
                                          const newState = { ...prev };
                                          if (newState[item.id!]) {
                                            delete newState[item.id!][key];
                                            if (Object.keys(newState[item.id!]).length === 0) {
                                              delete newState[item.id!];
                                            }
                                          }
                                          return newState;
                                        });
                                      }
                                    }
                                  }}
                                  className="w-20 text-center"
                                  placeholder={hasAllowance ? "0.00" : "Add"}
                                />
                                {hasAllowance && allowanceId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDeleteAllowance(item.id!, allowanceId)}
                                  >
                                    <X className="h-3 w-3 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}

                        {/* Exchange Rate */}
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={edits.exchange_rate_to_local !== undefined 
                              ? edits.exchange_rate_to_local.toString() 
                              : ((item.exchange_rate_to_local || expatriatePayGroup.exchange_rate_to_local || '').toString())}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^\d.]/g, '');
                              handleFieldChange(
                                item.employee_id,
                                'exchange_rate_to_local',
                                Number(sanitized || 0)
                              );
                            }}
                            className="w-20"
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

                        {/* Notes */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNotesEmployeeId(item.employee_id);
                                setNotesDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {(edits.notes !== undefined ? edits.notes : item.notes) && (
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={edits.notes !== undefined ? edits.notes : item.notes}>
                                {(edits.notes !== undefined ? edits.notes : item.notes)?.substring(0, 20)}...
                              </span>
                            )}
                          </div>
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

      {/* Bulk Add Allowances Dialog */}
      <Dialog open={bulkAddAllowanceDialogOpen} onOpenChange={setBulkAddAllowanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Allowances to Selected Employees</DialogTitle>
            <DialogDescription>
              Add a new allowance to {selectedItems.size} selected employee(s)
            </DialogDescription>
          </DialogHeader>
          <BulkAddAllowanceDialog
            open={bulkAddAllowanceDialogOpen}
            onOpenChange={setBulkAddAllowanceDialogOpen}
            selectedItems={Array.from(selectedItems)}
            payRunItems={payRunItems}
            currency={expatriatePayGroup.currency}
            onApply={async (name: string, amounts: number | Record<string, number>) => {
              try {
                // Get pay run item IDs for selected employees
                const selectedPayRunItemIds = payRunItems
                  .filter(item => selectedItems.has(item.employee_id))
                  .map(item => item.id!)
                  .filter(Boolean);

                if (selectedPayRunItemIds.length === 0) {
                  toast({
                    title: 'Error',
                    description: 'No pay run items found for selected employees',
                    variant: 'destructive'
                  });
                  return;
                }

                await ExpatriatePayrollService.bulkCreateAllowances(selectedPayRunItemIds, name, amounts);
                
                // Reload items to show new allowances
                await loadExpatriatePayRunItems();
                
                // Recalculate for all affected employees
                for (const employeeId of selectedItems) {
                  const item = payRunItems.find(i => i.employee_id === employeeId);
                  if (item) {
                    await calculateExpatriatePay(item);
                  }
                }
                await loadExpatriatePayRunItems();
                
                setBulkAddAllowanceDialogOpen(false);
                toast({
                  title: 'Success',
                  description: `Added "${name}" allowance to ${selectedItems.size} employee(s)`
                });
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.message || 'Failed to add allowances',
                  variant: 'destructive'
                });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Set Days Worked Dialog */}
      <Dialog open={bulkDaysWorkedDialogOpen} onOpenChange={setBulkDaysWorkedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Days Worked for Selected Employees</DialogTitle>
            <DialogDescription>
              Set days worked for {selectedItems.size} selected employee(s)
            </DialogDescription>
          </DialogHeader>
          <BulkDaysWorkedDialog
            open={bulkDaysWorkedDialogOpen}
            onOpenChange={setBulkDaysWorkedDialogOpen}
            selectedItems={Array.from(selectedItems)}
            payRunItems={payRunItems}
            onApply={async (days: number) => {
              for (const employeeId of selectedItems) {
                await handleFieldChange(employeeId, 'days_worked', days);
              }
              setBulkDaysWorkedDialogOpen(false);
              toast({
                title: 'Success',
                description: `Set ${days} days worked for ${selectedItems.size} employee(s)`
              });
            }}
          />
        </DialogContent>
      </Dialog>


      {/* Pay Run Exchange Rate Dialog */}
      <Dialog open={payRunExchangeRateDialogOpen} onOpenChange={setPayRunExchangeRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Exchange Rate for Pay Run</DialogTitle>
            <DialogDescription>
              Update exchange rate for all employees in this pay run. You can optionally update the pay group's default exchange rate for future pay runs.
            </DialogDescription>
          </DialogHeader>
          <PayRunExchangeRateDialog
            open={payRunExchangeRateDialogOpen}
            onOpenChange={setPayRunExchangeRateDialogOpen}
            currentRate={payRunData?.exchange_rate ?? expatriatePayGroup.exchange_rate_to_local}
            currency={expatriatePayGroup.currency}
            onApply={async (rate: number, updatePayGroup: boolean) => {
              try {
                // Preserve existing edits
                const preservedEdits = { ...editingItems };
                
                // Update all pay run items
                const updatedItems: ExpatriatePayRunItem[] = [];
                for (const item of payRunItems) {
                  // Merge with existing edits to preserve user input
                  const existingEdits = preservedEdits[item.employee_id] || {};
                  const updatedItem = { 
                    ...item, 
                    ...existingEdits,
                    exchange_rate_to_local: rate 
                  };
                  
                  // Recalculate with new exchange rate
                  const calculatedItem = await calculateExpatriatePay(updatedItem);
                  
                  // Save to database
                  await ExpatriatePayrollService.upsertExpatriatePayRunItem(calculatedItem);
                  
                  // Update local state - merge calculated values but preserve other edits
                  updatedItems.push(calculatedItem);
                  
                  // Update editingItems to include new exchange rate and calculated values
                  // but preserve other user edits
                  setEditingItems(prev => ({
                    ...prev,
                    [item.employee_id]: {
                      ...existingEdits,
                      exchange_rate_to_local: rate,
                      gross_foreign: calculatedItem.gross_foreign,
                      net_foreign: calculatedItem.net_foreign,
                      net_local: calculatedItem.net_local,
                      gross_local: calculatedItem.gross_local
                    }
                  }));
                }

                // Update payRunItems state with new calculated values
                setPayRunItems(updatedItems);

                // Optionally update pay group
                if (updatePayGroup) {
                  await ExpatriatePayrollService.updateExpatriatePayGroup(
                    expatriatePayGroup.id,
                    { exchange_rate_to_local: rate }
                  );
                  // Notify parent to refresh pay group data
                  onUpdate();
                }
                
                setPayRunExchangeRateDialogOpen(false);
                toast({
                  title: 'Success',
                  description: `Exchange rate updated to ${rate.toLocaleString()} for all employees${updatePayGroup ? ' and pay group' : ''}`
                });
              } catch (error: any) {
                console.error('Error updating exchange rate:', error);
                toast({
                  title: 'Error',
                  description: error.message || 'Failed to update exchange rate',
                  variant: 'destructive'
                });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Pay Group Details Dialog */}
      <Dialog open={payGroupDialogOpen} onOpenChange={setPayGroupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pay Group Details</DialogTitle>
            <DialogDescription>
              View and edit expatriate pay group settings
            </DialogDescription>
          </DialogHeader>
          <PayGroupDetailsDialog
            payGroupId={expatriatePayGroup.id}
            onClose={() => setPayGroupDialogOpen(false)}
            onUpdate={async () => {
              // Reload pay group data
              try {
                const updatedPayGroup = await ExpatriatePayrollService.getExpatriatePayGroup(expatriatePayGroup.id);
                if (updatedPayGroup) {
                  // Update the expatriatePayGroup prop would require parent component update
                  // For now, just refresh and notify parent
                  onUpdate();
                }
              } catch (error) {
                console.error('Error reloading pay group:', error);
              }
              setPayGroupDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Notes</DialogTitle>
            <DialogDescription>
              Add notes for {notesEmployeeId ? payRunItems.find(i => i.employee_id === notesEmployeeId)?.employee?.first_name || 'employee' : 'employee'}
            </DialogDescription>
          </DialogHeader>
          <NotesDialog
            open={notesDialogOpen}
            onOpenChange={setNotesDialogOpen}
            employeeId={notesEmployeeId}
            payRunItems={payRunItems}
            editingItems={editingItems}
            onSave={async (notes: string) => {
              if (notesEmployeeId) {
                await handleFieldChange(notesEmployeeId, 'notes', notes);
                await saveExpatriatePayRunItem(notesEmployeeId);
                setNotesDialogOpen(false);
                toast({
                  title: 'Success',
                  description: 'Notes saved successfully'
                });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Generate Payslips Dialog */}
      <GeneratePayslipsDialog
        open={generatePayslipsDialogOpen}
        onOpenChange={(open) => {
          setGeneratePayslipsDialogOpen(open);
          if (!open) {
            setGeneratePayslipsForSelected(false);
          }
        }}
        employeeCount={summaryTotals.employeeCount}
        payRunId={payRunId}
        selectedEmployeeIds={generatePayslipsForSelected ? Array.from(selectedItems) : undefined}
      />
    </div>
  );
};

// Bulk Add Allowance Dialog Component (supports same or individual amounts)
const BulkAddAllowanceDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  payRunItems: ExpatriatePayRunItem[];
  currency: string;
  onApply: (name: string, amounts: number | Record<string, number>) => void;
}> = ({ open, onOpenChange, selectedItems, payRunItems, currency, onApply }) => {
  const [allowanceName, setAllowanceName] = useState('');
  const [amountMode, setAmountMode] = useState<'same' | 'individual'>('same');
  const [sameAmount, setSameAmount] = useState('');
  const [individualAmounts, setIndividualAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // Initialize individual amounts for selected employees
      const initialAmounts: Record<string, string> = {};
      selectedItems.forEach(employeeId => {
        initialAmounts[employeeId] = '';
      });
      setIndividualAmounts(initialAmounts);
    }
  }, [open, selectedItems]);

  const handleApply = () => {
    if (!allowanceName.trim()) return;

    if (amountMode === 'same') {
      const parsedAmount = parseFloat(sameAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0) return;
      onApply(allowanceName.trim(), parsedAmount);
    } else {
      // Individual amounts
      const amounts: Record<string, number> = {};
      let hasValidAmount = false;
      
      selectedItems.forEach(employeeId => {
        const amountStr = individualAmounts[employeeId] || '';
        const parsedAmount = parseFloat(amountStr);
        if (!isNaN(parsedAmount) && parsedAmount >= 0) {
          amounts[employeeId] = parsedAmount;
          hasValidAmount = true;
        }
      });

      if (!hasValidAmount) {
        return; // At least one amount must be provided
      }

      onApply(allowanceName.trim(), amounts);
    }

    // Reset form
    setAllowanceName('');
    setSameAmount('');
    setIndividualAmounts({});
    setAmountMode('same');
  };

  const selectedEmployees = payRunItems.filter(item => selectedItems.includes(item.employee_id));

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Allowance Name</Label>
          <Input
            type="text"
            placeholder="e.g., Housing, Transport, Medical"
            value={allowanceName}
            onChange={(e) => setAllowanceName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Amount Mode</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={amountMode === 'same'}
                onChange={() => setAmountMode('same')}
                className="w-4 h-4"
              />
              <span>Same amount for all</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={amountMode === 'individual'}
                onChange={() => setAmountMode('individual')}
                className="w-4 h-4"
              />
              <span>Individual amounts</span>
            </label>
          </div>
        </div>

        {amountMode === 'same' ? (
          <div className="space-y-2">
            <Label>Amount ({currency})</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={sameAmount}
              onChange={(e) => setSameAmount(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            <Label>Amount per Employee ({currency})</Label>
            {selectedEmployees.map((item) => {
              const employeeName = `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.trim() || 'Unknown';
              return (
                <div key={item.employee_id} className="flex items-center gap-2">
                  <Label className="w-32 text-sm font-normal truncate">{employeeName}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={individualAmounts[item.employee_id] || ''}
                    onChange={(e) => {
                      setIndividualAmounts(prev => ({
                        ...prev,
                        [item.employee_id]: e.target.value
                      }));
                    }}
                    className="flex-1"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { 
          setAllowanceName(''); 
          setSameAmount(''); 
          setIndividualAmounts({});
          setAmountMode('same');
          onOpenChange(false); 
        }}>
          Cancel
        </Button>
        <Button 
          onClick={handleApply} 
          disabled={
            !allowanceName.trim() || 
            (amountMode === 'same' && (!sameAmount || parseFloat(sameAmount) < 0)) ||
            (amountMode === 'individual' && !Object.values(individualAmounts).some(v => v && parseFloat(v) >= 0))
          }
        >
          Add Allowance
        </Button>
      </DialogFooter>
    </>
  );
};

// Bulk Days Worked Dialog Component
const BulkDaysWorkedDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  payRunItems: ExpatriatePayRunItem[];
  onApply: (days: number) => void;
}> = ({ open, onOpenChange, selectedItems, payRunItems, onApply }) => {
  const [days, setDays] = useState('');

  const handleApply = () => {
    const parsedDays = parseFloat(days);
    if (isNaN(parsedDays) || parsedDays < 0) return;
    onApply(parsedDays);
    setDays('');
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Days Worked</Label>
          <Input
            type="number"
            placeholder="Enter days"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setDays(''); onOpenChange(false); }}>Cancel</Button>
        <Button onClick={handleApply} disabled={!days || parseFloat(days) < 0}>
          Apply
        </Button>
      </DialogFooter>
    </>
  );
};

// Pay Run Exchange Rate Dialog Component
const PayRunExchangeRateDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRate: number;
  currency: string;
  onApply: (rate: number, updatePayGroup: boolean) => void;
}> = ({ open, onOpenChange, currentRate, currency, onApply }) => {
  const [rate, setRate] = useState(currentRate.toString());
  const [updatePayGroup, setUpdatePayGroup] = useState(false);

  useEffect(() => {
    if (open) {
      setRate(currentRate.toString());
      setUpdatePayGroup(false);
    }
  }, [open, currentRate]);

  const handleApply = () => {
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate <= 0) return;
    onApply(parsedRate, updatePayGroup);
    setRate(currentRate.toString());
    setUpdatePayGroup(false);
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Exchange Rate</Label>
          <Input
            type="number"
            step="0.0001"
            placeholder="Enter exchange rate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Current rate: 1 {currency} = {currentRate.toLocaleString()} UGX
          </p>
          {rate && !isNaN(parseFloat(rate)) && parseFloat(rate) > 0 && (
            <p className="text-xs text-muted-foreground">
              New rate: 1 {currency} = {parseFloat(rate).toLocaleString()} UGX
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="update-paygroup"
            checked={updatePayGroup}
            onCheckedChange={(checked) => setUpdatePayGroup(checked === true)}
          />
          <Label htmlFor="update-paygroup" className="text-sm font-normal cursor-pointer">
            Update pay group default exchange rate for future pay runs
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { 
          setRate(currentRate.toString()); 
          setUpdatePayGroup(false);
          onOpenChange(false); 
        }}>
          Cancel
        </Button>
        <Button onClick={handleApply} disabled={!rate || parseFloat(rate) <= 0}>
          Apply to All Employees
        </Button>
      </DialogFooter>
    </>
  );
};

// Notes Dialog Component
const NotesDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  payRunItems: ExpatriatePayRunItem[];
  editingItems: Record<string, Partial<ExpatriatePayRunItem>>;
  onSave: (notes: string) => void;
}> = ({ open, onOpenChange, employeeId, payRunItems, editingItems, onSave }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (employeeId && open) {
      const item = payRunItems.find(i => i.employee_id === employeeId);
      const edits = editingItems[employeeId];
      setNotes(edits?.notes ?? item?.notes ?? '');
    }
  }, [employeeId, payRunItems, editingItems, open]);

  const handleSave = () => {
    onSave(notes);
    setNotes('');
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="Add notes about this employee's pay run..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setNotes(''); onOpenChange(false); }}>Cancel</Button>
        <Button onClick={handleSave}>
          Save Notes
        </Button>
      </DialogFooter>
    </>
  );
};

// Pay Group Details Dialog Component
const PayGroupDetailsDialog: React.FC<{
  payGroupId: string;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ payGroupId, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<ExpatriatePayGroupFormData>({
    name: '',
    country: '',
    currency: 'USD',
    exchange_rate_to_local: 0,
    default_daily_rate: 0,
    tax_country: 'UG',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadPayGroup = async () => {
      try {
        setIsLoading(true);
        const payGroup = await ExpatriatePayrollService.getExpatriatePayGroup(payGroupId);
        if (payGroup) {
          setFormData({
                name: payGroup.name,
                country: payGroup.country,
                currency: payGroup.currency,
                exchange_rate_to_local: payGroup.exchange_rate_to_local,
                default_daily_rate: payGroup.default_daily_rate || 0,
                tax_country: payGroup.tax_country,
                notes: payGroup.notes || ''
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load pay group details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (payGroupId) {
      loadPayGroup();
    }
  }, [payGroupId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await ExpatriatePayrollService.updateExpatriatePayGroup(payGroupId, formData);
      toast({
        title: 'Success',
        description: 'Pay group updated successfully'
      });
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pay group',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">PayGroup Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., US Expatriates - Uganda"
            required
          />
        </div>
        <div>
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="e.g., Uganda"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">Currency *</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {EXPATRIATE_CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="exchange_rate">Exchange Rate to Local *</Label>
          <Input
            id="exchange_rate"
            type="number"
            step="0.0001"
            value={formData.exchange_rate_to_local}
            onChange={(e) => setFormData({ ...formData, exchange_rate_to_local: parseFloat(e.target.value) || 0 })}
            placeholder="e.g., 3800"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tax_country">Tax Country *</Label>
          <Select
            value={formData.tax_country}
            onValueChange={(value) => setFormData({ ...formData, tax_country: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tax country" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TAX_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about this pay group"
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ExpatriatePayRunDetails;

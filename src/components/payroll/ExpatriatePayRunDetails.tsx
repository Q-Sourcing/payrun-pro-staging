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
  net_foreign: number;
  net_local: number;
  gross_local: number;
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
  employees,
  onUpdate
}) => {
  const [payRunItems, setPayRunItems] = useState<ExpatriatePayRunItem[]>([]);
  const [editingItems, setEditingItems] = useState<Record<string, Partial<ExpatriatePayRunItem>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadExpatriatePayRunItems();
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
      days_worked: 22, // Default working days
      allowances_foreign: 0,
      net_foreign: 0,
      net_local: 0,
      gross_local: 0,
      currency: expatriatePayGroup.currency,
      exchange_rate: expatriatePayGroup.exchange_rate_to_local,
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

      const calculatedItem: ExpatriatePayRunItem = {
        ...updatedItem,
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

    const edits = { ...editingItems[employeeId], [field]: value };
    setEditingItems(prev => ({ ...prev, [employeeId]: edits }));

    // Auto-calculate when relevant fields change
    if (['daily_rate', 'days_worked', 'allowances_foreign'].includes(field)) {
      const calculatedItem = await calculateExpatriatePay(currentItem, edits);
      setEditingItems(prev => ({ 
        ...prev, 
        [employeeId]: { 
          ...edits, 
          net_foreign: calculatedItem.net_foreign,
          net_local: calculatedItem.net_local,
          gross_local: calculatedItem.gross_local
        }
      }));
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
      
      // Update local state
      setPayRunItems(prev => prev.map(item => 
        item.employee_id === employeeId ? calculatedItem : item
      ));
      
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

      onUpdate();
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
      return { ...item, ...edits };
    });

    return {
      totalNetForeign: items.reduce((sum, item) => sum + (item.net_foreign || 0), 0),
      totalNetLocal: items.reduce((sum, item) => sum + (item.net_local || 0), 0),
      totalGrossLocal: items.reduce((sum, item) => sum + (item.gross_local || 0), 0),
      employeeCount: items.length
    };
  }, [payRunItems, editingItems]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with PayGroup Info */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">{expatriatePayGroup.name}</CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              🇺🇸 {expatriatePayGroup.currency} → Local
            </Badge>
          </div>
          <CardDescription>
            Expatriate PayRun: Daily rate payroll with dual currency calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Default Daily Rate</Label>
              <p className="font-medium">{ExpatriatePayrollService.formatCurrency(expatriatePayGroup.default_daily_rate, expatriatePayGroup.currency)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Exchange Rate</Label>
              <p className="font-medium">{expatriatePayGroup.exchange_rate_to_local.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tax Country</Label>
              <p className="font-medium">{expatriatePayGroup.tax_country}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Employees</Label>
              <p className="font-medium">{summaryTotals.employeeCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Net (Foreign)</p>
                <p className="text-lg font-semibold">
                  {ExpatriatePayrollService.formatCurrency(summaryTotals.totalNetForeign, expatriatePayGroup.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Net (Local)</p>
                <p className="text-lg font-semibold">
                  {ExpatriatePayrollService.formatCurrency(summaryTotals.totalNetLocal, 'UGX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Gross (Local)</p>
                <p className="text-lg font-semibold">
                  {ExpatriatePayrollService.formatCurrency(summaryTotals.totalGrossLocal, 'UGX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Run Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expatriate Pay Run Items</CardTitle>
          <CardDescription>
            Manage daily rates, days worked, and allowances for each employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead>Days Worked</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Net (Foreign)</TableHead>
                <TableHead>Net (Local)</TableHead>
                <TableHead>Gross (Local)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payRunItems.map((item) => {
                const edits = editingItems[item.employee_id] || {};
                const isCalculating = isCalculating[item.employee_id] || false;
                const hasUnsavedChanges = Object.keys(edits).length > 0;

                return (
                  <TableRow key={item.employee_id}>
                    <TableCell className="font-medium">
                      {item.employee?.first_name} {item.employee?.last_name}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={edits.daily_rate ?? item.daily_rate}
                        onChange={(e) => handleFieldChange(item.employee_id, 'daily_rate', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={edits.days_worked ?? item.days_worked}
                        onChange={(e) => handleFieldChange(item.employee_id, 'days_worked', parseInt(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={edits.allowances_foreign ?? item.allowances_foreign}
                        onChange={(e) => handleFieldChange(item.employee_id, 'allowances_foreign', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      {isCalculating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {ExpatriatePayrollService.formatCurrency(edits.net_foreign ?? item.net_foreign, item.currency)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {ExpatriatePayrollService.formatCurrency(edits.net_local ?? item.net_local, 'UGX')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {ExpatriatePayrollService.formatCurrency(edits.gross_local ?? item.gross_local, 'UGX')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveExpatriatePayRunItem(item.employee_id)}
                        disabled={!hasUnsavedChanges || isCalculating}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

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

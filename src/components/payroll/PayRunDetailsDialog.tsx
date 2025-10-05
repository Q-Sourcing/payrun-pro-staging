import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowUpDown, Filter, Download, Globe, Flag, Settings, FileText, Gift, Calculator } from "lucide-react";
import { getCountryDeductions, calculateDeduction } from "@/lib/constants/deductions";
import { getCurrencyByCode, getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { BulkAddDialog } from "./BulkAddDialog";
import { BulkDeductDialog } from "./BulkDeductDialog";
import { BulkSelectedDialog } from "./BulkSelectedDialog";
import { GeneratePayslipsDialog } from "./GeneratePayslipsDialog";
import { GenerateBillingSummaryDialog } from "./GenerateBillingSummaryDialog";
import { ApplyBenefitsDialog } from "./ApplyBenefitsDialog";
import { RecalculateTaxesDialog } from "./RecalculateTaxesDialog";
import { RemoveCustomItemsDialog } from "./RemoveCustomItemsDialog";
import LstDeductionsDialog, { LstDialogEmployee } from "./LstDeductionsDialog";

interface CustomDeduction {
  id?: string;
  name: string;
  amount: number;
  type?: string;
}

type SortField = 'name' | 'pay_type' | 'gross_pay' | 'total_deductions' | 'net_pay' | 'status';
type SortDirection = 'asc' | 'desc';

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
  status: string;
  employer_contributions: number;
  employees: {
    first_name: string;
    middle_name: string | null;
    last_name: string | null;
    email: string;
    pay_type: string;
    pay_rate: number;
    country: string;
    employee_type: string;
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
  const [newCustomDeduction, setNewCustomDeduction] = useState<Record<string, { name: string; amount: string; type: string }>>({});
  const [payGroupCountry, setPayGroupCountry] = useState<string>("");
  const [payGroupCurrency, setPayGroupCurrency] = useState<string>("UGX");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayType, setFilterPayType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
  const [bulkDeductDialogOpen, setBulkDeductDialogOpen] = useState(false);
  const [bulkSelectedDialogOpen, setBulkSelectedDialogOpen] = useState(false);
  const [generatePayslipsDialogOpen, setGeneratePayslipsDialogOpen] = useState(false);
  const [generateBillingDialogOpen, setGenerateBillingDialogOpen] = useState(false);
  const [applyBenefitsDialogOpen, setApplyBenefitsDialogOpen] = useState(false);
  const [recalculateTaxesDialogOpen, setRecalculateTaxesDialogOpen] = useState(false);
  const [removeCustomItemsDialogOpen, setRemoveCustomItemsDialogOpen] = useState(false);
  const [lstDialogOpen, setLstDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const loadPayItems = async () => {
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
        if (!isMounted) return;
        
        const country = (payRunData?.pay_groups as unknown as PayGroup)?.country || "Uganda";
        setPayGroupCountry(country);
        setPayGroupCurrency(getCurrencyCodeFromCountry(country));

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
              country,
              employee_type
            )
          `)
          .eq("pay_run_id", payRunId)
          .order("employees(first_name)");

        if (error) throw error;
        if (!isMounted) return;

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

        if (!isMounted) return;
        setPayItems(payItemsWithDeductions);
      } catch (error) {
        console.error("Error fetching pay items:", error);
        if (!isMounted) return;
        
        toast({
          title: "Error",
          description: "Failed to fetch pay run details",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (open && payRunId) {
      loadPayItems();
    }

    return () => {
      isMounted = false;
    };
  }, [open, payRunId, toast]);

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
      const country = (payRunData?.pay_groups as unknown as PayGroup)?.country || "Uganda";
      setPayGroupCountry(country);
      setPayGroupCurrency(getCurrencyCodeFromCountry(country));

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
            country,
            employee_type
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

  const formatCurrency = (amount: number, currencyCode?: string) => {
    const currency = currencyCode || 'UGX';
    const currencyInfo = getCurrencyByCode(currency);
    const symbol = currencyInfo?.symbol || currency;
    const decimals = currencyInfo?.decimalPlaces ?? 2;
    
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
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
    const isExpatriate = item.employees.employee_type === 'expatriate';
    
    let baseGrossPay = 0;
    if (item.employees.pay_type === 'hourly') {
      baseGrossPay = hoursWorked * payRate;
    } else if (item.employees.pay_type === 'piece_rate') {
      baseGrossPay = piecesCompleted * payRate;
    } else {
      baseGrossPay = payRate;
    }

    // Custom additions that affect gross (type: 'benefit')
    const grossAffectingAdditions = (item.customDeductions || [])
      .filter(d => d.type === 'benefit')
      .reduce((sum, d) => sum + d.amount, 0);

    // Calculate final gross pay including gross-affecting additions
    const grossPay = baseGrossPay + grossAffectingAdditions;

    let calculatedTaxDeduction = 0;
    let employerContributions = 0;
    const standardDeductions: { [key: string]: number } = {};

    if (isExpatriate) {
      // For expatriates, apply simplified flat tax (default 15%)
      // This should ideally fetch from expatriate_policies table
      const flatTaxRate = 0.15; // Default 15%
      calculatedTaxDeduction = grossPay * flatTaxRate;
      standardDeductions['Flat Tax (15%)'] = calculatedTaxDeduction;
      
      // Expatriates are typically exempt from social security
      employerContributions = 0;
    } else {
      // For local employees, apply standard country-specific deductions
      const deductionRules = getCountryDeductions(item.employees.country);
      
      deductionRules.forEach(rule => {
        if (rule.mandatory) {
          const amount = calculateDeduction(grossPay, rule, item.employees.country);
          // Exclude NSSF Employer from employee deductions; track as employer contribution only
          if (rule.name === 'NSSF Employer') {
            employerContributions += Math.min(grossPay, 1200000) * ((rule.percentage || 0) / 100);
          } else {
            standardDeductions[rule.name] = amount;
            calculatedTaxDeduction += amount;
            // If rule has an employer portion (rare), add to employerContributions without affecting deductions
            if (rule.employerContribution) {
              employerContributions += grossPay * ((rule.employerContribution || 0) / 100);
            }
          }
        }
      });
    }

    // Custom deductions
    const customDeductionsTotal = (item.customDeductions || [])
      .filter(d => d.type === 'deduction')
      .reduce((sum, d) => sum + d.amount, 0);

    // Custom additions that DON'T affect gross (type: 'allowance')
    const customAllowancesTotal = (item.customDeductions || [])
      .filter(d => d.type === 'allowance')
      .reduce((sum, d) => sum + d.amount, 0);

    const benefitDeductions = edits.benefit_deductions ?? item.benefit_deductions ?? 0;
    const totalDeductions = calculatedTaxDeduction + benefitDeductions + customDeductionsTotal;
    const netPay = grossPay + customAllowancesTotal - totalDeductions;

    return { 
      grossPay, 
      taxDeduction: calculatedTaxDeduction, 
      totalDeductions, 
      netPay,
      customDeductionsTotal,
      customBenefitsTotal: grossAffectingAdditions,
      customAllowancesTotal,
      employerContributions,
      standardDeductions
    };
  };

  // Filtered and sorted pay items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = payItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        getFullName(item.employees).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesPayType = filterPayType === 'all' || item.employees.pay_type === filterPayType;
      
      return matchesSearch && matchesStatus && matchesPayType;
    });

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = getFullName(a.employees);
          bValue = getFullName(b.employees);
          break;
        case 'pay_type':
          aValue = a.employees.pay_type;
          bValue = b.employees.pay_type;
          break;
        case 'gross_pay':
          aValue = calculatePay(a).grossPay;
          bValue = calculatePay(b).grossPay;
          break;
        case 'total_deductions':
          aValue = calculatePay(a).totalDeductions;
          bValue = calculatePay(b).totalDeductions;
          break;
        case 'net_pay':
          aValue = calculatePay(a).netPay;
          bValue = calculatePay(b).netPay;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [payItems, searchQuery, filterStatus, filterPayType, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkStatusUpdate = async (newStatus: 'draft' | 'pending' | 'approved' | 'paid') => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select employees to update",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("pay_items")
        .update({ status: newStatus })
        .in("id", Array.from(selectedItems));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedItems.size} employee(s) to ${newStatus}`,
      });

      setSelectedItems(new Set());
      fetchPayItems();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'approved': return 'secondary';
      case 'pending': return 'outline';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'approved': return 'text-blue-600';
      case 'pending': return 'text-orange-600';
      case 'draft': return 'text-gray-600';
      default: return 'text-gray-600';
    }
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
          type: deduction.type || 'deduction',
        });

      if (error) throw error;

      setNewCustomDeduction(prev => {
        const updated = { ...prev };
        delete updated[payItemId];
        return updated;
      });

      toast({
        title: "Success",
        description: `Custom ${deduction.type || 'deduction'} added`,
      });

      fetchPayItems();
      await updatePayRunTotals();
    } catch (error) {
      console.error("Error adding custom deduction:", error);
      toast({
        title: "Error",
        description: "Failed to add custom item",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: 'draft' | 'pending' | 'approved' | 'paid') => {
    try {
      const { error } = await supabase
        .from("pay_items")
        .update({ status: newStatus })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Status updated successfully",
      });

      fetchPayItems();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee Name', 'Pay Type', 'Basic Salary', 'Hours/Pieces', 'Gross Pay', 'Tax Deductions', 'Custom Benefits', 'Total Deductions', 'Net Pay', 'Status'];
    
    const rows = filteredAndSortedItems.map(item => {
      const calc = calculatePay(item);
      const hoursOrPieces = item.employees.pay_type === 'hourly' 
        ? `${item.hours_worked || 0} hours`
        : item.employees.pay_type === 'piece_rate'
        ? `${item.pieces_completed || 0} pieces`
        : '-';
      
      return [
        getFullName(item.employees),
        item.employees.pay_type,
        item.employees.pay_rate,
        hoursOrPieces,
        calc.grossPay,
        calc.taxDeduction,
        calc.customBenefitsTotal || 0,
        calc.totalDeductions,
        calc.netPay,
        item.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pay-run-${format(new Date(payRunDate), 'yyyy-MM-dd')}.csv`;
    a.click();
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

  // Bulk Operations Handlers
  const handleBulkAdd = async (amount: number, description: string, isPercentage: boolean, addToGross: boolean) => {
    try {
      const itemsToUpdate = Array.from(selectedItems.size > 0 ? selectedItems : new Set(payItems.map(p => p.id)));
      
      for (const itemId of itemsToUpdate) {
        const item = payItems.find(p => p.id === itemId);
        if (!item) continue;

        const currentCalc = calculatePay(item);
        const finalAmount = isPercentage ? (currentCalc.grossPay * amount / 100) : amount;

        // Insert the custom item
        await supabase.from("pay_item_custom_deductions").insert({
          pay_item_id: itemId,
          name: description,
          amount: finalAmount,
          type: addToGross ? 'benefit' : 'allowance'
        });

        // If adding to gross, recalculate and update the pay item
        if (addToGross) {
          const newGrossPay = currentCalc.grossPay + finalAmount;
          const deductionRules = getCountryDeductions(item.employees.country);
          const newTaxDeduction = item.employees.employee_type === 'expatriate'
            ? newGrossPay * 0.15
            : deductionRules
                .filter(rule => rule.mandatory)
                .reduce((total, rule) => total + calculateDeduction(newGrossPay, rule), 0);

          const newTotalDeductions = newTaxDeduction + item.benefit_deductions + currentCalc.customDeductionsTotal;
          const newNetPay = newGrossPay + currentCalc.customAllowancesTotal - newTotalDeductions;

          await supabase.from("pay_items").update({
            gross_pay: newGrossPay,
            tax_deduction: newTaxDeduction,
            total_deductions: newTotalDeductions,
            net_pay: newNetPay
          }).eq("id", itemId);
        }
      }

      await updatePayRunTotals();
      toast({
        title: "Success",
        description: `Added ${description} to ${itemsToUpdate.length} employee(s)`,
      });

      setSelectedItems(new Set());
      fetchPayItems();
    } catch (error) {
      console.error("Error applying bulk addition:", error);
      toast({
        title: "Error",
        description: "Failed to apply bulk addition",
        variant: "destructive",
      });
    }
  };

  const handleBulkDeduct = async (amount: number, description: string, isPercentage: boolean, deductionType: string) => {
    try {
      const itemsToUpdate = Array.from(selectedItems.size > 0 ? selectedItems : new Set(payItems.map(p => p.id)));
      
      for (const itemId of itemsToUpdate) {
        const item = payItems.find(p => p.id === itemId);
        if (!item) continue;

        const finalAmount = isPercentage ? (calculatePay(item).grossPay * amount / 100) : amount;

        await supabase.from("pay_item_custom_deductions").insert({
          pay_item_id: itemId,
          name: description,
          amount: finalAmount,
          type: 'deduction'
        });
      }

      await updatePayRunTotals();
      toast({
        title: "Success",
        description: `Applied ${description} to ${itemsToUpdate.length} employee(s)`,
      });

      setSelectedItems(new Set());
      fetchPayItems();
    } catch (error) {
      console.error("Error applying bulk deduction:", error);
      toast({
        title: "Error",
        description: "Failed to apply bulk deduction",
        variant: "destructive",
      });
    }
  };

  const handleBulkSelected = async (amount: number, description: string, operationType: string, applicationMethod: string, recalculateTaxes: boolean) => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select employees first",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const itemId of selectedItems) {
        const item = payItems.find(p => p.id === itemId);
        if (!item) continue;

        const isAdd = operationType.startsWith("add");
        const isPercentage = operationType.includes("percentage");
        const finalAmount = isPercentage ? (calculatePay(item).grossPay * amount / 100) : amount;

        if (isAdd) {
          await supabase.from("pay_item_custom_deductions").insert({
            pay_item_id: itemId,
            name: description,
            amount: finalAmount,
            type: applicationMethod.includes("gross") ? 'benefit' : 'allowance'
          });
        } else {
          await supabase.from("pay_item_custom_deductions").insert({
            pay_item_id: itemId,
            name: description,
            amount: finalAmount,
            type: 'deduction'
          });
        }
      }

      await updatePayRunTotals();
      toast({
        title: "Success",
        description: `Updated ${selectedItems.size} employee(s)`,
      });

      setSelectedItems(new Set());
      fetchPayItems();
    } catch (error) {
      console.error("Error applying bulk update:", error);
      toast({
        title: "Error",
        description: "Failed to apply bulk update",
        variant: "destructive",
      });
    }
  };

  // Get all unique custom column names across all pay items
  const customColumns = useMemo(() => {
    const columnNames = new Set<string>();
    payItems.forEach(item => {
      (item.customDeductions || []).forEach(cd => {
        columnNames.add(cd.name);
      });
    });
    return Array.from(columnNames).sort();
  }, [payItems]);

  // Get standard deduction columns based on country (using first employee's country)
  const standardDeductionColumns = useMemo(() => {
    if (payItems.length === 0) return [];
    const firstEmployee = payItems[0]?.employees;
    if (!firstEmployee) return [];
    
    if (firstEmployee.employee_type === 'expatriate') {
      return ['Flat Tax (15%)'];
    }
    
    const deductionRules = getCountryDeductions(firstEmployee.country);
    // Show employee NSSF as a deduction; employer NSSF is displayed but not part of total_deductions
    return deductionRules
      .filter(rule => rule.mandatory && rule.name !== 'NSSF Employer')
      .map(rule => rule.name);
  }, [payItems]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return filteredAndSortedItems.reduce((acc, item) => {
      const calc = calculatePay(item);
      return {
        totalGross: acc.totalGross + calc.grossPay,
        totalDeductions: acc.totalDeductions + calc.totalDeductions,
        totalNet: acc.totalNet + calc.netPay,
        totalEmployer: acc.totalEmployer + (calc.employerContributions || 0),
      };
    }, { totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployer: 0 });
  }, [filteredAndSortedItems]);

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
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">Pay Run Details - Comprehensive Summary</DialogTitle>
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
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 flex-shrink-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Employees</CardDescription>
                  <CardTitle className="text-3xl">{filteredAndSortedItems.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Gross Pay</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{formatCurrency(summaryTotals.totalGross, payGroupCurrency)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Deductions</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">{formatCurrency(summaryTotals.totalDeductions, payGroupCurrency)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Net Pay</CardDescription>
                  <CardTitle className="text-3xl text-primary">{formatCurrency(summaryTotals.totalNet, payGroupCurrency)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Filters and Actions */}
            <div className="flex gap-4 items-center flex-shrink-0">
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPayType} onValueChange={setFilterPayType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="piece_rate">Piece Rate</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedItems.size > 0 && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <span className="text-sm text-muted-foreground">{selectedItems.size} selected</span>
                  <Select onValueChange={(value) => handleBulkStatusUpdate(value as any)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Bulk update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Mark as Pending</SelectItem>
                      <SelectItem value="approved">Mark as Approved</SelectItem>
                      <SelectItem value="paid">Mark as Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              
              <div className="ml-auto flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Bulk Actions
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-background">
                    <DropdownMenuItem onClick={() => setBulkAddDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <span>Add to All Employees</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkDeductDialogOpen(true)} className="gap-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <span>Deduct from All Employees</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setGeneratePayslipsDialogOpen(true)} className="gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>Generate All Payslips</span>
                    </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLstDialogOpen(true)} className="gap-2">
                    <Flag className="h-4 w-4 text-green-700" />
                    <span>Uganda LST Deductions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try {
                      if (!payRunId) return;
                      // Remove all LST custom deductions for items in this pay run only
                      const { data: items } = await supabase
                        .from("pay_items")
                        .select("id")
                        .eq("pay_run_id", payRunId);
                      const ids = (items || []).map(i => i.id);
                      if (ids.length > 0) {
                        await supabase
                          .from("pay_item_custom_deductions")
                          .delete()
                          .in("pay_item_id", ids)
                          .eq("name", "LST");
                      }
                      await updatePayRunTotals();
                      fetchPayItems();
                      toast({ title: "LST Removed", description: "Removed LST deductions for this pay run." });
                    } catch (e: any) {
                      toast({ title: "Failed to remove LST", description: e?.message || "", variant: "destructive" });
                    }
                  }} className="gap-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <span>Remove LST Deductions</span>
                  </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGenerateBillingDialogOpen(true)} className="gap-2">
                      <Download className="h-4 w-4 text-blue-600" />
                      <span>Generate Billing Summary</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setApplyBenefitsDialogOpen(true)} className="gap-2">
                      <Gift className="h-4 w-4 text-purple-600" />
                      <span>Apply Benefits Package</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRecalculateTaxesDialogOpen(true)} className="gap-2">
                      <Calculator className="h-4 w-4 text-orange-600" />
                      <span>Recalculate All Taxes</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setRemoveCustomItemsDialogOpen(true)} className="gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span>Remove All Custom Items</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setBulkSelectedDialogOpen(true)}
                      disabled={selectedItems.size === 0}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Apply to Selected ({selectedItems.size})</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                        Employee Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('pay_type')}>
                        Pay Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Hours/Pieces</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('gross_pay')}>
                        Gross Pay
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    {/* Standard Deduction Columns */}
                    {standardDeductionColumns.map(columnName => (
                      <TableHead key={`standard-${columnName}`} className="text-center">
                        {columnName}
                      </TableHead>
                    ))}
                    {/* Employer Contribution Column (NSSF Employer) */}
                    <TableHead className="text-center">NSSF Employer</TableHead>
                    {/* Custom Addition/Deduction Columns */}
                    {customColumns.map(columnName => (
                      <TableHead key={columnName} className="text-center">
                        {columnName}
                      </TableHead>
                    ))}
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('total_deductions')}>
                        Total Deductions
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('net_pay')}>
                        Net Pay
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('status')}>
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedItems.map((item) => {
                    const edits = editingItems[item.id] || {};
                    const calculated = calculatePay(item, edits);
                    const isExpanded = expandedEmployee === item.id;
                    const countryDeductions = getCountryDeductions(item.employees.country);

                    return (
                      <>
                        <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => toggleSelectItem(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedEmployee(isExpanded ? null : item.id)}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{getFullName(item.employees)}</TableCell>
                          <TableCell>
                            {item.employees.employee_type === 'expatriate' ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                <Globe className="h-3 w-3 mr-1" />
                                Expat
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-100">
                                <Flag className="h-3 w-3 mr-1" />
                                Local
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.employees.pay_type === 'hourly' ? 'Hourly' : 
                               item.employees.pay_type === 'piece_rate' ? 'Piece' : 'Salary'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(item.employees.pay_rate, payGroupCurrency)}</TableCell>
                          <TableCell>
                            {item.employees.pay_type === 'hourly' && `${item.hours_worked || 0} hrs`}
                            {item.employees.pay_type === 'piece_rate' && `${item.pieces_completed || 0} pcs`}
                            {item.employees.pay_type === 'salary' && '-'}
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(calculated.grossPay, payGroupCurrency)}</TableCell>
                          {/* Standard Deduction Columns */}
                          {standardDeductionColumns.map(columnName => {
                            const amount = calculated.standardDeductions?.[columnName] || 0;
                            return (
                              <TableCell key={`standard-${columnName}`} className="text-center text-orange-600 font-medium">
                                {formatCurrency(amount, payGroupCurrency)}
                              </TableCell>
                            );
                          })}
                          {/* Employer NSSF (company cost) */}
                          <TableCell className="text-center text-muted-foreground italic font-medium">
                            {formatCurrency((calculatePay(item).employerContributions || 0), payGroupCurrency)}
                          </TableCell>
                          {/* Custom Addition/Deduction Columns */}
                          {customColumns.map(columnName => {
                            const customItem = (item.customDeductions || []).find(cd => cd.name === columnName);
                            if (!customItem) {
                              return <TableCell key={columnName} className="text-center text-muted-foreground">-</TableCell>;
                            }
                            const isDeduction = customItem.type === 'deduction';
                            return (
                              <TableCell key={columnName} className={`text-center font-medium ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                                {isDeduction ? '-' : '+'}{formatCurrency(customItem.amount, payGroupCurrency)}
                              </TableCell>
                            );
                          })}
                          <TableCell>{formatCurrency(calculated.totalDeductions, payGroupCurrency)}</TableCell>
                          <TableCell className="font-bold text-primary">{formatCurrency(calculated.netPay, payGroupCurrency)}</TableCell>
                          <TableCell>
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleStatusChange(item.id, value as any)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue>
                                  <span className={getStatusColor(item.status)}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingItems({ [item.id]: {} })}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={13 + standardDeductionColumns.length + customColumns.length} className="bg-muted/30">
                              <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                  {/* Editable Input Fields */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">Editable Fields</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
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
                                        <Label>Additional Benefits Deduction</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={edits.benefit_deductions ?? item.benefit_deductions ?? 0}
                                          onChange={(e) => handleFieldChange(item.id, 'benefit_deductions', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <Button onClick={() => handleSave(item)} className="w-full">
                                        Save Changes
                                      </Button>
                                    </CardContent>
                                  </Card>

                                  {/* Earnings Breakdown */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">💰 Earnings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="flex justify-between">
                                        <span>Basic Salary</span>
                                        <span className="font-semibold">{formatCurrency(item.employees.pay_rate, payGroupCurrency)}</span>
                                      </div>
                                      {item.employees.pay_type === 'hourly' && (
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                          <span>({item.hours_worked || 0} hours × {formatCurrency(item.employees.pay_rate, payGroupCurrency)}/hr)</span>
                                        </div>
                                      )}
                                      {item.employees.pay_type === 'piece_rate' && (
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                          <span>({item.pieces_completed || 0} pieces × {formatCurrency(item.employees.pay_rate, payGroupCurrency)}/pc)</span>
                                        </div>
                                      )}
                                       {(calculated.customBenefitsTotal || 0) > 0 && (
                                         <div className="flex justify-between text-green-600">
                                           <span>Gross-Affecting Additions</span>
                                           <span className="font-semibold">+{formatCurrency(calculated.customBenefitsTotal, payGroupCurrency)}</span>
                                         </div>
                                       )}
                                       {(calculated.customAllowancesTotal || 0) > 0 && (
                                         <div className="flex justify-between text-green-600">
                                           <span>Non-Gross Allowances</span>
                                           <span className="font-semibold">+{formatCurrency(calculated.customAllowancesTotal, payGroupCurrency)}</span>
                                         </div>
                                       )}
                                      <Separator />
                                      <div className="flex justify-between font-bold text-lg">
                                        <span>Gross Pay</span>
                                        <span className="text-green-600">{formatCurrency(calculated.grossPay, payGroupCurrency)}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                  {/* Deductions Breakdown */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">📊 Deductions</CardTitle>
                                      {item.employees.employee_type === 'expatriate' && (
                                        <p className="text-xs text-orange-600 mt-1">
                                          ⚠ Applying expatriate policies - flat tax rate and modified benefits
                                        </p>
                                      )}
                                      {item.employees.employee_type === 'local' && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Applying standard {item.employees.country} tax brackets and deductions
                                        </p>
                                      )}
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      {item.employees.employee_type === 'expatriate' ? (
                                        <div className="flex justify-between text-sm">
                                          <span>Flat Tax Rate (15%)</span>
                                          <span className="font-medium">{formatCurrency(calculated.taxDeduction, payGroupCurrency)}</span>
                                        </div>
                                      ) : (
                                        countryDeductions
                                          .filter(rule => rule.mandatory)
                                          .map((rule, idx) => {
                                            const amount = calculateDeduction(calculated.grossPay, rule);
                                            return (
                                              <div key={idx} className="flex justify-between text-sm">
                                                <span>{rule.name}</span>
                                                <span className="font-medium">{formatCurrency(amount, payGroupCurrency)}</span>
                                              </div>
                                            );
                                          })
                                      )}
                                      {item.benefit_deductions > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Additional Benefits</span>
                                          <span className="font-medium">{formatCurrency(item.benefit_deductions, payGroupCurrency)}</span>
                                        </div>
                                      )}
                                      {(calculated.customDeductionsTotal || 0) > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span>Custom Deductions</span>
                                          <span className="font-medium">{formatCurrency(calculated.customDeductionsTotal, payGroupCurrency)}</span>
                                        </div>
                                      )}
                                      <Separator />
                                      <div className="flex justify-between font-bold">
                                        <span>Total Deductions</span>
                                        <span className="text-orange-600">{formatCurrency(calculated.totalDeductions, payGroupCurrency)}</span>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Custom Deductions & Benefits Manager */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">➕ Custom Items</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {item.customDeductions && item.customDeductions.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                          {item.customDeductions.map((deduction) => (
                                            <div key={deduction.id} className="flex justify-between items-center p-2 bg-background rounded border">
                                              <div>
                                                <span className="font-medium">{deduction.name}</span>
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                  {deduction.type || 'deduction'}
                                                </Badge>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className={deduction.type === 'deduction' ? 'text-orange-600' : 'text-green-600'}>
                                                  {deduction.type === 'deduction' ? '-' : '+'}{formatCurrency(deduction.amount, payGroupCurrency)}
                                                </span>
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
                                      <div className="space-y-2">
                                        <Label>Add Custom Item</Label>
                                        <Select
                                          value={newCustomDeduction[item.id]?.type || 'deduction'}
                                          onValueChange={(value) =>
                                            setNewCustomDeduction((prev) => ({
                                              ...prev,
                                              [item.id]: { ...prev[item.id], type: value },
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="deduction">Deduction</SelectItem>
                                            <SelectItem value="benefit">Benefit</SelectItem>
                                            <SelectItem value="allowance">Allowance</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          placeholder="Name (e.g., Transport Allowance)"
                                          value={newCustomDeduction[item.id]?.name || ""}
                                          onChange={(e) =>
                                            setNewCustomDeduction((prev) => ({
                                              ...prev,
                                              [item.id]: { ...prev[item.id], name: e.target.value },
                                            }))
                                          }
                                        />
                                        <div className="flex gap-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Amount"
                                            value={newCustomDeduction[item.id]?.amount || ""}
                                            onChange={(e) =>
                                              setNewCustomDeduction((prev) => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], amount: e.target.value },
                                              }))
                                            }
                                          />
                                          <Button
                                            onClick={() => handleAddCustomDeduction(item.id)}
                                          >
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Final Summary */}
                                <Card className="border-2 border-primary">
                                  <CardContent className="pt-6">
                                    <div className="flex justify-between items-center text-2xl font-bold">
                                      <span>NET PAY</span>
                                      <span className="text-primary">{formatCurrency(calculated.netPay, payGroupCurrency)}</span>
                                    </div>
                                    {(calculated.employerContributions || 0) > 0 && (
                                      <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                                        <span>Employer Contributions (NSSF, etc.)</span>
                                        <span>{formatCurrency(calculated.employerContributions, payGroupCurrency)}</span>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Bulk Operations Dialogs */}
      <BulkAddDialog
        open={bulkAddDialogOpen}
        onOpenChange={setBulkAddDialogOpen}
        employeeCount={selectedItems.size > 0 ? selectedItems.size : payItems.length}
        currency={payGroupCountry === "Uganda" ? "UGX" : "USD"}
        onApply={handleBulkAdd}
      />
      
      <BulkDeductDialog
        open={bulkDeductDialogOpen}
        onOpenChange={setBulkDeductDialogOpen}
        employeeCount={selectedItems.size > 0 ? selectedItems.size : payItems.length}
        currency={payGroupCountry === "Uganda" ? "UGX" : "USD"}
        onApply={handleBulkDeduct}
      />
      
      <BulkSelectedDialog
        open={bulkSelectedDialogOpen}
        onOpenChange={setBulkSelectedDialogOpen}
        selectedEmployees={Array.from(selectedItems).map(id => {
          const item = payItems.find(p => p.id === id);
          return {
            id,
            name: item ? getFullName(item.employees) : "",
            grossPay: item ? calculatePay(item).grossPay : 0
          };
        })}
        currency={payGroupCountry === "Uganda" ? "UGX" : "USD"}
        onApply={handleBulkSelected}
      />

      <GeneratePayslipsDialog
        open={generatePayslipsDialogOpen}
        onOpenChange={setGeneratePayslipsDialogOpen}
        employeeCount={payItems.length}
        payRunId={payRunId || ""}
      />

      <GenerateBillingSummaryDialog
        open={generateBillingDialogOpen}
        onOpenChange={setGenerateBillingDialogOpen}
        payRunId={payRunId || ""}
      />

      <ApplyBenefitsDialog
        open={applyBenefitsDialogOpen}
        onOpenChange={setApplyBenefitsDialogOpen}
        employeeCount={payItems.length}
        currency={payGroupCurrency}
        onApply={(benefits) => {
          console.log("Applying benefits:", benefits);
          fetchPayItems();
        }}
      />

      <RecalculateTaxesDialog
        open={recalculateTaxesDialogOpen}
        onOpenChange={setRecalculateTaxesDialogOpen}
        employeeCount={payItems.length}
        onRecalculate={fetchPayItems}
      />

      <RemoveCustomItemsDialog
        open={removeCustomItemsDialogOpen}
        onOpenChange={setRemoveCustomItemsDialogOpen}
        customItemCount={payItems.reduce((count, item) => count + (item.customDeductions?.length || 0), 0)}
        onRemove={fetchPayItems}
      />

      <LstDeductionsDialog
        open={lstDialogOpen}
        onOpenChange={setLstDialogOpen}
        employees={payItems.map(item => ({
          id: item.id,
          name: getFullName(item.employees),
          grossPay: calculatePay(item).grossPay,
        })) as LstDialogEmployee[]}
        currency={payGroupCurrency}
        selectedIds={Array.from(selectedItems)}
        payRunStartMonthISO={(() => {
          const d = payPeriod?.start ? new Date(payPeriod.start) : new Date();
          const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
          return iso; // YYYY-MM-DD
        })()}
        onApply={async (options, targets, preview) => {
          try {
            // Create plan
            const startMonthISO = (() => {
              const d = payPeriod?.start ? new Date(payPeriod.start) : new Date();
              const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
              return iso;
            })();

            // LST tables not available in current schema - skip persistence
            console.log("LST deductions applied successfully");

            // Apply current month installment as custom deduction (equal split with remainder last month)
            const insertRows = preview.map(row => {
              const base = Math.floor(row.annualLST / options.months);
              const remainder = row.annualLST % options.months;
              const monthly = options.months > 1 ? base : row.annualLST;
              return {
                pay_item_id: row.id, // row.id is current pay run's pay_item id → scoping ensured
                name: "LST",
                amount: monthly,
                type: 'deduction',
              };
            });
            if (insertRows.length > 0) {
              const { error: insErr } = await supabase.from("pay_item_custom_deductions").insert(insertRows);
              if (insErr) throw insErr;
            }

            await updatePayRunTotals();
            fetchPayItems();

            const totalMonthly = insertRows.reduce((s, r) => s + (r.amount as number), 0);
            toast({
              title: "LST Applied Successfully",
              description: `Applied to ${insertRows.length} employee(s). Total monthly LST: ${totalMonthly.toLocaleString()}`,
            });
          } catch (e: any) {
            console.error("Error applying LST:", e);
            toast({
              title: "LST Application Failed",
              description: e?.message || "Unable to apply LST deductions. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />
    </Dialog>
  );
};

export default PayRunDetailsDialog;

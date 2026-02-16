import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { log, warn, error, debug } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBankSchedulePermissions } from "@/hooks/use-bank-schedule-permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowUpDown, Filter, Download, Globe, Flag, Settings, FileText, Gift, Calculator, FileSpreadsheet, Pencil, Check, X } from "lucide-react";
import { getCountryDeductions, calculateDeduction } from "@/lib/constants/deductions";
import { PayrollCalculationService, CalculationInput, CalculationResult } from "@/lib/types/payroll-calculations";
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
import { GeneratePayrollSummaryDialog } from "./GeneratePayrollSummaryDialog";
import { ApplyBenefitsDialog } from "./ApplyBenefitsDialog";
import { RecalculateTaxesDialog } from "./RecalculateTaxesDialog";
import { RemoveCustomItemsDialog } from "./RemoveCustomItemsDialog";
import { IndividualPayslipDialog } from "./IndividualPayslipDialog";
import LstDeductionsDialog, { LstDialogEmployee } from "./LstDeductionsDialog";
import BankScheduleExportDialog from "./BankScheduleExportDialog";
import { ExpatriatePayRunDetails } from "./ExpatriatePayRunDetails";
import { ExpatriatePayrollService } from '@/lib/services/expatriate-payroll';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalTimeline } from "./ApprovalTimeline";
import { PayrunsService } from "@/lib/services/payruns.service";
import { useUserRole } from "@/hooks/use-user-role";
import { Textarea } from "@/components/ui/textarea";

interface CustomDeduction {
  id?: string;
  name: string;
  amount: number;
  type: string;
}

type SortField = 'name' | 'pay_type' | 'gross_pay' | 'total_deductions' | 'net_pay' | 'status';
type SortDirection = 'asc' | 'desc';

interface PayItem {
  id: string;
  employee_id: string;
  pay_run_id: string;
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

interface ApprovalActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment?: string) => void;
  title: string;
  description: string;
  requireComment?: boolean;
  actionLabel: string;
  variant?: "default" | "destructive";
}

const ApprovalActionDialog = ({ isOpen, onClose, onConfirm, title, description, requireComment, actionLabel, variant = "default" }: ApprovalActionDialogProps) => {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {(requireComment || true) && (
            <div className="space-y-2">
              <Label>Comments {requireComment && "*"}</Label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant={variant}
              onClick={() => onConfirm(comment)}
              disabled={requireComment && !comment.trim()}
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PayRunDetailsDialog = ({ open, onOpenChange, payRunId, payRunDate, payPeriod, onPayRunUpdated }: PayRunDetailsDialogProps) => {

  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItems, setEditingItems] = useState<Record<string, Partial<PayItem> & { pay_rate?: number }>>({});
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
  const [generatePayrollSummaryDialogOpen, setGeneratePayrollSummaryDialogOpen] = useState(false);
  const [applyBenefitsDialogOpen, setApplyBenefitsDialogOpen] = useState(false);
  const [recalculateTaxesDialogOpen, setRecalculateTaxesDialogOpen] = useState(false);
  const [removeCustomItemsDialogOpen, setRemoveCustomItemsDialogOpen] = useState(false);
  const [lstDialogOpen, setLstDialogOpen] = useState(false);
  const [individualPayslipDialogOpen, setIndividualPayslipDialogOpen] = useState(false);
  const [bankScheduleDialogOpen, setBankScheduleDialogOpen] = useState(false);
  const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<{ id: string, name: string } | null>(null);
  const [isExpatriatePayRun, setIsExpatriatePayRun] = useState(false);
  const [expatriatePayGroup, setExpatriatePayGroup] = useState<any>(null);
  const [assignedExpatEmployees, setAssignedExpatEmployees] = useState<any[]>([]);
  const [payRunData, setPayRunData] = useState<any>(null);
  const { toast } = useToast();
  const { canExportBankSchedule } = useBankSchedulePermissions();
  // Approval Workflow State
  const { role, isSuperAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState("pay-details");
  const [approvalAction, setApprovalAction] = useState<{
    type: 'approve' | 'reject' | 'delegate' | 'submit',
    isOpen: boolean,
    title: string,
    description: string,
    requireComment: boolean,
    actionLabel: string,
    variant: "default" | "destructive"
  }>({
    type: 'approve', isOpen: false, title: "", description: "", requireComment: false, actionLabel: "Confirm", variant: "default"
  });
  const [refreshTimeline, setRefreshTimeline] = useState(0);

  const handleTimelineRefresh = () => setRefreshTimeline(prev => prev + 1);

  const handleSubmitForApproval = () => {
    initApprovalAction('submit');
  };

  const initApprovalAction = (type: 'approve' | 'reject' | 'delegate' | 'submit') => {
    if (type === 'approve') {
      setApprovalAction({
        type, isOpen: true, title: "Approve Payrun", description: "Are you sure you want to approve this step?", requireComment: false, actionLabel: "Approve", variant: "default"
      });
    } else if (type === 'reject') {
      setApprovalAction({
        type, isOpen: true, title: "Reject Payrun", description: "Please provide a reason for rejection.", requireComment: true, actionLabel: "Reject", variant: "destructive"
      });
    } else if (type === 'submit') {
      setApprovalAction({
        type, isOpen: true, title: "Submit Payrun", description: "Are you sure you want to submit this payrun for approval? It will be locked for editing.", requireComment: false, actionLabel: "Submit", variant: "default"
      });
    }
    // Delegate handled separately or via generic
  };

  const executeApprovalAction = async (comment?: string) => {
    if (!payRunId) return;
    try {
      if (approvalAction.type === 'approve') {
        await PayrunsService.approveStep(payRunId, comment);
        toast({ title: "Approved", description: "Step approved successfully." });
      } else if (approvalAction.type === 'reject') {
        if (!comment) return;
        await PayrunsService.rejectStep(payRunId, comment);
        toast({ title: "Rejected", description: "Step rejected." });
      } else if (approvalAction.type === 'submit') {
        await PayrunsService.submitForApproval(payRunId);
        toast({ title: "Submitted", description: "Payrun submitted for approval." });
        await loadData(); // Refresh Pay Run Status
        onPayRunUpdated?.();
        setActiveTab("approvals");
      }
      handleTimelineRefresh();
      onPayRunUpdated?.(); // Refresh main payrun data
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Action failed", variant: "destructive" });
    } finally {
      setApprovalAction(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleReturnToDraft = async () => {
    if (!confirm("Return to Draft? This will reset all approvals.")) return;
    try {
      if (!payRunId) return;
      await PayrunsService.returnToDraft(payRunId);
      toast({ title: "Reset", description: "Payrun returned to draft." });
      handleTimelineRefresh();
      onPayRunUpdated?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reset", variant: "destructive" });
    }
  };


  const loadData = async () => {
    if (!payRunId) return;

    setLoading(true);
    try {
      // Fetch pay run details
      const { data: payRunData, error: payRunError } = await (supabase as any)
        .from("pay_runs")
        .select(`
          id,
          status,
          approval_status,
          payroll_type,
          category,
          employee_type,
          pay_frequency,
          pay_group_master_id,
          pay_group_master:pay_group_master_id(
            id,
            name,
            country,
            currency,
            type,
            category,
            employee_type,
            pay_frequency,
            source_id,
            source_table
          )
        `)
        .eq("id", payRunId)
        .single();

      if (payRunError) throw payRunError;

      setPayRunData(payRunData);

      // Check if this is an expatriate pay run
      const isExpat = payRunData?.payroll_type === 'expatriate' ||
        payRunData?.pay_group_master?.type === 'expatriate';

      setIsExpatriatePayRun(isExpat);

      // If expatriate, fetch the expatriate pay group details
      if (isExpat && payRunData?.pay_group_master?.source_id) {
        const { data: expatGroup, error: expatError } = await (supabase as any)
          .from('expatriate_pay_groups')
          .select('*')
          .eq('id', payRunData.pay_group_master.source_id)
          .single();

        if (!expatError && expatGroup) {
          setExpatriatePayGroup(expatGroup);
          // fetch assigned employees by pay group membership (not by type)
          try {
            const assigned = await ExpatriatePayrollService.getEmployeesForPayGroup(payRunData.pay_group_master.source_id);
            setAssignedExpatEmployees(assigned || []);
          } catch (e) {
            console.error('Failed to load assigned expat employees:', e);
            setAssignedExpatEmployees([]);
          }
        }
      } else {
        setExpatriatePayGroup(null);
        setAssignedExpatEmployees([]);
      }

      // Set pay group country and currency
      const country = payRunData?.pay_group_master?.country || "Uganda";
      setPayGroupCountry(country);
      setPayGroupCurrency(payRunData?.pay_group_master?.currency || getCurrencyCodeFromCountry(country));

      // Fetch pay items
      const { data, error } = await (supabase as any)
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

      // For expatriate pay runs, if no pay items exist, create them using dual-source employee fetch
      if (isExpat && (!data || data.length === 0) && payRunData?.pay_group_master?.source_id) {
        console.log("🔄 No pay items found for expatriate pay run, creating from dual-source employee fetch...");

        try {
          const employees = await ExpatriatePayrollService.getEmployeesForPayGroup(payRunData.pay_group_master.source_id);
          if (employees.length > 0) {
            const payItemsToCreate = employees.map(emp => ({
              pay_run_id: payRunId,
              employee_id: emp.id,
              gross_pay: 0,
              tax_deduction: 0,
              benefit_deductions: 0,
              total_deductions: 0,
              net_pay: 0,
              hours_worked: null,
              pieces_completed: null,
              status: 'draft',
              employer_contributions: 0
            }));

            const { data: createdItems, error: createError } = await (supabase as any)
              .from("pay_items")
              .insert(payItemsToCreate as any)
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
              `);

            if (createError) throw createError;

            const payItemsWithDeductions = await Promise.all(
              (createdItems || []).map(async (item) => {
                const { data: customDeductions } = await (supabase as any)
                  .from("pay_item_custom_deductions")
                  .select("*")
                  .eq("pay_item_id", (item as any).id);

                return {
                  ...item,
                  customDeductions: customDeductions || [],
                };
              })
            );
            setPayItems(payItemsWithDeductions);
            return;
          }
        } catch (createError) {
          console.error("Error creating pay items for expatriate employees:", createError);
        }
      }

      // Fetch custom deductions for each pay item
      const payItemsWithDeductions = await Promise.all(
        (data || []).map(async (item) => {
          const { data: customDeductions } = await (supabase as any)
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
    } catch (err) {
      error("Error fetching pay items:", err);
      toast({
        title: "Error",
        description: "Failed to fetch pay run details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && payRunId) {
      loadData();
    }
  }, [open, payRunId]);

  const fetchPayItems = async () => {
    if (!payRunId) return;

    setLoading(true);
    try {
      // Fetch pay group country
      const { data: payRunData, error: payRunError } = await (supabase as any)
        .from("pay_runs")
        .select("pay_group_master:pay_group_master_id(country)")
        .eq("id", payRunId)
        .single();

      if (payRunError) throw payRunError;
      const country = (payRunData?.pay_group_master as unknown as PayGroup)?.country || "Uganda";
      setPayGroupCountry(country);
      setPayGroupCurrency(getCurrencyCodeFromCountry(country));

      // Fetch pay items
      const { data, error } = await (supabase as any)
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
          const { data: customDeductions } = await (supabase as any)
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
    } catch (err) {
      console.error("Error fetching pay items:", err);
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

  const handleFieldChange = (itemId: string, field: keyof PayItem | 'pay_rate', value: number) => {
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      }
    }));
  };

  // Server-side calculation using Edge Function (for final submissions)
  const calculatePayServer = async (item: PayItem, edits: Partial<PayItem> = {}): Promise<CalculationResult> => {
    try {
      const payRateOverride = (edits as any).pay_rate ?? item.employees.pay_rate;
      const payTypeOverride = item.employees.pay_type;
      const input: CalculationInput = {
        employee_id: item.employee_id,
        pay_run_id: item.pay_run_id,
        hours_worked: edits.hours_worked ?? item.hours_worked ?? 0,
        pieces_completed: edits.pieces_completed ?? item.pieces_completed ?? 0,
        pay_rate: payRateOverride,
        pay_type: payTypeOverride,
        employee_type: item.employees.employee_type,
        country: item.employees.country,
        is_head_office: payRunData?.category === 'head_office',
        custom_deductions: (item.customDeductions || []).map((d: any) => ({
          name: d.name,
          amount: d.amount,
          type: d.type
        })),
        benefit_deductions: edits.benefit_deductions ?? item.benefit_deductions ?? 0
      };

      // Use server-side Edge Function for calculations
      return await PayrollCalculationService.calculatePayroll(input);
    } catch (err) {
      error('Error calculating payroll:', err);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate payroll. Using fallback calculation.",
        variant: "destructive",
      });

      // Fallback to client-side calculation if server fails
      return calculatePayFallback(item, edits);
    }
  };

  // Client-side calculation for real-time UI updates (keeping original logic)
  const calculatePay = (item: PayItem, edits: Partial<PayItem> = {}) => {
    return calculatePayFallback(item, edits);
  };

  // Fallback client-side calculation (keeping the original logic as backup)
  const calculatePayFallback = (item: PayItem, edits: Partial<PayItem> = {}) => {
    const hoursWorked = edits.hours_worked ?? item.hours_worked ?? 0;
    const piecesCompleted = edits.pieces_completed ?? item.pieces_completed ?? 0;
    const payRate = (edits as any).pay_rate ?? item.employees.pay_rate;
    const isExpatriate = item.employees.employee_type === 'expatriate';

    let baseGrossPay = 0;
    if (item.employees.pay_type === 'hourly') {
      baseGrossPay = hoursWorked * payRate;
    } else if (item.employees.pay_type === 'piece_rate') {
      baseGrossPay = piecesCompleted * payRate;
    } else if (item.employees.pay_type === 'daily_rate') {
      baseGrossPay = hoursWorked * payRate; // For daily rate, hoursWorked represents days
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
      // For expatriates, allow for progressive tax if no flat percentage is provided in input/meta
      // For Head Office staff (usually residents in Uganda), standard progressive tax applies.
      // For others, use a more robust default (30%).
      const isHO = item.employees.country === 'Uganda' || item.employees.country === 'UG';

      if (isHO) {
        const deductionRules = getCountryDeductions(item.employees.country);
        deductionRules.forEach(rule => {
          if (rule.mandatory) {
            const amount = calculateDeduction(grossPay, rule, item.employees.country);
            if (rule.name === 'NSSF Employer') {
              employerContributions += grossPay * ((rule.percentage || 0) / 100);
            } else {
              standardDeductions[rule.name] = amount;
              calculatedTaxDeduction += amount;
              if (rule.employerContribution) {
                employerContributions += grossPay * ((rule.employerContribution || 0) / 100);
              }
            }
          }
        });
      } else {
        const flatTaxRate = 0.30;
        calculatedTaxDeduction = grossPay * flatTaxRate;
        standardDeductions['PAYE (Expat 30%)'] = calculatedTaxDeduction;
        employerContributions = 0;
      }
    } else {
      // For local employees, apply standard country-specific deductions
      const deductionRules = getCountryDeductions(item.employees.country);

      deductionRules.forEach(rule => {
        if (rule.mandatory) {
          const amount = calculateDeduction(grossPay, rule, item.employees.country);
          // Exclude NSSF Employer from employee deductions; track as employer contribution only
          if (rule.name === 'NSSF Employer') {
            // Updated to use rule percentage directly without arbitrary cap
            employerContributions += grossPay * ((rule.percentage || 0) / 100);
          } else {
            standardDeductions[rule.name] = amount;
            calculatedTaxDeduction += amount;
            // If rule has an employer portion, add to employerContributions
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

    // Return in the same format as CalculationResult
    const result = {
      gross_pay: grossPay,
      paye_tax: standardDeductions['PAYE'] || 0,
      nssf_employee: standardDeductions['NSSF Employee'] || standardDeductions['NSSF'] || 0,
      nssf_employer: employerContributions,
      total_deductions: totalDeductions,
      net_pay: netPay,
      employer_contributions: employerContributions,
      breakdown: [],
      standard_deductions: standardDeductions,
      standardDeductions: standardDeductions, // Add camelCase version for UI compatibility
      // Legacy fields for backward compatibility
      grossPay,
      taxDeduction: calculatedTaxDeduction,
      totalDeductions,
      netPay,
      customDeductionsTotal,
      customBenefitsTotal: grossAffectingAdditions,
      customAllowancesTotal
    } as any;

    return result;
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
      const { error } = await (supabase as any)
        .from("pay_items")
        .update({ status: newStatus } as any)
        .in("id", Array.from(selectedItems));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedItems.size} employee(s) to ${newStatus}`,
      });

      setSelectedItems(new Set());
      fetchPayItems();
    } catch (err) {
      error("Error updating status:", err);
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
    // Use server-side calculation for final save
    const result = await calculatePayServer(item, edits);
    const { gross_pay: grossPay, paye_tax: taxDeduction, total_deductions: totalDeductions, net_pay: netPay } = result;

    try {
      // If pay_rate was edited, sync it to the employee record (pay_items has no pay_rate column)
      if (typeof (edits as any).pay_rate === 'number') {
        await (supabase as any)
          .from("employees")
          .update({
            pay_rate: (edits as any).pay_rate,
            pay_type: item.employees.pay_type,
          } as any)
          .eq("id", item.employee_id);
      }

      const { error } = await (supabase as any)
        .from("pay_items")
        .update({
          hours_worked: edits.hours_worked ?? item.hours_worked,
          pieces_completed: edits.pieces_completed ?? item.pieces_completed,
          tax_deduction: taxDeduction,
          benefit_deductions: edits.benefit_deductions ?? item.benefit_deductions,
          gross_pay: grossPay,
          total_deductions: totalDeductions,
          net_pay: netPay,
        } as any)
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
    } catch (err) {
      error("Error updating pay item:", err);
      toast({
        title: "Error",
        description: "Failed to update pay item",
        variant: "destructive",
      });
    }
  };

  const updatePayRunTotals = async () => {
    if (!payRunId) return;

    const { data: allPayItems } = await (supabase as any)
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

      await (supabase as any)
        .from("pay_runs")
        .update({
          total_gross_pay: totals.gross,
          total_deductions: totals.deductions,
          total_net_pay: totals.net,
        } as any)
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
      const { error } = await (supabase as any)
        .from("pay_item_custom_deductions")
        .insert({
          pay_item_id: payItemId,
          name: deduction.name,
          amount: parseFloat(deduction.amount),
          type: deduction.type || 'deduction',
        } as any);

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
    } catch (err) {
      error("Error adding custom deduction:", err);
      toast({
        title: "Error",
        description: "Failed to add custom item",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: 'draft' | 'pending' | 'approved' | 'paid') => {
    try {
      const { error } = await (supabase as any)
        .from("pay_items")
        .update({ status: newStatus } as any)
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Status updated successfully",
      });

      fetchPayItems();
    } catch (err) {
      error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee Name', 'Pay Type', 'Daily Rate', 'Basic Salary', 'Total Days Worked', 'Gross Pay', 'Tax Deductions', 'Custom Benefits', 'Total Deductions', 'Net Pay', 'Status'];

    const rows = filteredAndSortedItems.map(item => {
      const calc = calculatePay(item);
      const hoursOrPieces = item.employees.pay_type === 'hourly'
        ? `${item.hours_worked || 0} hours`
        : item.employees.pay_type === 'piece_rate'
          ? `${item.pieces_completed || 0} pieces`
          : item.employees.pay_type === 'daily_rate'
            ? `${item.hours_worked || 0} days`
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
      const { error } = await (supabase as any)
        .from("pay_item_custom_deductions")
        .delete()
        .eq("id", deductionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom deduction removed",
      });

      fetchPayItems();
    } catch (err) {
      error("Error deleting custom deduction:", err);
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
        await (supabase as any).from("pay_item_custom_deductions").insert({
          pay_item_id: itemId,
          name: description,
          amount: finalAmount,
          type: addToGross ? 'benefit' : 'allowance'
        } as any);

        // If adding to gross, recalculate and update the pay item
        if (addToGross) {
          const newGrossPay = currentCalc.grossPay + finalAmount;
          const deductionRules = getCountryDeductions(item.employees.country);
          const newTaxDeduction = item.employees.employee_type === 'expatriate'
            ? newGrossPay * 0.15
            : deductionRules
              .filter(rule => rule.mandatory)
              .reduce((total, rule) => total + calculateDeduction(newGrossPay, rule, item.employees.country), 0);

          const newTotalDeductions = newTaxDeduction + item.benefit_deductions + currentCalc.customDeductionsTotal;
          const newNetPay = newGrossPay + currentCalc.customAllowancesTotal - newTotalDeductions;

          await (supabase as any).from("pay_items").update({
            gross_pay: newGrossPay,
            tax_deduction: newTaxDeduction,
            total_deductions: newTotalDeductions,
            net_pay: newNetPay
          } as any).eq("id", itemId);
        }
      }

      await updatePayRunTotals();
      toast({
        title: "Success",
        description: `Added ${description} to ${itemsToUpdate.length} employee(s)`,
      });

      setSelectedItems(new Set());
      fetchPayItems();
    } catch (err) {
      error("Error applying bulk addition:", err);
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
    } catch (err) {
      error("Error applying bulk deduction:", err);
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
    } catch (err) {
      error("Error applying bulk update:", err);
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto p-0 flex flex-col modern-dialog">
        <div className="min-h-0 flex flex-col">
          <DialogHeader className="flex-shrink-0 modern-dialog-header p-6 pb-0">
            <DialogTitle className="modern-dialog-title">Pay Run Details - Comprehensive Summary</DialogTitle>
            <DialogDescription className="modern-dialog-description">
              Pay Run Date: {(() => {
                try {
                  return format(new Date(payRunDate), 'MMM dd, yyyy');
                } catch (e) {
                  return 'Invalid Date';
                }
              })()} |
              Pay Period: {(() => {
                try {
                  return `${format(new Date(payPeriod.start), 'MMM dd')} - ${format(new Date(payPeriod.end), 'MMM dd, yyyy')}`;
                } catch (e) {
                  return 'Invalid Period';
                }
              })()}
              {payRunData?.category && payRunData?.employee_type && (
                <> | Category: {payRunData.category} {'>'} {payRunData.employee_type}{payRunData.pay_frequency ? ` > ${payRunData.pay_frequency}` : ''}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 border-b bg-background z-10 shrink-0">
              <TabsList className="w-auto justify-start bg-transparent p-0">
                <TabsTrigger value="pay-details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">
                  Pay Details
                </TabsTrigger>
                <TabsTrigger value="approvals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">
                  Approvals
                  {payRunData?.approval_status === 'pending_approval' && <span className="ml-2 h-2 w-2 rounded-full bg-orange-500" />}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pay-details" className="flex-1 overflow-y-auto p-6 pt-4 m-0 data-[state=inactive]:hidden shadow-none border-0">
              {/* Wrapped Content Container */}
              <div className="h-full">
                {isExpatriatePayRun ? (
                  expatriatePayGroup ? (
                    <ExpatriatePayRunDetails
                      payRunId={payRunId || ""}
                      expatriatePayGroup={expatriatePayGroup}
                      employees={assignedExpatEmployees}
                      onUpdate={fetchPayItems}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading expatriate pay group details...
                    </div>
                  )
                ) : payItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pay items found for this pay run
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Summary Cards */}
                    <div className="modern-dialog-content">
                      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
                        <div className="modern-dialog-card">
                          <div className="pb-2">
                            <div className="text-sm text-muted-foreground">Total Employees</div>
                            <div className="text-3xl font-bold">{filteredAndSortedItems.length}</div>
                          </div>
                        </div>
                        <div className="modern-dialog-card">
                          <div className="pb-2">
                            <div className="text-sm text-muted-foreground">Total Gross Pay</div>
                            <div className="text-3xl font-bold text-green-600">{formatCurrency(summaryTotals.totalGross, payGroupCurrency)}</div>
                          </div>
                        </div>
                        <div className="modern-dialog-card">
                          <div className="pb-2">
                            <div className="text-sm text-muted-foreground">Total Deductions</div>
                            <div className="text-3xl font-bold text-orange-600">{formatCurrency(summaryTotals.totalDeductions, payGroupCurrency)}</div>
                          </div>
                        </div>
                        <div className="modern-dialog-card">
                          <div className="pb-2">
                            <div className="text-sm text-muted-foreground">Total Net Pay</div>
                            <div className="text-3xl font-bold text-primary">{formatCurrency(summaryTotals.totalNet, payGroupCurrency)}</div>
                          </div>
                        </div>
                      </div>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // If only one employee is selected, auto-select them for payslip
                              if (selectedItems.size === 1) {
                                const selectedItem = payItems.find(item => selectedItems.has(item.id));
                                if (selectedItem) {
                                  setSelectedEmployeeForPayslip({
                                    id: selectedItem.employee_id,
                                    name: getFullName(selectedItem.employees)
                                  });
                                }
                              }
                              setIndividualPayslipDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Payslip{selectedItems.size > 1 ? 's' : ''}
                          </Button>
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
                          <DropdownMenuContent align="end" className="w-64">
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
                            {canExportBankSchedule && (
                              <DropdownMenuItem onClick={() => setBankScheduleDialogOpen(true)} className="gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                <span>Export Bank Schedule</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setLstDialogOpen(true)} className="gap-2">
                              <Flag className="h-4 w-4 text-green-700" />
                              <span>Uganda LST Deductions</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              try {
                                if (!payRunId) return;
                                // Remove all LST custom deductions for items in this pay run only
                                const { data: items } = await (supabase as any)
                                  .from("pay_items")
                                  .select("id")
                                  .eq("pay_run_id", payRunId);
                                const ids = (items || []).map(i => i.id);
                                if (ids.length > 0) {
                                  await (supabase as any)
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
                            <DropdownMenuItem onClick={() => setGeneratePayrollSummaryDialogOpen(true)} className="gap-2">
                              <Download className="h-4 w-4 text-blue-600" />
                              <span>Generate Payroll Summary</span>
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
                    <div className="max-h-[70vh] overflow-y-auto px-2 modern-dialog-table payrun-details-table">
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
                            <TableHead>Daily Rate</TableHead>
                            <TableHead>Basic Salary</TableHead>
                            <TableHead>Total Days Worked</TableHead>
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
                            const isEditing = !!editingItems[item.id];
                            const isExpanded = expandedEmployee === item.id;
                            const countryDeductions = getCountryDeductions(item.employees.country);

                            return (
                              <React.Fragment key={item.id}>
                                <TableRow className={selectedItems.has(item.id) ? 'bg-muted/50' : ''}>
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
                                        item.employees.pay_type === 'piece_rate' ? 'Piece' :
                                          item.employees.pay_type === 'daily_rate' ? 'Daily' : 'Salary'}
                                    </Badge>
                                  </TableCell>
                                  {/* Daily Rate column */}
                                  <TableCell>
                                    {item.employees.pay_type === 'daily_rate' ? (
                                      isEditing ? (
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="w-24 md:w-28"
                                          value={(editingItems[item.id] as any)?.pay_rate ?? item.employees.pay_rate}
                                          onChange={(e) => handleFieldChange(item.id, 'pay_rate', parseFloat(e.target.value) || 0)}
                                        />
                                      ) : (
                                        formatCurrency(item.employees.pay_rate, payGroupCurrency)
                                      )
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                  {/* Basic Salary (editable) */}
                                  <TableCell>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        className="w-24 md:w-28"
                                        value={(editingItems[item.id] as any)?.pay_rate ?? item.employees.pay_rate}
                                        onChange={(e) => handleFieldChange(item.id, 'pay_rate', parseFloat(e.target.value) || 0)}
                                      />
                                    ) : (
                                      formatCurrency(item.employees.pay_rate, payGroupCurrency)
                                    )}
                                  </TableCell>
                                  {/* Total Days Worked */}
                                  <TableCell>
                                    {item.employees.pay_type === 'daily_rate' ? (
                                      isEditing ? (
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="w-20 md:w-24"
                                          value={editingItems[item.id]?.hours_worked ?? item.hours_worked ?? 0}
                                          onChange={(e) => handleFieldChange(item.id, 'hours_worked', parseFloat(e.target.value) || 0)}
                                        />
                                      ) : (
                                        `${item.hours_worked || 0} days`
                                      )
                                    ) : (
                                      item.employees.pay_type === 'hourly'
                                        ? `${item.hours_worked || 0} hrs`
                                        : item.employees.pay_type === 'piece_rate'
                                          ? `${item.pieces_completed || 0} pcs`
                                          : '-'
                                    )}
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
                                    {formatCurrency((calculated.nssf_employer || 0), payGroupCurrency)}
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
                                    <div className="flex gap-2">
                                      {!isEditing ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingItems(prev => ({ ...prev, [item.id]: {} }))}
                                          aria-label="Edit row"
                                          title="Edit"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSave(item)}
                                            aria-label="Save row"
                                            title="Save"
                                          >
                                            <Check className="h-4 w-4 text-green-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItems(prev => {
                                                const next = { ...prev };
                                                delete next[item.id];
                                                return next;
                                              });
                                            }}
                                            aria-label="Cancel edit"
                                            title="Cancel"
                                          >
                                            <X className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedEmployeeForPayslip({
                                            id: item.employee_id,
                                            name: getFullName(item.employees)
                                          });
                                          setIndividualPayslipDialogOpen(true);
                                        }}
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        Payslip
                                      </Button>
                                    </div>
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
                                              {item.employees.pay_type === 'daily_rate' && (
                                                <div>
                                                  <Label>Days Worked</Label>
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
                                              {item.employees.pay_type === 'daily_rate' && (
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                  <span>({item.hours_worked || 0} days × {formatCurrency(item.employees.pay_rate, payGroupCurrency)}/day)</span>
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
                                              {item.employees.employee_type === 'regular' && (
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
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="flex-1 overflow-y-auto p-6 m-0">
              <ApprovalTimeline payrunId={payRunId || ""} refreshTrigger={refreshTimeline} />
            </TabsContent>
          </Tabs>

          <div className="p-4 border-t flex justify-between bg-white z-20">
            <div className="flex gap-2">
              {(isSuperAdmin || role === 'ORG_ADMIN') && (
                (payRunData?.approval_status === "draft" || payRunData?.approval_status === "rejected" || !payRunData?.approval_status) && (
                  <Button onClick={handleSubmitForApproval}>Submit for Approval</Button>
                )
              )}
              {(payRunData?.approval_status === "rejected" && (isSuperAdmin || role === 'ORG_ADMIN')) && (
                <Button variant="outline" onClick={handleReturnToDraft}>Return to Draft</Button>
              )}

              {payRunData?.approval_status === "pending_approval" && (
                <>
                  <Button onClick={() => initApprovalAction('approve')}>Approve</Button>
                  <Button variant="destructive" onClick={() => initApprovalAction('reject')}>Reject</Button>
                  <Button variant="outline" onClick={() => initApprovalAction('delegate')}>Delegate</Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>

          <ApprovalActionDialog
            isOpen={approvalAction.isOpen}
            onClose={() => setApprovalAction(prev => ({ ...prev, isOpen: false }))}
            onConfirm={executeApprovalAction}
            title={approvalAction.title}
            description={approvalAction.description}
            requireComment={approvalAction.requireComment}
            actionLabel={approvalAction.actionLabel}
            variant={approvalAction.variant}
          />
        </div>
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

      <BankScheduleExportDialog
        open={bankScheduleDialogOpen}
        onOpenChange={setBankScheduleDialogOpen}
        payRunId={payRunId || ""}
        payRunDate={payRunDate}
        payPeriod={payPeriod ? `${payPeriod.start} to ${payPeriod.end}` : undefined}
      />

      <GeneratePayrollSummaryDialog
        open={generatePayrollSummaryDialogOpen}
        onOpenChange={setGeneratePayrollSummaryDialogOpen}
        payRunId={payRunId || ""}
      />

      <ApplyBenefitsDialog
        open={applyBenefitsDialogOpen}
        onOpenChange={setApplyBenefitsDialogOpen}
        employeeCount={payItems.length}
        currency={payGroupCurrency}
        onApply={(benefits) => {
          debug("Applying benefits:", benefits);
          fetchPayItems();
        }}
      />

      <RecalculateTaxesDialog
        open={recalculateTaxesDialogOpen}
        onOpenChange={setRecalculateTaxesDialogOpen}
        employeeCount={payItems.length}
        payRunId={payRunId}
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
            log("LST deductions applied successfully");

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
            error("Error applying LST:", e);
            toast({
              title: "LST Application Failed",
              description: e?.message || "Unable to apply LST deductions. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />

      {/* Individual Payslip Dialog */}
      <IndividualPayslipDialog
        open={individualPayslipDialogOpen}
        onOpenChange={setIndividualPayslipDialogOpen}
        payRunId={payRunId}
        employeeId={selectedEmployeeForPayslip?.id}
        employeeName={selectedEmployeeForPayslip?.name}
      />
    </Dialog>
  );
};

export default PayRunDetailsDialog;

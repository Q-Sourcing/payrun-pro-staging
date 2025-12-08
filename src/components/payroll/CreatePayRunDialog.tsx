import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { log, warn, error, debug } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PayrollCalculationService, CalculationInput } from "@/lib/types/payroll-calculations";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrg } from '@/lib/tenant/OrgContext';
import { ProjectsService } from '@/lib/services/projects.service';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { useQuery } from '@tanstack/react-query';

// Function to generate payrun ID
const generatePayrunId = (payGroupName: string): string => {
  // Extract first letters of each word in the pay group name
  const prefix = payGroupName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  // Get current date and time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Format: [Prefix]-[YYYYMMDD]-[HHMMSS]
  return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`;
};

import { PayGroup } from '@/lib/types/paygroups';

interface CreatePayRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayRunCreated: () => void;
  payrollType?: string; // Optional prop to fix type when opened from a specific page
  defaultCategory?: string; // New: category filter
  defaultEmployeeType?: string; // New: employee_type filter
  defaultPayFrequency?: string; // New: pay_frequency filter
  onSuccess?: () => void; // Alias for onPayRunCreated
  initialIppmsPayType?: 'piece_rate' | 'daily_rate'; // New: preferred IPPMS pay type
}

const CreatePayRunDialog = ({
  open,
  onOpenChange,
  onPayRunCreated,
  payrollType,
  defaultCategory,
  defaultEmployeeType,
  defaultPayFrequency,
  onSuccess,
  initialIppmsPayType
}: CreatePayRunDialogProps) => {
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  // IPPMS-specific: selected pay type
  const [ippmsPayType, setIppmsPayType] = useState<'piece_rate' | 'daily_rate'>(initialIppmsPayType || 'piece_rate');

  interface FormData {
    payroll_type: string;
    project_id: string;
    pay_group_id: string;
    pay_run_date: Date;
    pay_period_start: Date;
    pay_period_end: Date;
    category: string;
    employee_type: string;
    pay_frequency: string;
    default_pieces_completed: number;
    default_piece_rate: number;
  }

  const [formData, setFormData] = useState<FormData>({
    payroll_type: payrollType || "",
    project_id: "", // NEW: Project selection for project-based pay runs
    pay_group_id: "",
    pay_run_date: new Date(),
    pay_period_start: new Date(),
    pay_period_end: new Date(),
    category: defaultCategory || "",
    employee_type: defaultEmployeeType || "",
    pay_frequency: defaultPayFrequency || "",
    default_pieces_completed: 0, // Default pieces completed for piece_rate employees
    default_piece_rate: 0, // Default rate per piece for employees without a set rate
  });
  const { toast } = useToast();
  const { organizationId } = useOrg();

  const handleSuccess = onSuccess || onPayRunCreated;

  // Determine if this is a project-based payrun (has category='projects')
  const isProjectBased = defaultCategory === 'projects';

  // Fetch projects filtered by employee type (for project-based payruns only)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', defaultEmployeeType, organizationId],
    queryFn: async () => {
      if (!defaultEmployeeType || !isProjectBased) return [];
      const employeeTypeMap: Record<string, 'manpower' | 'ippms' | 'expatriate'> = {
        'manpower': 'manpower',
        'ippms': 'ippms',
        'expatriate': 'expatriate'
      };
      const projectType = employeeTypeMap[defaultEmployeeType.toLowerCase()];
      if (!projectType) return [];
      return ProjectsService.getProjectsByType(projectType, organizationId || '');
    },
    enabled: isProjectBased && !!defaultEmployeeType
  });

  // Fetch pay groups filtered by selected project (for project-based payruns)
  const { data: projectPayGroups = [], refetch: refetchPayGroups } = useQuery({
    queryKey: ['project-paygroups', formData.project_id, defaultEmployeeType, ippmsPayType, defaultPayFrequency, organizationId],
    queryFn: async () => {
      if (!formData.project_id || !defaultEmployeeType) return [];

      const employeeTypeMap: Record<string, 'manpower' | 'ippms' | 'expatriate'> = {
        'manpower': 'manpower',
        'ippms': 'ippms',
        'expatriate': 'expatriate'
      };
      const employeeType = employeeTypeMap[defaultEmployeeType.toLowerCase()];
      if (!employeeType) return [];

      return PayGroupsService.getProjectPayGroups({
        organizationId,
        projectId: formData.project_id,
        employeeType,
        payType: employeeType === 'ippms' ? ippmsPayType : undefined,
        payFrequency: employeeType === 'manpower' ? defaultPayFrequency : undefined
      });
    },
    enabled: isProjectBased && !!formData.project_id && !!defaultEmployeeType
  });

  // Clear pay group selection when project changes
  useEffect(() => {
    if (isProjectBased) {
      setFormData(prev => ({ ...prev, pay_group_id: "" }));
    }
  }, [formData.project_id, isProjectBased]);

  const selectedPayGroup = payGroups.find(group => group.id === formData.pay_group_id);
  const generatedId = selectedPayGroup ? generatePayrunId(selectedPayGroup.name) : "";

  useEffect(() => {
    if (open) {
      // Only fetch pay groups for non-project-based payruns
      if (!isProjectBased) {
        fetchPayGroups();
      }
      // Reset form with defaults
      setFormData(prev => ({
        ...prev,
        payroll_type: payrollType || prev.payroll_type || "",
        project_id: "", // Reset project selection
        category: defaultCategory || "",
        employee_type: defaultEmployeeType || "",
        pay_frequency: defaultPayFrequency || "",
        default_pieces_completed: 0, // Reset to 0 when dialog opens
        default_piece_rate: 0, // Reset to 0 when dialog opens
      }));
      // Reset IPPMS pay type
      if ((defaultEmployeeType || "").toLowerCase() === "ippms") {
        setIppmsPayType(initialIppmsPayType || 'piece_rate');
      }
    }
  }, [open, payrollType, defaultCategory, defaultEmployeeType, defaultPayFrequency, initialIppmsPayType, isProjectBased]);

  const fetchPayGroups = async () => {
    try {
      console.log("🔍 Fetching pay groups, payrollType:", payrollType);
      setLoading(true);

      let data, error;

      // Always fetch from pay_group_master table for consistency
      let query = supabase
        .from("pay_group_master")
        .select("id, name, country, currency, code, type, source_table, source_id, category, employee_type, pay_frequency, pay_type")
        .eq("active", true)
        .order("name", { ascending: true });

      // Filter by category/employee_type/pay_frequency if provided
      if (defaultCategory) {
        query = query.eq("category", defaultCategory);
      }

      if (defaultEmployeeType) {
        query = (query as any).eq("employee_type", defaultEmployeeType);
      }

      if (defaultPayFrequency) {
        query = query.eq("pay_frequency", defaultPayFrequency);
      }

      // Filter by type if payrollType is provided (legacy support)
      if (payrollType) {
        const typeMapping = {
          "expatriate": "expatriate",
          "local": "regular",
          "regular": "regular"
        };
        const masterType = typeMapping[payrollType.toLowerCase()] || payrollType.toLowerCase();
        console.log("🔍 Filtering by master type:", masterType);
        // For IPPMS context, skip type filtering so piece_rate groups are included
        if ((defaultEmployeeType || "").toLowerCase() !== "ippms") {
          query = query.eq("type", masterType);
        }
      }

      // IPPMS: apply pay_type filter
      if ((defaultEmployeeType || "").toLowerCase() === "ippms") {
        query = (query as any).eq("pay_type", ippmsPayType);
      }

      const result = await query;
      data = result.data;
      error = result.error;

      if (error) {
        console.error("❌ Error fetching pay groups:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch pay groups",
          variant: "destructive",
        });
        setPayGroups([]);
      } else {
        console.log("✅ Pay groups fetched from pay_group_master:", data);
        console.table((data || []).map(({ id, name, type, code, country, currency }) => ({ id, name, type, code, country, currency })));
        setPayGroups(data || []);
      }
    } catch (err: any) {
      console.error("❌ Database connection failed:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to fetch pay groups",
        variant: "destructive",
      });
      setPayGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter pay groups based on payroll type and employee category
  // For project-based payruns, use projectPayGroups from React Query
  // For non-project payruns, use the legacy filtering logic
  const filteredPayGroups = isProjectBased
    ? projectPayGroups
    : (payrollType ? payGroups : payGroups.filter(group => {
      // Use case-insensitive comparison for type matching
      const groupType = (group.type || "").toLowerCase();
      const selectedType = (formData.payroll_type || "").toLowerCase();

      if (selectedType === "expatriate") {
        return groupType === "expatriate";
      } else if (selectedType === "local") {
        return groupType === "local";
      }
      return true;
    }));

  console.log("📊 Fetched PayGroups:", payGroups);
  console.log("📊 Filtered PayGroups for", formData.payroll_type || payrollType, ":", filteredPayGroups);
  console.log("📊 Payroll type:", payrollType || formData.payroll_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.payroll_type) {
      toast({
        title: "Error",
        description: "Please select a payroll type",
        variant: "destructive",
      });
      return;
    }

    // Validate project selection for project-based payruns
    if (isProjectBased && !formData.project_id) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    if (!formData.pay_group_id) {
      toast({
        title: "Error",
        description: "Please select a pay group",
        variant: "destructive",
      });
      return;
    }

    if (formData.pay_period_start >= formData.pay_period_end) {
      toast({
        title: "Error",
        description: "Pay period end date must be after start date",
        variant: "destructive",
      });
      return;
    }


    setLoading(true);
    try {
      console.log("🚀 Starting pay run creation with formData:", {
        pay_group_id: formData.pay_group_id,
        project_id: formData.project_id,
        pay_run_date: formData.pay_run_date,
        pay_period_start: formData.pay_period_start,
        pay_period_end: formData.pay_period_end
      });

      // Test database connection first
      const { error: testError } = await supabase
        .from("pay_groups")
        .select("id")
        .limit(1);

      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      console.log("✅ Database connection successful");

      console.log("✅ Database connection successful");

      // Get the selected pay group from master table
      // For project-based payruns, look in projectPayGroups
      const sourceGroups = isProjectBased ? projectPayGroups : payGroups;
      const selectedPayGroup = sourceGroups.find(g => g.id === formData.pay_group_id);
      console.log("🔍 Selected pay group from master:", selectedPayGroup);

      if (!selectedPayGroup) {
        throw new Error("Invalid pay group selected. Please try again.");
      }

      // Resolve the pay_group_master_id to use for assignments and pay run record
      // - For non-project-based selections, the id is already the master id
      // - For project-based selections (fetched from pay_groups), look up the master row by source_table/source_id
      let payGroupMasterId: string = selectedPayGroup.id;
      let masterMeta:
        | { category?: string | null; employee_type?: string | null; pay_frequency?: string | null; pay_type?: string | null }
        | null = null;
      if (isProjectBased) {
        const { data: masterRow, error: masterErr } = await supabase
          .from('pay_group_master')
          .select('id, category, employee_type, pay_frequency, pay_type')
          .eq('source_table', 'pay_groups')
          .eq('source_id', selectedPayGroup.id)
          .single();
        if (!masterErr && masterRow?.id) {
          payGroupMasterId = masterRow.id;
          masterMeta = {
            category: (masterRow as any).category,
            employee_type: (masterRow as any).employee_type,
            pay_frequency: (masterRow as any).pay_frequency,
            pay_type: (masterRow as any).pay_type,
          };
        } else {
          console.warn('⚠️ pay_group_master row not found for project-based group; falling back to selected id');
        }
      }

      // Get employees in this pay group using the source table and source_id
      console.log("🔍 Fetching employees for pay group:", selectedPayGroup.name);
      console.log("🔍 Source table:", (selectedPayGroup as any).source_table, "Source ID:", (selectedPayGroup as any).source_id);

      // Get pay group's category, employee_type, and pay_frequency for filtering
      // These come from pay_group_master table, so we need to access them via type assertion
      const payGroupCategory = (masterMeta?.category ?? (selectedPayGroup as any).category) as string | undefined;
      const payGroupEmployeeType = (masterMeta?.employee_type ?? (selectedPayGroup as any).employee_type) as string | undefined;
      const payGroupPayFrequency = (masterMeta?.pay_frequency ?? (selectedPayGroup as any).pay_frequency) as string | undefined;

      let employees, employeesError;

      // Unified employee fetching: always fetch from paygroup_employees table
      // This table links employees to pay_group_master_id and is the source of truth for assignments
      const { data: paygroupEmployees, error: paygroupError } = await supabase
        .from("paygroup_employees")
        .select(`
          employee_id,
          employees (
            id, pay_rate, pay_type, country, employee_type, status, pay_group_id, category, pay_frequency
          )
        `)
        .eq("pay_group_master_id", payGroupMasterId)
        .eq("active", true); // Only active assignments

      if (paygroupError) {
        employeesError = paygroupError;
        employees = null;
      } else {
        // Map to employee objects and filter by status
        employees = (paygroupEmployees?.map((pe: any) => pe.employees).filter(Boolean) || [])
          .filter((emp: any) => emp.status === 'active');

        // Apply additional filters based on pay group criteria
        // This ensures data integrity even if assignment was loose
        if (employees.length > 0) {
          employees = employees.filter((emp: any) => {
            const matchesCategory = !payGroupCategory || emp.category === payGroupCategory;
            const matchesEmployeeType = !payGroupEmployeeType || emp.employee_type === payGroupEmployeeType;

            // For manpower, also filter by pay_frequency
            const matchesFrequency = !(payGroupEmployeeType === "manpower" && payGroupPayFrequency) ||
              emp.pay_frequency === payGroupPayFrequency;

            // For IPPMS, also filter by pay_type selection
            const matchesPayType = !((defaultEmployeeType || "").toLowerCase() === "ippms" && ippmsPayType) ||
              emp.pay_type === ippmsPayType;

            return matchesCategory && matchesEmployeeType && matchesFrequency && matchesPayType;
          });
        }
      }

      // Fallback for legacy regular pay groups: if no employees found in paygroup_employees,
      // check the employees table directly using source_id.
      // This handles cases where data hasn't been migrated to paygroup_employees yet.
      if ((!employees || employees.length === 0) && selectedPayGroup.type === 'regular') {
        console.log("⚠️ No employees in paygroup_employees, checking legacy employees table...");
        const { data: legacyEmployees, error: legacyError } = await supabase
          .from("employees")
          .select("id, pay_rate, pay_type, country, employee_type, status, pay_group_id, category, pay_frequency")
          .eq("pay_group_id", selectedPayGroup.source_id)
          .eq("status", "active");

        if (!legacyError && legacyEmployees && legacyEmployees.length > 0) {
          // Apply the same filters
          employees = legacyEmployees.filter((emp: any) => {
            const matchesCategory = !payGroupCategory || emp.category === payGroupCategory;
            const matchesEmployeeType = !payGroupEmployeeType || emp.employee_type === payGroupEmployeeType;
            return matchesCategory && matchesEmployeeType;
          });
          console.log("✅ Found", employees.length, "employees in legacy table");
        }
      }

      console.log("📊 Employees found:", employees);
      console.log("📊 Employee count:", employees?.length || 0);

      if (employeesError) {
        console.error("❌ Error fetching employees:", employeesError);
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      if (!employees || employees.length === 0) {
        console.warn("⚠️ No active employees found matching pay group criteria");
        const criteria = [
          payGroupCategory && `Category: ${payGroupCategory}`,
          payGroupEmployeeType && `Employee Type: ${payGroupEmployeeType}`,
          payGroupPayFrequency && `Pay Frequency: ${payGroupPayFrequency}`
        ].filter(Boolean).join(", ");

        toast({
          title: "Warning",
          description: `No active employees found matching this pay group criteria${criteria ? ` (${criteria})` : ""}. Please ensure employees are assigned with matching category, employee type, and pay frequency.`,
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Found", employees.length, "employees for pay run");

      console.log("📝 Creating pay run record with pay_group_master_id:", selectedPayGroup.id);

      // Create pay run record using pay_group_master_id
      // Map to valid DB payroll_type values to satisfy check constraint
      const groupEmployeeType = ((selectedPayGroup as any).employee_type || "").toLowerCase();
      const groupSourceTable = (selectedPayGroup.source_table || "").toLowerCase();
      const isExpat = groupSourceTable === "expatriate_pay_groups" || (selectedPayGroup.type || "").toLowerCase() === "expatriate";
      const isIppms = groupEmployeeType === "ippms";
      const computedPayrollType: "regular" | "expatriate" | "piece_rate" =
        isExpat ? "expatriate" : (isIppms ? "piece_rate" : "regular");

      // Build base payload
      const baseInsertPayload: any = {
        pay_group_master_id: payGroupMasterId, // Use master table UUID (resolved for project-based)
        payroll_type: computedPayrollType,
        organization_id: organizationId || null,
        // Persist categorization for filtering/reporting
        category: (masterMeta?.category ?? (selectedPayGroup as any).category) || null,
        employee_type: (masterMeta?.employee_type ?? (selectedPayGroup as any).employee_type) || null,
        pay_frequency: (masterMeta?.pay_frequency ?? (selectedPayGroup as any).pay_frequency) || null,
        pay_type: (defaultEmployeeType || "").toLowerCase() === "ippms" ? ippmsPayType : null,
        pay_run_date: formData.pay_run_date.toISOString(),
        pay_period_start: formData.pay_period_start.toISOString(),
        pay_period_end: formData.pay_period_end.toISOString(),
        status: "draft",
      };

      // Prefer inserting project_id when available (project-based flows)
      const payloadWithProject = {
        ...baseInsertPayload,
        project_id: isProjectBased ? formData.project_id : null,
      };

      // Attempt insert with project_id first
      let payRunData, payRunError;
      try {
        const res = await supabase
          .from("pay_runs")
          .insert(payloadWithProject)
          .select()
          .single();
        payRunData = res.data;
        payRunError = res.error;
      } catch (e: any) {
        payRunError = e;
      }

      // If schema doesn’t have project_id yet, retry without it and warn
      if (payRunError && String(payRunError.message || '').includes("project_id") && String(payRunError.message || '').includes("schema cache")) {
        console.warn("⚠️ pay_runs.project_id not available in schema cache; retrying insert without project_id");
        toast({
          title: "Warning",
          description: "Database is missing pay_runs.project_id. Inserting without project link. Apply the migration to enable project_id.",
          variant: "destructive",
        });
        const res2 = await supabase
          .from("pay_runs")
          .insert(baseInsertPayload)
          .select()
          .single();
        payRunData = res2.data;
        payRunError = res2.error;
      }

      if (payRunError) {
        console.error("❌ Error creating pay run:", payRunError);
        throw new Error(`Failed to create pay run: ${payRunError.message}`);
      }

      console.log("✅ Pay run created:", payRunData.id);

      // Fetch pay group details to get tax_country
      let payGroupTaxCountry = selectedPayGroup.country; // Default to pay group country

      // Try to get tax_country from expatriate_pay_groups if available, otherwise use country
      if (selectedPayGroup.type === 'expatriate') {
        try {
          const { data: expatPayGroupData, error: epgError } = await supabase
            .from('expatriate_pay_groups')
            .select('tax_country')
            .eq('id', selectedPayGroup.source_id)
            .single();

          if (!epgError && expatPayGroupData?.tax_country) {
            payGroupTaxCountry = expatPayGroupData.tax_country;
          }
        } catch (e) {
          // If table doesn't exist or column doesn't exist, use country as fallback
          console.log("tax_country not available, using country:", selectedPayGroup.country);
        }
      }
      // For other types, use country as tax_country (tax_country column may not exist on pay_groups)

      console.log("🌍 Using tax_country from pay group:", payGroupTaxCountry);

      // Create pay items for each employee using server-side calculations
      const payItems = await Promise.all(
        employees.map(async (employee) => {
          try {
            // Use employee's pay rate if available, otherwise use default from form
            const effectivePayRate = employee.pay_rate || formData.default_piece_rate || 0;

            const input: CalculationInput = {
              employee_id: employee.id,
              pay_run_id: payRunData.id,
              pay_rate: effectivePayRate,
              pay_type: employee.pay_type,
              employee_type: employee.employee_type,
              country: payGroupTaxCountry, // Use pay group's tax_country instead of employee.country
              hours_worked: employee.pay_type === 'hourly' ? 0 : undefined,
              pieces_completed: employee.pay_type === 'piece_rate' ? (formData.default_pieces_completed || 0) : undefined,
              custom_deductions: [],
              benefit_deductions: 0
            };

            const result = await PayrollCalculationService.calculatePayroll(input);

            const grossPay = Number(result.gross_pay ?? 0)
            const taxDeduction = Number(result.paye_tax ?? 0)
            const totalDeductions = Number(result.total_deductions ?? taxDeduction)
            const netPay = Number(result.net_pay ?? (grossPay - totalDeductions))
            // Calculate benefit deductions from breakdown
            const benefitDeductions = (result.breakdown || [])
              .filter((item: any) => item.type === 'deduction' && item.description.toLowerCase().includes('benefit'))
              .reduce((sum: number, item: any) => sum + item.amount, 0);

            return {
              organization_id: organizationId || null,
              pay_run_id: payRunData.id,
              employee_id: employee.id,
              gross_pay: grossPay,
              tax_deduction: taxDeduction,
              benefit_deductions: benefitDeductions,
              total_deductions: totalDeductions,
              net_pay: netPay,
              employer_contributions: Number(result.employer_contributions ?? 0),
              hours_worked: employee.pay_type === 'hourly' ? 0 : null,
              pieces_completed: employee.pay_type === 'piece_rate' ? (formData.default_pieces_completed || 0) : null,
            };
          } catch (err) {
            error(`Failed to calculate payroll for employee ${employee.id}:`, err);
            // Fallback to simple calculation
            const effectivePayRate = employee.pay_rate || formData.default_piece_rate || 0;
            const grossPay = effectivePayRate || 0;
            const taxDeduction = grossPay * 0.1; // Simple 10% tax for demo
            const totalDeductions = taxDeduction;
            const netPay = grossPay - totalDeductions;

            return {
              organization_id: organizationId || null,
              pay_run_id: payRunData.id,
              employee_id: employee.id,
              gross_pay: grossPay,
              tax_deduction: taxDeduction,
              benefit_deductions: 0,
              total_deductions: totalDeductions,
              net_pay: netPay,
              employer_contributions: 0,
              hours_worked: employee.pay_type === 'hourly' ? 0 : null,
              pieces_completed: employee.pay_type === 'piece_rate' ? (formData.default_pieces_completed || 0) : null,
            };
          }
        })
      );

      const { error: payItemsError } = await supabase
        .from("pay_items")
        .insert(payItems);

      if (payItemsError) {
        throw new Error(`Failed to create pay items: ${payItemsError.message}`);
      }

      // Update pay run totals
      const totals = payItems.reduce(
        (acc, item) => ({
          gross: acc.gross + item.gross_pay,
          deductions: acc.deductions + item.total_deductions,
          net: acc.net + item.net_pay,
        }),
        { gross: 0, deductions: 0, net: 0 }
      );

      const { error: updateError } = await supabase
        .from("pay_runs")
        .update({
          total_gross_pay: totals.gross,
          total_deductions: totals.deductions,
          total_net_pay: totals.net,
        })
        .eq("id", payRunData.id);

      if (updateError) {
        throw new Error(`Failed to update pay run totals: ${updateError.message}`);
      }

      toast({
        title: "Success",
        description: "Pay run created successfully",
      });

      setFormData({
        payroll_type: payrollType || "",
        project_id: "",
        pay_group_id: "",
        pay_run_date: new Date(),
        pay_period_start: new Date(),
        pay_period_end: new Date(),
        category: defaultCategory || "",
        employee_type: defaultEmployeeType || "",
        pay_frequency: defaultPayFrequency || "",
        default_pieces_completed: 0,
        default_piece_rate: 0,
      });
      if (typeof handleSuccess === 'function') {
        handleSuccess();
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating pay run:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pay run. Please check your database connection.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title">Create New Pay Run</DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Set up a new pay run for processing employee payments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 modern-dialog-content">
          {/* Show Payroll Type dropdown only if not provided as prop AND not IPPMS */}
          {!payrollType && (defaultEmployeeType || "").toLowerCase() !== "ippms" ? (
            <div className="space-y-2">
              <Label htmlFor="payroll_type">Payroll Type *</Label>
              <Select
                value={formData.payroll_type}
                onValueChange={(value) => setFormData({
                  ...formData,
                  payroll_type: value,
                  pay_group_id: "" // Reset pay group when type changes
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payroll type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local">Local</SelectItem>
                  <SelectItem value="Expatriate">Expatriate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <Label htmlFor="payroll_type">Payroll Type</Label>
              <div className="text-sm text-gray-700 font-semibold mt-1">
                {(defaultEmployeeType || "").toLowerCase() === "ippms" ? "IPPMS" : payrollType}
              </div>
            </div>
          )}

          {/* IPPMS Pay Type selection */}
          {(defaultEmployeeType || "").toLowerCase() === "ippms" && (
            <div className="space-y-2">
              <Label htmlFor="ippms_pay_type">IPPMS Pay Type *</Label>
              <Select
                value={ippmsPayType}
                onValueChange={(value) => {
                  setIppmsPayType(value as 'piece_rate' | 'daily_rate');
                  setFormData(prev => ({ ...prev, pay_group_id: "" }));
                  // Refresh groups for new filter
                  fetchPayGroups();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select IPPMS pay type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece_rate">Piece Rate</SelectItem>
                  <SelectItem value="daily_rate">Daily Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project Selection (for project-based payruns only) */}
          {isProjectBased && (
            <div className="space-y-2">
              <Label htmlFor="project_id">Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
                disabled={projects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projects.length === 0 ? "No projects available" : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="no-projects" disabled>
                      No projects found
                    </SelectItem>
                  ) : (
                    projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col">
                          <span>{project.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {project.code} - {project.project_type}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No {defaultEmployeeType} projects available. Please create one first.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pay_group">Pay Group *</Label>
            <Select
              value={formData.pay_group_id}
              onValueChange={(value) => setFormData({ ...formData, pay_group_id: value })}
              disabled={filteredPayGroups.length === 0 || (isProjectBased && !formData.project_id)}
            >
              <SelectTrigger className={(filteredPayGroups.length === 0 || (isProjectBased && !formData.project_id)) ? "text-muted-foreground" : ""}>
                {selectedPayGroup ? (
                  <div className="flex flex-col items-start w-full">
                    <span className="font-medium">{selectedPayGroup.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedPayGroup.country} - {selectedPayGroup.currency || 'UGX'} - {selectedPayGroup.type}
                      {selectedPayGroup.code && ` (${selectedPayGroup.code})`}
                    </span>
                  </div>
                ) : (
                  <SelectValue placeholder={filteredPayGroups.length === 0 ? "No pay groups found" : "Select pay group"} />
                )}
              </SelectTrigger>
              <SelectContent>
                {filteredPayGroups.length === 0 ? (
                  <SelectItem value="no-groups" disabled>
                    {formData.payroll_type === "Expatriate" ? "No expatriate pay groups found" : "No pay groups found"}
                  </SelectItem>
                ) : (
                  (() => {
                    // Group by category → employee_type → (for IPPMS) pay_type
                    const categoryOrder = ['head_office', 'projects'];
                    const grouped: Record<string, Record<string, PayGroup[]>> = {};
                    filteredPayGroups.forEach((g: any) => {
                      const cat = (g.category || 'other') as string;
                      const emp = (g.employee_type || 'other') as string;
                      grouped[cat] = grouped[cat] || {};
                      grouped[cat][emp] = grouped[cat][emp] || [];
                      grouped[cat][emp].push(g);
                    });
                    const sections: React.ReactNode[] = [];
                    const orderedCategories = Object.keys(grouped).sort((a, b) => {
                      const ai = categoryOrder.indexOf(a);
                      const bi = categoryOrder.indexOf(b);
                      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                    });
                    orderedCategories.forEach(categoryKey => {
                      sections.push(
                        <div key={`cat-${categoryKey}`} className="py-1">
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {categoryKey === 'head_office' ? 'Head Office' : categoryKey === 'projects' ? 'Projects' : categoryKey}
                          </div>
                        </div>
                      );
                      const empTypes = Object.keys(grouped[categoryKey]);
                      empTypes.forEach(empKey => {
                        // Employee type header
                        sections.push(
                          <div key={`emp-${categoryKey}-${empKey}`} className="px-3 py-1 text-xs font-medium text-foreground/80">
                            {empKey === 'regular' ? 'Regular' :
                              empKey === 'expatriate' ? 'Expatriate' :
                                empKey === 'interns' ? 'Interns' :
                                  empKey === 'manpower' ? 'Manpower' :
                                    empKey === 'ippms' ? 'IPPMS' : empKey}
                          </div>
                        );
                        const items = grouped[categoryKey][empKey];
                        // If IPPMS, show pay_type sub-grouping label lines
                        const isIppms = empKey.toLowerCase() === 'ippms';
                        if (isIppms) {
                          const byPayType: Record<string, PayGroup[]> = {};
                          items.forEach((it: any) => {
                            const pt = (it.pay_type || 'piece_rate') as string;
                            if (!byPayType[pt]) byPayType[pt] = [];
                            byPayType[pt].push(it);
                          });
                          Object.keys(byPayType).forEach(ptKey => {
                            sections.push(
                              <div key={`pt-${categoryKey}-${empKey}-${ptKey}`} className="px-5 py-1 text-xs text-muted-foreground">
                                {ptKey === 'piece_rate' ? 'Piece Rate' : ptKey === 'daily_rate' ? 'Daily Rate' : ptKey}
                              </div>
                            );
                            byPayType[ptKey].forEach(g => {
                              sections.push(
                                <SelectItem key={g.id} value={g.id}>
                                  <div className="flex flex-col">
                                    <span>{g.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {g.country} - {(g as any).currency || 'UGX'} - {g.type}{g.code ? ` (${g.code})` : ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            });
                          });
                        } else {
                          items.forEach(g => {
                            sections.push(
                              <SelectItem key={g.id} value={g.id}>
                                <div className="flex flex-col">
                                  <span>{g.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {g.country} - {(g as any).currency || 'UGX'} - {g.type}{g.code ? ` (${g.code})` : ''}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          });
                        }
                      });
                    });
                    return sections;
                  })()
                )}
              </SelectContent>
            </Select>
            {filteredPayGroups.length === 0 && (formData.payroll_type || (isProjectBased && formData.project_id)) && (
              <p className="text-sm text-muted-foreground">
                {isProjectBased
                  ? "No pay groups exist for this project. Create a pay group first."
                  : formData.payroll_type === "Expatriate"
                    ? "No expatriate pay groups are available. Please create one first."
                    : "No pay groups are available. Please create one first."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="generated_id">Generated Pay Run ID</Label>
            <Input
              id="generated_id"
              value={generatedId}
              readOnly
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              This ID is automatically generated based on the pay group name and current timestamp
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay_run_date">Pay Run Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.pay_run_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.pay_run_date ? format(formData.pay_run_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.pay_run_date}
                  onSelect={(date) => date && setFormData({ ...formData, pay_run_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay_period_start">Pay Period Start *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.pay_period_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.pay_period_start ? format(formData.pay_period_start, "MMM dd") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.pay_period_start}
                    onSelect={(date) => date && setFormData({ ...formData, pay_period_start: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_period_end">Pay Period End *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.pay_period_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.pay_period_end ? format(formData.pay_period_end, "MMM dd") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.pay_period_end}
                    onSelect={(date) => date && setFormData({ ...formData, pay_period_end: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Show pieces_completed and default_rate input for piece_rate pay groups */}
          {selectedPayGroup && selectedPayGroup.type === 'piece_rate' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_pieces_completed">
                  Default Pieces *
                </Label>
                <Input
                  id="default_pieces_completed"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.default_pieces_completed}
                  onChange={(e) => setFormData({
                    ...formData,
                    default_pieces_completed: parseInt(e.target.value) || 0
                  })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_piece_rate">
                  Default Rate per Piece
                </Label>
                <Input
                  id="default_piece_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.default_piece_rate}
                  onChange={(e) => setFormData({
                    ...formData,
                    default_piece_rate: parseFloat(e.target.value) || 0
                  })}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Default values will be applied to employees who don't have specific values set.
                </p>
              </div>
            </div>
          )}


          <div className="flex justify-end space-x-2 modern-dialog-actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="modern-dialog-button-secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="modern-dialog-button">
              {loading ? "Creating..." : "Create Pay Run"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePayRunDialog;
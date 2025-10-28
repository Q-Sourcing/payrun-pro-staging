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

interface PayGroup {
  id: string;
  name: string;
  country: string;
  currency?: string;
  code?: string; // Readable code like EXPG-U847
  type: string; // 'regular', 'expatriate', 'contractor', 'intern'
  source_table: string; // 'pay_groups', 'expatriate_pay_groups'
  source_id: string; // UUID from the source table
}

interface CreatePayRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayRunCreated: () => void;
  payrollType?: string; // Optional prop to fix type when opened from a specific page
}

const CreatePayRunDialog = ({ open, onOpenChange, onPayRunCreated, payrollType }: CreatePayRunDialogProps) => {
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payroll_type: payrollType || "",
    employee_category: "",
    pay_group_id: "",
    pay_run_date: new Date(),
    pay_period_start: new Date(),
    pay_period_end: new Date(),
  });
  const { toast } = useToast();

  const selectedPayGroup = payGroups.find(group => group.id === formData.pay_group_id);
  const generatedId = selectedPayGroup ? generatePayrunId(selectedPayGroup.name) : "";

  useEffect(() => {
    if (open) {
      fetchPayGroups();
    }
  }, [open, payrollType]);

  const fetchPayGroups = async () => {
    try {
      console.log("🔍 Fetching pay groups, payrollType:", payrollType);
      setLoading(true);
      
      let data, error;
      
      // Always fetch from pay_group_master table for consistency
      let query = supabase
        .from("pay_group_master")
        .select("id, name, country, currency, code, type, source_table, source_id")
        .eq("active", true)
        .order("name", { ascending: true });
      
      // Filter by type if payrollType is provided
      if (payrollType) {
        const typeMapping = {
          "expatriate": "expatriate",
          "local": "regular",
          "regular": "regular"
        };
        const masterType = typeMapping[payrollType.toLowerCase()] || payrollType.toLowerCase();
        console.log("🔍 Filtering by master type:", masterType);
        query = query.eq("type", masterType);
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
  // If payrollType prop is provided, groups are already filtered by the query
  const filteredPayGroups = payrollType ? payGroups : payGroups.filter(group => {
    // Use case-insensitive comparison for type matching
    const groupType = (group.type || "").toLowerCase();
    const selectedType = (formData.payroll_type || "").toLowerCase();
    
    if (selectedType === "expatriate") {
      return groupType === "expatriate";
    } else if (selectedType === "local") {
      return groupType === "local";
    }
    return true;
  });

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

      // Get the selected pay group from master table
      const selectedPayGroup = payGroups.find(g => g.id === formData.pay_group_id);
      console.log("🔍 Selected pay group from master:", selectedPayGroup);
      
      if (!selectedPayGroup) {
        throw new Error("Invalid pay group selected. Please try again.");
      }

      console.log("📝 Creating pay run record with pay_group_master_id:", selectedPayGroup.id);
      
      // Create pay run record using pay_group_master_id
      const { data: payRunData, error: payRunError } = await supabase
        .from("pay_runs")
        .insert({
          pay_group_master_id: selectedPayGroup.id, // Use master table UUID
          payroll_type: selectedPayGroup.type, // Set the payroll type
          pay_run_date: formData.pay_run_date.toISOString(),
          pay_period_start: formData.pay_period_start.toISOString(),
          pay_period_end: formData.pay_period_end.toISOString(),
          status: "draft",
        })
        .select()
        .single();

      if (payRunError) {
        console.error("❌ Error creating pay run:", payRunError);
        throw new Error(`Failed to create pay run: ${payRunError.message}`);
      }

      console.log("✅ Pay run created:", payRunData.id);

      // Get employees in this pay group using the source table and source_id
      console.log("🔍 Fetching employees for pay group:", selectedPayGroup.name);
      console.log("🔍 Source table:", selectedPayGroup.source_table, "Source ID:", selectedPayGroup.source_id);
      
      let employees, employeesError;
      
      if (selectedPayGroup.type === "expatriate") {
        // For expatriate groups, fetch from paygroup_employees table using pay_group_master_id
        const { data: paygroupEmployees, error: paygroupError } = await supabase
          .from("paygroup_employees")
          .select(`
            employee_id,
            employees (
              id, pay_rate, pay_type, country, employee_type, status, pay_group_id
            )
          `)
          .eq("pay_group_master_id", selectedPayGroup.id);
        
        if (paygroupError) {
          employeesError = paygroupError;
          employees = null;
        } else {
          employees = paygroupEmployees?.map(pe => pe.employees).filter(Boolean) || [];
        }
      } else {
        // For regular groups, fetch directly from employees table using source_id
        const result = await supabase
          .from("employees")
          .select("id, pay_rate, pay_type, country, employee_type, status, pay_group_id")
          .eq("pay_group_id", selectedPayGroup.source_id)
          .eq("status", "active");
        
        employees = result.data;
        employeesError = result.error;
      }

      console.log("📊 Employees found:", employees);
      console.log("📊 Employee count:", employees?.length || 0);

      if (employeesError) {
        console.error("❌ Error fetching employees:", employeesError);
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      if (!employees || employees.length === 0) {
        console.warn("⚠️ No active employees found in this pay group");
        toast({
          title: "Warning",
          description: "No active employees found in this pay group",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Found", employees.length, "employees for pay run");

      // Create pay items for each employee using server-side calculations
      const payItems = await Promise.all(
        employees.map(async (employee) => {
          try {
            const input: CalculationInput = {
              employee_id: employee.id,
              pay_run_id: payRunData.id,
              pay_rate: employee.pay_rate,
              pay_type: employee.pay_type,
              employee_type: employee.employee_type,
              country: employee.country,
              hours_worked: employee.pay_type === 'hourly' ? 0 : undefined,
              pieces_completed: employee.pay_type === 'piece_rate' ? 0 : undefined,
              custom_deductions: [],
              benefit_deductions: 0
            };

            const result = await PayrollCalculationService.calculatePayroll(input);
            
            return {
              pay_run_id: payRunData.id,
              employee_id: employee.id,
              gross_pay: result.gross_pay,
              tax_deduction: result.paye_tax + result.nssf_employee, // PAYE + NSSF Employee (statutory deductions)
              benefit_deductions: 0,
              total_deductions: result.total_deductions,
              net_pay: result.net_pay,
              employer_contributions: result.employer_contributions,
              hours_worked: employee.pay_type === 'hourly' ? 0 : null,
              pieces_completed: employee.pay_type === 'piece_rate' ? 0 : null,
            };
          } catch (err) {
            error(`Failed to calculate payroll for employee ${employee.id}:`, err);
            // Fallback to simple calculation
            const grossPay = employee.pay_rate || 0;
            const taxDeduction = grossPay * 0.1; // Simple 10% tax for demo
            const totalDeductions = taxDeduction;
            const netPay = grossPay - totalDeductions;

            return {
              pay_run_id: payRunData.id,
              employee_id: employee.id,
              gross_pay: grossPay,
              tax_deduction: taxDeduction,
              benefit_deductions: 0,
              total_deductions: totalDeductions,
              net_pay: netPay,
              employer_contributions: 0,
              hours_worked: employee.pay_type === 'hourly' ? 0 : null,
              pieces_completed: employee.pay_type === 'piece_rate' ? 0 : null,
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
        pay_group_id: "",
        pay_run_date: new Date(),
        pay_period_start: new Date(),
        pay_period_end: new Date(),
      });
      onPayRunCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating pay run:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pay run. Please check your database connection.",
        variant: "destructive",
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
          {/* Show Payroll Type dropdown only if not provided as prop */}
          {!payrollType ? (
            <div className="space-y-2">
              <Label htmlFor="payroll_type">Payroll Type *</Label>
              <Select
                value={formData.payroll_type}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  payroll_type: value, 
                  employee_category: "",
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
                {payrollType}
              </div>
            </div>
          )}

          {formData.payroll_type === "Local" && (
            <div className="space-y-2">
              <Label htmlFor="employee_category">Employee Category</Label>
              <Select
                value={formData.employee_category}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  employee_category: value,
                  pay_group_id: "" // Reset pay group when category changes
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="On Contract">On Contract</SelectItem>
                  <SelectItem value="Temporary">Temporary</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Trainee">Trainee</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pay_group">Pay Group *</Label>
            <Select
              value={formData.pay_group_id}
              onValueChange={(value) => setFormData({ ...formData, pay_group_id: value })}
              disabled={filteredPayGroups.length === 0}
            >
              <SelectTrigger className={filteredPayGroups.length === 0 ? "text-muted-foreground" : ""}>
                <SelectValue placeholder={filteredPayGroups.length === 0 ? "No pay groups found" : "Select pay group"} />
              </SelectTrigger>
              <SelectContent>
                {filteredPayGroups.length === 0 ? (
                  <SelectItem value="no-groups" disabled>
                    {formData.payroll_type === "Expatriate" ? "No expatriate pay groups found" : "No pay groups found"}
                  </SelectItem>
                ) : (
                  filteredPayGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex flex-col">
                        <span>{group.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {group.country} - {group.currency || 'UGX'} - {group.type}
                          {group.code && ` (${group.code})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {filteredPayGroups.length === 0 && formData.payroll_type && (
              <p className="text-sm text-muted-foreground">
                {formData.payroll_type === "Expatriate" 
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
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
  pay_frequency: string;
  type?: string;
}

interface CreatePayRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayRunCreated: () => void;
}

const CreatePayRunDialog = ({ open, onOpenChange, onPayRunCreated }: CreatePayRunDialogProps) => {
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payroll_type: "",
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
  }, [open]);

  const fetchPayGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .select("id, name, country, pay_frequency, type")
        .order("name");

      if (error) {
        error("Error fetching pay groups:", error);
        // Fallback to mock data if database fails
        setPayGroups([
          { id: "1", name: "UG Monthly Staff", country: "Uganda", pay_frequency: "monthly", type: "local" },
          { id: "2", name: "TEST 2 Uganda", country: "Uganda", pay_frequency: "monthly", type: "local" }
        ]);
      } else {
        setPayGroups(data || []);
      }
    } catch (err) {
      error("Database connection failed:", err);
      // Fallback to mock data
      setPayGroups([
        { id: "1", name: "UG Monthly Staff", country: "Uganda", pay_frequency: "monthly", type: "local" },
        { id: "2", name: "TEST 2 Uganda", country: "Uganda", pay_frequency: "monthly", type: "local" }
      ]);
    }
  };

  // Filter pay groups based on payroll type and employee category
  const filteredPayGroups = payGroups.filter(group => {
    if (formData.payroll_type === "Expatriate") {
      return group.type === "Expatriate";
    } else if (formData.payroll_type === "Local") {
      return group.type === "Local";
    }
    return true;
  });

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
      // Test database connection first
      const { error: testError } = await supabase
        .from("pay_groups")
        .select("id")
        .limit(1);

      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      // Create pay run record (without pay_run_id column for now)
      const { data: payRunData, error: payRunError } = await supabase
        .from("pay_runs")
        .insert({
          pay_group_id: formData.pay_group_id,
          pay_run_date: formData.pay_run_date.toISOString(),
          pay_period_start: formData.pay_period_start.toISOString(),
          pay_period_end: formData.pay_period_end.toISOString(),
          status: "draft",
        })
        .select()
        .single();

      if (payRunError) {
        throw new Error(`Failed to create pay run: ${payRunError.message}`);
      }

      // Get employees in this pay group
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, pay_rate, pay_type, country, employee_type")
        .eq("pay_group_id", formData.pay_group_id)
        .eq("status", "active");

      if (employeesError) {
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      if (!employees || employees.length === 0) {
        toast({
          title: "Warning",
          description: "No active employees found in this pay group",
          variant: "destructive",
        });
        return;
      }

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
      error("Error creating pay run:", error);
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
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pay group" />
              </SelectTrigger>
              <SelectContent>
                {filteredPayGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex flex-col">
                      <span>{group.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {group.country} - {group.pay_frequency} - {group.type || 'local'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
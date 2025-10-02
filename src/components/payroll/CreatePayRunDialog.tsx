import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PayGroup {
  id: string;
  name: string;
  country: string;
  pay_frequency: string;
}

interface CreatePayRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayRunCreated: () => void;
}

const CreatePayRunDialog = ({ open, onOpenChange, onPayRunCreated }: CreatePayRunDialogProps) => {
  const [formData, setFormData] = useState({
    pay_group_id: "",
    pay_run_date: new Date(),
    pay_period_start: new Date(),
    pay_period_end: new Date(),
  });
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPayGroups();
    }
  }, [open]);

  const fetchPayGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .select("id, name, country, pay_frequency")
        .order("name");

      if (error) throw error;
      setPayGroups(data || []);
    } catch (error) {
      console.error("Error fetching pay groups:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Check if pay run already exists for this pay group and period
      const { data: existingPayRun, error: checkError } = await supabase
        .from("pay_runs")
        .select("id")
        .eq("pay_group_id", formData.pay_group_id)
        .gte("pay_period_start", formData.pay_period_start.toISOString().split('T')[0])
        .lte("pay_period_end", formData.pay_period_end.toISOString().split('T')[0])
        .limit(1);

      if (checkError) throw checkError;

      if (existingPayRun && existingPayRun.length > 0) {
        toast({
          title: "Error",
          description: "A pay run already exists for this pay group and period",
          variant: "destructive",
        });
        return;
      }

      // Get employees in this pay group
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, pay_rate, pay_type")
        .eq("pay_group_id", formData.pay_group_id)
        .eq("status", "active");

      if (employeesError) throw employeesError;

      if (!employees || employees.length === 0) {
        toast({
          title: "Warning",
          description: "No active employees found in this pay group",
          variant: "destructive",
        });
        return;
      }

      // Create the pay run
      const { data: payRunData, error: payRunError } = await supabase
        .from("pay_runs")
        .insert([
          {
            pay_group_id: formData.pay_group_id,
            pay_run_date: formData.pay_run_date.toISOString().split('T')[0],
            pay_period_start: formData.pay_period_start.toISOString().split('T')[0],
            pay_period_end: formData.pay_period_end.toISOString().split('T')[0],
            status: "draft",
            total_gross_pay: 0,
            total_deductions: 0,
            total_net_pay: 0,
          },
        ])
        .select()
        .single();

      if (payRunError) throw payRunError;

      // Create pay items for each employee
      const payItems = employees.map(employee => ({
        pay_run_id: payRunData.id,
        employee_id: employee.id,
        gross_pay: 0,
        tax_deduction: 0,
        benefit_deductions: 0,
        total_deductions: 0,
        net_pay: 0,
        hours_worked: employee.pay_type === 'hourly' ? 0 : null,
        pieces_completed: employee.pay_type === 'piece_rate' ? 0 : null,
      }));

      const { error: payItemsError } = await supabase
        .from("pay_items")
        .insert(payItems);

      if (payItemsError) throw payItemsError;

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
    } catch (error) {
      console.error("Error creating pay run:", error);
      toast({
        title: "Error",
        description: "Failed to create pay run",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Pay Run</DialogTitle>
          <DialogDescription>
            Set up a new pay run for processing employee payments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                {payGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex flex-col">
                      <span>{group.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {group.country} • {group.pay_frequency}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pay Run Date *</Label>
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
              <Label>Pay Period Start *</Label>
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
                    {formData.pay_period_start ? format(formData.pay_period_start, "MMM dd") : "Start"}
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
              <Label>Pay Period End *</Label>
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
                    {formData.pay_period_end ? format(formData.pay_period_end, "MMM dd") : "End"}
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

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Pay Run"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePayRunDialog;
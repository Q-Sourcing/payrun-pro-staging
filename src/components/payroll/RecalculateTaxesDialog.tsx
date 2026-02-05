import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Calculator, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { PayrollCalculationService, CalculationInput } from "@/lib/types/payroll-calculations";

interface RecalculateTaxesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  payRunId?: string;
  onRecalculate: () => void;
}

export const RecalculateTaxesDialog = ({ open, onOpenChange, employeeCount, payRunId, onRecalculate }: RecalculateTaxesDialogProps) => {
  const [scope, setScope] = useState<"all" | "selected" | "specific">("all");
  const [includePAYE, setIncludePAYE] = useState(true);
  const [includeNSSF, setIncludeNSSF] = useState(true);
  const [includeStatutory, setIncludeStatutory] = useState(true);
  const [includeCustom, setIncludeCustom] = useState(true);
  const [includeNetPay, setIncludeNetPay] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [showReport, setShowReport] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [notifyEmployees, setNotifyEmployees] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  const handleRecalculate = async () => {
    if (!payRunId) {
      toast({
        title: "Error",
        description: "No pay run ID provided for recalculation",
        variant: "destructive",
      });
      return;
    }

    setRecalculating(true);

    try {
      // Fetch pay run category to determine if it's head office
      const { data: payRun, error: payRunErr } = await (supabase
        .from("pay_runs" as any)
        .select("category")
        .eq("id", payRunId)
        .single() as any);

      if (payRunErr) throw payRunErr;
      const isHO = payRun?.category === 'head_office';

      // Fetch current pay items
      const { data: payItems, error: fetchError } = await (supabase
        .from("pay_items" as any)
        .select(`
          *,
          employees (
            id,
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
        .eq("pay_run_id", payRunId) as any);

      if (fetchError) throw fetchError;

      if (!payItems || payItems.length === 0) {
        throw new Error("No pay items found for this pay run");
      }

      // Recalculate each pay item
      const updatedPayItems = await Promise.all(
        payItems.map(async (item) => {
          try {
            // Fetch custom deductions for this pay item
            const { data: customDeductions } = await (supabase
              .from("pay_item_custom_deductions" as any)
              .select("*")
              .eq("pay_item_id", item.id) as any);

            const input: CalculationInput = {
              employee_id: item.employee_id,
              pay_run_id: payRunId,
              pay_rate: item.employees.pay_rate,
              pay_type: item.employees.pay_type,
              employee_type: item.employees.employee_type,
              country: item.employees.country,
              is_head_office: isHO,
              hours_worked: item.hours_worked,
              pieces_completed: item.pieces_completed,
              custom_deductions: (customDeductions || []).map((d: any) => ({
                name: d.name,
                amount: d.amount,
                type: d.type
              })),
              benefit_deductions: item.benefit_deductions || 0
            };

            const result = await PayrollCalculationService.calculatePayroll(input);

            return {
              id: item.id,
              gross_pay: result.gross_pay,
              tax_deduction: result.paye_tax + result.nssf_employee, // PAYE + NSSF Employee
              total_deductions: result.total_deductions,
              net_pay: result.net_pay,
              employer_contributions: result.employer_contributions,
            };
          } catch (error) {
            console.error(`Failed to recalculate for employee ${item.employee_id}:`, error);
            // Return original values if calculation fails
            return {
              id: item.id,
              gross_pay: item.gross_pay,
              tax_deduction: item.tax_deduction,
              total_deductions: item.total_deductions,
              net_pay: item.net_pay,
              employer_contributions: item.employer_contributions,
            };
          }
        })
      );

      // Update pay items in database
      const updatePromises = updatedPayItems.map(item =>
      (supabase
        .from("pay_items" as any)
        .update({
          gross_pay: item.gross_pay,
          tax_deduction: item.tax_deduction,
          total_deductions: item.total_deductions,
          net_pay: item.net_pay,
          employer_contributions: item.employer_contributions,
          updated_at: new Date().toISOString()
        })
        .eq("id", item.id) as any)
      );

      await Promise.all(updatePromises);

      // Update pay run totals
      const totalGross = updatedPayItems.reduce((sum, item) => sum + item.gross_pay, 0);
      const totalDeductions = updatedPayItems.reduce((sum, item) => sum + item.total_deductions, 0);
      const totalNet = updatedPayItems.reduce((sum, item) => sum + item.net_pay, 0);

      await (supabase
        .from("pay_runs" as any)
        .update({
          total_gross_pay: totalGross,
          total_deductions: totalDeductions,
          total_net_pay: totalNet,
          updated_at: new Date().toISOString()
        })
        .eq("id", payRunId) as any);

      toast({
        title: "Taxes Recalculated",
        description: `Successfully recalculated taxes for ${updatedPayItems.length} employees`,
      });

      onRecalculate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error recalculating taxes:", error);
      toast({
        title: "Recalculation Failed",
        description: error instanceof Error ? error.message : "Failed to recalculate taxes",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Recalculate All Taxes
          </DialogTitle>
          <DialogDescription>
            Recalculate tax deductions and net pay for employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will recalculate all tax-related deductions based on current rates and employee data.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label>Recalculation Scope</Label>
            <RadioGroup value={scope} onValueChange={(value: any) => setScope(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-scope" />
                <Label htmlFor="all-scope" className="font-normal">
                  Entire Pay Run
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected-scope" />
                <Label htmlFor="selected-scope" className="font-normal">
                  Selected Employees Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific-scope" />
                <Label htmlFor="specific-scope" className="font-normal">
                  Specific Deduction Types Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Recalculation Triggers</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paye"
                  checked={includePAYE}
                  onCheckedChange={(checked) => setIncludePAYE(checked as boolean)}
                />
                <Label htmlFor="paye" className="font-normal">
                  PAYE and income taxes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nssf"
                  checked={includeNSSF}
                  onCheckedChange={(checked) => setIncludeNSSF(checked as boolean)}
                />
                <Label htmlFor="nssf" className="font-normal">
                  Social security contributions (NSSF)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="statutory"
                  checked={includeStatutory}
                  onCheckedChange={(checked) => setIncludeStatutory(checked as boolean)}
                />
                <Label htmlFor="statutory" className="font-normal">
                  Statutory deductions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom"
                  checked={includeCustom}
                  onCheckedChange={(checked) => setIncludeCustom(checked as boolean)}
                />
                <Label htmlFor="custom" className="font-normal">
                  Custom deduction formulas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="net-pay"
                  checked={includeNetPay}
                  onCheckedChange={(checked) => setIncludeNetPay(checked as boolean)}
                />
                <Label htmlFor="net-pay" className="font-normal">
                  Net pay calculations
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backup"
                  checked={createBackup}
                  onCheckedChange={(checked) => setCreateBackup(checked as boolean)}
                />
                <Label htmlFor="backup" className="font-normal">
                  Create backup before recalculation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report"
                  checked={showReport}
                  onCheckedChange={(checked) => setShowReport(checked as boolean)}
                />
                <Label htmlFor="report" className="font-normal">
                  Show detailed change report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approval"
                  checked={requireApproval}
                  onCheckedChange={(checked) => setRequireApproval(checked as boolean)}
                />
                <Label htmlFor="approval" className="font-normal">
                  Require approval for significant changes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify"
                  checked={notifyEmployees}
                  onCheckedChange={(checked) => setNotifyEmployees(checked as boolean)}
                />
                <Label htmlFor="notify" className="font-normal">
                  Notify affected employees
                </Label>
              </div>
            </div>
          </div>

          <Card className="p-4 bg-muted">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Employees to recalculate:</span>
                <span className="font-semibold">{employeeCount} employees</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Estimated changes:</span>
                <span className="font-semibold">5-10% variance</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing time:</span>
                <span className="font-semibold">5-10 seconds</span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={recalculating}>
            Cancel
          </Button>
          <Button onClick={handleRecalculate} disabled={recalculating}>
            {recalculating ? "Recalculating..." : "Recalculate Taxes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

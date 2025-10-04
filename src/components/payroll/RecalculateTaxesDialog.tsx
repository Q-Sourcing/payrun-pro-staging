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

interface RecalculateTaxesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  onRecalculate: () => void;
}

export const RecalculateTaxesDialog = ({ open, onOpenChange, employeeCount, onRecalculate }: RecalculateTaxesDialogProps) => {
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
    setRecalculating(true);
    
    setTimeout(() => {
      setRecalculating(false);
      toast({
        title: "Taxes Recalculated",
        description: `Successfully recalculated taxes for ${employeeCount} employees`,
      });
      onRecalculate();
      onOpenChange(false);
    }, 3000);
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

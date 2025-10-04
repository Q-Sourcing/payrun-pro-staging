import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RemoveCustomItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customItemCount: number;
  onRemove: () => void;
}

export const RemoveCustomItemsDialog = ({ open, onOpenChange, customItemCount, onRemove }: RemoveCustomItemsDialogProps) => {
  const [removeAdditions, setRemoveAdditions] = useState(true);
  const [removeDeductions, setRemoveDeductions] = useState(true);
  const [removeBonuses, setRemoveBonuses] = useState(true);
  const [removeBenefits, setRemoveBenefits] = useState(false);
  const [removeOverrides, setRemoveOverrides] = useState(true);
  const [keepDefinitions, setKeepDefinitions] = useState(false);
  const [saveAuditLog, setSaveAuditLog] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [exportReport, setExportReport] = useState(false);
  const [scope, setScope] = useState<"all" | "selected" | "dateRange">("all");
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const handleRemove = async () => {
    setRemoving(true);
    
    setTimeout(() => {
      setRemoving(false);
      toast({
        title: "Custom Items Removed",
        description: `Successfully removed ${customItemCount} custom items`,
      });
      onRemove();
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Remove Custom Items
          </DialogTitle>
          <DialogDescription>
            Remove custom additions, deductions, and adjustments from pay items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warning: This action cannot be undone. {customItemCount} custom items will be removed.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label>Items to Remove</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="additions"
                  checked={removeAdditions}
                  onCheckedChange={(checked) => setRemoveAdditions(checked as boolean)}
                />
                <Label htmlFor="additions" className="font-normal">
                  All custom addition columns
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deductions"
                  checked={removeDeductions}
                  onCheckedChange={(checked) => setRemoveDeductions(checked as boolean)}
                />
                <Label htmlFor="deductions" className="font-normal">
                  All custom deduction columns
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bonuses"
                  checked={removeBonuses}
                  onCheckedChange={(checked) => setRemoveBonuses(checked as boolean)}
                />
                <Label htmlFor="bonuses" className="font-normal">
                  One-time bonuses and allowances
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="benefits"
                  checked={removeBenefits}
                  onCheckedChange={(checked) => setRemoveBenefits(checked as boolean)}
                />
                <Label htmlFor="benefits" className="font-normal">
                  Temporary benefits
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overrides"
                  checked={removeOverrides}
                  onCheckedChange={(checked) => setRemoveOverrides(checked as boolean)}
                />
                <Label htmlFor="overrides" className="font-normal">
                  Manual overrides and adjustments
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Preservation Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="definitions"
                  checked={keepDefinitions}
                  onCheckedChange={(checked) => setKeepDefinitions(checked as boolean)}
                />
                <Label htmlFor="definitions" className="font-normal">
                  Keep custom column definitions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="audit"
                  checked={saveAuditLog}
                  onCheckedChange={(checked) => setSaveAuditLog(checked as boolean)}
                />
                <Label htmlFor="audit" className="font-normal">
                  Save removed items to audit log
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backup"
                  checked={createBackup}
                  onCheckedChange={(checked) => setCreateBackup(checked as boolean)}
                />
                <Label htmlFor="backup" className="font-normal">
                  Create backup before removal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="export"
                  checked={exportReport}
                  onCheckedChange={(checked) => setExportReport(checked as boolean)}
                />
                <Label htmlFor="export" className="font-normal">
                  Export removed items report
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Scope</Label>
            <RadioGroup value={scope} onValueChange={(value: any) => setScope(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-items" />
                <Label htmlFor="all-items" className="font-normal">
                  Entire Pay Run
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected-items" />
                <Label htmlFor="selected-items" className="font-normal">
                  Selected Custom Items Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dateRange" id="date-range" />
                <Label htmlFor="date-range" className="font-normal">
                  Specific Date Range
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Card className="p-4 bg-destructive/10 border-destructive">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items to be removed:</span>
                <span className="font-semibold text-destructive">{customItemCount} custom items</span>
              </div>
              <div className="text-sm text-destructive font-medium">
                This action cannot be undone
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={removing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={removing}>
            {removing ? "Removing..." : "Remove Custom Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

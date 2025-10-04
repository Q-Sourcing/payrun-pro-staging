import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  currency: string;
  onApply: (amount: number, description: string, isPercentage: boolean, addToGross: boolean) => void;
}

export const BulkAddDialog = ({ open, onOpenChange, employeeCount, currency, onApply }: BulkAddDialogProps) => {
  const [operationType, setOperationType] = useState<"fixed" | "percentage">("fixed");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [addToGross, setAddToGross] = useState(true);

  const handleApply = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    onApply(parsedAmount, description, operationType === "percentage", addToGross);
    handleClose();
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setOperationType("fixed");
    setAddToGross(true);
    onOpenChange(false);
  };

  const calculateTotalImpact = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return 0;
    
    if (operationType === "fixed") {
      return parsedAmount * employeeCount;
    }
    return 0; // For percentage, we'd need individual salaries
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to All Employees</DialogTitle>
          <DialogDescription>
            Add amounts to all {employeeCount} employees in this pay run
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Operation Type</Label>
            <RadioGroup value={operationType} onValueChange={(value: "fixed" | "percentage") => setOperationType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal">Fixed Amount Addition</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="font-normal">Percentage Increase</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Details</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={operationType === "fixed" ? "Enter amount" : "Enter percentage"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                />
                <span className="flex items-center px-3 bg-muted rounded-md">
                  {operationType === "fixed" ? currency : "%"}
                </span>
              </div>
              <Input
                placeholder="Description (e.g., 'Annual Bonus', 'Performance Incentive')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Application</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-to-gross"
                checked={addToGross}
                onCheckedChange={(checked) => setAddToGross(checked as boolean)}
              />
              <Label htmlFor="add-to-gross" className="font-normal">
                Add to Gross Pay (affects tax calculations)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="net-bonus"
                checked={!addToGross}
                onCheckedChange={(checked) => setAddToGross(!checked)}
              />
              <Label htmlFor="net-bonus" className="font-normal">
                Add as Net Bonus (no tax implications)
              </Label>
            </div>
          </div>

          <Card className="p-4 bg-muted">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Affected Employees:</span>
                <span className="font-semibold">{employeeCount} employees</span>
              </div>
              {operationType === "fixed" && amount && (
                <div className="flex justify-between text-sm">
                  <span>Total Impact:</span>
                  <span className="font-semibold text-green-600">
                    +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculateTotalImpact())} to payroll
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!amount || !description}>
            Apply to All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

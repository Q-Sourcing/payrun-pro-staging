import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";

interface BulkDeductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  currency: string;
  onApply: (amount: number, description: string, isPercentage: boolean, deductionType: string) => void;
}

export const BulkDeductDialog = ({ open, onOpenChange, employeeCount, currency, onApply }: BulkDeductDialogProps) => {
  const [operationType, setOperationType] = useState<"fixed" | "percentage">("fixed");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deductionType, setDeductionType] = useState<"taxable" | "non-taxable" | "statutory">("non-taxable");

  const handleApply = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    onApply(parsedAmount, description, operationType === "percentage", deductionType);
    handleClose();
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setOperationType("fixed");
    setDeductionType("non-taxable");
    onOpenChange(false);
  };

  const calculateTotalImpact = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return 0;
    
    if (operationType === "fixed") {
      return parsedAmount * employeeCount;
    }
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deduct from All Employees</DialogTitle>
          <DialogDescription>
            Apply deductions to all {employeeCount} employees in this pay run
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Deduction Type</Label>
            <RadioGroup value={operationType} onValueChange={(value: "fixed" | "percentage") => setOperationType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed-deduct" />
                <Label htmlFor="fixed-deduct" className="font-normal">Fixed Amount Deduction</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage-deduct" />
                <Label htmlFor="percentage-deduct" className="font-normal">Percentage Deduction</Label>
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
                placeholder="Description (e.g., 'Loan Repayment', 'Union Dues', 'Insurance')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Deduction Category</Label>
            <RadioGroup value={deductionType} onValueChange={(value: "taxable" | "non-taxable" | "statutory") => setDeductionType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="taxable" id="taxable" />
                <Label htmlFor="taxable" className="font-normal">Taxable Deduction</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non-taxable" id="non-taxable" />
                <Label htmlFor="non-taxable" className="font-normal">Non-Taxable Deduction</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="statutory" id="statutory" />
                <Label htmlFor="statutory" className="font-normal">Statutory Deduction</Label>
              </div>
            </RadioGroup>
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
                  <span className="font-semibold text-red-600">
                    -{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculateTotalImpact())} from payroll
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

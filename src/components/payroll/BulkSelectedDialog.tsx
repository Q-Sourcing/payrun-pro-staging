import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

interface Employee {
  id: string;
  name: string;
  grossPay: number;
}

interface BulkSelectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployees: Employee[];
  currency: string;
  onApply: (amount: number, description: string, operationType: string, applicationMethod: string, recalculateTaxes: boolean) => void;
}

export const BulkSelectedDialog = ({ open, onOpenChange, selectedEmployees, currency, onApply }: BulkSelectedDialogProps) => {
  const [operationType, setOperationType] = useState<"add-fixed" | "add-percentage" | "deduct-fixed" | "deduct-percentage">("add-fixed");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [applicationMethod, setApplicationMethod] = useState<"gross" | "separate-add" | "gross-deduct" | "separate-deduct">("gross");
  const [recalculateTaxes, setRecalculateTaxes] = useState(true);

  const handleApply = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    onApply(parsedAmount, description, operationType, applicationMethod, recalculateTaxes);
    handleClose();
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setOperationType("add-fixed");
    setApplicationMethod("gross");
    setRecalculateTaxes(true);
    onOpenChange(false);
  };

  const calculatePreview = (employee: Employee) => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return { addition: 0, newGross: employee.grossPay };
    
    let addition = 0;
    if (operationType === "add-fixed" || operationType === "deduct-fixed") {
      addition = parsedAmount;
    } else {
      addition = employee.grossPay * (parsedAmount / 100);
    }

    const multiplier = operationType.startsWith("add") ? 1 : -1;
    const newGross = employee.grossPay + (addition * multiplier);

    return { addition: addition * multiplier, newGross };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update Selected Employees ({selectedEmployees.length})</DialogTitle>
          <DialogDescription>
            Apply changes to the selected employees in this pay run
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Operation Type</Label>
            <RadioGroup value={operationType} onValueChange={(value: any) => setOperationType(value)}>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add-fixed" id="add-fixed" />
                  <Label htmlFor="add-fixed" className="font-normal">Add Fixed Amount</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add-percentage" id="add-percentage" />
                  <Label htmlFor="add-percentage" className="font-normal">Add Percentage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deduct-fixed" id="deduct-fixed" />
                  <Label htmlFor="deduct-fixed" className="font-normal">Deduct Fixed Amount</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deduct-percentage" id="deduct-percentage" />
                  <Label htmlFor="deduct-percentage" className="font-normal">Deduct Percentage</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Amount/Percentage</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={operationType.includes("percentage") ? "Enter percentage" : "Enter amount"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <span className="flex items-center px-3 bg-muted rounded-md">
                {operationType.includes("percentage") ? "%" : currency}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <Label>Application Method</Label>
            <RadioGroup value={applicationMethod} onValueChange={(value: any) => setApplicationMethod(value)}>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gross" id="gross" />
                  <Label htmlFor="gross" className="font-normal">Add to Gross Pay</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="separate-add" id="separate-add" />
                  <Label htmlFor="separate-add" className="font-normal">Add as Separate Line Item</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gross-deduct" id="gross-deduct" />
                  <Label htmlFor="gross-deduct" className="font-normal">Deduct from Gross</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="separate-deduct" id="separate-deduct" />
                  <Label htmlFor="separate-deduct" className="font-normal">Deduct as Separate Item</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recalculate"
              checked={recalculateTaxes}
              onCheckedChange={(checked) => setRecalculateTaxes(checked as boolean)}
            />
            <Label htmlFor="recalculate" className="font-normal">Recalculate Taxes</Label>
          </div>

          {amount && selectedEmployees.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Affected Employees Preview:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedEmployees.map(emp => {
                  const { addition, newGross } = calculatePreview(emp);
                  return (
                    <div key={emp.id} className="flex justify-between text-sm">
                      <span>{emp.name}:</span>
                      <span className={addition >= 0 ? "text-green-600" : "text-red-600"}>
                        {addition >= 0 ? "+" : ""}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(addition)}
                        <span className="text-muted-foreground ml-2">
                          (New Gross: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(newGross)})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!amount || !description}>
            Apply to Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

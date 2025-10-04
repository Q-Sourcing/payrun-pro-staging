import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Benefit {
  id: string;
  name: string;
  benefit_type: string;
  cost: number;
  cost_type: string;
}

interface ApplyBenefitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  currency: string;
  onApply: (benefits: Benefit[]) => void;
}

export const ApplyBenefitsDialog = ({ open, onOpenChange, employeeCount, currency, onApply }: ApplyBenefitsDialogProps) => {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [applicationScope, setApplicationScope] = useState<"all" | "department" | "individual" | "type">("all");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchBenefits();
    }
  }, [open]);

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .order("name");

      if (error) throw error;
      setBenefits(data || []);
    } catch (error) {
      console.error("Error fetching benefits:", error);
      toast({
        title: "Error",
        description: "Failed to load benefits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBenefit = (benefitId: string) => {
    setSelectedBenefits(prev =>
      prev.includes(benefitId)
        ? prev.filter(id => id !== benefitId)
        : [...prev, benefitId]
    );
  };

  const calculateTotalCost = () => {
    const selected = benefits.filter(b => selectedBenefits.includes(b.id));
    const fixedCosts = selected.filter(b => b.cost_type === 'fixed').reduce((sum, b) => sum + b.cost, 0);
    return fixedCosts * employeeCount;
  };

  const handleApply = () => {
    const selected = benefits.filter(b => selectedBenefits.includes(b.id));
    if (selected.length === 0) {
      toast({
        title: "No benefits selected",
        description: "Please select at least one benefit to apply",
        variant: "destructive",
      });
      return;
    }

    onApply(selected);
    toast({
      title: "Benefits Applied",
      description: `Applied ${selected.length} benefit(s) to ${employeeCount} employees`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Apply Benefits Package
          </DialogTitle>
          <DialogDescription>
            Select benefits to apply to employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Available Benefits</Label>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading benefits...</div>
            ) : benefits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No benefits available. Create benefits first.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                {benefits.map((benefit) => (
                  <div
                    key={benefit.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedBenefits.includes(benefit.id)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => toggleBenefit(benefit.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{benefit.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {benefit.benefit_type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {benefit.cost_type === 'fixed' 
                          ? `${currency} ${benefit.cost.toLocaleString()}`
                          : `${benefit.cost}%`
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {benefit.cost_type === 'fixed' ? 'per employee' : 'of salary'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label>Application Scope</Label>
            <RadioGroup value={applicationScope} onValueChange={(value: any) => setApplicationScope(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal">
                  All Employees ({employeeCount})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="department" />
                <Label htmlFor="department" className="font-normal">
                  Selected Departments
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="font-normal">
                  Individual Selection
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="type" id="type" />
                <Label htmlFor="type" className="font-normal">
                  By Employee Type (Local/Expatriate)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {selectedBenefits.length > 0 && (
            <Card className="p-4 bg-muted">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Selected Benefits:</span>
                  <span className="font-semibold">{selectedBenefits.length} benefit(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Affected Employees:</span>
                  <span className="font-semibold">{employeeCount} employees</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated Total Cost:</span>
                  <span className="font-semibold text-green-600">
                    {currency} {calculateTotalCost().toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedBenefits.length === 0}>
            Apply Benefits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

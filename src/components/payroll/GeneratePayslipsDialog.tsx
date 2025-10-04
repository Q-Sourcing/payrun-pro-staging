import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { FileText, Mail, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratePayslipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  payRunId: string;
}

export const GeneratePayslipsDialog = ({ open, onOpenChange, employeeCount, payRunId }: GeneratePayslipsDialogProps) => {
  const [formatType, setFormatType] = useState<"individual" | "combined" | "email" | "print">("individual");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [includeYTD, setIncludeYTD] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setGenerating(true);
    
    // Simulate generation
    setTimeout(() => {
      setGenerating(false);
      toast({
        title: "Payslips Generated",
        description: `Successfully generated ${employeeCount} payslips`,
      });
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Employee Payslips
          </DialogTitle>
          <DialogDescription>
            Create professional payslips for {employeeCount} employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Format Options</Label>
            <RadioGroup value={formatType} onValueChange={(value: any) => setFormatType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="font-normal flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Individual PDF Files
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="combined" />
                <Label htmlFor="combined" className="font-normal flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Combined PDF Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="font-normal flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email to Employees
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="print" id="print" />
                <Label htmlFor="print" className="font-normal flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print Hard Copies
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Payslip Details</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-logo"
                  checked={includeLogo}
                  onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
                />
                <Label htmlFor="include-logo" className="font-normal">
                  Include company logo and details
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-breakdown"
                  checked={includeBreakdown}
                  onCheckedChange={(checked) => setIncludeBreakdown(checked as boolean)}
                />
                <Label htmlFor="include-breakdown" className="font-normal">
                  Show detailed deduction breakdown
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-ytd"
                  checked={includeYTD}
                  onCheckedChange={(checked) => setIncludeYTD(checked as boolean)}
                />
                <Label htmlFor="include-ytd" className="font-normal">
                  Include year-to-date totals
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-signature"
                  checked={includeSignature}
                  onCheckedChange={(checked) => setIncludeSignature(checked as boolean)}
                />
                <Label htmlFor="include-signature" className="font-normal">
                  Add digital signature
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="password-protect"
                  checked={passwordProtect}
                  onCheckedChange={(checked) => setPasswordProtect(checked as boolean)}
                />
                <Label htmlFor="password-protect" className="font-normal">
                  Password protect sensitive payslips
                </Label>
              </div>
            </div>
          </div>

          <Card className="p-4 bg-muted">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Employees:</span>
                <span className="font-semibold">All {employeeCount} employees selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Estimated Processing Time:</span>
                <span className="font-semibold">15-20 seconds</span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate Payslips"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

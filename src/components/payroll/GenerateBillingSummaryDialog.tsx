import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { FileText, FileSpreadsheet, Code, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenerateBillingSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payRunId: string;
}

export const GenerateBillingSummaryDialog = ({ open, onOpenChange, payRunId }: GenerateBillingSummaryDialogProps) => {
  const [reportType, setReportType] = useState<"comprehensive" | "employer" | "tax" | "department">("comprehensive");
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "csv" | "html">("pdf");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(true);
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [includeContributions, setIncludeContributions] = useState(true);
  const [includeTaxSummary, setIncludeTaxSummary] = useState(true);
  const [includeDepartmental, setIncludeDepartmental] = useState(true);
  const [includePaymentInstructions, setIncludePaymentInstructions] = useState(true);
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [includeComparative, setIncludeComparative] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeSignatures, setIncludeSignatures] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setGenerating(true);
    
    setTimeout(() => {
      setGenerating(false);
      toast({
        title: "Billing Summary Generated",
        description: `Successfully generated ${reportType} billing summary in ${exportFormat.toUpperCase()} format`,
      });
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Billing Summary
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive payroll billing and compliance report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Report Type</Label>
            <RadioGroup value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="comprehensive" id="comprehensive" />
                <Label htmlFor="comprehensive" className="font-normal">
                  Comprehensive Billing Summary
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employer" id="employer" />
                <Label htmlFor="employer" className="font-normal">
                  Employer Contributions Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tax" id="tax" />
                <Label htmlFor="tax" className="font-normal">
                  Tax Compliance Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="department" />
                <Label htmlFor="department" className="font-normal">
                  Departmental Cost Analysis
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Content Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="logo"
                  checked={includeLogo}
                  onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
                />
                <Label htmlFor="logo" className="font-normal">
                  Company logo and branding
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="executive"
                  checked={includeExecutiveSummary}
                  onCheckedChange={(checked) => setIncludeExecutiveSummary(checked as boolean)}
                />
                <Label htmlFor="executive" className="font-normal">
                  Executive summary
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="breakdown"
                  checked={includeBreakdown}
                  onCheckedChange={(checked) => setIncludeBreakdown(checked as boolean)}
                />
                <Label htmlFor="breakdown" className="font-normal">
                  Detailed employee breakdown
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contributions"
                  checked={includeContributions}
                  onCheckedChange={(checked) => setIncludeContributions(checked as boolean)}
                />
                <Label htmlFor="contributions" className="font-normal">
                  Employer contributions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tax-summary"
                  checked={includeTaxSummary}
                  onCheckedChange={(checked) => setIncludeTaxSummary(checked as boolean)}
                />
                <Label htmlFor="tax-summary" className="font-normal">
                  Tax deduction summaries
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="departmental"
                  checked={includeDepartmental}
                  onCheckedChange={(checked) => setIncludeDepartmental(checked as boolean)}
                />
                <Label htmlFor="departmental" className="font-normal">
                  Department/project costing
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="payment"
                  checked={includePaymentInstructions}
                  onCheckedChange={(checked) => setIncludePaymentInstructions(checked as boolean)}
                />
                <Label htmlFor="payment" className="font-normal">
                  Payment instructions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compliance"
                  checked={includeCompliance}
                  onCheckedChange={(checked) => setIncludeCompliance(checked as boolean)}
                />
                <Label htmlFor="compliance" className="font-normal">
                  Compliance statements
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Export Formats</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  PDF (Professional)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (XLSX) - Editable
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  CSV - Raw Data
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="font-normal flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  HTML - Web View
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Additional Features</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comparative"
                  checked={includeComparative}
                  onCheckedChange={(checked) => setIncludeComparative(checked as boolean)}
                />
                <Label htmlFor="comparative" className="font-normal">
                  Include comparative analysis (vs last period)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={includeNotes}
                  onCheckedChange={(checked) => setIncludeNotes(checked as boolean)}
                />
                <Label htmlFor="notes" className="font-normal">
                  Add management notes section
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signatures"
                  checked={includeSignatures}
                  onCheckedChange={(checked) => setIncludeSignatures(checked as boolean)}
                />
                <Label htmlFor="signatures" className="font-normal">
                  Include approval signatures
                </Label>
              </div>
            </div>
          </div>

          <Card className="p-4 bg-muted">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Report Type:</span>
                <span className="font-semibold capitalize">{reportType} Billing Summary</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Export Format:</span>
                <span className="font-semibold uppercase">{exportFormat}</span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate Summary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

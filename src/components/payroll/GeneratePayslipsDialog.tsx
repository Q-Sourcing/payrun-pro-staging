import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import { FileText, Mail, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    
    try {
      const { data: payRunData, error: payRunError } = await supabase
        .from("pay_runs")
        .select(`
          *,
          pay_groups(name, country),
          pay_items(
            *,
            employees(
              first_name,
              middle_name,
              last_name,
              email,
              pay_type,
              pay_rate,
              department
            )
          )
        `)
        .eq("id", payRunId)
        .single();

      if (payRunError) throw payRunError;

      const currency = getCurrencyCodeFromCountry(payRunData.pay_groups.country);

      if (formatType === "email" || formatType === "print") {
        toast({
          title: "Action not implemented yet",
          description: "Email and print workflows will be added soon. Generated a downloadable PDF instead.",
        });
      }

      generatePayslipsPDFCombined(payRunData, currency);

      toast({
        title: "Payslips Generated",
        description: `Successfully generated ${employeeCount} payslips as PDF`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating payslips:", error);
      toast({
        title: "Error",
        description: "Failed to generate payslips",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePayslipsCSV = (payRun: any, currency: string) => {
    const lines: string[] = [];
    
    lines.push("EMPLOYEE PAYSLIPS");
    lines.push(`Pay Run Date: ${format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')}`);
    lines.push(`Pay Period: ${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`);
    lines.push("");
    
    lines.push("Employee Name,Email,Department,Pay Type,Gross Pay,Tax Deductions,Total Deductions,Net Pay");
    
    payRun.pay_items.forEach((item: any) => {
      const fullName = [
        item.employees.first_name,
        item.employees.middle_name,
        item.employees.last_name
      ].filter(Boolean).join(' ');
      
      lines.push([
        fullName,
        item.employees.email,
        item.employees.department || 'N/A',
        item.employees.pay_type,
        `${currency} ${item.gross_pay.toLocaleString()}`,
        `${currency} ${item.tax_deduction.toLocaleString()}`,
        `${currency} ${item.total_deductions.toLocaleString()}`,
        `${currency} ${item.net_pay.toLocaleString()}`
      ].join(','));
    });
    
    return lines.join('\n');
  };

  const generatePayslipsPDFCombined = (payRun: any, currency: string) => {
    const doc = new jsPDF();
    const payDate = format(new Date(payRun.pay_run_date), 'MMM dd, yyyy');
    const period = `${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`;

    (payRun.pay_items || []).forEach((item: any, idx: number) => {
      if (idx > 0) doc.addPage();
      const fullName = [item.employees.first_name, item.employees.middle_name, item.employees.last_name].filter(Boolean).join(' ');

      let y = 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('EMPLOYEE PAYSLIP', 105, y, { align: 'center' });
      y += 8;

      doc.setFontSize(11);
      doc.text(fullName, 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Email: ${item.employees.email || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Department: ${item.employees.department || 'N/A'}  •  Pay Type: ${item.employees.pay_type}`, 20, y);
      y += 8;

      doc.text(`Pay Run Date: ${payDate}`, 20, y);
      y += 5;
      doc.text(`Pay Period: ${period}`, 20, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount']],
        body: [
          ['Gross Pay', `${currency} ${Number(item.gross_pay || 0).toLocaleString()}`],
          ['Tax Deductions', `${currency} ${Number(item.tax_deduction || 0).toLocaleString()}`],
          ['Other Deductions', `${currency} ${Number(item.benefit_deductions || 0).toLocaleString()}`],
          ['Total Deductions', `${currency} ${Number(item.total_deductions || 0).toLocaleString()}`],
          ['Net Pay', `${currency} ${Number(item.net_pay || 0).toLocaleString()}`],
        ],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [51, 102, 204] },
      });

      const nextY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('This payslip is confidential and intended for the recipient only.', 105, nextY, { align: 'center' });
    });

    doc.save(`payslips-${format(new Date(payRun.pay_run_date), 'yyyy-MM-dd')}.pdf`);
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

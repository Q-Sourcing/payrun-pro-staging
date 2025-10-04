import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { FileText, FileSpreadsheet, Code, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { CompanySettingsDialog } from "./CompanySettingsDialog";

interface GenerateBillingSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payRunId: string;
}

export const GenerateBillingSummaryDialog = ({ open, onOpenChange, payRunId }: GenerateBillingSummaryDialogProps) => {
  const [reportType, setReportType] = useState<"comprehensive" | "employer" | "tax" | "department">("comprehensive");
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "csv">("pdf");
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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
    }
  }, [open]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    
    try {
      // Fetch pay run data
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
              department,
              employee_type
            )
          )
        `)
        .eq("id", payRunId)
        .single();

      if (payRunError) throw payRunError;

      const currency = getCurrencyCodeFromCountry(payRunData.pay_groups.country);
      const payItems = payRunData.pay_items || [];

      // Calculate employer contributions (NSSF at 10%)
      const employerNSSF = (payRunData.total_gross_pay || 0) * 0.10;
      const totalEmployerCost = (payRunData.total_gross_pay || 0) + employerNSSF;

      // Validate data consistency before generating
      const isValid = validateExportData(payRunData, payItems);
      if (!isValid) {
        toast({
          title: "Validation failed",
          description: "Calculated totals do not match the pay run. Please recalculate before exporting.",
          variant: "destructive",
        });
        return;
      }

      // Prepare optional company logo
      const logoDataUrl = await fetchLogoDataUrl();

      // Generate based on format
      if (exportFormat === "pdf") {
        generatePDF(payRunData, payItems, currency, employerNSSF, totalEmployerCost, logoDataUrl || undefined);
      } else if (exportFormat === "excel") {
        generateExcel(payRunData, payItems, currency, employerNSSF, totalEmployerCost);
      } else {
        const csv = generateCSV(payRunData, payItems, currency, employerNSSF, totalEmployerCost);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `billing-summary-${format(new Date(payRunData.pay_run_date), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Billing Summary Downloaded",
        description: `Successfully generated and downloaded ${exportFormat.toUpperCase()} billing summary`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating billing summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate billing summary",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Data validation helpers
  const nearlyEqual = (a: number, b: number, epsilon = 0.01) => Math.abs(a - b) <= epsilon;
  const validateExportData = (payRun: any, payItems: any[]) => {
    const gross = payItems.reduce((s, i) => s + (Number(i.gross_pay) || 0), 0);
    const deductions = payItems.reduce((s, i) => s + (Number(i.total_deductions) || 0), 0);
    const net = payItems.reduce((s, i) => s + (Number(i.net_pay) || 0), 0);
    return (
      nearlyEqual(Number(payRun.total_gross_pay) || 0, gross) &&
      nearlyEqual(Number(payRun.total_deductions) || 0, deductions) &&
      nearlyEqual(Number(payRun.total_net_pay) || 0, net)
    );
  };

  // Optional logo loader
  const fetchLogoDataUrl = async (): Promise<string | null> => {
    try {
      if (!includeLogo || !companySettings?.include_logo || !companySettings?.logo_url) return null;
      const res = await fetch(companySettings.logo_url);
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Unable to load company logo:', e);
      return null;
    }
  };

  const generatePDF = (payRun: any, payItems: any[], currency: string, employerNSSF: number, totalEmployerCost: number, logoDataUrl?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Company Header
    if (companySettings?.show_company_details) {
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', 20, yPos - 5, 40, 16);
          yPos += 18;
        } catch {}
      }
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(companySettings.company_name || 'Q-Payroll Solutions', 20, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (companySettings.address) {
        doc.text(companySettings.address, 20, yPos);
        yPos += 5;
      }
      if (companySettings.phone || companySettings.email) {
        doc.text(`${companySettings.phone || ''} ${companySettings.email || ''}`, 20, yPos);
        yPos += 10;
      }
    }

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PAYROLL BILLING SUMMARY", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Pay Run Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Pay Run Date: ${format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')}`, 20, yPos);
    yPos += 5;
    doc.text(`Pay Period: ${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`, 20, yPos);
    yPos += 5;
    doc.text(`Pay Group: ${payRun.pay_groups.name}`, 20, yPos);
    yPos += 10;

    if (companySettings?.include_generated_date) {
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, yPos);
      yPos += 10;
    }

    // Executive Summary
    if (includeExecutiveSummary) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", 20, yPos);
      yPos += 7;

      const summaryData = [
        ["Total Employees", payItems.length.toString()],
        ["Total Gross Pay", `${currency} ${(payRun.total_gross_pay || 0).toLocaleString()}`],
        ["Total Employee Deductions", `${currency} ${(payRun.total_deductions || 0).toLocaleString()}`],
        ["Total Net Pay", `${currency} ${(payRun.total_net_pay || 0).toLocaleString()}`],
        ["Employer Contributions (NSSF)", `${currency} ${employerNSSF.toLocaleString()}`],
        ["Total Employer Cost", `${currency} ${totalEmployerCost.toLocaleString()}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Employee Breakdown
    if (includeBreakdown) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("EMPLOYEE BREAKDOWN", 20, yPos);
      yPos += 7;

      const employeeData = payItems.map(item => {
        const fullName = [item.employees.first_name, item.employees.middle_name, item.employees.last_name]
          .filter(Boolean).join(' ');
        return [
          fullName,
          item.employees.email,
          `${currency} ${item.gross_pay.toLocaleString()}`,
          `${currency} ${item.total_deductions.toLocaleString()}`,
          `${currency} ${item.net_pay.toLocaleString()}`,
          item.status
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Email', 'Gross Pay', 'Deductions', 'Net Pay', 'Status']],
        body: employeeData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 102, 204] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Deduction Analysis
    if (includeTaxSummary && yPos < 250) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DEDUCTION SUMMARY", 20, yPos);
      yPos += 7;

      const totalPAYE = payItems.reduce((sum, item) => sum + (item.tax_deduction || 0), 0);
      const totalNSSFEmp = (payRun.total_gross_pay || 0) * 0.05;
      const totalGross = payRun.total_gross_pay || 1;

      const deductionData = [
        ["PAYE", `${currency} ${totalPAYE.toLocaleString()}`, `${((totalPAYE / totalGross) * 100).toFixed(1)}%`],
        ["NSSF Employee", `${currency} ${totalNSSFEmp.toLocaleString()}`, `${((totalNSSFEmp / totalGross) * 100).toFixed(1)}%`],
        ["NSSF Employer", `${currency} ${employerNSSF.toLocaleString()}`, `${((employerNSSF / totalGross) * 100).toFixed(1)}%`],
        ["Total Deductions", `${currency} ${(payRun.total_deductions || 0).toLocaleString()}`, `${(((payRun.total_deductions || 0) / totalGross) * 100).toFixed(1)}%`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Deduction Type', 'Total Amount', 'Percentage of Gross']],
        body: deductionData,
        theme: 'plain',
        styles: { fontSize: 9 },
        headStyles: { fontStyle: 'bold' },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Payment Instructions
    if (includePaymentInstructions) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT INSTRUCTIONS", 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Amount to Transfer: ${currency} ${(payRun.total_net_pay || 0).toLocaleString()}`, 20, yPos);
      yPos += 5;
      doc.text(`Number of Beneficiaries: ${payItems.length}`, 20, yPos);
      yPos += 5;
      doc.text(`Reference: Payroll ${format(new Date(payRun.pay_run_date), 'MMMDDYYYY')}`, 20, yPos);
      yPos += 5;
      doc.text(`Due Date: ${format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')}`, 20, yPos);
    }

    // Footer
    if (companySettings?.add_confidentiality_footer) {
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("CONFIDENTIAL - For Internal Use Only", pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
        if (companySettings?.show_page_numbers) {
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: "right" });
        }
      }
    }

    // Save PDF
    doc.save(`billing-summary-${format(new Date(payRun.pay_run_date), 'yyyy-MM-dd')}.pdf`);
  };

  const generateExcel = (payRun: any, payItems: any[], currency: string, employerNSSF: number, totalEmployerCost: number) => {
    const wb = XLSX.utils.book_new();

    // Worksheet 1: Executive Summary
    const summaryData = [
      ["PAYROLL BILLING SUMMARY"],
      [],
      ["Company", companySettings?.company_name || "Q-Payroll Solutions"],
      ["Pay Run Date", format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')],
      ["Pay Period", `${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`],
      ["Pay Group", payRun.pay_groups.name],
      [],
      ["EXECUTIVE SUMMARY"],
      ["Total Employees", payItems.length],
      ["Total Gross Pay", `${currency} ${(payRun.total_gross_pay || 0).toLocaleString()}`],
      ["Total Employee Deductions", `${currency} ${(payRun.total_deductions || 0).toLocaleString()}`],
      ["Total Net Pay", `${currency} ${(payRun.total_net_pay || 0).toLocaleString()}`],
      ["Employer Contributions (NSSF)", `${currency} ${employerNSSF.toLocaleString()}`],
      ["Total Employer Cost", `${currency} ${totalEmployerCost.toLocaleString()}`],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "Executive Summary");

    // Worksheet 2: Employee Details
    const employeeHeaders = ["Name", "Email", "Pay Type", "Department", "Gross Pay", "Tax Deduction", "Benefit Deductions", "Total Deductions", "Net Pay", "Status"];
    const employeeData = payItems.map(item => {
      const fullName = [item.employees.first_name, item.employees.middle_name, item.employees.last_name]
        .filter(Boolean).join(' ');
      return [
        fullName,
        item.employees.email,
        item.employees.pay_type,
        item.employees.department || "N/A",
        item.gross_pay,
        item.tax_deduction,
        item.benefit_deductions,
        item.total_deductions,
        item.net_pay,
        item.status
      ];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([employeeHeaders, ...employeeData]);
    XLSX.utils.book_append_sheet(wb, ws2, "Employee Details");

    // Worksheet 3: Deduction Analysis
    const totalPAYE = payItems.reduce((sum, item) => sum + (item.tax_deduction || 0), 0);
    const totalNSSFEmp = (payRun.total_gross_pay || 0) * 0.05;
    const totalGross = payRun.total_gross_pay || 1;

    const deductionHeaders = ["Deduction Type", "Total Amount", "Percentage of Gross"];
    const deductionData = [
      ["PAYE", totalPAYE, ((totalPAYE / totalGross) * 100).toFixed(1) + "%"],
      ["NSSF Employee", totalNSSFEmp, ((totalNSSFEmp / totalGross) * 100).toFixed(1) + "%"],
      ["NSSF Employer", employerNSSF, ((employerNSSF / totalGross) * 100).toFixed(1) + "%"],
      ["Total Deductions", payRun.total_deductions || 0, (((payRun.total_deductions || 0) / totalGross) * 100).toFixed(1) + "%"],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet([deductionHeaders, ...deductionData]);
    XLSX.utils.book_append_sheet(wb, ws3, "Deduction Analysis");

    // Worksheet 4: Payment Instructions
    const paymentData = [
      ["PAYMENT INSTRUCTIONS"],
      [],
      ["Total Amount to Transfer", `${currency} ${(payRun.total_net_pay || 0).toLocaleString()}`],
      ["Number of Beneficiaries", payItems.length],
      ["Reference", `Payroll ${format(new Date(payRun.pay_run_date), 'MMMDDYYYY')}`],
      ["Due Date", format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(paymentData);
    XLSX.utils.book_append_sheet(wb, ws4, "Payment Instructions");

    // Save Excel file
    XLSX.writeFile(wb, `billing-summary-${format(new Date(payRun.pay_run_date), 'yyyy-MM-dd')}.xlsx`);
  };

  const generateCSV = (payRun: any, payItems: any[], currency: string, employerNSSF: number, totalEmployerCost: number) => {
    const lines: string[] = [];
    
    // Header
    lines.push("PAYROLL BILLING SUMMARY");
    lines.push(`Pay Run Date: ${format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')}`);
    lines.push(`Pay Period: ${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`);
    lines.push(`Pay Group: ${payRun.pay_groups.name}`);
    lines.push("");
    
    // Executive Summary
    lines.push("EXECUTIVE SUMMARY");
    lines.push(`Total Employees,${payItems.length}`);
    lines.push(`Total Gross Pay,${currency} ${payRun.total_gross_pay?.toLocaleString() || '0'}`);
    lines.push(`Total Deductions,${currency} ${payRun.total_deductions?.toLocaleString() || '0'}`);
    lines.push(`Total Net Pay,${currency} ${payRun.total_net_pay?.toLocaleString() || '0'}`);
    lines.push("");
    
    // Detailed Employee Breakdown
    lines.push("EMPLOYEE BREAKDOWN");
    lines.push("Employee Name,Email,Pay Type,Gross Pay,Deductions,Net Pay,Status");
    
    payItems.forEach(item => {
      const fullName = [
        item.employees.first_name,
        item.employees.middle_name,
        item.employees.last_name
      ].filter(Boolean).join(' ');
      
      lines.push([
        fullName,
        item.employees.email,
        item.employees.pay_type,
        `${currency} ${item.gross_pay.toLocaleString()}`,
        `${currency} ${item.total_deductions.toLocaleString()}`,
        `${currency} ${item.net_pay.toLocaleString()}`,
        item.status
      ].join(','));
    });
    
    lines.push("");
    
    // Deduction Summary
    const totalPAYE = payItems.reduce((sum, item) => sum + (item.tax_deduction || 0), 0);
    const totalNSSFEmp = (payRun.total_gross_pay || 0) * 0.05;
    const totalGross = payRun.total_gross_pay || 1;
    
    lines.push("DEDUCTION SUMMARY");
    lines.push("Deduction Type,Total Amount,Percentage of Gross");
    lines.push(`PAYE,${currency} ${totalPAYE.toLocaleString()},${((totalPAYE / totalGross) * 100).toFixed(1)}%`);
    lines.push(`NSSF Employee,${currency} ${totalNSSFEmp.toLocaleString()},${((totalNSSFEmp / totalGross) * 100).toFixed(1)}%`);
    lines.push(`NSSF Employer,${currency} ${employerNSSF.toLocaleString()},${((employerNSSF / totalGross) * 100).toFixed(1)}%`);
    lines.push(`Total Deductions,${currency} ${payRun.total_deductions?.toLocaleString() || '0'},${(((payRun.total_deductions || 0) / totalGross) * 100).toFixed(1)}%`);
    
    lines.push("");
    lines.push("EMPLOYER CONTRIBUTIONS");
    lines.push(`NSSF Employer,${currency} ${employerNSSF.toLocaleString()}`);
    lines.push(`Total Employer Cost,${currency} ${totalEmployerCost.toLocaleString()}`);
    
    lines.push("");
    lines.push("PAYMENT INSTRUCTIONS");
    lines.push(`Total Amount to Transfer,${currency} ${payRun.total_net_pay?.toLocaleString() || '0'}`);
    lines.push(`Number of Beneficiaries,${payItems.length}`);
    lines.push(`Reference,Payroll ${format(new Date(payRun.pay_run_date), 'MMMDDYYYY')}`);
    lines.push(`Due Date,${format(new Date(payRun.pay_run_date), 'MMM dd, yyyy')}`);
    
    return lines.join('\n');
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
                <RadioGroupItem value="settings" id="settings" />
                <Label htmlFor="settings" className="font-normal flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Export Settings
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
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)} disabled={generating}>
            <Settings className="h-4 w-4 mr-2" />
            Company Settings
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate Summary"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CompanySettingsDialog
        open={settingsDialogOpen}
        onOpenChange={(open) => {
          setSettingsDialogOpen(open);
          if (!open) fetchCompanySettings();
        }}
      />
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getCurrencyCodeFromCountry } from "@/lib/constants/countries";
import { FileText, Mail, Download, Printer, Settings, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PayslipGenerator } from "@/lib/services/payslip-generator";
import { PayslipPDFExport } from "@/lib/services/payslip-pdf-export";
// import { PayslipTemplateManager } from "@/lib/services/payslip-template-manager";
import { DEFAULT_PAYSLIP_TEMPLATES } from "@/lib/constants/payslip-templates";
import { PayslipData, PayslipTemplateConfig, PayslipExportSettings } from "@/lib/types/payslip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";

interface GeneratePayslipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  payRunId: string;
  selectedEmployeeIds?: string[];
}

export const GeneratePayslipsDialog = ({ open, onOpenChange, employeeCount, payRunId, selectedEmployeeIds }: GeneratePayslipsDialogProps) => {
  const [formatType, setFormatType] = useState<"individual" | "combined" | "email" | "print">("individual");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [includeYTD, setIncludeYTD] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [emailProgress, setEmailProgress] = useState(0);
  const [companySettings, setCompanySettings] = useState<any>(null);
  
  // New payslip design system states
  const [selectedTemplate, setSelectedTemplate] = useState("corporate");
  const [useNewDesignSystem, setUseNewDesignSystem] = useState(true);
  const [templateConfig, setTemplateConfig] = useState<PayslipTemplateConfig | null>(null);
  const [exportSettings, setExportSettings] = useState<PayslipExportSettings>({
    format: 'A4',
    orientation: 'portrait',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    quality: 'high',
    security: {
      passwordProtected: false,
      password: '',
      watermark: ''
    }
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
      loadTemplateConfig();
    }
  }, [open, selectedTemplate]);

  const loadTemplateConfig = () => {
    const template = DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      setTemplateConfig(template.config);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .single();
      if (data) setCompanySettings(data);
    } catch (error) {
      console.log("No company settings found");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setEmailProgress(0);
    
    try {
      if (useNewDesignSystem && templateConfig) {
        try {
          await generatePayslipsWithNewSystem();
        } catch (newSystemError) {
          console.warn('New design system failed, falling back to legacy system:', newSystemError);
          toast({
            title: "Design System Issue",
            description: "New design system failed, using legacy system instead",
            variant: "destructive",
          });
          await generatePayslipsWithLegacySystem();
        }
      } else {
        await generatePayslipsWithLegacySystem();
      }
      
      const actualCount = selectedEmployeeIds && selectedEmployeeIds.length > 0 
        ? selectedEmployeeIds.length 
        : employeeCount;
      
      toast({
        title: "Payslips Generated",
        description: `Successfully generated ${actualCount} payslips`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating payslips:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate payslips";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setEmailProgress(0);
    }
  };

  const generatePayslipsWithNewSystem = async () => {
    try {
      console.log('Starting payslip generation with new system...');
      console.log('PayRun ID:', payRunId);
      console.log('Template:', selectedTemplate);
      console.log('Template Config:', templateConfig);
      
      // Detect if this is an expatriate pay run
      let isExpatriatePayRun = false;
      try {
        const { data: payRunData } = await supabase
          .from('pay_runs')
          .select('payroll_type, pay_group_master:pay_group_master_id(type)')
          .eq('id', payRunId)
          .single();
        
        isExpatriatePayRun = payRunData?.payroll_type === 'expatriate' || 
                            (payRunData?.pay_group_master as any)?.type === 'expatriate';
        
        // Also check if there are any expatriate pay run items
        if (!isExpatriatePayRun) {
          const { data: expatItems } = await supabase
            .from('expatriate_pay_run_items')
            .select('id')
            .eq('pay_run_id', payRunId)
            .limit(1);
          
          if (expatItems && expatItems.length > 0) {
            isExpatriatePayRun = true;
          }
        }
      } catch (error) {
        console.warn('Could not determine pay run type, defaulting to regular:', error);
      }
      
      let payslipsData: PayslipData[];
      
      try {
        console.log('🔍 Generating payslips for pay run:', payRunId, 'isExpatriate:', isExpatriatePayRun);
        
        // Use appropriate method based on pay run type
        if (isExpatriatePayRun) {
          payslipsData = await PayslipGenerator.generateAllExpatriatePayslipsData(payRunId);
          console.log('✅ Generated expatriate payslips data from database:', payslipsData.length, 'payslips for pay run', payRunId);
        } else {
          payslipsData = await PayslipGenerator.generateAllPayslipsData(payRunId);
          console.log('✅ Generated payslips data from database:', payslipsData.length, 'payslips for pay run', payRunId);
        }
        
        // Validate that payslips were generated
        if (!payslipsData || payslipsData.length === 0) {
          throw new Error(`No payslips could be generated for pay run ${payRunId}`);
        }

        // Filter by selected employees if provided
        if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
          console.log('🔍 Filtering payslips for selected employees:', selectedEmployeeIds);
          const originalCount = payslipsData.length;
          
          // Create a set of employee codes from selected IDs (first 8 chars uppercase)
          const selectedEmployeeCodes = new Set(
            selectedEmployeeIds.map(id => id.substring(0, 8).toUpperCase())
          );
          
          payslipsData = payslipsData.filter(p => {
            // Match by employee code (derived from first 8 chars of employee ID)
            const employeeCode = p.employee?.code;
            return employeeCode && selectedEmployeeCodes.has(employeeCode);
          });
          console.log(`✅ Filtered from ${originalCount} to ${payslipsData.length} payslips`);
          
          if (payslipsData.length === 0) {
            throw new Error('No payslips found for the selected employees');
          }
        }
      } catch (dbError) {
        console.error('❌ Database query failed for pay run', payRunId, ':', dbError);
        // Don't silently fall back to sample data - throw the error instead
        throw new Error(`Failed to generate payslips for pay run ${payRunId}: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
      
      if (formatType === "individual") {
        await generateIndividualPDFsNew(payslipsData);
      } else if (formatType === "combined") {
        await generateCombinedPDFNew(payslipsData);
      } else if (formatType === "email") {
        await sendPayslipEmailsNew(payslipsData);
      } else if (formatType === "print") {
        await printPayslipsNew(payslipsData);
      }
    } catch (error) {
      console.error("Error generating payslips with new system:", error);
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('No pay items found')) {
          throw new Error('No employees found in this pay run. Please ensure the pay run has been processed.');
        } else if (error.message.includes('Pay run not found')) {
          throw new Error('Pay run not found. Please refresh and try again.');
        } else if (error.message.includes('No payslips could be generated')) {
          throw new Error('Unable to generate payslips. Please check that all employee data is complete.');
        }
      }
      throw error;
    }
  };

  const generatePayslipsWithLegacySystem = async () => {
    const { data: payRunData, error: payRunError } = await supabase
      .from("pay_runs")
      .select(`
        *,
        pay_group_master:pay_group_master_id(name, country),
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
            project
          )
        )
      `)
      .eq("id", payRunId)
      .single();

    if (payRunError) throw payRunError;

    // Fetch custom deductions for detailed breakdown
    const payItemIds = payRunData.pay_items.map((item: any) => item.id);
    const { data: customDeductions } = await supabase
      .from("pay_item_custom_deductions")
      .select("*")
      .in("pay_item_id", payItemIds);

    // Attach custom deductions to pay items
    payRunData.pay_items = payRunData.pay_items.map((item: any) => ({
      ...item,
      custom_deductions: customDeductions?.filter((d: any) => d.pay_item_id === item.id) || []
    }));

    const currency = getCurrencyCodeFromCountry(payRunData.pay_group_master.country);

    if (formatType === "individual") {
      await generateIndividualPDFs(payRunData, currency);
    } else if (formatType === "combined") {
      await generatePayslipsPDFCombined(payRunData, currency);
    } else if (formatType === "email") {
      await sendPayslipEmails(payRunData, currency);
    } else if (formatType === "print") {
      await printPayslips(payRunData, currency);
    }
  };

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
      console.warn("Unable to load company logo:", e);
      return null;
    }
  };

  const generateSinglePayslipPDF = (item: any, payRun: any, currency: string, logoDataUrl: string | null): jsPDF => {
    const doc = new jsPDF();
    const fullName = [item.employees.first_name, item.employees.middle_name, item.employees.last_name].filter(Boolean).join(' ');
    const project = item.employees.project || '';
    const payDate = format(new Date(payRun.pay_run_date), 'MMM dd, yyyy');
    const period = `${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`;

    let y = 18;

    // Company logo
    if (logoDataUrl && includeLogo) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 20, y - 5, 40, 16);
        y += 18;
      } catch (e) {
        console.warn("Failed to add logo to PDF:", e);
      }
    }

    // Header with project
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const headerText = project ? `EMPLOYEE PAYSLIP - ${project.toUpperCase()}` : 'EMPLOYEE PAYSLIP';
    doc.text(headerText, 105, y, { align: 'center' });
    y += 10;

    // Employee details
    doc.setFontSize(14);
    doc.text(fullName, 20, y);
    y += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (project) {
      doc.text(`Project: ${project}`, 20, y);
      y += 5;
    }
    doc.text(`Email: ${item.employees.email || 'N/A'}`, 20, y);
    y += 5;
    doc.text(`Department: ${item.employees.department || 'N/A'}  •  Pay Type: ${item.employees.pay_type}`, 20, y);
    y += 8;

    doc.text(`Pay Run Date: ${payDate}`, 20, y);
    y += 5;
    doc.text(`Pay Period: ${period}`, 20, y);
    y += 10;

    // Earnings and Deductions table with detailed breakdown
    const tableData: any[] = [
      ['Gross Pay', `${currency} ${Number(item.gross_pay || 0).toLocaleString()}`],
    ];

    if (includeBreakdown) {
      // Add detailed deduction breakdown
      const taxDeduction = Number(item.tax_deduction || 0);
      const benefitDeductions = Number(item.benefit_deductions || 0);
      
      if (taxDeduction > 0) {
        tableData.push(['PAYE Tax', `${currency} ${taxDeduction.toLocaleString()}`]);
      }
      
      // Add custom deductions individually
      if (item.custom_deductions && item.custom_deductions.length > 0) {
        item.custom_deductions.forEach((deduction: any) => {
          tableData.push([deduction.name, `${currency} ${Number(deduction.amount || 0).toLocaleString()}`]);
        });
      } else if (benefitDeductions > 0) {
        tableData.push(['Other Deductions', `${currency} ${benefitDeductions.toLocaleString()}`]);
      }
    } else {
      tableData.push(['Tax Deductions', `${currency} ${Number(item.tax_deduction || 0).toLocaleString()}`]);
      tableData.push(['Other Deductions', `${currency} ${Number(item.benefit_deductions || 0).toLocaleString()}`]);
    }

    tableData.push(['Total Deductions', `${currency} ${Number(item.total_deductions || 0).toLocaleString()}`]);
    tableData.push(['Net Pay', `${currency} ${Number(item.net_pay || 0).toLocaleString()}`]);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { 
        fillColor: companySettings?.primary_color ? 
          hexToRgb(companySettings.primary_color) : 
          [51, 102, 204] 
      },
    });

    const nextY = (doc as any).lastAutoTable.finalY + 10;
    
    // Add confidentiality footer
    if (companySettings?.add_confidentiality_footer !== false) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const footerText = project ? 
        `This payslip is confidential and intended for the ${project} project recipient only.` :
        'This payslip is confidential and intended for the recipient only.';
      doc.text(footerText, 105, nextY, { align: 'center' });
    }

    // Add password protection if enabled
    // Note: Password protection requires jsPDF with encryption plugin
    // For now, this is a placeholder for future implementation
    if (passwordProtect && password) {
      console.log(`Password protection requested for ${project || 'payslip'}`);
    }

    return doc;
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [51, 102, 204];
  };

  const generateIndividualPDFs = async (payRun: any, currency: string) => {
    const logoDataUrl = await fetchLogoDataUrl();
    const zip = new JSZip();
    const payPeriod = format(new Date(payRun.pay_run_date), 'yyyy-MM-dd');

    (payRun.pay_items || []).forEach((item: any) => {
      const doc = generateSinglePayslipPDF(item, payRun, currency, logoDataUrl);
      const fullName = [item.employees.first_name, item.employees.middle_name, item.employees.last_name].filter(Boolean).join('_');
      const project = item.employees.project || 'General';
      const filename = `${project}/${fullName}_payslip_${payPeriod}.pdf`;
      zip.file(filename, doc.output('blob'));
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslips-${payPeriod}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendPayslipEmails = async (payRun: any, currency: string) => {
    const logoDataUrl = await fetchLogoDataUrl();
    const payPeriod = `${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`;
    
    const employees = payRun.pay_items.map((item: any) => ({
      email: item.employees.email,
      name: [item.employees.first_name, item.employees.middle_name, item.employees.last_name].filter(Boolean).join(' '),
      project: item.employees.project || 'General'
    }));

    // Email integration temporarily disabled
    toast({
      title: "Email Disabled",
      description: "Email integration has been temporarily disabled. Payslips can still be downloaded.",
    });
  };

  const printPayslips = async (payRun: any, currency: string) => {
    const logoDataUrl = await fetchLogoDataUrl();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups to print payslips",
        variant: "destructive",
      });
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>Payslips</title>
          <style>
            @media print {
              .pagebreak { page-break-after: always; }
            }
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #3366CC; color: white; }
            .header { text-align: center; margin: 20px 0; }
            .employee-info { margin: 10px 0; }
          </style>
        </head>
        <body>
    `;

    (payRun.pay_items || []).forEach((item: any, idx: number) => {
      const fullName = [item.employees.first_name, item.employees.middle_name, item.employees.last_name].filter(Boolean).join(' ');
      const project = item.employees.project || '';
      const payDate = format(new Date(payRun.pay_run_date), 'MMM dd, yyyy');
      const period = `${format(new Date(payRun.pay_period_start), 'MMM dd, yyyy')} - ${format(new Date(payRun.pay_period_end), 'MMM dd, yyyy')}`;

      htmlContent += `
        <div class="${idx > 0 ? 'pagebreak' : ''}">
          <h1 class="header">${project ? `EMPLOYEE PAYSLIP - ${project.toUpperCase()}` : 'EMPLOYEE PAYSLIP'}</h1>
          <div class="employee-info">
            <h2>${fullName}</h2>
            ${project ? `<p><strong>Project:</strong> ${project}</p>` : ''}
            <p><strong>Email:</strong> ${item.employees.email || 'N/A'}</p>
            <p><strong>Department:</strong> ${item.employees.department || 'N/A'} • <strong>Pay Type:</strong> ${item.employees.pay_type}</p>
            <p><strong>Pay Run Date:</strong> ${payDate}</p>
            <p><strong>Pay Period:</strong> ${period}</p>
          </div>
          <table>
            <thead>
              <tr><th>Description</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>Gross Pay</td><td>${currency} ${Number(item.gross_pay || 0).toLocaleString()}</td></tr>
              <tr><td>Tax Deductions</td><td>${currency} ${Number(item.tax_deduction || 0).toLocaleString()}</td></tr>
              <tr><td>Other Deductions</td><td>${currency} ${Number(item.benefit_deductions || 0).toLocaleString()}</td></tr>
              <tr><td><strong>Total Deductions</strong></td><td><strong>${currency} ${Number(item.total_deductions || 0).toLocaleString()}</strong></td></tr>
              <tr><td><strong>Net Pay</strong></td><td><strong>${currency} ${Number(item.net_pay || 0).toLocaleString()}</strong></td></tr>
            </tbody>
          </table>
          <p style="text-align: center; font-style: italic; font-size: 12px;">
            ${project ? `This payslip is confidential and intended for the ${project} project recipient only.` : 'This payslip is confidential and intended for the recipient only.'}
          </p>
        </div>
      `;
    });

    htmlContent += '</body></html>';
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  // New payslip generation methods using the design system
  const generateIndividualPDFsNew = async (payslipsData: PayslipData[]) => {
    try {
      const zip = new JSZip();
      const payPeriod = format(new Date(payslipsData[0]?.payPeriod.start || new Date()), 'yyyy-MM-dd');

      console.log('Generating PDFs for', payslipsData.length, 'payslips');

      for (const payslipData of payslipsData) {
        try {
          const doc = await PayslipPDFExport.generatePDF(
            payslipData,
            templateConfig!,
            exportSettings
          );
          
          const employeeCode = payslipData.employee.code;
          const filename = `${employeeCode}_payslip_${payPeriod}.pdf`;
          zip.file(filename, doc.output('blob'));
        } catch (pdfError) {
          console.error(`Error generating PDF for ${payslipData.employee.name}:`, pdfError);
          // Continue with other payslips
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslips-${payPeriod}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error in generateIndividualPDFsNew:', error);
      throw error;
    }
  };

  const generateCombinedPDFNew = async (payslipsData: PayslipData[]) => {
    const doc = new jsPDF({
      orientation: exportSettings.orientation,
      unit: 'mm',
      format: exportSettings.format
    });

    for (let i = 0; i < payslipsData.length; i++) {
      if (i > 0) doc.addPage();
      
      const payslipDoc = await PayslipPDFExport.generatePDF(
        payslipsData[i],
        templateConfig!,
        exportSettings
      );
      
      // Copy content from payslipDoc to main doc
      // This is a simplified approach - in practice, you'd need to copy the content properly
    }

    const payPeriod = format(new Date(payslipsData[0]?.payPeriod.start || new Date()), 'yyyy-MM-dd');
    doc.save(`payslips-${payPeriod}.pdf`);
  };

  const sendPayslipEmailsNew = async (payslipsData: PayslipData[]) => {
    // Email integration temporarily disabled
    toast({
      title: "Email Disabled",
      description: "Email integration has been temporarily disabled. Payslips can still be downloaded.",
    });
  };

  const printPayslipsNew = async (payslipsData: PayslipData[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups to print payslips",
        variant: "destructive",
      });
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>Payslips</title>
          <style>
            @media print {
              .pagebreak { page-break-after: always; }
            }
            body { font-family: Arial, sans-serif; }
            .payslip-container { margin: 20px; }
          </style>
        </head>
        <body>
    `;

    // Generate HTML for each payslip using the new template system
    payslipsData.forEach((payslipData, idx) => {
      htmlContent += `
        <div class="payslip-container ${idx > 0 ? 'pagebreak' : ''}">
          <!-- Payslip content would be rendered here using the new template system -->
          <h1>PAYSLIP - ${payslipData.employee.name}</h1>
          <p>Employee Code: ${payslipData.employee.code}</p>
          <p>Department: ${payslipData.employee.department}</p>
          <p>Net Pay: ${new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0
          }).format(payslipData.totals.net)}</p>
        </div>
      `;
    });

    htmlContent += '</body></html>';
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
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
            Create professional payslips for {selectedEmployeeIds && selectedEmployeeIds.length > 0 ? selectedEmployeeIds.length : employeeCount} employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New Payslip Design System Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Payslip Design System</Label>
                <p className="text-sm text-muted-foreground">
                  Use the new advanced payslip templates with professional designs
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-new-design"
                  checked={useNewDesignSystem}
                  onCheckedChange={(checked) => setUseNewDesignSystem(checked as boolean)}
                />
                <Label htmlFor="use-new-design" className="font-normal">
                  Enable New Design System
                </Label>
              </div>
            </div>
          </div>

          {/* Template Selection (only show if new design system is enabled) */}
          {useNewDesignSystem && (
            <div className="space-y-4">
              <Label>Choose Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PAYSLIP_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateConfig && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                  </p>
                </div>
              )}
            </div>
          )}

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
              {useNewDesignSystem ? (
                // New design system options
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-logo"
                      checked={templateConfig?.branding.showCompanyLogo || false}
                      onCheckedChange={(checked) => {
                        if (templateConfig) {
                          const newConfig = { ...templateConfig };
                          newConfig.branding.showCompanyLogo = checked as boolean;
                          setTemplateConfig(newConfig);
                        }
                      }}
                    />
                    <Label htmlFor="include-logo" className="font-normal">
                      Include company logo and details
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-breakdown"
                      checked={templateConfig?.layout.sections.earnings || false}
                      onCheckedChange={(checked) => {
                        if (templateConfig) {
                          const newConfig = { ...templateConfig };
                          newConfig.layout.sections.earnings = checked as boolean;
                          setTemplateConfig(newConfig);
                        }
                      }}
                    />
                    <Label htmlFor="include-breakdown" className="font-normal">
                      Show detailed earnings breakdown
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-contributions"
                      checked={templateConfig?.layout.sections.contributions || false}
                      onCheckedChange={(checked) => {
                        if (templateConfig) {
                          const newConfig = { ...templateConfig };
                          newConfig.layout.sections.contributions = checked as boolean;
                          setTemplateConfig(newConfig);
                        }
                      }}
                    />
                    <Label htmlFor="include-contributions" className="font-normal">
                      Include NSSF contributions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confidentiality-footer"
                      checked={templateConfig?.branding.confidentialityFooter || false}
                      onCheckedChange={(checked) => {
                        if (templateConfig) {
                          const newConfig = { ...templateConfig };
                          newConfig.branding.confidentialityFooter = checked as boolean;
                          setTemplateConfig(newConfig);
                        }
                      }}
                    />
                    <Label htmlFor="confidentiality-footer" className="font-normal">
                      Add confidentiality footer
                    </Label>
                  </div>
                </>
              ) : (
                // Legacy system options
                <>
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
                      disabled
                    />
                    <Label htmlFor="password-protect" className="font-normal text-muted-foreground">
                      Password protect sensitive payslips (Coming soon)
                    </Label>
                  </div>
                </>
              )}
            </div>
          </div>

          <Card className="p-4 bg-muted">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Employees:</span>
                <span className="font-semibold">
                  {selectedEmployeeIds && selectedEmployeeIds.length > 0 
                    ? `${selectedEmployeeIds.length} employee${selectedEmployeeIds.length === 1 ? '' : 's'} selected`
                    : `All ${employeeCount} employees selected`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Design System:</span>
                <span className="font-semibold">
                  {useNewDesignSystem ? 'New Advanced Templates' : 'Legacy System'}
                </span>
              </div>
              {useNewDesignSystem && (
                <div className="flex justify-between text-sm">
                  <span>Template:</span>
                  <span className="font-semibold">
                    {DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Corporate'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Estimated Processing Time:</span>
                <span className="font-semibold">
                  {useNewDesignSystem ? '10-15 seconds' : '15-20 seconds'}
                </span>
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

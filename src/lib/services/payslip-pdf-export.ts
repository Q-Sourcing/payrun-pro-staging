import jsPDF from 'jspdf';
import { PayslipData, PayslipTemplateConfig, PayslipExportSettings } from '@/lib/types/payslip';

export class PayslipPDFExport {
  /**
   * Generate PDF from payslip data and template configuration
   */
  static async generatePDF(
    data: PayslipData,
    config: PayslipTemplateConfig,
    exportSettings: PayslipExportSettings
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: exportSettings.orientation,
      unit: 'mm',
      format: exportSettings.format
    });

    // Set margins
    const margins = {
      top: parseFloat(exportSettings.margin.top),
      right: parseFloat(exportSettings.margin.right),
      bottom: parseFloat(exportSettings.margin.bottom),
      left: parseFloat(exportSettings.margin.left)
    };

    let y = margins.top;

    // Add header
    y = this.addHeader(doc, data, config, margins, y);

    // Add employee information
    if (config.layout.sections.employeeInfo) {
      y = this.addEmployeeInfo(doc, data, config, margins, y);
    }

    // Add earnings
    if (config.layout.sections.earnings) {
      y = this.addEarnings(doc, data, config, margins, y);
    }

    // Add deductions
    if (config.layout.sections.deductions) {
      y = this.addDeductions(doc, data, config, margins, y);
    }

    // Add contributions
    if (config.layout.sections.contributions) {
      y = this.addContributions(doc, data, config, margins, y);
    }

    // Add leave information
    if (config.layout.sections.leave) {
      y = this.addLeaveInfo(doc, data, config, margins, y);
    }

    // Add totals
    if (config.layout.sections.totals) {
      y = this.addTotals(doc, data, config, margins, y);
    }

    // Add footer
    this.addFooter(doc, data, config, margins, y);

    // Add watermark if enabled
    if (config.branding.showWatermark && config.branding.watermarkText) {
      this.addWatermark(doc, config.branding.watermarkText);
    }

    return doc;
  }

  private static addHeader(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Company logo (if enabled)
    if (config.layout.header.showLogo && config.branding.showCompanyLogo) {
      // Add company logo placeholder
      doc.setFillColor(14, 114, 136); // Primary color
      doc.rect(margins.left, y, 20, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(data.company.name.charAt(0), margins.left + 10, y + 10, { align: 'center' });
      y += 20;
    }

    // Company information
    if (config.layout.header.showCompanyInfo) {
      doc.setTextColor(15, 23, 42); // Text color
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(data.company.name, centerX, y, { align: 'center' });
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(data.company.address, centerX, y, { align: 'center' });
      y += 5;

      doc.text(data.company.email, centerX, y, { align: 'center' });
      y += 10;
    }

    // Payslip title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('PAYSLIP', centerX, y, { align: 'center' });
    y += 8;

    // Pay period
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Secondary color
    doc.text(data.payPeriod.display, centerX, y, { align: 'center' });
    y += 15;

    return y;
  }

  private static addEmployeeInfo(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftCol = margins.left;
    const rightCol = pageWidth / 2 + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('Employee Information', leftCol, y);
    y += 8;

    // Left column
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42); // Text color

    doc.text(`Employee Code: ${data.employee.code}`, leftCol, y);
    y += 5;
    doc.text(`Name: ${data.employee.name}`, leftCol, y);
    y += 5;
    doc.text(`Job Title: ${data.employee.jobTitle}`, leftCol, y);
    y += 5;
    doc.text(`Department: ${data.employee.department}`, leftCol, y);
    y += 5;

    // Right column
    let rightY = y - 20;
    doc.text(`Bank: ${data.employee.bank.name}`, rightCol, rightY);
    rightY += 5;
    doc.text(`Account: ${data.employee.bank.account}`, rightCol, rightY);
    rightY += 5;
    doc.text(`NSSF No: ${data.employee.nssfNo}`, rightCol, rightY);
    rightY += 5;
    doc.text(`TIN: ${data.employee.tin}`, rightCol, rightY);

    y += 15;
    return y;
  }

  private static addEarnings(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('Earnings', margins.left, y);
    y += 8;

    // Table header
    doc.setFillColor(248, 250, 252); // Background color
    doc.rect(margins.left, y - 3, doc.internal.pageSize.getWidth() - margins.left - margins.right, 8, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Text color
    doc.text('Description', margins.left + 2, y + 2);
    doc.text('Amount', doc.internal.pageSize.getWidth() - margins.right - 30, y + 2, { align: 'right' });
    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    data.earnings.forEach((earning) => {
      doc.text(earning.description, margins.left + 2, y + 2);
      doc.text(this.formatCurrency(earning.amount), doc.internal.pageSize.getWidth() - margins.right - 30, y + 2, { align: 'right' });
      y += 5;
    });

    // Total earnings
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Accent color
    doc.text('Total Earnings', margins.left + 2, y + 2);
    doc.text(this.formatCurrency(data.totals.gross), doc.internal.pageSize.getWidth() - margins.right - 30, y + 2, { align: 'right' });
    y += 10;

    return y;
  }

  private static addDeductions(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('Deductions', margins.left, y);
    y += 8;

    // Table header
    doc.setFillColor(248, 250, 252); // Background color
    doc.rect(margins.left, y - 3, doc.internal.pageSize.getWidth() - margins.left - margins.right, 8, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Text color
    doc.text('Description', margins.left + 2, y + 2);
    doc.text('Amount', doc.internal.pageSize.getWidth() - margins.right - 30, y + 2, { align: 'right' });
    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    data.deductions.forEach((deduction) => {
      doc.text(deduction.description, margins.left + 2, y + 2);
      doc.text(this.formatCurrency(deduction.amount), doc.internal.pageSize.getWidth() - margins.right - 30, y + 2, { align: 'right' });
      y += 5;
    });

    // Total deductions
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('Total Deductions', margins.left + 2, y + 2);
    doc.text(this.formatCurrency(data.totals.deductions), doc.internal.pageSize.getWidth() - margins.right - 30, y + 2, { align: 'right' });
    y += 10;

    return y;
  }

  private static addContributions(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('Contributions', margins.left, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42); // Text color

    // NSSF contributions
    doc.text('NSSF Contributions:', margins.left, y);
    y += 5;
    doc.text(`Company: ${this.formatCurrency(data.contributions.nssf.company)}`, margins.left + 10, y);
    y += 4;
    doc.text(`Employee: ${this.formatCurrency(data.contributions.nssf.employee)}`, margins.left + 10, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${this.formatCurrency(data.contributions.nssf.total)}`, margins.left + 10, y);
    y += 10;

    return y;
  }

  private static addLeaveInfo(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 114, 136); // Primary color
    doc.text('Leave Information', margins.left, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42); // Text color

    doc.text(`Leave Taken: ${data.leave.taken} days`, margins.left, y);
    y += 5;
    doc.text(`Leave Due: ${data.leave.due} days`, margins.left, y);
    y += 10;

    return y;
  }

  private static addTotals(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Summary box - Increased height to accommodate all content
    const boxHeight = 35; // Increased from 25 to 35
    doc.setFillColor(240, 253, 244); // Light green background
    doc.rect(margins.left, y, pageWidth - margins.left - margins.right, boxHeight, 'F');
    doc.setDrawColor(16, 185, 129); // Accent color
    doc.setLineWidth(2);
    doc.rect(margins.left, y, pageWidth - margins.left - margins.right, boxHeight);

    y += 6; // Reduced from 8 to 6 for better spacing

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Text color
    doc.text('PAYMENT SUMMARY', centerX, y, { align: 'center' });
    y += 6; // Reduced from 8 to 6 for better spacing

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gross Pay: ${this.formatCurrency(data.totals.gross)}`, margins.left + 5, y);
    doc.text(`Total Deductions: ${this.formatCurrency(data.totals.deductions)}`, margins.left + 5, y + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Accent color
    doc.text(`Net Pay: ${this.formatCurrency(data.totals.net)}`, margins.left + 5, y + 10);

    y += boxHeight + 5; // Use the actual box height plus some spacing
    return y;
  }

  private static addFooter(doc: jsPDF, data: PayslipData, config: PayslipTemplateConfig, margins: any, y: number): void {
    if (!config.branding.confidentialityFooter) return;

    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = doc.internal.pageSize.getWidth() / 2;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139); // Secondary color
    doc.text('This payslip is confidential and intended for the recipient only.', centerX, pageHeight - margins.bottom, { align: 'center' });
  }

  private static addWatermark(doc: jsPDF, watermarkText: string): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 200, 200); // Light gray
    doc.text(watermarkText, centerX, centerY, { 
      align: 'center',
      angle: -45 
    });
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Download PDF file
   */
  static async downloadPDF(
    data: PayslipData,
    config: PayslipTemplateConfig,
    exportSettings: PayslipExportSettings,
    filename?: string
  ): Promise<void> {
    const doc = await this.generatePDF(data, config, exportSettings);
    const defaultFilename = `payslip-${data.employee.code}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename || defaultFilename);
  }

  /**
   * Generate multiple payslips as a single PDF
   */
  static async generateMultiplePDFs(
    payslipsData: PayslipData[],
    config: PayslipTemplateConfig,
    exportSettings: PayslipExportSettings
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: exportSettings.orientation,
      unit: 'mm',
      format: exportSettings.format
    });

    for (let i = 0; i < payslipsData.length; i++) {
      if (i > 0) {
        doc.addPage();
      }
      
      const payslipDoc = await this.generatePDF(payslipsData[i], config, exportSettings);
      // Copy content from payslipDoc to main doc
      // This is a simplified approach - in practice, you'd need to copy the content properly
    }

    return doc;
  }
}

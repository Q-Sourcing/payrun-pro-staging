import * as XLSX from 'xlsx';
import { BankScheduleData, BankScheduleResult } from './bank-schedule-service';

export interface ExcelExportOptions {
  fileName?: string;
  includeHeaders?: boolean;
  includeTotals?: boolean;
  formatCurrency?: boolean;
}

export class BankScheduleExporter {
  /**
   * Export bank schedule data to Excel with separate sheets for each bank
   */
  static async exportToExcel(
    data: BankScheduleResult,
    options: ExcelExportOptions = {}
  ): Promise<void> {
    const {
      fileName = `Bank_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`,
      includeHeaders = true,
      includeTotals = true,
      formatCurrency = true,
    } = options;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create Centenary Bank sheet
    if (data.centenaryBank.length > 0) {
      const centenarySheet = this.createBankSheet(
        data.centenaryBank,
        'Bank-Centenary',
        data.payRunInfo,
        includeHeaders,
        includeTotals,
        formatCurrency
      );
      XLSX.utils.book_append_sheet(workbook, centenarySheet, 'Bank-Centenary');
    }

    // Create Stanbic Bank sheet
    if (data.stanbicBank.length > 0) {
      const stanbicSheet = this.createBankSheet(
        data.stanbicBank,
        'Bank-Stanbic',
        data.payRunInfo,
        includeHeaders,
        includeTotals,
        formatCurrency
      );
      XLSX.utils.book_append_sheet(workbook, stanbicSheet, 'Bank-Stanbic');
    }

    // If no data in either bank, create a summary sheet
    if (data.centenaryBank.length === 0 && data.stanbicBank.length === 0) {
      const summarySheet = this.createSummarySheet(data.payRunInfo);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Save the file
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Create a bank sheet with proper formatting
   */
  private static createBankSheet(
    bankData: BankScheduleData[],
    sheetName: string,
    payRunInfo: BankScheduleResult['payRunInfo'],
    includeHeaders: boolean,
    includeTotals: boolean,
    formatCurrency: boolean
  ): any[][] {
    const sheet: any[][] = [];

    // Add header information
    if (includeHeaders) {
      sheet.push([payRunInfo.companyName]);
      sheet.push(['Payroll Period:', `${payRunInfo.payPeriodStart} to ${payRunInfo.payPeriodEnd}`]);
      sheet.push(['Printed On:', new Date().toLocaleString()]);
      sheet.push([]); // Empty row
    }

    // Add column headers
    const headers = ['#', 'AccountName', 'BankName', 'AccountNumber', 'BankNet'];
    sheet.push(headers);

    // Add employee data
    bankData.forEach((employee, index) => {
      const row = [
        index + 1,
        employee.accountName,
        employee.bankName,
        employee.accountNumber,
        formatCurrency ? employee.bankNet : employee.bankNet,
      ];
      sheet.push(row);
    });

    // Add totals row
    if (includeTotals && bankData.length > 0) {
      sheet.push([]); // Empty row
      const total = bankData.reduce((sum, emp) => sum + emp.bankNet, 0);
      const totalsRow = ['', '', '', 'TOTAL:', formatCurrency ? total : total];
      sheet.push(totalsRow);
    }

    return sheet;
  }

  /**
   * Create a summary sheet when no data is available
   */
  private static createSummarySheet(payRunInfo: BankScheduleResult['payRunInfo']): any[][] {
    const sheet: any[][] = [];

    sheet.push([payRunInfo.companyName]);
    sheet.push(['Payroll Period:', `${payRunInfo.payPeriodStart} to ${payRunInfo.payPeriodEnd}`]);
    sheet.push(['Printed On:', new Date().toLocaleString()]);
    sheet.push([]);
    sheet.push(['No employees found in this pay run']);
    sheet.push(['Please ensure the pay run has been processed and contains active employees']);

    return sheet;
  }

  /**
   * Generate a preview of the Excel data without creating the file
   */
  static generatePreview(data: BankScheduleResult): {
    centenaryPreview: any[][];
    stanbicPreview: any[][];
    summary: {
      totalEmployees: number;
      centenaryEmployees: number;
      stanbicEmployees: number;
      centenaryTotal: number;
      stanbicTotal: number;
      grandTotal: number;
    };
  } {
    const centenaryPreview = data.centenaryBank.length > 0
      ? this.createBankSheet(data.centenaryBank, 'Bank-Centenary', data.payRunInfo, true, true, false)
      : [];

    const stanbicPreview = data.stanbicBank.length > 0
      ? this.createBankSheet(data.stanbicBank, 'Bank-Stanbic', data.payRunInfo, true, true, false)
      : [];

    const summary = {
      totalEmployees: data.centenaryBank.length + data.stanbicBank.length,
      centenaryEmployees: data.centenaryBank.length,
      stanbicEmployees: data.stanbicBank.length,
      centenaryTotal: data.totals.centenaryTotal,
      stanbicTotal: data.totals.stanbicTotal,
      grandTotal: data.totals.grandTotal,
    };

    return {
      centenaryPreview,
      stanbicPreview,
      summary,
    };
  }

  /**
   * Format currency values for display
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Generate a CSV export for a specific bank
   */
  static exportBankToCSV(
    bankData: BankScheduleData[],
    bankName: string,
    payRunInfo: BankScheduleResult['payRunInfo']
  ): string {
    const csvRows: string[] = [];

    // Add header information as comments
    csvRows.push(`# ${payRunInfo.companyName}`);
    csvRows.push(`# Payroll Period: ${payRunInfo.payPeriodStart} to ${payRunInfo.payPeriodEnd}`);
    csvRows.push(`# Printed On: ${new Date().toLocaleString()}`);
    csvRows.push(`# Bank: ${bankName}`);
    csvRows.push('');

    // Add CSV headers
    csvRows.push('Number,AccountName,BankName,AccountNumber,BankNet');

    // Add data rows
    bankData.forEach((employee, index) => {
      const row = [
        index + 1,
        `"${employee.accountName}"`,
        `"${employee.bankName}"`,
        `"${employee.accountNumber}"`,
        employee.bankNet,
      ].join(',');
      csvRows.push(row);
    });

    // Add totals
    if (bankData.length > 0) {
      const total = bankData.reduce((sum, emp) => sum + emp.bankNet, 0);
      csvRows.push('');
      csvRows.push(`"","","","TOTAL:",${total}`);
    }

    return csvRows.join('\n');
  }
}

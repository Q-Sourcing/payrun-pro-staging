import { BankScheduleExporter } from '../bank-schedule-exporter';
import { BankScheduleResult } from '../bank-schedule-service';

// Mock data for testing
const mockBankScheduleData: BankScheduleResult = {
  centenaryBank: [
    {
      accountName: 'John Doe',
      bankName: 'Centenary Bank',
      accountNumber: '1234567890',
      bankNet: 1500000,
    },
    {
      accountName: 'Jane Smith',
      bankName: 'Centenary Bank',
      accountNumber: '0987654321',
      bankNet: 2000000,
    },
  ],
  stanbicBank: [
    {
      accountName: 'Mike Johnson',
      bankName: 'Stanbic Bank',
      accountNumber: '5555555555',
      bankNet: 1800000,
    },
  ],
  totals: {
    centenaryTotal: 3500000,
    stanbicTotal: 1800000,
    grandTotal: 5300000,
  },
  payRunInfo: {
    payPeriodStart: '2024-01-01',
    payPeriodEnd: '2024-01-31',
    payRunDate: '2024-02-01',
    companyName: 'QSourcing Uganda',
  },
};

describe('BankScheduleExporter', () => {
  describe('generatePreview', () => {
    it('should generate preview data correctly', () => {
      const preview = BankScheduleExporter.generatePreview(mockBankScheduleData);
      
      expect(preview.summary.totalEmployees).toBe(3);
      expect(preview.summary.centenaryEmployees).toBe(2);
      expect(preview.summary.stanbicEmployees).toBe(1);
      expect(preview.summary.centenaryTotal).toBe(3500000);
      expect(preview.summary.stanbicTotal).toBe(1800000);
      expect(preview.summary.grandTotal).toBe(5300000);
      
      // Check that preview data contains expected structure
      expect(preview.centenaryPreview).toBeDefined();
      expect(preview.stanbicPreview).toBeDefined();
      expect(preview.centenaryPreview.length).toBeGreaterThan(0);
      expect(preview.stanbicPreview.length).toBeGreaterThan(0);
    });

    it('should handle empty bank data', () => {
      const emptyData: BankScheduleResult = {
        ...mockBankScheduleData,
        centenaryBank: [],
        stanbicBank: [],
      };
      
      const preview = BankScheduleExporter.generatePreview(emptyData);
      
      expect(preview.summary.totalEmployees).toBe(0);
      expect(preview.summary.centenaryEmployees).toBe(0);
      expect(preview.summary.stanbicEmployees).toBe(0);
      expect(preview.summary.grandTotal).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly for UGX', () => {
      const formatted = BankScheduleExporter.formatCurrency(1500000);
      expect(formatted).toContain('UGX');
      expect(formatted).toContain('1,500,000');
    });

    it('should handle zero amounts', () => {
      const formatted = BankScheduleExporter.formatCurrency(0);
      expect(formatted).toContain('UGX');
      expect(formatted).toContain('0');
    });
  });

  describe('exportBankToCSV', () => {
    it('should generate CSV content correctly', () => {
      const csvContent = BankScheduleExporter.exportBankToCSV(
        mockBankScheduleData.centenaryBank,
        'Centenary Bank',
        mockBankScheduleData.payRunInfo
      );
      
      expect(csvContent).toContain('QSourcing Uganda');
      expect(csvContent).toContain('Centenary Bank');
      expect(csvContent).toContain('John Doe');
      expect(csvContent).toContain('Jane Smith');
      expect(csvContent).toContain('1234567890');
      expect(csvContent).toContain('0987654321');
      expect(csvContent).toContain('1500000');
      expect(csvContent).toContain('2000000');
      expect(csvContent).toContain('TOTAL:');
      expect(csvContent).toContain('3500000');
    });

    it('should handle empty bank data in CSV', () => {
      const csvContent = BankScheduleExporter.exportBankToCSV(
        [],
        'Centenary Bank',
        mockBankScheduleData.payRunInfo
      );
      
      expect(csvContent).toContain('QSourcing Uganda');
      expect(csvContent).toContain('Centenary Bank');
      expect(csvContent).toContain('TOTAL:,0');
    });
  });
});

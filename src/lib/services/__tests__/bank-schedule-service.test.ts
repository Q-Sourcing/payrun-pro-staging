import { BankScheduleService } from '../bank-schedule-service';

// Mock data for testing
const mockPayRunData = {
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

describe('BankScheduleService', () => {
  describe('validateBankSchedule', () => {
    it('should validate correct data successfully', () => {
      const validation = BankScheduleService.validateBankSchedule(mockPayRunData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing employees', () => {
      const emptyData = {
        ...mockPayRunData,
        centenaryBank: [],
        stanbicBank: [],
      };
      const validation = BankScheduleService.validateBankSchedule(emptyData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No employees found in the pay run');
    });

    it('should detect missing account numbers', () => {
      const invalidData = {
        ...mockPayRunData,
        centenaryBank: [
          {
            ...mockPayRunData.centenaryBank[0],
            accountNumber: '',
          },
        ],
      };
      const validation = BankScheduleService.validateBankSchedule(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('missing account numbers'))).toBe(true);
    });

    it('should detect zero total net pay', () => {
      const invalidData = {
        ...mockPayRunData,
        totals: {
          centenaryTotal: 0,
          stanbicTotal: 0,
          grandTotal: 0,
        },
      };
      const validation = BankScheduleService.validateBankSchedule(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Total net pay is zero or negative');
    });
  });

  describe('getScheduleSummary', () => {
    it('should return correct summary statistics', () => {
      const summary = BankScheduleService.getScheduleSummary(mockPayRunData);
      expect(summary.totalEmployees).toBe(3);
      expect(summary.centenaryEmployees).toBe(2);
      expect(summary.stanbicEmployees).toBe(1);
      expect(summary.centenaryTotal).toBe(3500000);
      expect(summary.stanbicTotal).toBe(1800000);
      expect(summary.grandTotal).toBe(5300000);
      expect(summary.payPeriod).toBe('2024-01-01 to 2024-01-31');
    });
  });
});

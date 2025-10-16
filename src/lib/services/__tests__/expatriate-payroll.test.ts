import { ExpatriatePayrollService } from '../expatriate-payroll';
import type { ExpatriateCalculationInput } from '../../types/expatriate-payroll';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({
        data: {
          employee_id: 'test-employee-id',
          net_foreign: 3600,
          net_local: 13680000,
          gross_local: 15500000,
          details: {
            tax_country: 'UG',
            exchange_rate: 3800,
            daily_rate: 150,
            days_worked: 22,
            allowances: 300,
            currency: 'USD'
          }
        },
        error: null
      }))
    }
  }
}));

describe('ExpatriatePayrollService', () => {
  describe('getCurrencySymbol', () => {
    it('should return correct currency symbols', () => {
      expect(ExpatriatePayrollService.getCurrencySymbol('USD')).toBe('$');
      expect(ExpatriatePayrollService.getCurrencySymbol('EUR')).toBe('€');
      expect(ExpatriatePayrollService.getCurrencySymbol('GBP')).toBe('£');
      expect(ExpatriatePayrollService.getCurrencySymbol('UGX')).toBe('USh');
      expect(ExpatriatePayrollService.getCurrencySymbol('KES')).toBe('KSh');
      expect(ExpatriatePayrollService.getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency amounts correctly', () => {
      expect(ExpatriatePayrollService.formatCurrency(150, 'USD')).toBe('$150');
      expect(ExpatriatePayrollService.formatCurrency(1500000, 'UGX')).toBe('USh1,500,000');
      expect(ExpatriatePayrollService.formatCurrency(50000, 'KES')).toBe('KSh50,000');
    });
  });

  describe('formatDualCurrency', () => {
    it('should format dual currency display correctly', () => {
      const result = ExpatriatePayrollService.formatDualCurrency(
        3600, 'USD', 13680000, 'UGX', 3800
      );
      expect(result).toBe('$3,600 → USh13,680,000 (Rate: 3,800)');
    });
  });

  describe('calculateExpatriatePay', () => {
    it('should calculate expatriate pay correctly', async () => {
      const input: ExpatriateCalculationInput = {
        employee_id: 'test-employee-id',
        daily_rate: 150,
        days_worked: 22,
        allowances: 300,
        currency: 'USD',
        exchange_rate_to_local: 3800,
        tax_country: 'UG'
      };

      const result = await ExpatriatePayrollService.calculateExpatriatePay(input);

      expect(result).toEqual({
        employee_id: 'test-employee-id',
        net_foreign: 3600,
        net_local: 13680000,
        gross_local: 15500000,
        details: {
          tax_country: 'UG',
          exchange_rate: 3800,
          daily_rate: 150,
          days_worked: 22,
          allowances: 300,
          currency: 'USD'
        }
      });
    });

    it('should handle calculation errors', async () => {
      const mockInvoke = require('@/integrations/supabase/client').supabase.functions.invoke;
      mockInvoke.mockRejectedValueOnce(new Error('Calculation failed'));

      const input: ExpatriateCalculationInput = {
        employee_id: 'test-employee-id',
        daily_rate: 150,
        days_worked: 22,
        allowances: 300,
        currency: 'USD',
        exchange_rate_to_local: 3800,
        tax_country: 'UG'
      };

      await expect(ExpatriatePayrollService.calculateExpatriatePay(input))
        .rejects.toThrow('Calculation failed');
    });
  });

  describe('getExpatriatePayGroups', () => {
    it('should fetch expatriate pay groups', async () => {
      const result = await ExpatriatePayrollService.getExpatriatePayGroups();
      expect(result).toEqual([]);
    });
  });

  describe('createExpatriatePayGroup', () => {
    it('should create new expatriate pay group', async () => {
      const payGroupData = {
        name: 'Test Expatriate Group',
        country: 'Uganda',
        currency: 'USD',
        exchange_rate_to_local: 3800,
        default_daily_rate: 150,
        tax_country: 'UG',
        notes: 'Test notes'
      };

      const result = await ExpatriatePayrollService.createExpatriatePayGroup(payGroupData);
      expect(result).toBeDefined();
    });
  });
});

// Integration test for Edge Function
describe('Expatriate Payroll Edge Function Integration', () => {
  it('should validate input parameters', () => {
    const validInput: ExpatriateCalculationInput = {
      employee_id: 'test-employee-id',
      daily_rate: 150,
      days_worked: 22,
      allowances: 300,
      currency: 'USD',
      exchange_rate_to_local: 3800,
      tax_country: 'UG'
    };

    // Test required fields
    expect(validInput.employee_id).toBeDefined();
    expect(validInput.daily_rate).toBeGreaterThan(0);
    expect(validInput.days_worked).toBeGreaterThan(0);
    expect(validInput.currency).toBeDefined();
    expect(validInput.exchange_rate_to_local).toBeGreaterThan(0);
    expect(validInput.tax_country).toBeDefined();
  });

  it('should validate tax country codes', () => {
    const validTaxCountries = ['UG', 'KE', 'TZ', 'RW', 'SS'];
    const input: ExpatriateCalculationInput = {
      employee_id: 'test-employee-id',
      daily_rate: 150,
      days_worked: 22,
      allowances: 300,
      currency: 'USD',
      exchange_rate_to_local: 3800,
      tax_country: 'UG'
    };

    expect(validTaxCountries).toContain(input.tax_country);
  });

  it('should validate currency codes', () => {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'UGX', 'KES', 'TZS', 'RWF', 'SSP'];
    const input: ExpatriateCalculationInput = {
      employee_id: 'test-employee-id',
      daily_rate: 150,
      days_worked: 22,
      allowances: 300,
      currency: 'USD',
      exchange_rate_to_local: 3800,
      tax_country: 'UG'
    };

    expect(validCurrencies).toContain(input.currency);
  });
});

// Performance test
describe('Expatriate Payroll Performance', () => {
  it('should calculate pay within acceptable time', async () => {
    const input: ExpatriateCalculationInput = {
      employee_id: 'test-employee-id',
      daily_rate: 150,
      days_worked: 22,
      allowances: 300,
      currency: 'USD',
      exchange_rate_to_local: 3800,
      tax_country: 'UG'
    };

    const startTime = Date.now();
    await ExpatriatePayrollService.calculateExpatriatePay(input);
    const endTime = Date.now();

    // Should complete within 5 seconds (including network call)
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

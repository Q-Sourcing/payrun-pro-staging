import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Employee = Database['public']['Tables']['employees']['Row'];
type PayItem = Database['public']['Tables']['pay_items']['Row'];
type PayRun = Database['public']['Tables']['pay_runs']['Row'];

export interface BankScheduleData {
  accountName: string;
  bankName: string;
  accountNumber: string;
  bankNet: number;
}

export interface BankScheduleResult {
  centenaryBank: BankScheduleData[];
  stanbicBank: BankScheduleData[];
  totals: {
    centenaryTotal: number;
    stanbicTotal: number;
    grandTotal: number;
  };
  payRunInfo: {
    payPeriodStart: string;
    payPeriodEnd: string;
    payRunDate: string;
    companyName: string;
  };
}

export class BankScheduleService {
  /**
   * Fetch bank schedule data for a specific pay run
   */
  static async generateBankSchedule(payRunId: string): Promise<BankScheduleResult> {
    try {
      // Fetch pay run details with pay group info
      const { data: payRun, error: payRunError } = await supabase
        .from('pay_runs')
        .select(`
          *,
          pay_group_master:pay_group_master_id(name, country)
        `)
        .eq('id', payRunId)
        .single();

      if (payRunError || !payRun) {
        throw new Error(`Pay run not found: ${payRunError?.message || 'Unknown error'}`);
      }

      // Fetch pay items separately
      const { data: payItems, error: payItemsError } = await supabase
        .from('pay_items')
        .select('*')
        .eq('pay_run_id', payRunId)
        .not('net_pay', 'is', null)
        .gt('net_pay', 0);

      if (payItemsError) {
        throw new Error(`Failed to fetch pay items: ${payItemsError.message}`);
      }

      if (!payItems || payItems.length === 0) {
        throw new Error('No active employees found in this pay run');
      }

      // Get unique employee IDs
      const employeeIds = [...new Set(payItems.map(item => item.employee_id))];

      // Fetch employee details using the correct column names (first_name, last_name)
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, bank_name, account_number, status')
        .in('id', employeeIds)
        .eq('status', 'active');

      if (employeesError) {
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      // Create a map for quick employee lookup
      const employeeMap = new Map(employees?.map(emp => [emp.id, emp]) || []);

      // Process and categorize by bank
      const centenaryBank: BankScheduleData[] = [];
      const stanbicBank: BankScheduleData[] = [];

      payItems.forEach((item) => {
        const employee = employeeMap.get(item.employee_id);
        
        if (!employee) {
          return; // Skip if employee not found or inactive
        }
        
        const bankName = employee.bank_name || 'Centenary Bank'; // Default to Centenary if no bank specified
        
        // Combine first_name and last_name to create full name
        const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';
        
        const bankData: BankScheduleData = {
          accountName: fullName,
          bankName: bankName,
          accountNumber: employee.account_number || '',
          bankNet: item.net_pay || 0,
        };

        // Assign to appropriate bank based on business logic
        if (bankName.toLowerCase().includes('stanbic')) {
          stanbicBank.push(bankData);
        } else {
          centenaryBank.push(bankData);
        }
      });

      // Calculate totals
      const centenaryTotal = centenaryBank.reduce((sum, item) => sum + item.bankNet, 0);
      const stanbicTotal = stanbicBank.reduce((sum, item) => sum + item.bankNet, 0);
      const grandTotal = centenaryTotal + stanbicTotal;

      // Prepare pay run info
      const payRunInfo = {
        payPeriodStart: payRun.pay_period_start,
        payPeriodEnd: payRun.pay_period_end,
        payRunDate: payRun.pay_run_date,
        companyName: 'QSourcing Uganda', // As specified in requirements
      };

      return {
        centenaryBank,
        stanbicBank,
        totals: {
          centenaryTotal,
          stanbicTotal,
          grandTotal,
        },
        payRunInfo,
      };
    } catch (error) {
      console.error('Error generating bank schedule:', error);
      throw error;
    }
  }

  /**
   * Validate bank schedule data before export
   */
  static validateBankSchedule(data: BankScheduleResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.centenaryBank.length === 0 && data.stanbicBank.length === 0) {
      errors.push('No employees found in the pay run');
    }

    if (data.totals.grandTotal <= 0) {
      errors.push('Total net pay is zero or negative');
    }

    // Check for missing account numbers
    const allEmployees = [...data.centenaryBank, ...data.stanbicBank];
    const missingAccountNumbers = allEmployees.filter(emp => !emp.accountNumber || emp.accountNumber.trim() === '');
    
    if (missingAccountNumbers.length > 0) {
      errors.push(`${missingAccountNumbers.length} employees are missing account numbers`);
    }

    // Check for missing bank names
    const missingBankNames = allEmployees.filter(emp => !emp.bankName || emp.bankName.trim() === '');
    
    if (missingBankNames.length > 0) {
      errors.push(`${missingBankNames.length} employees are missing bank names`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get summary statistics for bank schedule
   */
  static getScheduleSummary(data: BankScheduleResult) {
    return {
      totalEmployees: data.centenaryBank.length + data.stanbicBank.length,
      centenaryEmployees: data.centenaryBank.length,
      stanbicEmployees: data.stanbicBank.length,
      centenaryTotal: data.totals.centenaryTotal,
      stanbicTotal: data.totals.stanbicTotal,
      grandTotal: data.totals.grandTotal,
      payPeriod: `${data.payRunInfo.payPeriodStart} to ${data.payRunInfo.payPeriodEnd}`,
    };
  }
}

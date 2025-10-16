import { supabase } from '@/integrations/supabase/client';
import { PayslipData } from '@/lib/types/payslip';
import { format } from 'date-fns';
import { ExpatriatePayrollService } from './expatriate-payroll';

export class PayslipGenerator {
  /**
   * Generate payslip data from pay run and employee information
   */
  static async generatePayslipData(
    payRunId: string, 
    employeeId: string
  ): Promise<PayslipData> {
    try {
      // Fetch pay run data with all related information
      const { data: payRunData, error: payRunError } = await supabase
        .from('pay_runs')
        .select(`
          *,
          pay_groups(
            name,
            country
          ),
          pay_items(
            *,
            employees(
              id,
              first_name,
              middle_name,
              last_name,
              email,
              phone,
              pay_type,
              pay_rate,
              department,
              project,
              bank_name,
              account_number,
              nssf_number,
              tin
            )
          )
        `)
        .eq('id', payRunId)
        .single();

      if (payRunError) {
        console.error('PayRun fetch error:', payRunError);
        throw payRunError;
      }

      if (!payRunData) {
        throw new Error('Pay run not found');
      }

      // Find the specific employee's pay item
      const payItem = payRunData.pay_items.find((item: any) => item.employee_id === employeeId);
      if (!payItem) {
        throw new Error('Employee not found in this pay run');
      }

      // Fetch company settings (handle case where table might not exist)
      let companySettings = null;
      try {
        const { data: companyData } = await supabase
          .from('company_settings')
          .select('*')
          .single();
        companySettings = companyData;
      } catch (error) {
        console.log('Company settings not found, using defaults');
      }

      // Fetch custom deductions for this pay item (handle case where table might not exist)
      let customDeductions = [];
      try {
        const { data: deductionsData } = await supabase
          .from('pay_item_custom_deductions')
          .select('*')
          .eq('pay_item_id', payItem.id);
        customDeductions = deductionsData || [];
      } catch (error) {
        console.log('Custom deductions table not found, using empty array');
      }

      // Build earnings array
      const earnings = [
        {
          description: 'Basic Salary',
          amount: Number(payItem.gross_pay || 0)
        }
      ];

      // Build deductions array
      const deductions = [];
      
      // Add tax deductions
      if (Number(payItem.tax_deduction || 0) > 0) {
        deductions.push({
          description: 'PAYE Tax',
          amount: Number(payItem.tax_deduction || 0)
        });
      }

      // Add NSSF deductions
      const nssfDeduction = Number(payItem.gross_pay || 0) * 0.05; // 5% of gross
      if (nssfDeduction > 0) {
        deductions.push({
          description: 'NSSF',
          amount: nssfDeduction
        });
      }

      // Add custom deductions
      if (customDeductions && customDeductions.length > 0) {
        customDeductions.forEach((deduction: any) => {
          deductions.push({
            description: deduction.name,
            amount: Number(deduction.amount || 0)
          });
        });
      }

      // Add other benefit deductions
      if (Number(payItem.benefit_deductions || 0) > 0) {
        deductions.push({
          description: 'Other Deductions',
          amount: Number(payItem.benefit_deductions || 0)
        });
      }

      // Calculate NSSF contributions
      const nssfCompany = Number(payItem.gross_pay || 0) * 0.10; // 10% of gross
      const nssfEmployee = Number(payItem.gross_pay || 0) * 0.05; // 5% of gross

      // Build payslip data with safe defaults
      const payslipData: PayslipData = {
        employee: {
          code: payItem.employees?.id?.substring(0, 8).toUpperCase() || 'EMP001',
          name: [
            payItem.employees?.first_name,
            payItem.employees?.middle_name,
            payItem.employees?.last_name
          ].filter(Boolean).join(' ') || 'Employee Name',
          jobTitle: payItem.employees?.project || 'Employee',
          department: payItem.employees?.department || 'General',
          hireDate: '2024-01-01', // Default hire date
          nssfNo: payItem.employees?.nssf_number || 'N/A',
          tin: payItem.employees?.tin || 'N/A',
          bank: {
            name: payItem.employees?.bank_name || 'N/A',
            account: payItem.employees?.account_number || 'N/A'
          }
        },
        company: {
          name: companySettings?.company_name || 'Q-Sourcing Limited',
          address: companySettings?.address || 'Plot 15 Martyrs\' Way, Kampala',
          email: companySettings?.email || 'hr@qsourcing.co.ug',
          logo: companySettings?.logo_url || '/assets/company-logo.png'
        },
        payPeriod: {
          start: payRunData.pay_period_start,
          end: payRunData.pay_period_end,
          display: `${format(new Date(payRunData.pay_period_start), 'yyyy-MMM-dd')} to ${format(new Date(payRunData.pay_period_end), 'yyyy-MMM-dd')}`
        },
        earnings,
        deductions,
        contributions: {
          nssf: {
            company: nssfCompany,
            employee: nssfEmployee,
            total: nssfCompany + nssfEmployee
          },
          privatePension: {
            company: 0,
            employee: 0,
            total: 0
          }
        },
        totals: {
          gross: Number(payItem.gross_pay || 0),
          deductions: Number(payItem.total_deductions || 0),
          net: Number(payItem.net_pay || 0)
        },
        leave: {
          taken: 0, // This would need to be calculated from leave records
          due: 21 // This would need to be calculated based on company policy
        }
      };

      return payslipData;
    } catch (error) {
      console.error('Error generating payslip data:', error);
      throw error;
    }
  }

  /**
   * Generate payslip data for all employees in a pay run
   */
  static async generateAllPayslipsData(payRunId: string): Promise<PayslipData[]> {
    try {
      const { data: payRunData, error: payRunError } = await supabase
        .from('pay_runs')
        .select(`
          *,
          pay_groups(
            name,
            country
          ),
          pay_items(
            *,
            employees(
              id,
              first_name,
              middle_name,
              last_name,
              email,
              phone,
              pay_type,
              pay_rate,
              department,
              project
            )
          )
        `)
        .eq('id', payRunId)
        .single();

      if (payRunError) {
        console.error('PayRun fetch error:', payRunError);
        throw payRunError;
      }

      if (!payRunData || !payRunData.pay_items || payRunData.pay_items.length === 0) {
        throw new Error('No pay items found for this pay run');
      }

      const payslipsData: PayslipData[] = [];

      // Generate payslip data for each pay item
      for (const payItem of payRunData.pay_items) {
        try {
          const payslipData = await this.generatePayslipData(payRunId, payItem.employee_id);
          payslipsData.push(payslipData);
        } catch (itemError) {
          console.error(`Error generating payslip for employee ${payItem.employee_id}:`, itemError);
          // Continue with other employees even if one fails
        }
      }

      if (payslipsData.length === 0) {
        throw new Error('No payslips could be generated');
      }

      return payslipsData;
    } catch (error) {
      console.error('Error generating all payslips data:', error);
      throw error;
    }
  }

  /**
   * Generate sample payslip data for preview/testing
   */
  static generateSamplePayslipData(): PayslipData {
    return {
      employee: {
        code: "14918",
        name: "Nalungu Kevin Colin",
        jobTitle: "IT Officer",
        department: "QSSU Group",
        hireDate: "2024-01-01",
        nssfNo: "1998150200707",
        tin: "1033125087",
        bank: {
          name: "Equity",
          account: "1001101549837"
        }
      },
      company: {
        name: "Q-Sourcing Limited",
        address: "Plot 15 Martyrs' Way, Kampala",
        email: "hr@qsourcing.co.ug",
        logo: "/assets/company-logo.png"
      },
      payPeriod: {
        start: "2025-07-01",
        end: "2025-07-31",
        display: "2025-Jul-01 to 2025-Jul-31"
      },
      earnings: [
        { description: "Basic Salary", amount: 3672000 }
      ],
      deductions: [
        { description: "NSSF", amount: 183600 },
        { description: "PAYE", amount: 1003600 }
      ],
      contributions: {
        nssf: { company: 367200, employee: 183600, total: 550800 },
        privatePension: { company: 0, employee: 0, total: 0 }
      },
      totals: {
        gross: 3672000,
        deductions: 1187200,
        net: 2484800
      },
      leave: {
        taken: 0,
        due: 21
      }
    };
  }

  /**
   * Generate expatriate payslip data from expatriate pay run and employee information
   */
  static async generateExpatriatePayslipData(
    payRunId: string, 
    employeeId: string
  ): Promise<PayslipData> {
    try {
      // Fetch expatriate pay run data with all related information
      const { data: payRunData, error: payRunError } = await supabase
        .from('pay_runs')
        .select(`
          *,
          expatriate_pay_groups(
            id,
            name,
            currency,
            exchange_rate_to_local,
            tax_country,
            default_daily_rate
          ),
          expatriate_pay_run_items(
            *,
            employees(
              id,
              first_name,
              middle_name,
              last_name,
              email,
              phone,
              department,
              project,
              bank_name,
              account_number,
              nssf_number,
              tin
            )
          )
        `)
        .eq('id', payRunId)
        .single();

      if (payRunError) {
        console.error('Expatriate PayRun fetch error:', payRunError);
        throw payRunError;
      }

      if (!payRunData) {
        throw new Error('Pay run not found');
      }

      // Find the specific employee's pay item
      const employeePayItem = payRunData.expatriate_pay_run_items?.find(
        (item: any) => item.employee_id === employeeId
      );

      if (!employeePayItem) {
        throw new Error('Employee pay item not found');
      }

      const expatriatePayGroup = payRunData.expatriate_pay_groups;
      const employee = employeePayItem.employees;

      // Calculate payslip data for expatriate employee
      const payslipData: PayslipData = {
        employee: {
          code: employee.id.substring(0, 8).toUpperCase(),
          name: `${employee.first_name} ${employee.middle_name ? employee.middle_name + ' ' : ''}${employee.last_name}`,
          jobTitle: employee.department || 'Expatriate Employee',
          department: employee.department || 'International',
          hireDate: format(new Date(), 'yyyy-MM-dd'), // Default to current date
          nssfNo: employee.nssf_number || 'N/A',
          tin: employee.tin || 'N/A',
          bank: {
            name: employee.bank_name || 'N/A',
            account: employee.account_number || 'N/A'
          }
        },
        company: {
          name: 'QSourcing Uganda', // This should come from company settings
          address: 'Kampala, Uganda',
          email: 'hr@qsourcing.com',
          logo: '' // Company logo URL
        },
        payPeriod: {
          start: format(new Date(payRunData.pay_period_start), 'yyyy-MM-dd'),
          end: format(new Date(payRunData.pay_period_end), 'yyyy-MM-dd'),
          display: `${format(new Date(payRunData.pay_period_start), 'MMM dd')} - ${format(new Date(payRunData.pay_period_end), 'MMM dd, yyyy')}`
        },
        earnings: [
          {
            description: `Daily Rate (${employeePayItem.days_worked} days @ ${ExpatriatePayrollService.formatCurrency(employeePayItem.daily_rate, expatriatePayGroup.currency)})`,
            amount: employeePayItem.daily_rate * employeePayItem.days_worked
          }
        ],
        deductions: [],
        contributions: {
          nssf: {
            company: 0, // NSSF employer contribution in local currency
            employee: 0, // NSSF employee contribution in local currency
            total: 0
          },
          privatePension: {
            company: 0,
            employee: 0,
            total: 0
          }
        },
        totals: {
          gross: employeePayItem.gross_local, // Gross in local currency
          deductions: 0, // Total deductions in local currency
          net: employeePayItem.net_local // Net in local currency
        },
        leave: {
          taken: 0,
          due: 0
        },
        // Expatriate-specific fields
        expatriateDetails: {
          isExpatriate: true,
          foreignCurrency: expatriatePayGroup.currency,
          foreignAmount: employeePayItem.net_foreign,
          localAmount: employeePayItem.net_local,
          exchangeRate: employeePayItem.exchange_rate,
          dailyRate: employeePayItem.daily_rate,
          daysWorked: employeePayItem.days_worked,
          allowances: employeePayItem.allowances_foreign,
          taxCountry: employeePayItem.tax_country
        }
      };

      // Add allowances if any
      if (employeePayItem.allowances_foreign > 0) {
        payslipData.earnings.push({
          description: 'Allowances',
          amount: employeePayItem.allowances_foreign
        });
      }

      // Calculate deductions based on tax country
      const grossLocal = employeePayItem.gross_local;
      const netLocal = employeePayItem.net_local;
      const totalDeductions = grossLocal - netLocal;

      if (totalDeductions > 0) {
        payslipData.deductions.push({
          description: `Tax & Social Security (${employeePayItem.tax_country})`,
          amount: totalDeductions
        });
      }

      // Update totals
      payslipData.totals.deductions = totalDeductions;

      return payslipData;

    } catch (error) {
      console.error('Error generating expatriate payslip data:', error);
      throw error;
    }
  }
}

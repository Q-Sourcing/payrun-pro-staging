// @ts-nocheck
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
          pay_group_master:pay_group_master_id(
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
              sub_department,
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
          subDepartment: payItem.employees?.sub_department || 'General',
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
          pay_group_master:pay_group_master_id(
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
              sub_department,
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
   * Generate payslip data for all employees in an expatriate pay run
   */
  static async generateAllExpatriatePayslipsData(payRunId: string): Promise<PayslipData[]> {
    try {
      console.log('🔍 Generating all expatriate payslips for pay run:', payRunId);

      // Fetch all expatriate pay run items for this pay run
      const { data: payRunItems, error: itemsError } = await supabase
        .from('expatriate_pay_run_items')
        .select(`
          id,
          pay_run_id,
          employee_id
        `)
        .eq('pay_run_id', payRunId);

      if (itemsError) {
        console.error('❌ Expatriate PayRun items fetch error:', itemsError);
        throw itemsError;
      }

      if (!payRunItems || payRunItems.length === 0) {
        throw new Error(`No pay items found for expatriate pay run: ${payRunId}`);
      }

      // Validate all items belong to the correct pay run
      const invalidItems = payRunItems.filter(item => item.pay_run_id !== payRunId);
      if (invalidItems.length > 0) {
        console.error('❌ Found items with incorrect pay_run_id:', invalidItems);
        throw new Error(`Found ${invalidItems.length} items with incorrect pay_run_id. Expected ${payRunId}`);
      }

      console.log(`✅ Found ${payRunItems.length} pay run items for pay run ${payRunId}`);

      const payslipsData: PayslipData[] = [];

      // Generate payslip data for each pay run item
      for (const payRunItem of payRunItems) {
        try {
          console.log(`📄 Generating payslip for employee ${payRunItem.employee_id} in pay run ${payRunId}`);
          const payslipData = await this.generateExpatriatePayslipData(payRunId, payRunItem.employee_id);
          payslipsData.push(payslipData);
          console.log(`✅ Successfully generated payslip for employee ${payRunItem.employee_id}`);
        } catch (itemError) {
          console.error(`❌ Error generating payslip for employee ${payRunItem.employee_id} in pay run ${payRunId}:`, itemError);
          // Continue with other employees even if one fails
        }
      }

      if (payslipsData.length === 0) {
        throw new Error('No payslips could be generated for this expatriate pay run');
      }

      return payslipsData;
    } catch (error) {
      console.error('Error generating all expatriate payslips data:', error);
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
        subDepartment: "QSSU Group",
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
      console.log('🔍 Generating expatriate payslip:', { payRunId, employeeId });

      // Fetch expatriate pay run item with employee and pay group info
      const { data: payRunItem, error: itemError } = await supabase
        .from('expatriate_pay_run_items')
        .select(`
          *,
          employees(
            id,
            first_name,
            middle_name,
            last_name,
            email,
            phone,
            sub_department,
            project,
            bank_name,
            account_number,
            nssf_number,
            tin
          ),
          expatriate_pay_groups(
            id,
            name,
            currency,
            exchange_rate_to_local,
            tax_country
          )
        `)
        .eq('pay_run_id', payRunId)
        .eq('employee_id', employeeId)
        .single();

      if (itemError || !payRunItem) {
        console.error('❌ Error fetching pay run item:', itemError);
        throw new Error(`Employee pay item not found for payRunId: ${payRunId}, employeeId: ${employeeId}`);
      }

      // Validate that the fetched item belongs to the correct pay run
      if (payRunItem.pay_run_id !== payRunId) {
        console.error('❌ Pay run ID mismatch:', {
          requested: payRunId,
          fetched: payRunItem.pay_run_id,
          employeeId
        });
        throw new Error(`Pay run ID mismatch: Expected ${payRunId}, but got ${payRunItem.pay_run_id}`);
      }

      console.log('✅ Fetched pay run item:', {
        payRunId: payRunItem.pay_run_id,
        employeeId: payRunItem.employee_id,
        dailyRate: payRunItem.daily_rate,
        daysWorked: payRunItem.days_worked,
        currency: payRunItem.currency,
        exchangeRate: payRunItem.exchange_rate_to_local,
        grossLocal: payRunItem.gross_local,
        netLocal: payRunItem.net_local,
        netForeign: payRunItem.net_foreign,
        hasEmployee: !!payRunItem.employees,
        hasPayGroup: !!payRunItem.expatriate_pay_groups,
        payGroupId: payRunItem.expatriate_pay_group_id
      });

      // Fetch pay run data for period information
      const { data: payRunData, error: payRunError } = await supabase
        .from('pay_runs')
        .select('id, pay_period_start, pay_period_end')
        .eq('id', payRunId)
        .single();

      if (payRunError) {
        console.error('❌ PayRun fetch error:', payRunError);
        throw payRunError;
      }

      if (!payRunData) {
        throw new Error(`Pay run not found: ${payRunId}`);
      }

      // Validate that the fetched pay run matches the requested one
      if (payRunData.id !== payRunId) {
        console.error('❌ Pay run ID mismatch in period fetch:', {
          requested: payRunId,
          fetched: payRunData.id
        });
        throw new Error(`Pay run ID mismatch in period data: Expected ${payRunId}, but got ${payRunData.id}`);
      }

      console.log('✅ Fetched pay run period:', {
        payRunId: payRunData.id,
        periodStart: payRunData.pay_period_start,
        periodEnd: payRunData.pay_period_end
      });

      // Validate required data
      if (!payRunItem.employees) {
        throw new Error(`Employee data not found for employeeId: ${employeeId} in payRunId: ${payRunId}`);
      }

      const employee = payRunItem.employees;
      const expatriatePayGroup = payRunItem.expatriate_pay_groups;

      // Validate critical pay run item fields
      if (payRunItem.daily_rate === undefined || payRunItem.daily_rate === null) {
        throw new Error(`Daily rate is missing for employeeId: ${employeeId} in payRunId: ${payRunId}`);
      }
      if (payRunItem.days_worked === undefined || payRunItem.days_worked === null) {
        throw new Error(`Days worked is missing for employeeId: ${employeeId} in payRunId: ${payRunId}`);
      }
      if (!payRunItem.currency) {
        throw new Error(`Currency is missing for employeeId: ${employeeId} in payRunId: ${payRunId}`);
      }

      // Use fallback values if expatriatePayGroup is null
      const currency = expatriatePayGroup?.currency ?? payRunItem.currency;
      const exchangeRate = expatriatePayGroup?.exchange_rate_to_local ?? payRunItem.exchange_rate_to_local;

      if (!expatriatePayGroup) {
        console.warn(`⚠️ Pay group not found for pay run item ${payRunItem.id}, using item-level data:`, {
          currency: payRunItem.currency,
          exchange_rate: payRunItem.exchange_rate_to_local,
          payRunId,
          employeeId
        });
      } else {
        console.log('✅ Pay group found:', {
          payGroupId: expatriatePayGroup.id,
          currency: expatriatePayGroup.currency,
          exchangeRate: expatriatePayGroup.exchange_rate_to_local
        });
      }

      console.log('📊 Using currency:', currency, 'from', expatriatePayGroup ? 'pay group' : 'pay run item');

      // Fetch individual allowances from the allowances table
      const allowances = await ExpatriatePayrollService.getAllowancesForPayRunItem(payRunItem.id);
      console.log(`✅ Fetched ${allowances.length} allowances for pay run item ${payRunItem.id}:`, allowances);

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

      // Calculate total allowances from individual allowance items
      const totalAllowances = allowances.reduce((sum, allowance) => sum + Number(allowance.amount || 0), 0);
      console.log('💰 Total allowances:', totalAllowances);

      // Build earnings array with daily rate and individual allowances
      const earnings = [
        {
          description: `Daily Rate (${payRunItem.days_worked} days @ ${ExpatriatePayrollService.formatCurrency(payRunItem.daily_rate, currency)})`,
          amount: payRunItem.daily_rate * payRunItem.days_worked
        }
      ];

      // Add each allowance as a separate earnings line item
      allowances.forEach((allowance) => {
        earnings.push({
          description: allowance.name,
          amount: Number(allowance.amount || 0)
        });
      });

      // Calculate payslip data for expatriate employee
      const payslipData: PayslipData = {
        employee: {
          code: employee.id.substring(0, 8).toUpperCase(),
          name: `${employee.first_name} ${employee.middle_name ? employee.middle_name + ' ' : ''}${employee.last_name}`,
          jobTitle: employee.sub_department || 'Expatriate Employee',
          subDepartment: employee.sub_department || 'International',
          hireDate: format(new Date(), 'yyyy-MM-dd'), // Default to current date
          nssfNo: employee.nssf_number || 'N/A',
          tin: employee.tin || 'N/A',
          bank: {
            name: employee.bank_name || 'N/A',
            account: employee.account_number || 'N/A'
          }
        },
        company: {
          name: companySettings?.company_name || 'QSourcing Uganda',
          address: companySettings?.address || 'Kampala, Uganda',
          email: companySettings?.email || 'hr@qsourcing.com',
          logo: companySettings?.logo_url || ''
        },
        payPeriod: {
          start: format(new Date(payRunData.pay_period_start), 'yyyy-MM-dd'),
          end: format(new Date(payRunData.pay_period_end), 'yyyy-MM-dd'),
          display: `${format(new Date(payRunData.pay_period_start), 'MMM dd')} - ${format(new Date(payRunData.pay_period_end), 'MMM dd, yyyy')}`
        },
        earnings: earnings,
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
          gross: payRunItem.gross_local, // Gross in local currency
          deductions: 0, // Total deductions in local currency
          net: payRunItem.net_local // Net in local currency
        },
        leave: {
          taken: 0,
          due: 0
        },
        // Expatriate-specific fields
        expatriateDetails: {
          isExpatriate: true,
          foreignCurrency: currency, // Use fallback currency
          foreignAmount: payRunItem.net_foreign,
          localAmount: payRunItem.net_local,
          exchangeRate: payRunItem.exchange_rate_to_local,
          dailyRate: payRunItem.daily_rate,
          daysWorked: payRunItem.days_worked,
          allowances: totalAllowances,
          taxCountry: payRunItem.tax_country
        }
      };

      // Calculate deductions based on tax country
      const grossLocal = payRunItem.gross_local;
      const netLocal = payRunItem.net_local;
      const totalDeductions = grossLocal - netLocal;

      if (totalDeductions > 0) {
        payslipData.deductions.push({
          description: `Tax & Social Security (${payRunItem.tax_country})`,
          amount: totalDeductions
        });
      }

      // Update totals
      payslipData.totals.deductions = totalDeductions;

      console.log('📄 Generated payslip data summary:', {
        employeeName: payslipData.employee.name,
        employeeId,
        payRunId,
        grossLocal: payslipData.totals.gross,
        netLocal: payslipData.totals.net,
        netForeign: payslipData.expatriateDetails.foreignAmount,
        currency: payslipData.expatriateDetails.foreignCurrency,
        exchangeRate: payslipData.expatriateDetails.exchangeRate,
        dailyRate: payslipData.expatriateDetails.dailyRate,
        daysWorked: payslipData.expatriateDetails.daysWorked,
        totalAllowances: payslipData.expatriateDetails.allowances,
        earningsCount: payslipData.earnings.length,
        deductionsCount: payslipData.deductions.length
      });

      return payslipData;

    } catch (error) {
      console.error('Error generating expatriate payslip data:', error);
      throw error;
    }
  }
}

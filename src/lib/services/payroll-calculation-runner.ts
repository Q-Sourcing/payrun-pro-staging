// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { PayrollCalculationService, CalculationInput } from '@/lib/types/payroll-calculations';

/**
 * Runs payroll calculation for all pay items in a pay run and persists the results.
 * Extracted from RecalculateTaxesDialog so it can be reused without opening a dialog.
 *
 * @returns the number of employees successfully calculated
 */
export async function runPayrollCalculation(payRunId: string): Promise<number> {
  // Fetch pay run category to determine if it's head office
  const { data: payRun, error: payRunErr } = await (supabase
    .from('pay_runs' as any)
    .select('category')
    .eq('id', payRunId)
    .single() as any);

  if (payRunErr) throw new Error(`Failed to fetch pay run: ${payRunErr.message}`);
  const isHO = payRun?.category === 'head_office';

  // Fetch all pay items with employee details
  const { data: payItems, error: fetchError } = await (supabase
    .from('pay_items' as any)
    .select(`
      *,
      employees (
        id,
        first_name,
        middle_name,
        last_name,
        email,
        pay_type,
        pay_rate,
        country,
        employee_type
      )
    `)
    .eq('pay_run_id', payRunId) as any);

  if (fetchError) throw new Error(`Failed to fetch pay items: ${fetchError.message}`);
  if (!payItems || payItems.length === 0) throw new Error('No employees found in this pay run');

  // Fetch payroll benefits scoped to this pay run
  const { data: scopedPayrollBenefits, error: benefitsError } = await (supabase as any)
    .from('payroll_benefits')
    .select('employee_id, benefit_name, cost, cost_type, entry_type')
    .eq('payrun_id', payRunId);

  if (benefitsError) throw new Error(`Failed to fetch payroll benefits: ${benefitsError.message}`);

  const benefitsByEmployee = new Map<string, any[]>();
  (scopedPayrollBenefits || []).forEach((row: any) => {
    const existing = benefitsByEmployee.get(row.employee_id) || [];
    existing.push(row);
    benefitsByEmployee.set(row.employee_id, existing);
  });

  // Calculate each pay item
  const updatedPayItems = await Promise.all(
    payItems.map(async (item: any) => {
      try {
        const { data: customDeductions } = await (supabase
          .from('pay_item_custom_deductions' as any)
          .select('*')
          .eq('pay_item_id', item.id) as any);

        const benefitRows = benefitsByEmployee.get(item.employee_id) || [];
        const payrollRunBenefits = benefitRows.map((benefit: any) => {
          const amount = benefit.cost_type === 'percentage'
            ? (Number(item.gross_pay || 0) * Number(benefit.cost || 0)) / 100
            : Number(benefit.cost || 0);
          return { name: benefit.benefit_name, amount, type: benefit.entry_type || 'benefit' };
        });

        const input: CalculationInput = {
          employee_id: item.employee_id,
          pay_run_id: payRunId,
          pay_rate: item.employees.pay_rate,
          pay_type: item.employees.pay_type,
          employee_type: item.employees.employee_type,
          country: item.employees.country,
          is_head_office: isHO,
          hours_worked: item.hours_worked,
          pieces_completed: item.pieces_completed,
          custom_deductions: [
            ...((customDeductions || []).map((d: any) => ({ name: d.name, amount: d.amount, type: d.type }))),
            ...payrollRunBenefits,
          ],
          benefit_deductions: item.benefit_deductions || 0,
        };

        const result = await PayrollCalculationService.calculatePayroll(input);

        return {
          id: item.id,
          gross_pay: result.gross_pay,
          tax_deduction: result.paye_tax + result.nssf_employee,
          total_deductions: result.total_deductions,
          net_pay: result.net_pay,
          employer_contributions: result.employer_contributions,
        };
      } catch {
        // Keep zeros if calculation fails for this employee
        return {
          id: item.id,
          gross_pay: item.gross_pay,
          tax_deduction: item.tax_deduction,
          total_deductions: item.total_deductions,
          net_pay: item.net_pay,
          employer_contributions: item.employer_contributions,
        };
      }
    })
  );

  // Persist updated pay items
  await Promise.all(
    updatedPayItems.map((item: any) =>
      (supabase
        .from('pay_items' as any)
        .update({
          gross_pay: item.gross_pay,
          tax_deduction: item.tax_deduction,
          total_deductions: item.total_deductions,
          net_pay: item.net_pay,
          employer_contributions: item.employer_contributions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id) as any)
    )
  );

  // Update pay run totals
  const totalGross = updatedPayItems.reduce((sum: number, item: any) => sum + item.gross_pay, 0);
  const totalDeductions = updatedPayItems.reduce((sum: number, item: any) => sum + item.total_deductions, 0);
  const totalNet = updatedPayItems.reduce((sum: number, item: any) => sum + item.net_pay, 0);

  await (supabase
    .from('pay_runs' as any)
    .update({
      total_gross_pay: totalGross,
      total_deductions: totalDeductions,
      total_net_pay: totalNet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payRunId) as any);

  return updatedPayItems.length;
}

/**
 * Returns true if the pay run has not been calculated yet
 * (all pay items have net_pay = 0 or null).
 */
export async function isPayRunUncalculated(payRunId: string): Promise<boolean> {
  const { data, error } = await (supabase
    .from('pay_items' as any)
    .select('net_pay')
    .eq('pay_run_id', payRunId) as any);

  if (error || !data || data.length === 0) return false;
  return data.every((item: any) => !item.net_pay || item.net_pay === 0);
}

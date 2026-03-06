import { supabase } from '@/integrations/supabase/client';

async function countWithOrg(table: string, orgId: string) {
  // Attempt org-scoped count; if column missing, fallback to global count
  const scoped = await (supabase as any).from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
  if (!scoped.error) return scoped.count || 0
  const global = await (supabase as any).from(table).select('id', { count: 'exact', head: true })
  return global.count || 0
}

export async function getDashboardStats(orgId: string) {
  const companies = await countWithOrg('companies', orgId)

  // Employees: unified table or legacy with fallback
  let employees = 0
  const unified = await supabase.from('employee_master').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
  if (!unified.error) {
    employees = unified.count || 0
  } else {
    employees = await countWithOrg('employees', orgId)
  }

  const groups = await countWithOrg('pay_groups', orgId)

  // Payroll this month via RPC -> fallback legacy without org filter if needed
  let payroll = 0;
  try {
    const { data, error } = await supabase.rpc('get_org_total_payroll', { org_id: orgId });
    if (!error && typeof data === 'number') payroll = data;
  } catch { }
  if (!payroll) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    // Try org-scoped legacy pay_runs first
    let legacy = await supabase
      .from('pay_runs')
      .select('total_gross_pay')
      .gte('pay_period_end', monthStart)
      .lte('pay_period_end', monthEnd)
      .eq('organization_id', orgId)
    if (legacy.error) {
      legacy = await supabase
        .from('pay_runs')
        .select('total_gross_pay')
        .gte('pay_period_end', monthStart)
        .lte('pay_period_end', monthEnd)
    }
    if (!legacy.error && Array.isArray(legacy.data)) {
      payroll = legacy.data.reduce((a: any, r: any) => a + (Number(r.total_gross_pay) || 0), 0)
    }
  }

  return { companies, employees, groups, payroll };
}

export async function getRecentPayRuns(orgId: string, limit = 5) {
  const withComputedTotals = async (rows: any[] | null | undefined) => {
    const payRuns = rows || []
    if (payRuns.length === 0) return payRuns

    const payRunIds = payRuns.map((r: any) => r.id)
    const { data: payItems } = await (supabase as any)
      .from('pay_items')
      .select('pay_run_id, gross_pay, total_deductions, net_pay')
      .in('pay_run_id', payRunIds)

    const { data: headOfficeItems } = await (supabase as any)
      .from('head_office_pay_run_items')
      .select('pay_run_id, gross_pay, total_deductions, net_pay')
      .in('pay_run_id', payRunIds)

    const { data: expatriateItems } = await (supabase as any)
      .from('expatriate_pay_run_items')
      .select('pay_run_id, gross_local, local_net_pay')
      .in('pay_run_id', payRunIds)

    const totalsByRunId = (payItems || []).reduce((acc: Record<string, any>, item: any) => {
      const current = acc[item.pay_run_id] || { gross: 0, deductions: 0, net: 0, employees: 0 }
      current.gross += Number(item.gross_pay) || 0
      current.deductions += Number(item.total_deductions) || 0
      current.net += Number(item.net_pay) || 0
      current.employees += 1
      acc[item.pay_run_id] = current
      return acc
    }, {})

    ;(headOfficeItems || []).forEach((item: any) => {
      const current = totalsByRunId[item.pay_run_id] || { gross: 0, deductions: 0, net: 0, employees: 0 }
      current.gross += Number(item.gross_pay) || 0
      current.deductions += Number(item.total_deductions) || 0
      current.net += Number(item.net_pay) || 0
      current.employees += 1
      totalsByRunId[item.pay_run_id] = current
    })

    ;(expatriateItems || []).forEach((item: any) => {
      const current = totalsByRunId[item.pay_run_id] || { gross: 0, deductions: 0, net: 0, employees: 0 }
      current.gross += Number(item.gross_local) || 0
      current.net += Number(item.local_net_pay) || 0
      current.employees += 1
      totalsByRunId[item.pay_run_id] = current
    })

    return payRuns.map((run: any) => {
      const computed = totalsByRunId[run.id] || { gross: 0, deductions: 0, net: 0, employees: 0 }
      const dbGross = Number(run.total_gross_pay ?? run.total_gross) || 0
      const dbDeductions = Number(run.total_deductions) || 0
      const dbNet = Number(run.total_net_pay ?? run.total_net) || 0

      return {
        ...run,
        total_gross_pay: dbGross > 0 ? dbGross : computed.gross,
        total_deductions: dbDeductions > 0 ? dbDeductions : computed.deductions,
        total_net_pay: dbNet > 0 ? dbNet : computed.net,
        total_employees: computed.employees || run.total_employees || 0,
      }
    })
  }

  // Query pay_runs with correct column names
  let result = await supabase
    .from('pay_runs')
    .select('id, created_at, pay_period_start, pay_period_end, total_gross, total_gross_pay, total_deductions, total_net, total_net_pay, status, pay_group:pay_group_master(name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (result.error) {
    // Retry without org filter if needed
    result = await supabase
      .from('pay_runs')
      .select('id, created_at, pay_period_start, pay_period_end, total_gross, total_gross_pay, total_deductions, total_net, total_net_pay, status, pay_group:pay_group_master(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  if (!result.error) {
    result.data = await withComputedTotals(result.data)
  }

  return result
}

export async function getCompaniesSummary(orgId: string) {
  // Try org filter first; fallback to all if org column missing
  let res = await supabase
    .from('companies')
    .select(`
      id,
      name,
      company_units:company_units(id),
      employee_count:employees(id),
      payroll:pay_runs(total_gross_pay)
    `)
    .eq('organization_id', orgId)
  if (res.error) {
    res = await supabase
      .from('companies')
      .select(`
        id,
        name,
        company_units:company_units(id),
        employee_count:employees(id),
        payroll:pay_runs(total_gross_pay)
      `)
  }
  return res
}

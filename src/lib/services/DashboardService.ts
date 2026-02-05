import { supabase } from '@/integrations/supabase/client';

async function countWithOrg(table: string, orgId: string) {
  // Attempt org-scoped count; if column missing, fallback to global count
  const scoped = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
  if (!scoped.error) return scoped.count || 0
  const global = await supabase.from(table).select('id', { count: 'exact', head: true })
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
      .gte('period_end', monthStart)
      .lte('period_end', monthEnd)
      .eq('organization_id', orgId)
    if (legacy.error) {
      legacy = await supabase
        .from('pay_runs')
        .select('total_gross_pay')
        .gte('period_end', monthStart)
        .lte('period_end', monthEnd)
    }
    if (!legacy.error && Array.isArray(legacy.data)) {
      payroll = legacy.data.reduce((a: any, r: any) => a + (Number(r.total_gross_pay) || 0), 0)
    }
  }

  return { companies, employees, groups, payroll };
}

export async function getRecentPayRuns(orgId: string, limit = 5) {
  // Query pay_runs with correct column names
  let result = await supabase
    .from('pay_runs')
    .select('id, period_start, period_end, total_gross_pay, total_net_pay, status, pay_group:pay_groups(name)')
    .eq('organization_id', orgId)
    .order('period_end', { ascending: false })
    .limit(limit)

  if (result.error) {
    // Retry without org filter if needed
    result = await supabase
      .from('pay_runs')
      .select('id, period_start, period_end, total_gross_pay, total_net_pay, status, pay_group:pay_groups(name)')
      .order('period_end', { ascending: false })
      .limit(limit)
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

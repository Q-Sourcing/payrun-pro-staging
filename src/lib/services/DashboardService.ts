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
  } catch {}
  if (!payroll) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString()
    // Try org-scoped legacy pay_runs first
    let legacy = await supabase
      .from('pay_runs')
      .select('total_gross')
      .gte('pay_period_end', monthStart)
      .lte('pay_period_end', monthEnd)
      .eq('organization_id', orgId)
    if (legacy.error) {
      legacy = await supabase
        .from('pay_runs')
        .select('total_gross')
        .gte('pay_period_end', monthStart)
        .lte('pay_period_end', monthEnd)
    }
    if (!legacy.error && Array.isArray(legacy.data)) {
      payroll = legacy.data.reduce((a:any, r:any) => a + (Number(r.total_gross)||0), 0)
    }
  }

  return { companies, employees, groups, payroll };
}

export async function getRecentPayRuns(orgId: string, limit = 5) {
  // Try unified table with org filter
  let unified = await supabase
    .from('master_payrolls')
    .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group:pay_groups(name), total_employees')
    .eq('organization_id', orgId)
    .order('pay_period_end', { ascending: false })
    .limit(limit);
  if (unified.error) {
    // Retry unified without org filter
    unified = await supabase
      .from('master_payrolls')
      .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group:pay_groups(name), total_employees')
      .order('pay_period_end', { ascending: false })
      .limit(limit);
  }
  if (!unified.error && unified.data?.length) return unified

  // Fallback to legacy pay_runs
  let legacy = await supabase
    .from('pay_runs')
    .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group:pay_groups(name)')
    .eq('organization_id', orgId)
    .order('pay_period_end', { ascending: false })
    .limit(limit)
  if (legacy.error) {
    legacy = await supabase
      .from('pay_runs')
      .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group:pay_groups(name)')
      .order('pay_period_end', { ascending: false })
      .limit(limit)
  }
  return legacy
}

export async function getCompaniesSummary(orgId: string) {
  // Try org filter first; fallback to all if org column missing
  let res = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
  if (res.error) {
    res = await supabase
      .from('companies')
      .select('id, name')
  }
  return res
}

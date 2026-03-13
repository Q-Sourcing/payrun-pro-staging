import { supabase } from '@/integrations/supabase/client'

async function authUid() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.id || null
}

export async function getOrgEmployees(orgId: string, filters?: { companyId?: string; companyUnitId?: string; employeeTypeId?: string; status?: string; mine?: boolean }) {
  const uid = await authUid()
  // Try unified first
  let query = (supabase as any)
    .from('employee_master')
    .select('id, first_name, last_name, email, status, base_rate, currency, company_id, company_unit_id, employee_type_id, created_by, created_at')
    .eq('organization_id', orgId)

  // Apply company filter at DB level
  if (filters?.companyId) {
    query = query.eq('company_id', filters.companyId)
  }

  let res: any = await query.order('created_at', { ascending: false })

  if (res.error) {
    let fallbackQuery = (supabase as any)
      .from('employees')
      .select('id, first_name, last_name, email, status, base_rate:pay_rate, currency, company_id, company_unit_id, employee_type, created_by, created_at')
      .eq('organization_id', orgId)

    if (filters?.companyId) {
      fallbackQuery = fallbackQuery.eq('company_id', filters.companyId)
    }

    res = await fallbackQuery.order('created_at', { ascending: false })

    if (res.error) {
      res = await (supabase as any)
        .from('employees')
        .select('id, first_name, last_name, email, status, base_rate:pay_rate, currency, company_id, company_unit_id, employee_type, created_by, created_at')
        .order('created_at', { ascending: false })
    }
  }

  let data = res.data || []
  const statusFilter = filters?.status?.toLowerCase()
  if (statusFilter) data = data.filter((r:any) => String(r.status||'').toLowerCase() === statusFilter)
  if (filters?.mine) {
    const uidNow = uid
    if (uidNow) data = data.filter((r:any) => r.created_by === uidNow)
  }
  // Client-side fallback filter for companyId (in case DB-level didn't apply)
  if (filters?.companyId) data = data.filter((r:any) => r.company_id === filters.companyId)
  if (filters?.companyUnitId) data = data.filter((r:any) => r.company_unit_id === filters.companyUnitId)
  if (filters?.employeeTypeId) data = data.filter((r:any) => (r.employee_type_id||r.employee_type) === filters.employeeTypeId)

  return { data }
}

export async function getOrgPayGroups(orgId: string, filters?: { companyId?: string; companyUnitId?: string; employeeTypeId?: string; mine?: boolean }) {
  const uid = await authUid()
  let query = (supabase as any)
    .from('pay_groups')
    .select('id, name, currency, created_by, created_at, employee_type_id, company_unit_id, organization_id')
    .eq('organization_id', orgId)

  let res: any = await query.order('created_at', { ascending: false })

  if (res.error) {
    res = await (supabase as any)
      .from('pay_groups')
      .select('id, name, currency, created_by, created_at, employee_type_id, company_unit_id, organization_id')
      .order('created_at', { ascending: false })
    if (res.error) {
      res = await (supabase as any)
        .from('pay_groups')
        .select('id, name, currency')
        .order('id', { ascending: false })
    }
  }
  let data = res.data || []
  if (filters?.companyUnitId) data = data.filter((r:any) => r.company_unit_id === filters.companyUnitId)
  if (filters?.employeeTypeId) data = data.filter((r:any) => r.employee_type_id === filters.employeeTypeId)
  if (filters?.mine && uid) data = data.filter((r:any) => r.created_by === uid)
  
  // Filter by companyId: pay_groups linked to company_units belonging to the company
  if (filters?.companyId) {
    try {
      const { data: units } = await supabase
        .from('company_units')
        .select('id')
        .eq('company_id', filters.companyId)
      const unitIds = new Set((units || []).map(u => u.id))
      // Keep pay groups whose company_unit_id belongs to this company, or has no unit (org-level)
      data = data.filter((r: any) => !r.company_unit_id || unitIds.has(r.company_unit_id))
    } catch { }
  }
  
  return { data }
}

export async function getOrgPayRuns(orgId: string, filters?: { payGroupId?: string; companyId?: string; mine?: boolean }) {
  const uid = await authUid()
  let query = (supabase as any)
    .from('master_payrolls')
    .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group_id, created_by, currency')
    .eq('organization_id', orgId)

  let res: any = await query.order('pay_period_start', { ascending: false })

  if (res.error) {
    res = await (supabase as any)
      .from('master_payrolls')
      .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group_id, created_by, currency')
      .order('pay_period_start', { ascending: false })
    if (res.error) {
      let prQuery = (supabase as any)
        .from('pay_runs')
        .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group_id, created_by, currency')
        .eq('organization_id', orgId)
      
      res = await prQuery.order('pay_period_start', { ascending: false })
      if (res.error) {
        res = await (supabase as any)
          .from('pay_runs')
          .select('id, pay_period_start, pay_period_end, total_gross, total_net, payroll_status, pay_group_id, created_by, currency')
          .order('id', { ascending: false })
      }
    }
  }
  let data = res.data || []
  if (filters?.payGroupId) data = data.filter((r:any) => r.pay_group_id === filters.payGroupId)
  if (filters?.mine && uid) data = data.filter((r:any) => r.created_by === uid)
  return { data }
}

// @ts-nocheck
import { supabase } from '@/integrations/supabase/client'
import { AuditLogger } from './audit-logger'

export interface MultiTenantPayRun {
  id: string
  organization_id: string
  company_id?: string
  company_unit_id?: string
  employee_type_id?: string
  pay_group_id?: string
  pay_period_start: string
  pay_period_end: string
  base_currency: string
  payroll_status: 'draft' | 'pending' | 'approved' | 'closed'
  total_employees: number
  total_gross: number
  total_net: number
  created_by?: string
  created_at: string
  updated_at: string
  // Related data
  organization?: {
    name: string
  }
  company?: {
    name: string
  }
  company_unit?: {
    name: string
    kind?: 'head_office' | 'project' | null
  }
  employee_type?: {
    code: string
    name: string
    pay_basis: 'monthly' | 'daily' | 'hourly'
  }
  pay_group?: {
    name: string
    currency: string
    pay_frequency: 'monthly' | 'bi_weekly' | 'weekly' | 'daily' | 'custom'
  }
}

export interface MultiTenantPayRunItem {
  id: string
  master_payroll_id: string
  employee_id: string
  days_worked?: number
  hours_worked?: number
  base_rate: number
  allowances: number
  deductions: number
  gross_local: number
  net_local: number
  // Expatriate fields
  foreign_currency?: string
  foreign_base_rate?: number
  foreign_allowances?: number
  foreign_gross?: number
  foreign_net?: number
  exchange_rate?: number
  tax_country?: string
  created_at: string
  updated_at: string
  // Related data
  employee?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    employee_type?: {
      code: string
      name: string
      pay_basis: 'monthly' | 'daily' | 'hourly'
    }
  }
}

export interface CreatePayRunData {
  organization_id: string
  company_id?: string
  company_unit_id?: string
  employee_type_id?: string
  pay_group_id?: string
  pay_period_start: string
  pay_period_end: string
  base_currency: string
}

export class MultiTenantPayrollService {
  // Get current user's organization ID from JWT
  static async getCurrentOrganizationId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data?.session?.access_token) return null

      const payload = JSON.parse(atob(data.session.access_token.split('.')[1]))
      return payload.organization_id || payload.app_metadata?.organization_id || payload.user_metadata?.organization_id || null
    } catch {
      return null
    }
  }

  // List pay runs for current organization
  static async listPayRuns(organizationId?: string): Promise<MultiTenantPayRun[]> {
    const orgId = organizationId || await this.getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context available')

    const { data, error } = await supabase
      .from('master_payrolls')
      .select(`
        id,
        organization_id,
        company_id,
        company_unit_id,
        employee_type_id,
        pay_group_id,
        pay_period_start,
        pay_period_end,
        base_currency,
        payroll_status,
        total_employees,
        total_gross,
        total_net,
        created_by,
        created_at,
        updated_at,
        organization:organizations(name),
        company:companies(name),
        company_unit:company_units(name, kind),
        employee_type:employee_types(code, name, pay_basis),
        pay_group:pay_groups(name, currency, pay_frequency)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pay runs:', error)
      throw new Error('Failed to fetch pay runs')
    }

    return data || []
  }

  // Get pay run by ID
  static async getPayRun(id: string): Promise<MultiTenantPayRun | null> {
    const { data, error } = await supabase
      .from('master_payrolls')
      .select(`
        id,
        organization_id,
        company_id,
        company_unit_id,
        employee_type_id,
        pay_group_id,
        pay_period_start,
        pay_period_end,
        base_currency,
        payroll_status,
        total_employees,
        total_gross,
        total_net,
        created_by,
        created_at,
        updated_at,
        organization:organizations(name),
        company:companies(name),
        company_unit:company_units(name, kind),
        employee_type:employee_types(code, name, pay_basis),
        pay_group:pay_groups(name, currency, pay_frequency)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching pay run:', error)
      return null
    }

    return data
  }

  // Create new pay run
  static async createPayRun(data: CreatePayRunData): Promise<MultiTenantPayRun> {
    const { data: result, error } = await supabase
      .from('master_payrolls')
      .insert(data)
      .select(`
        id,
        organization_id,
        company_id,
        company_unit_id,
        employee_type_id,
        pay_group_id,
        pay_period_start,
        pay_period_end,
        base_currency,
        payroll_status,
        total_employees,
        total_gross,
        total_net,
        created_by,
        created_at,
        updated_at,
        organization:organizations(name),
        company:companies(name),
        company_unit:company_units(name, kind),
        employee_type:employee_types(code, name, pay_basis),
        pay_group:pay_groups(name, currency, pay_frequency)
      `)
      .single()

    if (error) {
      console.error('Error creating pay run:', error)
      throw new Error('Failed to create pay run')
    }

    await AuditLogger.logPrivilegedAction('payroll.create', 'payroll_run', { id: result.id, ...data })

    return result
  }

  // Get pay run items
  static async getPayRunItems(payRunId: string): Promise<MultiTenantPayRunItem[]> {
    const { data, error } = await supabase
      .from('pay_run_items')
      .select(`
        id,
        master_payroll_id,
        employee_id,
        days_worked,
        hours_worked,
        base_rate,
        allowances,
        deductions,
        gross_local,
        net_local,
        foreign_currency,
        foreign_base_rate,
        foreign_allowances,
        foreign_gross,
        foreign_net,
        exchange_rate,
        tax_country,
        created_at,
        updated_at,
        employee:employee_master(
          id,
          first_name,
          last_name,
          email,
          employee_type:employee_types(code, name, pay_basis)
        )
      `)
      .eq('master_payroll_id', payRunId)
      .order('created_at')

    if (error) {
      console.error('Error fetching pay run items:', error)
      throw new Error('Failed to fetch pay run items')
    }

    return data || []
  }

  // Create or update pay run item
  static async upsertPayRunItem(item: Partial<MultiTenantPayRunItem>): Promise<MultiTenantPayRunItem> {
    const { data, error } = await supabase
      .from('pay_run_items')
      .upsert(item, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select(`
        id,
        master_payroll_id,
        employee_id,
        days_worked,
        hours_worked,
        base_rate,
        allowances,
        deductions,
        gross_local,
        net_local,
        foreign_currency,
        foreign_base_rate,
        foreign_allowances,
        foreign_gross,
        foreign_net,
        exchange_rate,
        tax_country,
        created_at,
        updated_at,
        employee:employee_master(
          id,
          first_name,
          last_name,
          email,
          employee_type:employee_types(code, name, pay_basis)
        )
      `)
      .single()

    if (error) {
      console.error('Error upserting pay run item:', error)
      throw new Error('Failed to save pay run item')
    }

    return data
  }

  // Get employees for pay group
  static async getPayGroupEmployees(payGroupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('employee_pay_groups')
      .select(`
        employee_id,
        assigned_on,
        unassigned_on,
        employee:employee_master(
          id,
          first_name,
          last_name,
          email,
          base_rate,
          currency,
          status,
          employee_type:employee_types(code, name, pay_basis)
        )
      `)
      .eq('pay_group_id', payGroupId)
      .is('unassigned_on', null)
      .order('assigned_on')

    if (error) {
      console.error('Error fetching pay group employees:', error)
      throw new Error('Failed to fetch pay group employees')
    }

    return data?.map(item => item.employee).filter(Boolean) || []
  }

  // Calculate expatriate pay (adapted from existing logic)
  static async calculateExpatriatePay(input: {
    employee_id: string
    daily_rate: number
    days_worked: number
    allowances: number
    currency: string
    exchange_rate_to_local: number
    tax_country: string
  }): Promise<{
    gross_foreign: number
    net_foreign: number
    gross_local: number
    net_local: number
  }> {
    // This would call the existing Edge Function for calculations
    // For now, we'll do a simplified calculation
    const gross_foreign = (input.daily_rate * input.days_worked) + input.allowances
    const net_foreign = gross_foreign * 0.85 // Simplified 15% deduction
    const gross_local = gross_foreign * input.exchange_rate_to_local
    const net_local = net_foreign * input.exchange_rate_to_local

    return {
      gross_foreign,
      net_foreign,
      gross_local,
      net_local
    }
  }

  // Update pay run totals
  static async updatePayRunTotals(payRunId: string): Promise<void> {
    const { data: items } = await supabase
      .from('pay_run_items')
      .select('gross_local, net_local, employee_id')
      .eq('master_payroll_id', payRunId)

    if (!items) return

    const total_gross = items.reduce((sum, item) => sum + (item.gross_local || 0), 0)
    const total_net = items.reduce((sum, item) => sum + (item.net_local || 0), 0)
    const total_employees = new Set(items.map(item => item.employee_id)).size

    const { error } = await supabase
      .from('master_payrolls')
      .update({
        total_gross,
        total_net,
        total_employees,
        updated_at: new Date().toISOString()
      })
      .eq('id', payRunId)

    if (error) {
      console.error('Error updating pay run totals:', error)
      throw new Error('Failed to update pay run totals')
    }
  }

  // Update pay run status
  static async updatePayRunStatus(payRunId: string, status: 'draft' | 'pending' | 'approved' | 'closed'): Promise<void> {
    const { error } = await supabase
      .from('master_payrolls')
      .update({
        payroll_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', payRunId)

    if (error) {
      console.error('Error updating pay run status:', error)
      throw new Error('Failed to update pay run status')
    }

    await AuditLogger.logPrivilegedAction('payroll.status_change', 'payroll_run', { id: payRunId, status })
  }

  // Format currency
  static formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
}

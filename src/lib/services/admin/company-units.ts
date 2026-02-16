// @ts-nocheck - Types out of sync with DB schema; regenerate with `npx supabase gen types`
import { supabase } from '@/integrations/supabase/client'

export interface CompanyUnit {
  id: string
  company_id: string
  name: string
  kind: 'head_office' | 'project'
  created_at: string
  updated_at: string
  company?: {
    id: string
    name: string
    organization_id: string
  }
  pay_groups_count?: number
  employees_count?: number
}

export interface CreateCompanyUnitData {
  company_id: string
  name: string
  kind: 'head_office' | 'project'
}

export interface UpdateCompanyUnitData {
  name?: string
  kind?: 'head_office' | 'project'
}

export class CompanyUnitService {
  static async listCompanyUnits(companyId?: string): Promise<CompanyUnit[]> {
    let query = supabase
      .from('company_units')
      .select(`
        id,
        company_id,
        name,
        kind,
        created_at,
        updated_at,
        company:companies(id, name, organization_id),
        pay_groups:pay_groups(count),
        employee_master:employee_master(count)
      `)
      .order('created_at', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching company units:', error)
      throw new Error('Failed to fetch company units')
    }

    return data?.map(unit => ({
      ...unit,
      pay_groups_count: unit.pay_groups?.[0]?.count || 0,
      employees_count: unit.employee_master?.[0]?.count || 0
    })) || []
  }

  static async getCompanyUnit(id: string): Promise<CompanyUnit | null> {
    const { data, error } = await supabase
      .from('company_units')
      .select(`
        id,
        company_id,
        name,
        kind,
        created_at,
        updated_at,
        company:companies(id, name, organization_id),
        pay_groups:pay_groups(count),
        employee_master:employee_master(count)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching company unit:', error)
      return null
    }

    return {
      ...data,
      pay_groups_count: data.pay_groups?.[0]?.count || 0,
      employees_count: data.employee_master?.[0]?.count || 0
    }
  }

  static async createCompanyUnit(data: CreateCompanyUnitData): Promise<CompanyUnit> {
    const { data: result, error } = await supabase
      .from('company_units')
      .insert(data)
      .select(`
        id,
        company_id,
        name,
        kind,
        created_at,
        updated_at,
        company:companies(id, name, organization_id)
      `)
      .single()

    if (error) {
      console.error('Error creating company unit:', error)
      throw new Error('Failed to create company unit')
    }

    return result
  }

  static async updateCompanyUnit(id: string, data: UpdateCompanyUnitData): Promise<CompanyUnit> {
    const { data: result, error } = await supabase
      .from('company_units')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        id,
        company_id,
        name,
        kind,
        created_at,
        updated_at,
        company:companies(id, name, organization_id)
      `)
      .single()

    if (error) {
      console.error('Error updating company unit:', error)
      throw new Error('Failed to update company unit')
    }

    return result
  }

  static async deleteCompanyUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('company_units')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company unit:', error)
      throw new Error('Failed to delete company unit')
    }
  }
}


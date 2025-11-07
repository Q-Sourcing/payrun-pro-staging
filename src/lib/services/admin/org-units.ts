import { supabase } from '@/integrations/supabase/client'

export interface OrgUnit {
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

export interface CreateOrgUnitData {
  company_id: string
  name: string
  kind: 'head_office' | 'project'
}

export interface UpdateOrgUnitData {
  name?: string
  kind?: 'head_office' | 'project'
}

export class OrgUnitService {
  static async listOrgUnits(companyId?: string): Promise<OrgUnit[]> {
    let query = supabase
      .from('org_units')
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
      console.error('Error fetching org units:', error)
      throw new Error('Failed to fetch org units')
    }

    return data?.map(unit => ({
      ...unit,
      pay_groups_count: unit.pay_groups?.[0]?.count || 0,
      employees_count: unit.employee_master?.[0]?.count || 0
    })) || []
  }

  static async getOrgUnit(id: string): Promise<OrgUnit | null> {
    const { data, error } = await supabase
      .from('org_units')
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
      console.error('Error fetching org unit:', error)
      return null
    }

    return {
      ...data,
      pay_groups_count: data.pay_groups?.[0]?.count || 0,
      employees_count: data.employee_master?.[0]?.count || 0
    }
  }

  static async createOrgUnit(data: CreateOrgUnitData): Promise<OrgUnit> {
    const { data: result, error } = await supabase
      .from('org_units')
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
      console.error('Error creating org unit:', error)
      throw new Error('Failed to create org unit')
    }

    return result
  }

  static async updateOrgUnit(id: string, data: UpdateOrgUnitData): Promise<OrgUnit> {
    const { data: result, error } = await supabase
      .from('org_units')
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
      console.error('Error updating org unit:', error)
      throw new Error('Failed to update org unit')
    }

    return result
  }

  static async deleteOrgUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('org_units')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting org unit:', error)
      throw new Error('Failed to delete org unit')
    }
  }
}

import { supabase } from '@/integrations/supabase/client'

export interface Company {
  id: string
  organization_id: string
  name: string
  country_id?: string
  currency?: string
  created_at: string
  updated_at: string
  country?: {
    id: string
    name: string
    iso2: string
  }
  currency_info?: {
    code: string
    name: string
    symbol?: string
  }
  company_units_count?: number
}

export interface CreateCompanyData {
  organization_id: string
  name: string
  country_id?: string
  currency?: string
}

export interface UpdateCompanyData {
  name?: string
  country_id?: string
  currency?: string
}

export class CompanyService {
  static async listCompanies(organizationId?: string): Promise<Company[]> {
    let query = supabase
      .from('companies')
      .select(`
        id,
        organization_id,
        name,
        country_id,
        currency,
        created_at,
        updated_at,
        country:countries(id, name, iso2),
        currency_info:currencies(code, name, symbol),
        company_units:company_units(count)
      `)
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching companies:', error)
      throw new Error('Failed to fetch companies')
    }

    return data?.map(company => ({
      ...company,
      company_units_count: company.company_units?.[0]?.count || 0
    })) || []
  }

  static async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        organization_id,
        name,
        country_id,
        currency,
        created_at,
        updated_at,
        country:countries(id, name, iso2),
        currency_info:currencies(code, name, symbol),
        company_units:company_units(count)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching company:', error)
      return null
    }

    return {
      ...data,
      org_units_count: data.org_units?.[0]?.count || 0
    }
  }

  static async createCompany(data: CreateCompanyData): Promise<Company> {
    const { data: result, error } = await supabase
      .from('companies')
      .insert(data)
      .select(`
        id,
        organization_id,
        name,
        country_id,
        currency,
        created_at,
        updated_at,
        country:countries(id, name, iso2),
        currency_info:currencies(code, name, symbol)
      `)
      .single()

    if (error) {
      console.error('Error creating company:', error)
      throw new Error('Failed to create company')
    }

    return result
  }

  static async updateCompany(id: string, data: UpdateCompanyData): Promise<Company> {
    const { data: result, error } = await supabase
      .from('companies')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        id,
        organization_id,
        name,
        country_id,
        currency,
        created_at,
        updated_at,
        country:countries(id, name, iso2),
        currency_info:currencies(code, name, symbol)
      `)
      .single()

    if (error) {
      console.error('Error updating company:', error)
      throw new Error('Failed to update company')
    }

    return result
  }

  static async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company:', error)
      throw new Error('Failed to delete company')
    }
  }
}

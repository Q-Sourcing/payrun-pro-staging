import { supabase } from '@/integrations/supabase/client'

export interface Continent {
  id: string
  name: string
  created_at: string
  countries_count?: number
}

export interface Country {
  id: string
  name: string
  iso2: string
  continent_id: string
  created_at: string
  continent?: {
    id: string
    name: string
  }
  companies_count?: number
}

export interface Currency {
  code: string
  name: string
  symbol?: string
  created_at: string
}

export interface EmployeeType {
  id: string
  code: string
  name: string
  pay_basis: 'monthly' | 'daily' | 'hourly'
  active: boolean
  created_at: string
}

export class CatalogService {
  // Continents
  static async listContinents(): Promise<Continent[]> {
    const { data, error } = await supabase
      .from('continents')
      .select(`
        id,
        name,
        created_at,
        countries:countries(count)
      `)
      .order('name')

    if (error) {
      console.error('Error fetching continents:', error)
      throw new Error('Failed to fetch continents')
    }

    return data?.map(continent => ({
      ...continent,
      countries_count: continent.countries?.[0]?.count || 0
    })) || []
  }

  static async createContinent(name: string): Promise<Continent> {
    const { data, error } = await supabase
      .from('continents')
      .insert({ name })
      .select()
      .single()

    if (error) {
      console.error('Error creating continent:', error)
      throw new Error('Failed to create continent')
    }

    return data
  }

  // Countries
  static async listCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select(`
        id,
        name,
        iso2,
        continent_id,
        created_at,
        continent:continents(id, name),
        companies:companies(count)
      `)
      .order('name')

    if (error) {
      console.error('Error fetching countries:', error)
      throw new Error('Failed to fetch countries')
    }

    return data?.map(country => ({
      ...country,
      companies_count: country.companies?.[0]?.count || 0
    })) || []
  }

  static async createCountry(name: string, iso2: string, continentId: string): Promise<Country> {
    const { data, error } = await supabase
      .from('countries')
      .insert({ name, iso2, continent_id: continentId })
      .select(`
        id,
        name,
        iso2,
        continent_id,
        created_at,
        continent:continents(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating country:', error)
      throw new Error('Failed to create country')
    }

    return data
  }

  // Currencies
  static async listCurrencies(): Promise<Currency[]> {
    const { data, error } = await supabase
      .from('currencies')
      .select('code, name, symbol, created_at')
      .order('code')

    if (error) {
      console.error('Error fetching currencies:', error)
      throw new Error('Failed to fetch currencies')
    }

    return data || []
  }

  static async createCurrency(code: string, name: string, symbol?: string): Promise<Currency> {
    const { data, error } = await supabase
      .from('currencies')
      .insert({ code, name, symbol })
      .select()
      .single()

    if (error) {
      console.error('Error creating currency:', error)
      throw new Error('Failed to create currency')
    }

    return data
  }

  // Employee Types
  static async listEmployeeTypes(): Promise<EmployeeType[]> {
    const { data, error } = await supabase
      .from('employee_types')
      .select('id, code, name, pay_basis, active, created_at')
      .order('code')

    if (error) {
      console.error('Error fetching employee types:', error)
      throw new Error('Failed to fetch employee types')
    }

    return data || []
  }

  static async createEmployeeType(
    code: string, 
    name: string, 
    payBasis: 'monthly' | 'daily' | 'hourly'
  ): Promise<EmployeeType> {
    const { data, error } = await supabase
      .from('employee_types')
      .insert({ code, name, pay_basis: payBasis })
      .select()
      .single()

    if (error) {
      console.error('Error creating employee type:', error)
      throw new Error('Failed to create employee type')
    }

    return data
  }

  static async updateEmployeeType(
    id: string, 
    updates: Partial<Pick<EmployeeType, 'name' | 'pay_basis' | 'active'>>
  ): Promise<EmployeeType> {
    const { data, error } = await supabase
      .from('employee_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating employee type:', error)
      throw new Error('Failed to update employee type')
    }

    return data
  }

  static async deleteEmployeeType(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting employee type:', error)
      throw new Error('Failed to delete employee type')
    }
  }
}

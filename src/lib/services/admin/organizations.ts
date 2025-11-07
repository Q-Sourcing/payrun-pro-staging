import { supabase } from '@/integrations/supabase/client'

export interface Organization {
  id: string
  name: string
  description?: string
  active: boolean
  created_at: string
  updated_at: string
  companies_count?: number
  users_count?: number
}

export interface CreateOrganizationData {
  name: string
  description?: string
  active?: boolean
}

export interface UpdateOrganizationData {
  name?: string
  description?: string
  active?: boolean
}

export class OrganizationService {
  static async listOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        description,
        active,
        created_at,
        updated_at,
        companies:companies(count),
        user_profiles:user_profiles(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      throw new Error('Failed to fetch organizations')
    }

    return data?.map(org => ({
      ...org,
      companies_count: org.companies?.[0]?.count || 0,
      users_count: org.user_profiles?.[0]?.count || 0
    })) || []
  }

  static async getOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        description,
        active,
        created_at,
        updated_at,
        companies:companies(count),
        user_profiles:user_profiles(count)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return null
    }

    return {
      ...data,
      companies_count: data.companies?.[0]?.count || 0,
      users_count: data.user_profiles?.[0]?.count || 0
    }
  }

  static async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    const { data: result, error } = await supabase
      .from('organizations')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      throw new Error('Failed to create organization')
    }

    return result
  }

  static async updateOrganization(id: string, data: UpdateOrganizationData): Promise<Organization> {
    const { data: result, error } = await supabase
      .from('organizations')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      throw new Error('Failed to update organization')
    }

    return result
  }

  static async deleteOrganization(id: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization:', error)
      throw new Error('Failed to delete organization')
    }
  }

  static async toggleOrganizationStatus(id: string): Promise<Organization> {
    const { data: org } = await supabase
      .from('organizations')
      .select('active')
      .eq('id', id)
      .single()

    if (!org) {
      throw new Error('Organization not found')
    }

    return this.updateOrganization(id, { active: !org.active })
  }
}

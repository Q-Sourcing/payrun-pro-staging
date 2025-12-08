/**
 * Companies Service
 * Service functions for managing companies
 */

import { supabase } from '@/integrations/supabase/client';

export interface Company {
    id: string;
    organization_id: string;
    name: string;
    country_id?: string | null;
    currency?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateCompanyInput {
    name: string;
    organization_id: string;
    country_id?: string;
    currency?: string;
}

export class CompaniesService {
    /**
     * Get all companies for a specific organization
     */
    static async getCompaniesByOrganization(organizationId: string): Promise<Company[]> {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('organization_id', organizationId)
                .order('name');

            if (error) throw error;
            return (data || []) as Company[];
        } catch (error: any) {
            console.error('Error fetching companies:', error);
            throw new Error(`Failed to fetch companies: ${error.message}`);
        }
    }

    /**
     * Get all companies (for admin)
     */
    static async getAllCompanies(): Promise<Company[]> {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');

            if (error) throw error;
            return (data || []) as Company[];
        } catch (error: any) {
            console.error('Error fetching all companies:', error);
            throw new Error(`Failed to fetch companies: ${error.message}`);
        }
    }

    /**
     * Get a single company by ID
     */
    static async getCompanyById(id: string): Promise<Company | null> {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Company;
        } catch (error: any) {
            console.error('Error fetching company:', error);
            return null;
        }
    }

    /**
     * Create a new company
     */
    static async createCompany(companyData: CreateCompanyInput): Promise<Company> {
        try {
            const insertData: any = {
                name: companyData.name.trim(),
                organization_id: companyData.organization_id,
                country_id: companyData.country_id || null,
                currency: companyData.currency || null,
            };

            const { data, error } = await supabase
                .from('companies')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;
            return data as Company;
        } catch (error: any) {
            console.error('Error creating company:', error);
            throw new Error(`Failed to create company: ${error.message}`);
        }
    }

    /**
     * Update a company
     */
    static async updateCompany(id: string, companyData: Partial<CreateCompanyInput>): Promise<Company> {
        try {
            const updateData: any = {};
            if (companyData.name !== undefined) updateData.name = companyData.name.trim();
            if (companyData.country_id !== undefined) updateData.country_id = companyData.country_id;
            if (companyData.currency !== undefined) updateData.currency = companyData.currency;

            const { data, error } = await supabase
                .from('companies')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Company;
        } catch (error: any) {
            console.error('Error updating company:', error);
            throw new Error(`Failed to update company: ${error.message}`);
        }
    }

    /**
     * Delete a company
     */
    static async deleteCompany(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error deleting company:', error);
            throw new Error(`Failed to delete company: ${error.message}`);
        }
    }
}

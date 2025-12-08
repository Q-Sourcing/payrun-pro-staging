/**
 * Company Units Service
 * Service functions for managing company units
 */

import { supabase } from '@/integrations/supabase/client';

export interface CompanyUnit {
  id: string;
  company_id: string;
  name: string;
  kind?: 'head_office' | 'project' | null;
  description?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCompanyUnitInput {
  name: string;
  company_id: string;
  kind?: 'head_office' | 'project';
  description?: string;
}

export class CompanyUnitsService {
  /**
   * Get all company units for a specific company
   */
  static async getCompanyUnitsByCompany(companyId: string): Promise<CompanyUnit[]> {
    try {
      const { data, error } = await supabase
        .from('company_units')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as CompanyUnit[];
    } catch (error: any) {
      console.error('Error fetching company units:', error);
      throw new Error(`Failed to fetch company units: ${error.message}`);
    }
  }

  /**
   * Get all company units (for admin)
   */
  static async getAllCompanyUnits(): Promise<CompanyUnit[]> {
    try {
      const { data, error } = await supabase
        .from('company_units')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []) as CompanyUnit[];
    } catch (error: any) {
      console.error('Error fetching all company units:', error);
      throw new Error(`Failed to fetch company units: ${error.message}`);
    }
  }

  /**
   * Create a new company unit
   */
  static async createCompanyUnit(companyUnitData: CreateCompanyUnitInput): Promise<CompanyUnit> {
    try {
      const insertData: any = {
        name: companyUnitData.name.trim(),
        company_id: companyUnitData.company_id,
        kind: companyUnitData.kind || null,
        description: companyUnitData.description?.trim() || null,
        active: true,
      };
      
      const { data, error } = await supabase
        .from('company_units')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as CompanyUnit;
    } catch (error: any) {
      console.error('Error creating company unit:', error);
      throw new Error(`Failed to create company unit: ${error.message}`);
    }
  }

  /**
   * Update a company unit
   */
  static async updateCompanyUnit(id: string, companyUnitData: Partial<CreateCompanyUnitInput>): Promise<CompanyUnit> {
    try {
      const updateData: any = {};
      if (companyUnitData.name !== undefined) updateData.name = companyUnitData.name.trim();
      if (companyUnitData.kind !== undefined) updateData.kind = companyUnitData.kind;
      if (companyUnitData.description !== undefined) updateData.description = companyUnitData.description?.trim() || null;

      const { data, error } = await supabase
        .from('company_units')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CompanyUnit;
    } catch (error: any) {
      console.error('Error updating company unit:', error);
      throw new Error(`Failed to update company unit: ${error.message}`);
    }
  }

  /**
   * Delete (deactivate) a company unit
   */
  static async deleteCompanyUnit(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('company_units')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting company unit:', error);
      throw new Error(`Failed to delete company unit: ${error.message}`);
    }
  }
}


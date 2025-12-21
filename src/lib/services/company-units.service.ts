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
  category_id?: string | null;
  description?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateCompanyUnitInput {
  name?: string;
  kind?: 'head_office' | 'project';
  category_id?: string | null; // Deprecated but kept for compatibility
  categoryIds?: string[]; // New N:M support
  description?: string;
  active?: boolean;
}

export interface CreateCompanyUnitInput {
  name: string;
  company_id: string;
  kind?: 'head_office' | 'project';
  category_id?: string | null; // Deprecated
  categoryIds?: string[]; // New N:M support
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
   * Get all company units for a specific company and category
   */
  static async getCompanyUnitsByCompanyAndCategory(
    companyId: string,
    categoryId?: string,
    options?: { includeUnclassified: boolean }
  ): Promise<CompanyUnit[]> {
    try {
      // For fetching by category, we now need to join with company_unit_categories
      if (categoryId) {
        // If filtering by category, use the join table
        let query = supabase
          .from('company_units')
          .select(`
                *,
                company_unit_categories!inner(category_id)
            `)
          .eq('company_id', companyId)
          .eq('active', true);

        if (options?.includeUnclassified) {
          // "Unclassified" logic is tricky in N:M. It usually means "has NO categories".
          // Supabase filter for "not exists" is hard in one query.
          // For now, let's stick to standard filtering:
          // If categoryId is provided, we want units that HAVE this category.
          // If "includeUnclassified", maybe we fetch all and filter in memory or do a separate query.
          // Given the complexity, let's simplify:
          // 1. Fetch units with the category.
          // 2. If includeUnclassified, fetch units with NO categories (left join -> null check).

          // Actually, simplest is to just fetch ALL active units for company, then filter in memory if the dataset is small.
          // Assuming < 1000 units per company, this is safe.
          const { data: allUnits, error } = await supabase
            .from('company_units')
            .select(`
                    *,
                    company_unit_categories(category_id)
                `)
            .eq('company_id', companyId)
            .eq('active', true)
            .order('name');

          if (error) throw error;

          return (allUnits || []).filter(unit => {
            const cats = unit.company_unit_categories as any[];
            const hasCat = cats.some(c => c.category_id === categoryId);
            const hasNoCat = !cats || cats.length === 0;
            return hasCat || hasNoCat;
          }) as unknown as CompanyUnit[];

        } else {
          // Strict filter
          query = query.eq('company_unit_categories.category_id', categoryId);
          const { data, error } = await query.order('name');
          if (error) throw error;
          return (data || []) as CompanyUnit[];
        }
      } else {
        // No category filter -> return all
        return this.getCompanyUnitsByCompany(companyId);
      }


    } catch (error: any) {
      console.error('Error fetching company units by category:', error);
      throw new Error(`Failed to fetch company units: ${error.message}`);
    }
  } // End function


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
      // 1. Insert the unit
      const insertData: any = {
        name: companyUnitData.name.trim(),
        company_id: companyUnitData.company_id,
        kind: companyUnitData.kind || null,
        category_id: companyUnitData.category_id || null, // Keep legacy field populated if provided
        description: companyUnitData.description?.trim() || null,
        active: true,
      };

      const { data: unit, error } = await supabase
        .from('company_units')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // 2. Insert category mappings if provided
      if (companyUnitData.categoryIds && companyUnitData.categoryIds.length > 0) {
        const links = companyUnitData.categoryIds.map(catId => ({
          company_unit_id: unit.id,
          category_id: catId
        }));

        const { error: linkError } = await supabase
          .from('company_unit_categories')
          .insert(links);

        if (linkError) {
          console.error('Error linking categories to unit:', linkError);
          // Non-fatal? Or should we rollback? For MVP/Staging, log and continue, but ideally transaction.
        }
      }

      return unit as CompanyUnit;
    } catch (error: any) {
      console.error('Error creating company unit:', error);
      throw new Error(`Failed to create company unit: ${error.message}`);
    }
  }

  /**
   * Update a company unit
   */
  static async updateCompanyUnit(id: string, companyUnitData: UpdateCompanyUnitInput): Promise<CompanyUnit> {
    try {
      // 1. Update Unit Fields
      const updateData: any = {};
      if (companyUnitData.name !== undefined) updateData.name = companyUnitData.name.trim();
      if (companyUnitData.kind !== undefined) updateData.kind = companyUnitData.kind;
      if (companyUnitData.category_id !== undefined) updateData.category_id = companyUnitData.category_id;
      if (companyUnitData.description !== undefined) updateData.description = companyUnitData.description?.trim() || null;
      if (companyUnitData.active !== undefined) updateData.active = companyUnitData.active;

      let updatedUnit: CompanyUnit | null = null;

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase
          .from('company_units')
          .update(updateData)
          .eq('id', id)
          .select()
          .maybeSingle(); // Use maybeSingle to avoid PGRST116 if 0 rows

        if (error) throw error;
        updatedUnit = data as unknown as CompanyUnit;
      }

      // 2. Sync Categories if provided
      if (companyUnitData.categoryIds !== undefined) {
        // Full sync: Delete existing for this unit, insert new list
        // Delete
        await supabase.from('company_unit_categories').delete().eq('company_unit_id', id);

        // Insert new
        if (companyUnitData.categoryIds.length > 0) {
          const links = companyUnitData.categoryIds.map(catId => ({
            company_unit_id: id,
            category_id: catId
          }));
          await supabase.from('company_unit_categories').insert(links);
        }
      }

      // If we didn't update the unit itself, we might want to fetch it to return consistent data
      // OR just return null/mock if the caller handles it.
      // But let's fetch it if it wasn't updated, just effectively.
      if (!updatedUnit) {
        const { data } = await supabase
          .from('company_units')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        updatedUnit = data as unknown as CompanyUnit;
      }

      return updatedUnit!;
    } catch (error: any) {
      console.error('Error updating company unit:', error);
      throw new Error(`Failed to update company unit: ${error.message}`);
    }
  }

  /**
   * Get categories for a unit
   */
  static async getCategoriesForUnit(unitId: string): Promise<string[]> {
    const { data } = await supabase
      .from('company_unit_categories')
      .select('category_id')
      .eq('company_unit_id', unitId);

    return data?.map(d => d.category_id) || [];
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


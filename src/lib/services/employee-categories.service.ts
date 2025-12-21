/**
 * Employee Categories Service
 * Service functions for managing dynamic employee categories
 */

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type EmployeeCategory = Database['public']['Tables']['employee_categories']['Row'];
export type InsertEmployeeCategory = Database['public']['Tables']['employee_categories']['Insert'];
export type UpdateEmployeeCategory = Database['public']['Tables']['employee_categories']['Update'];

export class EmployeeCategoriesService {
    /**
     * Get all categories for an organization
     */
    static async getCategoriesByOrg(orgId: string): Promise<EmployeeCategory[]> {
        try {
            const { data, error } = await supabase
                .from('employee_categories')
                .select('*')
                .eq('organization_id', orgId)
                .eq('active', true)
                .order('label');

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            console.error('Error fetching employee categories:', error);
            throw new Error(`Failed to fetch employee categories: ${error.message}`);
        }
    }

    /**
     * Create a new category
     */
    static async createCategory(input: InsertEmployeeCategory): Promise<EmployeeCategory> {
        try {
            const { data, error } = await supabase
                .from('employee_categories')
                .insert(input)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error: any) {
            console.error('Error creating employee category:', error);
            throw new Error(`Failed to create employee category: ${error.message}`);
        }
    }

    /**
     * Update a category
     */
    static async updateCategory(id: string, input: UpdateEmployeeCategory): Promise<EmployeeCategory> {
        try {
            const { data, error } = await supabase
                .from('employee_categories')
                .update(input)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error: any) {
            console.error('Error updating employee category:', error);
            throw new Error(`Failed to update employee category: ${error.message}`);
        }
    }

    /**
     * Deactivate a category
     */
    static async deleteCategory(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('employee_categories')
                .update({ active: false })
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error deleting employee category:', error);
            throw new Error(`Failed to delete employee category: ${error.message}`);
        }
    }

    /**
     * Seed default categories for an organization if they don't exist
     */
    static async seedDefaults(orgId: string): Promise<void> {
        try {
            const { error } = await supabase.rpc('seed_default_categories', { org_id: orgId });
            if (error) throw error;
        } catch (error: any) {
            console.error('Error seeding default categories:', error);
            // We don't throw here as this might fail if the function doesn't exist yet
            // but the migration should have created it.
        }
    }
}

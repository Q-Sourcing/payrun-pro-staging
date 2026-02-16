// @ts-nocheck
/**
 * Sub-Departments Service
 * Service functions for managing sub-departments
 */

import { supabase } from '@/integrations/supabase/client';

export interface SubDepartment {
    id: string;
    name: string;
    company_unit_id: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateSubDepartmentInput {
    name: string;
    company_unit_id: string;
}

export class SubDepartmentsService {
    /**
     * Get all sub-departments for a specific company unit
     */
    static async getSubDepartmentsByCompanyUnit(companyUnitId: string): Promise<SubDepartment[]> {
        try {
            const { data, error } = await (supabase
                .from('sub_departments' as any) as any)
                .select('*')
                .eq('company_unit_id', companyUnitId)
                .order('name');

            if (error) throw error;
            return (data || []) as SubDepartment[];
        } catch (error: any) {
            console.error('Error fetching sub-departments:', error);
            throw new Error(`Failed to fetch sub-departments: ${error.message}`);
        }
    }

    /**
     * Get all sub-departments (for admin)
     */
    static async getAllSubDepartments(): Promise<SubDepartment[]> {
        try {
            const { data, error } = await (supabase
                .from('sub_departments' as any) as any)
                .select('*')
                .order('name');

            if (error) throw error;
            return (data || []) as SubDepartment[];
        } catch (error: any) {
            console.error('Error fetching all sub-departments:', error);
            throw new Error(`Failed to fetch sub-departments: ${error.message}`);
        }
    }

    /**
     * Get a single sub-department by ID
     */
    static async getSubDepartmentById(id: string): Promise<SubDepartment | null> {
        try {
            const { data, error } = await (supabase
                .from('sub_departments' as any) as any)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as SubDepartment;
        } catch (error: any) {
            console.error('Error fetching sub-department:', error);
            return null;
        }
    }

    /**
     * Create a new sub-department
     */
    static async createSubDepartment(subDepartmentData: CreateSubDepartmentInput): Promise<SubDepartment> {
        try {
            const insertData: any = {
                name: subDepartmentData.name.trim(),
                company_unit_id: subDepartmentData.company_unit_id,
            };

            const { data, error } = await (supabase
                .from('sub_departments' as any) as any)
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;
            return data as SubDepartment;
        } catch (error: any) {
            console.error('Error creating sub-department:', error);
            throw new Error(`Failed to create sub-department: ${error.message}`);
        }
    }

    /**
     * Update a sub-department
     */
    static async updateSubDepartment(id: string, subDepartmentData: Partial<CreateSubDepartmentInput>): Promise<SubDepartment> {
        try {
            const updateData: any = {};
            if (subDepartmentData.name !== undefined) updateData.name = subDepartmentData.name.trim();
            if (subDepartmentData.company_unit_id !== undefined) updateData.company_unit_id = subDepartmentData.company_unit_id;

            const { data, error } = await (supabase
                .from('sub_departments' as any) as any)
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as SubDepartment;
        } catch (error: any) {
            console.error('Error updating sub-department:', error);
            throw new Error(`Failed to update sub-department: ${error.message}`);
        }
    }

    /**
     * Delete a sub-department
     */
    static async deleteSubDepartment(id: string): Promise<void> {
        try {
            const { error } = await (supabase
                .from('sub_departments' as any) as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error deleting sub-department:', error);
            throw new Error(`Failed to delete sub-department: ${error.message}`);
        }
    }
}

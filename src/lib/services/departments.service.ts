/**
 * Departments Service
 * Service functions for managing departments
 */

import { supabase } from '@/integrations/supabase/client';

export interface Department {
    id: string;
    name: string;
    company_unit_id: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateDepartmentInput {
    name: string;
    company_unit_id: string;
}

export class DepartmentsService {
    /**
     * Get all departments for a specific company unit
     */
    static async getDepartmentsByCompanyUnit(companyUnitId: string): Promise<Department[]> {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('company_unit_id', companyUnitId)
                .order('name');

            if (error) throw error;
            return (data || []) as Department[];
        } catch (error: any) {
            console.error('Error fetching departments:', error);
            throw new Error(`Failed to fetch departments: ${error.message}`);
        }
    }

    /**
     * Get all departments (for admin)
     */
    static async getAllDepartments(): Promise<Department[]> {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (error) throw error;
            return (data || []) as Department[];
        } catch (error: any) {
            console.error('Error fetching all departments:', error);
            throw new Error(`Failed to fetch departments: ${error.message}`);
        }
    }

    /**
     * Get a single department by ID
     */
    static async getDepartmentById(id: string): Promise<Department | null> {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Department;
        } catch (error: any) {
            console.error('Error fetching department:', error);
            return null;
        }
    }

    /**
     * Create a new department
     */
    static async createDepartment(departmentData: CreateDepartmentInput): Promise<Department> {
        try {
            const insertData: any = {
                name: departmentData.name.trim(),
                company_unit_id: departmentData.company_unit_id,
            };

            const { data, error } = await supabase
                .from('departments')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;
            return data as Department;
        } catch (error: any) {
            console.error('Error creating department:', error);
            throw new Error(`Failed to create department: ${error.message}`);
        }
    }

    /**
     * Update a department
     */
    static async updateDepartment(id: string, departmentData: Partial<CreateDepartmentInput>): Promise<Department> {
        try {
            const updateData: any = {};
            if (departmentData.name !== undefined) updateData.name = departmentData.name.trim();
            if (departmentData.company_unit_id !== undefined) updateData.company_unit_id = departmentData.company_unit_id;

            const { data, error } = await supabase
                .from('departments')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Department;
        } catch (error: any) {
            console.error('Error updating department:', error);
            throw new Error(`Failed to update department: ${error.message}`);
        }
    }

    /**
     * Delete a department
     */
    static async deleteDepartment(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error deleting department:', error);
            throw new Error(`Failed to delete department: ${error.message}`);
        }
    }
}

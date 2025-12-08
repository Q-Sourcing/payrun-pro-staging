import { supabase } from '@/integrations/supabase/client';
import { Project, PROJECT_TYPE_PAY_TYPES } from '@/lib/types/projects';

export class ProjectsService {
    /**
     * Get all projects
     */
    static async getProjects(organizationId?: string): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    /**
     * Get projects filtered by project type (employee type)
     */
    static async getProjectsByType(
        projectType: 'manpower' | 'ippms' | 'expatriate',
        _organizationId: string
    ): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('project_type', projectType)
            .eq('status', 'active')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    /**
     * Get allowed pay types for a specific project
     */
    static async getAllowedPayTypes(projectId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('project_type, allowed_pay_types, supports_all_pay_types')
            .eq('id', projectId)
            .single();

        if (error) throw error;

        // If project supports all pay types, return all types for that project type
        if (data.supports_all_pay_types) {
            return [...PROJECT_TYPE_PAY_TYPES[data.project_type as keyof typeof PROJECT_TYPE_PAY_TYPES]];
        }

        // Otherwise return the specific allowed pay types
        return data.allowed_pay_types || [];
    }

    /**
     * Get a single project by ID
     */
    static async getProjectById(projectId: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return data;
    }

    /**
     * Create a new project
     */
    static async createProject(project: Partial<Project>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .insert(project)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update a project
     */
    static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

  /**
   * Alias for getProjectById
   */
  static async getProject(id: string) {
    return this.getProjectById(id);
  }
}

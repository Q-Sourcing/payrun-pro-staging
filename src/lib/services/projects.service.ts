import { supabase } from '@/integrations/supabase/client';
import { Project, PROJECT_TYPE_PAY_TYPES } from '@/lib/types/projects';

type ProjectOnboardingStepRow = { project_id: string; completed: boolean | null };

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
        _organizationId: string,
        options?: { onlyFullyOnboarded?: boolean }
    ): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('project_type', projectType)
            .eq('status', 'active')
            .order('name');

        if (error) throw error;
        const projects = data || [];
        if (!options?.onlyFullyOnboarded || projects.length === 0) {
            return projects;
        }

        const projectIds = projects.map((p) => p.id);
        const { data: steps, error: stepsError } = await supabase
            .from('project_onboarding_steps')
            .select('project_id, completed')
            .in('project_id', projectIds);

        if (stepsError) throw stepsError;

        const progressByProject = new Map<string, { total: number; completed: number }>();
        const typedSteps = (steps ?? []) as ProjectOnboardingStepRow[];
        typedSteps.forEach((step) => {
            const current = progressByProject.get(step.project_id) || { total: 0, completed: 0 };
            current.total += 1;
            if (step.completed) current.completed += 1;
            progressByProject.set(step.project_id, current);
        });

        return projects.filter((project) => {
            const progress = progressByProject.get(project.id);
            return !!progress && progress.total > 0 && progress.completed === progress.total;
        });
    }

    static async getProjectOnboardingProgress(projectId: string): Promise<{
        totalSteps: number;
        completedSteps: number;
        isFullyOnboarded: boolean;
    }> {
        const { data, error } = await supabase
            .from('project_onboarding_steps')
            .select('completed')
            .eq('project_id', projectId);

        if (error) throw error;

        const totalSteps = (data || []).length;
        const completedSteps = (data || []).filter((s) => s.completed).length;
        return {
            totalSteps,
            completedSteps,
            isFullyOnboarded: totalSteps > 0 && completedSteps === totalSteps,
        };
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

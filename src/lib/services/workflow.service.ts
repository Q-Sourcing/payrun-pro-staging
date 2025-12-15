import { supabase } from '@/integrations/supabase/client';
import { OrgSettings, ApprovalWorkflow, ApprovalWorkflowStep } from '../types/workflow';

export const workflowService = {
    // --- Org Settings ---

    async getOrgSettings(orgId: string): Promise<OrgSettings | null> {
        const { data, error } = await supabase
            .from('org_settings')
            .select('*')
            .eq('organization_id', orgId) // Map to organization_id
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore not found
            console.error('Error fetching org settings:', error);
            throw error;
        }
        return data;
    },

    async updateOrgSettings(settings: Partial<OrgSettings> & { org_id: string }): Promise<OrgSettings> {
        // Upsert logic
        const { data, error } = await supabase
            .from('org_settings')
            .upsert({
                organization_id: settings.org_id, // Map
                max_approval_levels: settings.max_approval_levels,
                approvals_sequential: settings.approvals_sequential,
                approvals_allow_delegation: settings.approvals_allow_delegation,
                approvals_rejection_comment_required: settings.approvals_rejection_comment_required,
                approvals_visibility_non_admin: settings.approvals_visibility_non_admin
            }, { onConflict: 'organization_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Workflows ---

    async getWorkflows(orgId: string): Promise<ApprovalWorkflow[]> {
        const { data, error } = await supabase
            .from('approval_workflows')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getWorkflowWithSteps(workflowId: string): Promise<ApprovalWorkflow | null> {
        const { data, error } = await supabase
            .from('approval_workflows')
            .select(`
        *,
        steps:approval_workflow_steps(*)
      `)
            .eq('id', workflowId)
            .single();

        if (error) throw error;

        // Sort steps
        if (data && data.steps) {
            data.steps.sort((a: any, b: any) => a.level - b.level);
        }

        return data;
    },

    async createWorkflow(workflow: Omit<ApprovalWorkflow, 'id' | 'created_at'>, steps: Omit<ApprovalWorkflowStep, 'id' | 'workflow_id'>[]): Promise<ApprovalWorkflow> {
        // 1. Create Workflow
        const { data: wfData, error: wfError } = await supabase
            .from('approval_workflows')
            .insert({
                org_id: workflow.org_id,
                name: workflow.name,
                description: workflow.description,
                is_active: workflow.is_active,
                is_default: workflow.is_default
            })
            .select()
            .single();

        if (wfError) throw wfError;

        // 2. Create Steps
        if (steps.length > 0) {
            const stepsToInsert = steps.map(step => ({
                workflow_id: wfData.id,
                level: step.level,
                approver_user_id: step.approver_user_id,
                sequence_number: step.sequence_number,
                notify_email: step.notify_email,
                notify_in_app: step.notify_in_app
            }));

            const { error: stepsError } = await supabase
                .from('approval_workflow_steps')
                .insert(stepsToInsert);

            if (stepsError) {
                // Cleanup workflow if steps fail (manual transaction)
                await supabase.from('approval_workflows').delete().eq('id', wfData.id);
                throw stepsError;
            }
        }

        return wfData;
    },

    async updateWorkflow(workflowId: string, updates: Partial<ApprovalWorkflow>) {
        const { data, error } = await supabase
            .from('approval_workflows')
            .update(updates)
            .eq('id', workflowId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateWorkflowSteps(workflowId: string, steps: Omit<ApprovalWorkflowStep, 'id' | 'workflow_id'>[]) {
        // Transaction-like replacement
        // 1. Delete existing
        const { error: delError } = await supabase
            .from('approval_workflow_steps')
            .delete()
            .eq('workflow_id', workflowId);

        if (delError) throw delError;

        // 2. Insert new
        if (steps.length > 0) {
            const stepsToInsert = steps.map(step => ({
                workflow_id: workflowId,
                level: step.level,
                approver_user_id: step.approver_user_id,
                sequence_number: step.sequence_number,
                notify_email: step.notify_email,
                notify_in_app: step.notify_in_app
            }));

            const { error: insError } = await supabase
                .from('approval_workflow_steps')
                .insert(stepsToInsert);

            if (insError) throw insError;
        }
    },

    async deleteWorkflow(workflowId: string) {
        const { error } = await supabase
            .from('approval_workflows')
            .delete()
            .eq('id', workflowId);
        if (error) throw error;
    }
};

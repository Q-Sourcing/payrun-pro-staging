import { supabase } from '@/integrations/supabase/client';
import {
    OrgSettings,
    ApprovalWorkflow,
    ApprovalWorkflowStep,
    PayrollApprovalScope,
    ApproverType,
    PayrollApprovalConfig
} from '../types/workflow';

export const workflowService = {
    // --- Org Settings ---

    async getOrgSettings(orgId: string): Promise<OrgSettings | null> {
        const { data, error } = await (supabase
            .from('org_settings') as any)
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching org settings:', error);
            throw error;
        }
        return data as OrgSettings;
    },

    async updateOrgSettings(settings: Partial<OrgSettings> & { org_id: string }): Promise<OrgSettings> {
        const { data, error } = await (supabase
            .from('org_settings') as any)
            .upsert({
                organization_id: settings.org_id,
                max_approval_levels: settings.max_approval_levels,
                approvals_sequential: settings.approvals_sequential,
                approvals_allow_delegation: settings.approvals_allow_delegation,
                approvals_rejection_comment_required: settings.approvals_rejection_comment_required,
                approvals_visibility_non_admin: settings.approvals_visibility_non_admin,
                payroll_approvals_enabled: settings.payroll_approvals_enabled,
                approvals_enabled_scopes: settings.approvals_enabled_scopes
            }, { onConflict: 'organization_id' })
            .select()
            .single();

        if (error) throw error;
        return data as OrgSettings;
    },

    // --- Workflows ---

    async getWorkflows(orgId: string): Promise<ApprovalWorkflow[]> {
        const { data, error } = await (supabase
            .from('approval_workflows') as any)
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as ApprovalWorkflow[];
    },

    async getWorkflowWithSteps(workflowId: string): Promise<ApprovalWorkflow | null> {
        const { data, error } = await (supabase
            .from('approval_workflows') as any)
            .select(`
                *,
                steps:approval_workflow_steps(*)
            `)
            .eq('id', workflowId)
            .single();

        if (error) throw error;

        // Fetch user info for each step
        const workflow = data as any;
        if (workflow && workflow.steps) {
            for (const step of workflow.steps) {
                if (step.approver_user_id) {
                    const { data: userData } = await (supabase
                        .from('user_profiles') as any)
                        .select('first_name, last_name, email')
                        .eq('id', step.approver_user_id)
                        .maybeSingle();
                    if (userData) {
                        step.approver_user = userData;
                    }
                }
                if (step.fallback_user_id) {
                    const { data: fallbackData } = await (supabase
                        .from('user_profiles') as any)
                        .select('first_name, last_name, email')
                        .eq('id', step.fallback_user_id)
                        .maybeSingle();
                    if (fallbackData) {
                        step.fallback_user = fallbackData;
                    }
                }
            }
            workflow.steps.sort((a: any, b: any) => (a.level || 0) - (b.level || 0));
        }

        return workflow as ApprovalWorkflow;
    },

    async createWorkflow(workflow: Omit<ApprovalWorkflow, 'id' | 'created_at'>, steps: Omit<ApprovalWorkflowStep, 'id' | 'workflow_id'>[]): Promise<ApprovalWorkflow> {
        const { data: wfData, error: wfError } = await (supabase
            .from('approval_workflows') as any)
            .insert({
                org_id: workflow.org_id,
                name: workflow.name,
                description: workflow.description,
                is_active: workflow.is_active,
                is_default: workflow.is_default,
                applies_to_scopes: workflow.applies_to_scopes || [],
                version: 1
            })
            .select()
            .single();

        if (wfError) throw wfError;

        if (steps.length > 0) {
            const stepsToInsert = steps.map(step => ({
                workflow_id: wfData.id,
                level: step.level,
                approver_user_id: step.approver_user_id,
                sequence_number: step.sequence_number,
                notify_email: step.notify_email,
                notify_in_app: step.notify_in_app,
                approver_type: step.approver_type || 'role',
                approver_role: step.approver_role,
                fallback_user_id: step.fallback_user_id
            }));

            const { error: stepsError } = await (supabase
                .from('approval_workflow_steps') as any)
                .insert(stepsToInsert);

            if (stepsError) {
                await (supabase.from('approval_workflows') as any).delete().eq('id', wfData.id);
                throw stepsError;
            }
        }

        return wfData as ApprovalWorkflow;
    },

    async updateWorkflow(workflowId: string, updates: Partial<ApprovalWorkflow>) {
        // Increment version on update
        const { data: currentWf } = await (supabase
            .from('approval_workflows') as any)
            .select('version')
            .eq('id', workflowId)
            .single();

        const nextVersion = ((currentWf as any)?.version || 1) + 1;

        const { data, error } = await (supabase
            .from('approval_workflows') as any)
            .update({
                ...updates,
                version: nextVersion,
                updated_at: new Date().toISOString()
            })
            .eq('id', workflowId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateWorkflowSteps(workflowId: string, steps: Omit<ApprovalWorkflowStep, 'id' | 'workflow_id'>[]) {
        const { error: delError } = await (supabase
            .from('approval_workflow_steps') as any)
            .delete()
            .eq('workflow_id', workflowId);

        if (delError) throw delError;

        if (steps.length > 0) {
            const stepsToInsert = steps.map(step => ({
                workflow_id: workflowId,
                level: step.level,
                approver_user_id: step.approver_user_id,
                sequence_number: step.sequence_number,
                notify_email: step.notify_email,
                notify_in_app: step.notify_in_app,
                approver_type: step.approver_type || 'role',
                approver_role: step.approver_role,
                fallback_user_id: step.fallback_user_id
            }));

            const { error: insError } = await (supabase
                .from('approval_workflow_steps') as any)
                .insert(stepsToInsert);

            if (insError) throw insError;
        }

        // Also trigger a version increment even if only steps changed
        const { data: currentWf } = await (supabase
            .from('approval_workflows') as any)
            .select('version')
            .eq('id', workflowId)
            .single();

        await (supabase
            .from('approval_workflows') as any)
            .update({
                version: ((currentWf as any)?.version || 1) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', workflowId);
    },

    async deleteWorkflow(workflowId: string) {
        const { error } = await (supabase
            .from('approval_workflows') as any)
            .delete()
            .eq('id', workflowId);
        if (error) throw error;
    },

    // --- Approval Actions ---

    async resolveApproversForStep(step: ApprovalWorkflowStep, orgId: string): Promise<string[]> {
        if (step.approver_type === 'individual') {
            return step.approver_user_id ? [step.approver_user_id] : [];
        }

        if (step.approver_type === 'role' || step.approver_type === 'hybrid') {
            const role = step.approver_role;
            if (!role) return [];

            // Fetch users with this role in the organization
            const { data: users, error } = await (supabase
                .from('user_profiles') as any)
                .select('id')
                .eq('is_active', true)
                .filter('role', 'eq', role); // simplified, assuming role column exists in user_profiles or mapped

            if (error) {
                console.error('Error resolving role approvers:', error);
                // Fallback to individual if hybrid
                if (step.approver_type === 'hybrid' && step.fallback_user_id) {
                    return [step.fallback_user_id];
                }
                return [];
            }

            const userIds = users?.map((u: any) => u.id) || [];

            // If no users found for role and it's hybrid, use fallback
            if (userIds.length === 0 && step.approver_type === 'hybrid' && step.fallback_user_id) {
                return [step.fallback_user_id];
            }

            return userIds;
        }

        return [];
    },

    async triggerApprovals(payrunId: string, orgId: string, scope: PayrollApprovalScope): Promise<boolean> {
        // 1. Find active workflow for this scope
        const { data: workflows, error: wfError } = await (supabase
            .from('approval_workflows') as any)
            .select('*')
            .eq('org_id', orgId)
            .eq('is_active', true)
            .contains('applies_to_scopes', [scope]);

        if (wfError || !workflows || workflows.length === 0) {
            console.log(`No active workflow found for scope: ${scope}`);
            return false;
        }

        // Use the first matching workflow or a default one
        const workflow = workflows[0] as any;

        // 2. Clear existing stages if any
        await (supabase.from('payrun_approval_steps') as any).delete().eq('payrun_id', payrunId);

        // 3. Get steps
        const { data: steps, error: stepsError } = await (supabase
            .from('approval_workflow_steps') as any)
            .select('*')
            .eq('workflow_id', workflow.id)
            .order('level', { ascending: true });

        if (stepsError || !steps || steps.length === 0) return false;

        // 4. Create action instances
        const stepsToInsert = [];
        for (const step of steps) {
            const potentialApprovers = await this.resolveApproversForStep(step as any, orgId);

            // Simple implementation: level 1 pending.
            stepsToInsert.push({
                payrun_id: payrunId,
                workflow_step_id: step.id,
                level: step.level,
                status: step.level === 1 ? 'pending' : 'skipped',
                workflow_version: workflow.version,
                approver_role: step.approver_role,
                approver_user_id: step.approver_type === 'individual' ? step.approver_user_id : null
            });
        }

        if (stepsToInsert.length > 0) {
            const { error: insError } = await (supabase
                .from('payrun_approval_steps') as any)
                .insert(stepsToInsert);
            if (insError) throw insError;
        }

        return true;
    },

    async overrideApproval(payrunId: string, level: number, reason: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // 1. Update the step
        const { error } = await (supabase
            .from('payrun_approval_steps') as any)
            .update({
                status: 'approved_overridden',
                override_reason: reason,
                override_by: user.id,
                override_at: new Date().toISOString(),
                actioned_by: user.id,
                actioned_at: new Date().toISOString()
            })
            .eq('payrun_id', payrunId)
            .eq('level', level);

        if (error) throw error;

        // 2. Clear pending status for this level if any other records exist
        // (usually there's only one record per level in my simple implementation)

        // 3. Trigger next level if exists
        const { data: nextSteps } = await (supabase
            .from('payrun_approval_steps') as any)
            .select('id')
            .eq('payrun_id', payrunId)
            .eq('level', level + 1);

        if (nextSteps && nextSteps.length > 0) {
            await (supabase
                .from('payrun_approval_steps') as any)
                .update({ status: 'pending' })
                .eq('payrun_id', payrunId)
                .eq('level', level + 1);
        }

        // 4. Audit Log
        await this.logAudit({
            user_id: user.id,
            action: 'OVERRIDE_APPROVAL',
            resource: `payrun:${payrunId}`,
            details: { level, reason, payrun_id: payrunId },
            result: 'success'
        });
    },

    async logAudit(params: {
        user_id?: string;
        action: string;
        resource: string;
        details: any;
        result: 'success' | 'failure' | 'denied';
    }) {
        try {
            await (supabase
                .from('audit_logs') as any)
                .insert({
                    user_id: params.user_id,
                    action: params.action,
                    resource: params.resource,
                    details: params.details,
                    result: params.result,
                    timestamp: new Date().toISOString()
                });
        } catch (error) {
            console.error('Failed to log audit:', error);
        }
    },

    // --- Per-Type Approval Configs ---

    async getApprovalConfigs(orgId: string): Promise<PayrollApprovalConfig[]> {
        const { data, error } = await (supabase
            .from('payroll_approval_configs') as any)
            .select(`
                *,
                categories:payroll_approval_categories(category_id)
            `)
            .eq('organization_id', orgId);

        if (error) throw error;

        return (data || []).map((config: any) => ({
            ...config,
            categories: config.categories?.map((c: any) => c.category_id) || []
        })) as PayrollApprovalConfig[];
    },

    async updateApprovalConfig(orgId: string, config: Partial<PayrollApprovalConfig> & { name: string, categories: string[] }): Promise<void> {
        const isNew = !config.id;

        // 1. Upsert config
        const { data: configData, error: configError } = await (supabase
            .from('payroll_approval_configs') as any)
            .upsert({
                id: config.id,
                organization_id: orgId,
                name: config.name,
                description: config.description,
                is_enabled: config.is_enabled ?? true,
                workflow_id: config.workflow_id
            }, { onConflict: 'id' })
            .select()
            .single();

        if (configError) throw configError;

        const configId = configData.id;

        // 2. Update categories (delete then insert for simplicity)
        if (!isNew) {
            await (supabase
                .from('payroll_approval_categories') as any)
                .delete()
                .eq('config_id', configId);
        }

        if (config.categories.length > 0) {
            const { error: catError } = await (supabase
                .from('payroll_approval_categories') as any)
                .insert(config.categories.map(catId => ({
                    config_id: configId,
                    category_id: catId
                })));

            if (catError) throw catError;
        }
    },

    async deleteApprovalConfig(configId: string): Promise<void> {
        const { error } = await (supabase
            .from('payroll_approval_configs') as any)
            .delete()
            .eq('id', configId);
        if (error) throw error;
    },

    // --- Notification Templates ---

    async getNotificationTemplates(): Promise<any[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch templates where org_id is NULL (system defaults) OR org_id matches user's org
        // Note: RLS handles the filtering, so we just select *
        const { data, error } = await (supabase as any)
            .from('notification_templates')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching templates:', error);
            // Return empty array if table doesn't exist yet to prevent crash
            return [];
        }
        return data || [];
    },

    async updateNotificationTemplate(id: string, updates: any): Promise<any> {
        const { data, error } = await (supabase as any)
            .from('notification_templates')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- My Approvals ---

    async getMyApprovals(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<any[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch steps assigned to user directly
        // TO DO: Also fetch steps assigned to roles the user has (requires more complex query or stored proc)
        // For compliance simplicity, we might only support direct assignment or resolved role assignment at creation

        let query = (supabase as any)
            .from('payrun_approval_steps')
            .select(`
                *,
                pay_run:payrun_id (
                    id,
                    period_start,
                    period_end,
                    payment_date,
                    status
                )
            `)
            .eq('approver_user_id', user.id)
            .order('created_at', { ascending: false });

        if (status === 'pending') {
            query = query.eq('status', 'pending');
        } else if (status === 'approved') {
            query = query.in('status', ['approved', 'approved_overridden']);
        } else {
            query = query.eq('status', 'rejected');
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async approvePayrunStep(stepId: string, comments?: string): Promise<void> {
        const { error } = await (supabase.rpc as any)('approve_payrun_step', {
            step_id: stepId,
            comments_text: comments || null
        });
        if (error) throw error;
    },

    async rejectPayrunStep(stepId: string, comments: string): Promise<void> {
        const { error } = await (supabase.rpc as any)('reject_payrun_step', {
            step_id: stepId,
            comments_text: comments
        });
        if (error) throw error;
    }
};


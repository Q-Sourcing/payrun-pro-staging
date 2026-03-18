// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

// Lazy accessor to handle potential initialization timing issues
const getClient = () => {
    if (supabase) return supabase;
    // Fallback: re-import at runtime
    const mod = require('@/integrations/supabase/client');
    return mod.supabase;
};
import {
    OrgSettings,
    ApprovalWorkflow,
    ApprovalWorkflowStep,
    PayrollApprovalScope,
    ApproverType,
    PayrollApprovalConfig,
    ApprovalWorkflowCriteria,
    ApprovalWorkflowFollowup,
    ApprovalWorkflowMessage,
    ApprovalGroup,
    ApprovalGroupMember,
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
                org_id: settings.org_id,
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

        const workflow = data as any;
        if (workflow && workflow.steps) {
            for (const step of workflow.steps) {
                if (step.approver_user_id) {
                    const { data: userData } = await (supabase
                        .from('user_profiles') as any)
                        .select('first_name, last_name, email')
                        .eq('id', step.approver_user_id)
                        .maybeSingle();
                    if (userData) step.approver_user = userData;
                }
                if (step.fallback_user_id) {
                    const { data: fallbackData } = await (supabase
                        .from('user_profiles') as any)
                        .select('first_name, last_name, email')
                        .eq('id', step.fallback_user_id)
                        .maybeSingle();
                    if (fallbackData) step.fallback_user = fallbackData;
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
                version: 1,
                created_by: (await supabase.auth.getUser()).data.user?.id,
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
                fallback_user_id: step.fallback_user_id,
                approver_designation_id: step.approver_designation_id,
                approver_department_id: step.approver_department_id,
                approver_group_id: step.approver_group_id,
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
                updated_at: new Date().toISOString(),
                updated_by: (await supabase.auth.getUser()).data.user?.id,
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
                fallback_user_id: step.fallback_user_id,
                approver_designation_id: step.approver_designation_id,
                approver_department_id: step.approver_department_id,
                approver_group_id: step.approver_group_id,
            }));

            const { error: insError } = await (supabase
                .from('approval_workflow_steps') as any)
                .insert(stepsToInsert);

            if (insError) throw insError;
        }

        const { data: currentWf } = await (supabase
            .from('approval_workflows') as any)
            .select('version')
            .eq('id', workflowId)
            .single();

        await (supabase
            .from('approval_workflows') as any)
            .update({
                version: ((currentWf as any)?.version || 1) + 1,
                updated_at: new Date().toISOString(),
                updated_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .eq('id', workflowId);
    },

    async deleteWorkflow(workflowId: string) {
        // Check if workflow is in use
        const { data: configs } = await (supabase
            .from('payroll_approval_configs') as any)
            .select('id, name')
            .eq('workflow_id', workflowId);

        if (configs && configs.length > 0) {
            throw new Error(`This workflow is assigned to: ${configs.map((c: any) => c.name).join(', ')}. Reassign before deleting.`);
        }

        const { error } = await (supabase
            .from('approval_workflows') as any)
            .delete()
            .eq('id', workflowId);
        if (error) throw error;
    },

    async duplicateWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
        const wf = await this.getWorkflowWithSteps(workflowId);
        if (!wf) throw new Error('Workflow not found');

        const newWf = await this.createWorkflow(
            {
                org_id: wf.org_id,
                name: `${wf.name} (Copy)`,
                description: wf.description,
                is_active: false,
                is_default: false,
                applies_to_scopes: wf.applies_to_scopes,
            },
            (wf.steps || []).map(s => ({
                level: s.level,
                sequence_number: s.sequence_number,
                notify_email: s.notify_email,
                notify_in_app: s.notify_in_app,
                approver_type: s.approver_type,
                approver_role: s.approver_role,
                approver_user_id: s.approver_user_id,
                fallback_user_id: s.fallback_user_id,
                approver_designation_id: s.approver_designation_id,
                approver_department_id: s.approver_department_id,
                approver_group_id: s.approver_group_id,
            }))
        );

        // Copy criteria
        const { data: criteria } = await (supabase.from('approval_workflow_criteria') as any)
            .select('*').eq('workflow_id', workflowId);
        if (criteria?.length) {
            await (supabase.from('approval_workflow_criteria') as any).insert(
                criteria.map((c: any) => ({ workflow_id: newWf.id, field: c.field, operator: c.operator, value: c.value, sequence_number: c.sequence_number }))
            );
        }

        // Copy followup
        const { data: followup } = await (supabase.from('approval_workflow_followups') as any)
            .select('*').eq('workflow_id', workflowId).maybeSingle();
        if (followup) {
            await (supabase.from('approval_workflow_followups') as any).insert({
                workflow_id: newWf.id, is_enabled: followup.is_enabled, followup_type: followup.followup_type,
                days_after: followup.days_after, repeat_interval_days: followup.repeat_interval_days, send_at_time: followup.send_at_time,
            });
        }

        // Copy messages
        const { data: messages } = await (supabase.from('approval_workflow_messages') as any)
            .select('*').eq('workflow_id', workflowId);
        if (messages?.length) {
            await (supabase.from('approval_workflow_messages') as any).insert(
                messages.map((m: any) => ({
                    workflow_id: newWf.id, event_type: m.event_type, from_type: m.from_type,
                    to_type: m.to_type, subject: m.subject, body_content: m.body_content, is_active: m.is_active,
                }))
            );
        }

        return newWf;
    },

    async setDefaultWorkflow(orgId: string, workflowId: string) {
        // Unset all defaults for this org
        await (supabase.from('approval_workflows') as any)
            .update({ is_default: false })
            .eq('org_id', orgId);
        // Set the new default
        await (supabase.from('approval_workflows') as any)
            .update({ is_default: true })
            .eq('id', workflowId);
    },

    // --- Criteria (Phase 4) ---

    async getCriteria(workflowId: string): Promise<ApprovalWorkflowCriteria[]> {
        const { data, error } = await (supabase.from('approval_workflow_criteria') as any)
            .select('*')
            .eq('workflow_id', workflowId)
            .order('sequence_number');
        if (error) throw error;
        return (data || []) as ApprovalWorkflowCriteria[];
    },

    async saveCriteria(workflowId: string, criteria: Omit<ApprovalWorkflowCriteria, 'id' | 'workflow_id' | 'created_at'>[]) {
        await (supabase.from('approval_workflow_criteria') as any).delete().eq('workflow_id', workflowId);
        if (criteria.length > 0) {
            const { error } = await (supabase.from('approval_workflow_criteria') as any).insert(
                criteria.map((c, i) => ({ workflow_id: workflowId, field: c.field, operator: c.operator, value: c.value, sequence_number: i }))
            );
            if (error) throw error;
        }
    },

    // --- Follow-ups (Phase 5) ---

    async getFollowup(workflowId: string): Promise<ApprovalWorkflowFollowup | null> {
        const { data, error } = await (supabase.from('approval_workflow_followups') as any)
            .select('*')
            .eq('workflow_id', workflowId)
            .maybeSingle();
        if (error) throw error;
        return data as ApprovalWorkflowFollowup | null;
    },

    async saveFollowup(workflowId: string, followup: Omit<ApprovalWorkflowFollowup, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>) {
        const { error } = await (supabase.from('approval_workflow_followups') as any)
            .upsert({
                workflow_id: workflowId,
                is_enabled: followup.is_enabled,
                followup_type: followup.followup_type,
                days_after: followup.days_after,
                repeat_interval_days: followup.repeat_interval_days,
                send_at_time: followup.send_at_time,
            }, { onConflict: 'workflow_id' });
        if (error) throw error;
    },

    // --- Messages (Phase 6) ---

    async getMessages(workflowId: string): Promise<ApprovalWorkflowMessage[]> {
        const { data, error } = await (supabase.from('approval_workflow_messages') as any)
            .select('*')
            .eq('workflow_id', workflowId);
        if (error) throw error;
        return (data || []) as ApprovalWorkflowMessage[];
    },

    async saveMessage(workflowId: string, message: Omit<ApprovalWorkflowMessage, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>) {
        const { error } = await (supabase.from('approval_workflow_messages') as any)
            .upsert({
                workflow_id: workflowId,
                event_type: message.event_type,
                from_type: message.from_type,
                to_type: message.to_type,
                subject: message.subject,
                body_content: message.body_content,
                is_active: message.is_active,
            }, { onConflict: 'workflow_id,event_type' });
        if (error) throw error;
    },

    async deleteMessage(workflowId: string, eventType: string) {
        await (supabase.from('approval_workflow_messages') as any)
            .delete()
            .eq('workflow_id', workflowId)
            .eq('event_type', eventType);
    },

    // --- Approval Groups ---

    async getGroups(orgId: string): Promise<ApprovalGroup[]> {
        const { data, error } = await (supabase.from('approval_groups') as any)
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return (data || []) as ApprovalGroup[];
    },

    // --- Approval Actions ---

    async resolveApproversForStep(step: ApprovalWorkflowStep, orgId: string): Promise<string[]> {
        if (step.approver_type === 'individual') {
            return step.approver_user_id ? [step.approver_user_id] : [];
        }

        if (step.approver_type === 'role' || step.approver_type === 'hybrid') {
            const role = step.approver_role;
            if (!role) return [];

            const { data: users, error } = await (supabase
                .from('user_profiles') as any)
                .select('id')
                .eq('is_active', true)
                .filter('role', 'eq', role);

            if (error) {
                console.error('Error resolving role approvers:', error);
                if (step.approver_type === 'hybrid' && step.fallback_user_id) {
                    return [step.fallback_user_id];
                }
                return [];
            }

            const userIds = users?.map((u: any) => u.id) || [];

            if (userIds.length === 0 && step.approver_type === 'hybrid' && step.fallback_user_id) {
                return [step.fallback_user_id];
            }

            return userIds;
        }

        return [];
    },

    async triggerApprovals(payrunId: string, orgId: string, scope: PayrollApprovalScope): Promise<boolean> {
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

        const workflow = workflows[0] as any;

        await (supabase.from('payrun_approval_steps') as any).delete().eq('payrun_id', payrunId);

        const { data: steps, error: stepsError } = await (supabase
            .from('approval_workflow_steps') as any)
            .select('*')
            .eq('workflow_id', workflow.id)
            .order('level', { ascending: true });

        if (stepsError || !steps || steps.length === 0) return false;

        const stepsToInsert = [];
        for (const step of steps) {
            const potentialApprovers = await this.resolveApproversForStep(step as any, orgId);

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

        const { data, error } = await (supabase as any)
            .from('notification_templates')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching templates:', error);
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

        let query = (supabase as any)
            .from('payrun_approval_steps')
            .select(`
                *,
                pay_run:payrun_id (
                    id,
                    pay_period_start,
                    pay_period_end,
                    pay_run_date,
                    status,
                    approval_status,
                    total_gross,
                    pay_group_id
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

    async approvePayrunStep(payrunId: string, comments?: string): Promise<void> {
        const { error } = await (supabase.rpc as any)('approve_payrun_step', {
            payrun_id_input: payrunId,
            comments_input: comments || null
        });
        if (error) throw error;
    },

    async rejectPayrunStep(payrunId: string, comments: string): Promise<void> {
        const { error } = await (supabase.rpc as any)('reject_payrun_step', {
            payrun_id_input: payrunId,
            comments_input: comments
        });
        if (error) throw error;
    }
};

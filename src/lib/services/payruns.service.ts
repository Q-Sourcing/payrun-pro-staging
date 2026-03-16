// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { PayrunApprovalStep, ApprovalActionResponse } from '../types/workflow';
import { AuditLogger } from './audit-logger';

async function triggerApprovalEmail(
    payrunId: string,
    eventKey: 'PAYRUN_SUBMITTED' | 'PAYRUN_APPROVED' | 'PAYRUN_REJECTED' | 'APPROVAL_REMINDER',
    recipientUserId: string
) {
    try {
        await supabase.functions.invoke('trigger-approval-email', {
            body: {
                payrun_id: payrunId,
                event_key: eventKey,
                recipient_user_id: recipientUserId,
            },
        });
    } catch (err) {
        // Non-fatal: log but don't block the main flow
        console.warn('trigger-approval-email failed (non-fatal):', err);
    }
}

export class PayrunsService {

    // --- Approval Actions (RPCs) ---

    static async submitForApproval(payrunId: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('submit_payrun_for_approval', {
            payrun_id_input: payrunId
        });

        if (error) throw error;

        const result = data as ApprovalActionResponse;

        await AuditLogger.logPrivilegedAction('payrun.submit', 'pay_run', { id: payrunId });

        // Notify the first-level approver if workflow was created
        if (result?.next_approver) {
            await triggerApprovalEmail(payrunId, 'PAYRUN_SUBMITTED', result.next_approver);
        }

        return result;
    }

    static async approveStep(payrunId: string, comments?: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('approve_payrun_step', {
            payrun_id_input: payrunId,
            comments_input: comments || null
        });

        if (error) throw error;

        const result = data as ApprovalActionResponse;

        await AuditLogger.logPrivilegedAction('payrun.approve', 'pay_run', { id: payrunId, comments });

        if (result?.status === 'approved') {
            // Fully approved — notify the submitter
            const { data: payrun } = await supabase
                .from('pay_runs')
                .select('created_by, approval_submitted_by')
                .eq('id', payrunId)
                .maybeSingle();

            const notifyUserId = payrun?.approval_submitted_by || payrun?.created_by;
            if (notifyUserId) {
                await triggerApprovalEmail(payrunId, 'PAYRUN_APPROVED', notifyUserId);
            }
        } else if (result?.status === 'progressing' && result?.next_level) {
            // Progressing to next level — fetch and notify the next approver
            const { data: nextStep } = await supabase
                .from('payrun_approval_steps')
                .select('approver_user_id')
                .eq('payrun_id', payrunId)
                .eq('level', result.next_level)
                .maybeSingle();

            if (nextStep?.approver_user_id) {
                await triggerApprovalEmail(payrunId, 'PAYRUN_SUBMITTED', nextStep.approver_user_id);
            }
        }

        return result;
    }

    static async rejectStep(payrunId: string, comments: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('reject_payrun_step', {
            payrun_id_input: payrunId,
            comments_input: comments
        });

        if (error) throw error;

        const result = data as ApprovalActionResponse;

        await AuditLogger.logPrivilegedAction('payrun.reject', 'pay_run', { id: payrunId, comments });

        // Notify the submitter of rejection
        const { data: payrun } = await supabase
            .from('pay_runs')
            .select('created_by, approval_submitted_by')
            .eq('id', payrunId)
            .maybeSingle();

        const notifyUserId = payrun?.approval_submitted_by || payrun?.created_by;
        if (notifyUserId) {
            await triggerApprovalEmail(payrunId, 'PAYRUN_REJECTED', notifyUserId);
        }

        return result;
    }

    static async delegateStep(payrunId: string, newApproverId: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('delegate_approval_step', {
            payrun_id_input: payrunId,
            new_approver_id: newApproverId
        });

        if (error) throw error;
        return data as ApprovalActionResponse;
    }

    static async returnToDraft(payrunId: string): Promise<{ success: boolean }> {
        const { error } = await supabase.rpc('return_payrun_to_draft', {
            payrun_id_input: payrunId
        });

        if (error) throw error;

        await AuditLogger.logPrivilegedAction('payrun.reset', 'pay_run', { id: payrunId });
        return { success: true };
    }

    // --- Fetching Data ---

    static async getApprovalSteps(payrunId: string): Promise<PayrunApprovalStep[]> {
        const { data, error } = await supabase
            .from('payrun_approval_steps')
            .select(`
                *,
                approver:approver_user_id(first_name, last_name),
                actioned_by_user:actioned_by(first_name, last_name),
                original_approver:original_approver_id(first_name, last_name),
                delegated_by_user:delegated_by(first_name, last_name)
            `)
            .eq('payrun_id', payrunId)
            .order('level', { ascending: true });

        if (error) throw error;

        return data.map(step => ({
            ...step,
            approver: step.approver?.[0] || step.approver,
            actioned_by_user: step.actioned_by_user,
        })) as unknown as PayrunApprovalStep[];
    }

    static async getPayrunStatus(payrunId: string) {
        const { data, error } = await supabase
            .from('pay_runs')
            .select('status, approval_status, approval_current_level')
            .eq('id', payrunId)
            .single();

        if (error) throw error;
        return data;
    }

    // Returns the current user's active approval step for a payrun (if any)
    static async getMyStepForPayrun(payrunId: string): Promise<PayrunApprovalStep | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('payrun_approval_steps')
            .select('*')
            .eq('payrun_id', payrunId)
            .eq('approver_user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (error) return null;
        return data as unknown as PayrunApprovalStep | null;
    }
}

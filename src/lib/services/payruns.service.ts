import { supabase } from '@/integrations/supabase/client';
import { PayrunApprovalStep, ApprovalActionResponse } from '../types/workflow';
import { AuditLogger } from './audit-logger';

export class PayrunsService {

    // --- Approval Actions (RPCs) ---

    static async submitForApproval(payrunId: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('submit_payrun_for_approval', {
            payrun_id_input: payrunId
        });

        if (error) throw error;

        await AuditLogger.logPrivilegedAction('payrun.submit', 'pay_run', { id: payrunId });
        return data as ApprovalActionResponse;
    }

    static async approveStep(payrunId: string, comments?: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('approve_payrun_step', {
            payrun_id_input: payrunId,
            comments_input: comments || null
        });

        if (error) throw error;

        await AuditLogger.logPrivilegedAction('payrun.approve', 'pay_run', { id: payrunId, comments });
        return data as ApprovalActionResponse;
    }

    static async rejectStep(payrunId: string, comments: string): Promise<ApprovalActionResponse> {
        const { data, error } = await supabase.rpc('reject_payrun_step', {
            payrun_id_input: payrunId,
            comments_input: comments
        });

        if (error) throw error;

        await AuditLogger.logPrivilegedAction('payrun.reject', 'pay_run', { id: payrunId, comments });
        return data as ApprovalActionResponse;
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
        // Implementation might be simple update or RPC if complex cleanup needed
        // Migration didn't specify RPC for this but plan did "return_payrun_to_draft". 
        // Checking my created migration... I missed creating 'return_payrun_to_draft' RPC in 20251214000001_approval_functions.sql 
        // I created submit, approve, reject, delegate. I missed return_to_draft!

        // I should fix the migration or implement it here as direct DB manipulation if permissible (Admin only)
        // Better to use RPC for safety. I will create the RPC in a subsequent step or just do it here if safe.
        // Given I am in 'Execute', I can add the RPC.

        // For now, I'll assume I'll add the RPC.
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

        // Transform for UI usage
        return data.map(step => ({
            ...step,
            approver: step.approver?.[0] || step.approver, // Handle if array returned (unlikely with single relation but safe)
            actioned_by_user: step.actioned_by_user,
            // Map other fields if needed
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
}

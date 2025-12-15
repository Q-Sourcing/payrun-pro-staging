export interface OrgSettings {
    id: string;
    org_id: string;
    max_approval_levels: number;
    approvals_sequential: boolean;
    approvals_allow_delegation: boolean;
    approvals_rejection_comment_required: boolean;
    approvals_visibility_non_admin: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ApprovalWorkflow {
    id: string;
    org_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    is_default: boolean;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    steps?: ApprovalWorkflowStep[];
}

export interface ApprovalWorkflowStep {
    id: string;
    workflow_id: string;
    level: number;
    approver_user_id?: string;
    approver_role?: string;
    sequence_number: number;
    notify_email: boolean;
    notify_in_app: boolean;
    created_at?: string;
    // UI helper
    approver_user?: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

export interface PayrunApprovalStep {
    id: string;
    payrun_id: string;
    level: number;
    approver_user_id: string;
    approver_role?: string;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    actioned_at?: string;
    actioned_by?: string;
    comments?: string;
    original_approver_id?: string;
    delegated_by?: string;
    delegated_at?: string;
    created_at?: string;
    updated_at?: string;
    // UI helpers
    approver?: { first_name: string; last_name: string; };
    actioned_by_user?: { first_name: string; last_name: string; };
    delegated_by_user?: { first_name: string; last_name: string; };
}

export interface ApprovalActionResponse {
    success: boolean;
    message?: string;
    next_level?: number;
}

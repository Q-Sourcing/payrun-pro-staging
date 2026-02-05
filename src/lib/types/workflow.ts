// Payroll action scopes that can require approvals
export type PayrollApprovalScope =
    | 'payroll_run_creation'
    | 'payroll_run_finalization'
    | 'payroll_reruns'
    | 'payroll_adjustments'
    | 'payroll_overrides'
    | 'backdated_changes';

// Approver assignment types
export type ApproverType = 'role' | 'individual' | 'hybrid';

// Predefined OBAC roles that can be approvers
export const APPROVER_ROLES = {
    REPORTING_MANAGER: 'Reporting Manager',
    FINANCE_OFFICER: 'Finance Officer',
    FINANCE_MANAGER: 'Finance Manager',
    HR_MANAGER: 'HR Manager',
    PAYROLL_ADMIN: 'Payroll Admin',
    SUPER_ADMIN: 'Super Admin',
    ORG_FINANCE_CONTROLLER: 'Organization Finance Controller',
} as const;

export type ApproverRoleKey = keyof typeof APPROVER_ROLES;

// Extended org settings with approval toggle and scopes
export interface OrgSettings {
    id: string;
    org_id: string;
    max_approval_levels: number;
    approvals_sequential: boolean;
    approvals_allow_delegation: boolean;
    approvals_rejection_comment_required: boolean;
    approvals_visibility_non_admin: boolean;
    // NEW FIELDS
    payroll_approvals_enabled?: boolean;
    approvals_enabled_scopes?: PayrollApprovalScope[];
    created_at?: string;
    updated_at?: string;
}

// Extended workflow with scopes and versioning
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
    // NEW FIELDS
    applies_to_scopes?: PayrollApprovalScope[];
    version?: number;
    steps?: ApprovalWorkflowStep[];
}

// Extended workflow step with approver type and fallback
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
    // NEW FIELDS
    approver_type?: ApproverType;
    fallback_user_id?: string;
    // UI helpers
    approver_user?: {
        first_name: string;
        last_name: string;
        email: string;
    };
    fallback_user?: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

// Extended payrun approval step with override tracking and versioning
export interface PayrunApprovalStep {
    id: string;
    payrun_id: string;
    level: number;
    approver_user_id: string;
    approver_role?: string;
    status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'approved_overridden';
    actioned_at?: string;
    actioned_by?: string;
    comments?: string;
    original_approver_id?: string;
    delegated_by?: string;
    delegated_at?: string;
    created_at?: string;
    updated_at?: string;
    // NEW FIELDS
    workflow_version?: number;
    override_reason?: string;
    override_by?: string;
    override_at?: string;
    // UI helpers
    approver?: { first_name: string; last_name: string; };
    actioned_by_user?: { first_name: string; last_name: string; };
    delegated_by_user?: { first_name: string; last_name: string; };
    override_by_user?: { first_name: string; last_name: string; };
}

// Workflow version history for audit trail
export interface ApprovalWorkflowVersion {
    id: string;
    workflow_id: string;
    version: number;
    workflow_snapshot: {
        workflow: ApprovalWorkflow;
        steps: ApprovalWorkflowStep[];
    };
    created_at: string;
    created_by?: string;
}

export interface ApprovalActionResponse {
    success: boolean;
    message?: string;
    next_level?: number;
}

// Approval scope labels for UI
export const APPROVAL_SCOPE_LABELS: Record<PayrollApprovalScope, string> = {
    payroll_run_creation: 'Payroll Run Creation',
    payroll_run_finalization: 'Payroll Run Finalization',
    payroll_reruns: 'Payroll Re-runs',
    payroll_adjustments: 'Payroll Adjustments',
    payroll_overrides: 'Payroll Overrides',
    backdated_changes: 'Backdated Payroll Changes',
};

// --- NEW PER-TYPE APPROVAL TYPES ---

export interface PayrollApprovalConfig {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    is_enabled: boolean;
    workflow_id?: string;
    created_at?: string;
    updated_at?: string;
    // UI Helpers
    categories?: string[]; // Array of category IDs
    workflow?: ApprovalWorkflow;
}

export interface PayrollApprovalCategory {
    id: string;
    config_id: string;
    category_id: string;
    created_at?: string;
}

export interface NotificationTemplate {
    id: string;
    org_id?: string;
    name: string;
    trigger_event: string;
    subject: string;
    body_content: string;
    is_active: boolean;
    module: string;
    available_variables?: string[];
    created_at?: string;
    updated_at?: string;
}

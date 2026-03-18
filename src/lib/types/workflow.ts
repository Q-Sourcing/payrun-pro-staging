// Payroll action scopes that can require approvals
export type PayrollApprovalScope =
    | 'payroll_run_creation'
    | 'payroll_run_finalization'
    | 'payroll_reruns'
    | 'payroll_adjustments'
    | 'payroll_overrides'
    | 'backdated_changes';

// Extended approver types for Phase 3
export type ApproverType =
    | 'role'
    | 'individual'
    | 'hybrid'
    | 'reporting_to'
    | 'department_head'
    | 'department_members'
    | 'designation'
    | 'project_manager'
    | 'group';

// Approver type display metadata
export const APPROVER_TYPE_META: Record<ApproverType, { label: string; icon: string; description: string }> = {
    reporting_to: { label: 'Reporting Manager', icon: '👤', description: 'Resolves to the employee\'s direct manager at runtime' },
    role: { label: 'By OBAC Role', icon: '🛡️', description: 'Any user with this organizational role' },
    department_head: { label: 'Department Head', icon: '🏢', description: 'Head of the employee\'s department' },
    department_members: { label: 'Department Members', icon: '👥', description: 'All users in the selected department' },
    designation: { label: 'By Designation', icon: '📋', description: 'All users with the selected designation' },
    individual: { label: 'Specific Individual', icon: '🧑', description: 'A specific named user' },
    project_manager: { label: 'Project Manager', icon: '📊', description: 'Manager of the associated project' },
    group: { label: 'Approval Group', icon: '👥', description: 'Members of a named approval group' },
    hybrid: { label: 'Role + Fallback', icon: '🔄', description: 'Role-based with individual fallback' },
};

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
    updated_by?: string;
    applies_to_scopes?: PayrollApprovalScope[];
    version?: number;
    steps?: ApprovalWorkflowStep[];
}

// Extended workflow step with all approver types
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
    approver_type?: ApproverType;
    fallback_user_id?: string;
    approver_designation_id?: string;
    approver_department_id?: string;
    approver_group_id?: string;
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
    workflow_version?: number;
    override_reason?: string;
    override_by?: string;
    override_at?: string;
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

// --- Per-Type Approval Config ---

export interface PayrollApprovalConfig {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    is_enabled: boolean;
    workflow_id?: string;
    created_at?: string;
    updated_at?: string;
    categories?: string[];
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

// --- Phase 3: Approval Groups ---

export interface ApprovalGroup {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ApprovalGroupMember {
    id: string;
    group_id: string;
    user_id: string;
    created_at?: string;
}

// --- Phase 4: Criteria ---

export type CriteriaField = 'amount' | 'pay_group' | 'employee_category' | 'department' | 'designation' | 'payrun_type';
export type CriteriaOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'contains';

export interface ApprovalWorkflowCriteria {
    id: string;
    workflow_id: string;
    field: CriteriaField;
    operator: CriteriaOperator;
    value: any;
    sequence_number: number;
    created_at?: string;
}

export const CRITERIA_FIELD_LABELS: Record<CriteriaField, string> = {
    amount: 'Total Amount',
    pay_group: 'Pay Group',
    employee_category: 'Employee Category',
    department: 'Department',
    designation: 'Designation',
    payrun_type: 'Pay Run Type',
};

export const CRITERIA_OPERATORS: Record<CriteriaField, { value: CriteriaOperator; label: string }[]> = {
    amount: [
        { value: 'greater_than', label: 'Greater than' },
        { value: 'less_than', label: 'Less than' },
        { value: 'equals', label: 'Equals' },
    ],
    pay_group: [{ value: 'in', label: 'Is one of' }],
    employee_category: [{ value: 'in', label: 'Is one of' }],
    department: [{ value: 'in', label: 'Is one of' }],
    designation: [{ value: 'in', label: 'Is one of' }],
    payrun_type: [{ value: 'in', label: 'Is one of' }],
};

// --- Phase 5: Follow-ups ---

export interface ApprovalWorkflowFollowup {
    id: string;
    workflow_id: string;
    is_enabled: boolean;
    followup_type: 'one_time' | 'repeat';
    days_after: number;
    repeat_interval_days?: number;
    send_at_time: string;
    created_at?: string;
    updated_at?: string;
}

// --- Phase 6: Messages ---

export type MessageEventType = 'submitted' | 'approved' | 'rejected' | 'followup';
export type MessageFromType = 'system' | 'submitter' | 'approver';
export type MessageToType = 'current_approver' | 'all_approvers' | 'submitter' | 'all';

export interface ApprovalWorkflowMessage {
    id: string;
    workflow_id: string;
    event_type: MessageEventType;
    from_type: MessageFromType;
    to_type: MessageToType;
    subject: string;
    body_content: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export const MESSAGE_EVENT_LABELS: Record<MessageEventType, string> = {
    submitted: 'Submitted for Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    followup: 'Follow-up Reminder',
};

export const MESSAGE_VARIABLES = [
    '{{total_gross}}',
    '{{total_deductions}}',
    '{{total_net}}',
    '{{total_employer_nssf}}',
    '{{total_employees}}',
    '{{pay_period}}',
    '{{pay_group_name}}',
    '{{payrun_type}}',
    '{{approver_name}}',
    '{{submitter_name}}',
    '{{submitted_at}}',
    '{{org_name}}',
    '{{current_level}}',
    '{{total_levels}}',
    '{{rejection_reason}}',
    '{{rejected_by}}',
    '{{days_pending}}',
    '{{workflow_name}}',
    '{{due_date}}',
    '{{action_url}}',
    '{{approve_url}}',
    '{{reject_url}}',
];

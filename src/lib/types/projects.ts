// Project Types and Interfaces

export interface Project {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    project_type: 'manpower' | 'ippms' | 'expatriate';
    project_subtype?: string | null;
    allowed_pay_types?: string[] | null;
    supports_all_pay_types: boolean;
    status: 'active' | 'inactive' | 'completed';
    start_date?: string | null;
    end_date?: string | null;
    responsible_manager_id?: string | null;
    client_name?: string | null;
    location?: string | null;
    contract_value?: number | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectOnboardingStep {
    id: string;
    project_id: string;
    step_key: string;
    completed: boolean;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

// Employee Type to Project Type Mapping
export const EMPLOYEE_TYPE_TO_PROJECT_TYPE = {
    'regular': 'manpower',
    'ippms': 'ippms',
    'expatriate': 'expatriate'
} as const;

// Project Type to Pay Types Mapping
export const PROJECT_TYPE_PAY_TYPES = {
    'manpower': ['daily', 'bi_weekly', 'monthly'],
    'ippms': ['piece_rate', 'daily'],
    'expatriate': ['monthly']
} as const;

// Helper function to get pay types for a project type
export const getPayTypesForProjectType = (projectType: 'manpower' | 'ippms' | 'expatriate'): string[] => {
    return [...PROJECT_TYPE_PAY_TYPES[projectType]];
};

// Helper function to get project type from employee type
export const getProjectTypeFromEmployeeType = (employeeType: string): 'manpower' | 'ippms' | 'expatriate' | null => {
    const mapping = EMPLOYEE_TYPE_TO_PROJECT_TYPE as Record<string, 'manpower' | 'ippms' | 'expatriate'>;
    return mapping[employeeType] || null;
};

// Helper function to format pay type for display
export const formatPayType = (payType: string): string => {
    const formatMap: Record<string, string> = {
        'daily': 'Daily',
        'bi_weekly': 'Bi-Weekly',
        'monthly': 'Monthly',
        'piece_rate': 'Piece Rate',
        'hourly': 'Hourly',
        'salary': 'Salary',
        'daily_rate': 'Daily Rate'
    };
    return formatMap[payType] || payType;
};

// Helper function to format project type for display
export const formatProjectType = (projectType: string): string => {
    const formatMap: Record<string, string> = {
        'manpower': 'Manpower',
        'ippms': 'IPPMS',
        'expatriate': 'Expatriate'
    };
    return formatMap[projectType] || projectType;
};

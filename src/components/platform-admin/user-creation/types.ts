export type WizardData = {
    firstName: string;
    lastName: string;
    email: string;
    selectedOrgIds: string[];
    // Map orgId -> { companyIds, roleKeys }
    orgConfig: Record<string, { companyIds: string[]; roles: string[] }>;
    platformRoles: string[];
};

export interface StepProps {
    data: WizardData;
    updateData: (partial: Partial<WizardData>) => void;
}

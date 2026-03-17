import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import { EmployeeForm, type EmployeeFormValues } from "@/components/employees/EmployeeForm";

interface EmployeeCreateFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

function mapEmploymentStatusToRecordStatus(
    employmentStatus?: EmployeeFormValues["employment_status"]
): "active" | "inactive" {
    switch (employmentStatus) {
        case "Terminated":
        case "Resigned":
        case "Deceased":
            return "inactive";
        case "Active":
        case "Probation":
        case "Notice Period":
        default:
            return "active";
    }
}

export const EmployeeCreateForm = ({ onSuccess, onCancel }: EmployeeCreateFormProps) => {
    const { toast } = useToast();
    const { organizationId } = useOrg();

    const handleCreate = useCallback(async (values: EmployeeFormValues) => {
        try {
            const finalOrgId = organizationId || localStorage.getItem('active_organization_id');
            if (!finalOrgId) {
                toast({
                    title: "Missing organization",
                    description: "Select an active organization before creating an employee.",
                    variant: "destructive"
                });
                return;
            }
            const parsedPayRate = Number(values.pay_rate);
            const safePayRate = Number.isFinite(parsedPayRate) ? parsedPayRate : 0;
            const recordStatus = mapEmploymentStatusToRecordStatus(values.employment_status);
            const { error } = await supabase.from("employees").insert([
                {
                    employee_number: values.employee_number || `EMP-${Date.now()}`,
                    first_name: values.first_name,
                    middle_name: values.middle_name || null,
                    last_name: values.last_name || null,
                    email: values.email,
                    personal_email: values.personal_email || null,
                    phone: values.phone ? `${values.phone_country_code || '+256'}${values.phone}` : null,
                    work_phone: values.work_phone || null,
                    gender: values.gender || null,
                    date_of_birth: values.date_of_birth || null,
                    national_id: values.national_id || null,
                    nationality: values.nationality || null,
                    citizenship: values.citizenship || null,
                    tin: values.tin || null,
                    nssf_number: values.nssf_number || null,
                    passport_number: values.passport_number || null,
                    pay_type: values.pay_type,
                    pay_rate: safePayRate,
                    country: values.country,
                    currency: values.currency,
                    pay_group_id: values.pay_group_id || null,
                    status: recordStatus,
                    employment_status: values.employment_status || "Active",
                    engagement_type: values.engagement_type || null,
                    bank_name: values.bank_name || null,
                    bank_branch: values.bank_branch || null,
                    account_number: values.account_number || null,
                    account_type: values.account_type || null,
                    sub_department: values.sub_department || null,
                    company_id: values.company_id || null,
                    company_unit_id: values.company_unit_id || null,
                    sub_department_id: values.sub_department_id || null,
                    date_joined: values.date_joined || null,
                    designation_id: values.designation || null,
                    work_location: values.work_location || null,
                    number_prefix_override: values.employee_prefix || null,
                    category: values.category || undefined,
                    employee_type: values.employee_type || undefined,
                    pay_frequency: values.pay_frequency || null,
                    probation_end_date: values.probation_end_date || null,
                    probation_status: values.probation_status || null,
                    organization_id: finalOrgId,
                    project_id: values.category === "projects" ? (values.project_id || null) : null,
                },
            ]);
            if (error) throw error;
            toast({ title: "✅ Success", description: "Employee added successfully" });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Error Adding Employee", description: e?.message || "Something went wrong.", variant: "destructive" });
        }
    }, [organizationId, onSuccess, toast]);

    return (
        <div className="bg-muted/30 w-full max-w-full min-w-0 overflow-x-hidden">
            <div className="px-3 sm:px-6 py-6 w-full max-w-full min-w-0 overflow-x-hidden">
                <div className="max-w-3xl mx-auto w-full min-w-0 space-y-6">
                    <EmployeeForm mode="create" onSubmit={handleCreate} />
                </div>
            </div>

        </div>
    );
};

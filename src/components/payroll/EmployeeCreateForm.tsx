import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import { EmployeeForm, type EmployeeFormValues } from "@/components/employees/EmployeeForm";

interface EmployeeCreateFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const EmployeeCreateForm = ({ onSuccess, onCancel }: EmployeeCreateFormProps) => {
    const { toast } = useToast();
    const { organizationId } = useOrg();

    const handleCreate = useCallback(async (values: EmployeeFormValues) => {
        try {
            const finalOrgId = organizationId || localStorage.getItem('active_organization_id') || '00000000-0000-0000-0000-000000000001';
            const { error } = await supabase.from("employees").insert([
                {
                    first_name: values.first_name,
                    middle_name: values.middle_name || null,
                    last_name: values.last_name || null,
                    email: values.email,
                    phone: values.phone ? `${values.phone_country_code || '+256'}${values.phone}` : null,
                    gender: values.gender || null,
                    date_of_birth: values.date_of_birth || null,
                    national_id: values.national_id || null,
                    tin: values.tin || null,
                    nssf_number: values.nssf_number || null,
                    passport_number: values.passport_number || null,
                    pay_type: values.pay_type,
                    pay_rate: values.pay_rate ? Number(values.pay_rate) : null,
                    country: values.country,
                    currency: values.currency,
                    pay_group_id: values.pay_group_id || null,
                    status: values.status || "active",
                    employment_status: values.employment_status || "Active",
                    bank_name: values.bank_name || null,
                    bank_branch: values.bank_branch || null,
                    account_number: values.account_number || null,
                    account_type: values.account_type || null,
                    department: values.department || null,
                    company_id: values.company_id || null,
                    company_unit_id: values.company_unit_id || null,
                    department_id: values.department_id || null,
                    date_joined: values.date_joined || null,
                    number_prefix_override: values.employee_prefix || null,
                    category: values.category || null,
                    employee_type: values.employee_type || null,
                    pay_frequency: values.pay_frequency || null,
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
        <div className="flex flex-col h-full bg-gray-50/30">
            <ScrollArea className="flex-1 px-6 py-6">
                <div className="max-w-3xl mx-auto space-y-6 pb-20">
                    <EmployeeForm mode="create" onSubmit={handleCreate} />
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-white flex justify-end gap-3 z-10">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};

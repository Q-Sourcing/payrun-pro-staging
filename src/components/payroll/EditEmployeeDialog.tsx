import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PayGroupCategory, HeadOfficeSubType, ProjectsSubType } from '@/lib/types/paygroups';
import { EmployeeForm, type EmployeeFormValues } from "@/components/employees/EmployeeForm";

interface PayGroup {
  id: string;
  name: string;
  country: string;
}

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  pay_type: string;
  pay_rate: number;
  country: string;
  currency: string;
  pay_group_id?: string | null;
  status: string;
  employee_type: string;
  employee_type_id?: string | null;
  category?: string | null;
  department?: string | null;
  department_id?: string | null;
  company_id?: string | null;
  company_unit_id?: string | null;
  date_joined?: string | null;
  employee_number?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  account_number?: string | null;
  account_type?: string | null;
}

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated: () => void;
  employee: Employee | null;
}

const EditEmployeeDialog = ({ open, onOpenChange, onEmployeeUpdated, employee }: EditEmployeeDialogProps) => {
  const { toast } = useToast();

  if (!employee) return null;

  const defaultValues: EmployeeFormValues = {
    first_name: employee.first_name,
    middle_name: employee.middle_name || "",
    last_name: employee.last_name || "",
    email: employee.email,
    phone: (employee as any).phone || "",
    phone_country_code: "+256",
    pay_type: employee.pay_type as any,
    pay_rate: employee.pay_rate || null,
    country: employee.country,
    currency: employee.currency,
    pay_group_id: employee.pay_group_id || "",
    status: (employee.status as any) || "active",
    employee_type: (employee.employee_type as any) || "",
    department: employee.department || "",
    company_id: (employee as any).company_id || "",
    company_unit_id: (employee as any).company_unit_id || "",
    department_id: employee.department_id || "",
    date_joined: (employee as any).date_joined || "",
    employee_number: (employee as any).employee_number || "",
    category: (employee.category as any) || "",
    project_id: (employee as any).project_id || "",
    pay_frequency: (employee as any).pay_frequency || "",
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    const { error } = await supabase
      .from("employees")
      .update({
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
        employee_type: values.employee_type || null,
        department: values.department || null,
        company_id: values.company_id || null,
        company_unit_id: values.company_unit_id || null,
        department_id: values.department_id || null,
        date_joined: values.date_joined || null,
        category: values.category || null,
        pay_frequency: values.pay_frequency || null,
        project_id: values.category === "projects" ? (values.project_id || null) : null,
      })
      .eq("id", employee.id);

    if (error) {
      toast({ title: "Error", description: error.message || "Failed to update employee", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Employee updated successfully" });
    onEmployeeUpdated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title">Edit Employee</DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Update employee information and pay details
          </DialogDescription>
        </DialogHeader>
        <div className="modern-dialog-content">
          <EmployeeForm mode="edit" defaultValues={defaultValues} onSubmit={onSubmit} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;

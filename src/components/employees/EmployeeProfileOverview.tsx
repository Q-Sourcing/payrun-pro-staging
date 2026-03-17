import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, Briefcase, MapPin, DollarSign, CreditCard, FileText, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmployeeProfileOverviewProps {
  employee: any;
  onUpdated: () => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-28 shrink-0 text-sm">{label}</span>
      <span className="font-medium text-sm">{value || "—"}</span>
    </div>
  );
}

function EditableCard({
  title,
  icon: Icon,
  fields,
  employee,
  onSave,
}: {
  title: string;
  icon: any;
  fields: { key: string; label: string; icon: any; type?: string; options?: { value: string; label: string }[] }[];
  employee: any;
  onSave: (updates: Record<string, any>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      initial[f.key] = employee[f.key] ?? "";
    });
    setValues(initial);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setValues({});
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(values);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {editing
          ? fields.map((f) =>
              f.options ? (
                <div key={f.key} className="flex items-center gap-3">
                  <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Label className="w-28 shrink-0 text-muted-foreground">{f.label}</Label>
                  <Select
                    value={values[f.key] || ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder={`Select ${f.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div key={f.key} className="flex items-center gap-3">
                  <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Label className="w-28 shrink-0 text-muted-foreground">{f.label}</Label>
                  <Input
                    type={f.type || "text"}
                    className="flex-1 h-8"
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              )
            )
          : fields.map((f) => (
              <InfoRow
                key={f.key}
                icon={f.icon}
                label={f.label}
                value={
                  f.options
                    ? f.options.find((o) => o.value === employee[f.key])?.label || employee[f.key]
                    : employee[f.key]
                }
              />
            ))}
      </CardContent>
    </Card>
  );
}

export function EmployeeProfileOverview({ employee, onUpdated }: EmployeeProfileOverviewProps) {
  const { toast } = useToast();

  const handleSave = async (updates: Record<string, any>) => {
    const { error } = await (supabase as any)
      .from("employees")
      .update(updates)
      .eq("id", employee.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Updated", description: "Employee details saved." });
    onUpdated();
  };

  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Personal Information */}
      <EditableCard
        title="Personal Information"
        icon={User}
        employee={employee}
        onSave={handleSave}
        fields={[
          { key: "first_name", label: "First Name", icon: User },
          { key: "middle_name", label: "Middle Name", icon: User },
          { key: "last_name", label: "Last Name", icon: User },
          { key: "personal_email", label: "Personal Email", icon: Mail, type: "email" },
          { key: "phone", label: "Mobile", icon: Phone },
          { key: "gender", label: "Gender", icon: User, options: [
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]},
          { key: "date_of_birth", label: "Date of Birth", icon: User, type: "date" },
          { key: "nationality", label: "Nationality", icon: MapPin },
          { key: "citizenship", label: "Citizenship", icon: MapPin },
          { key: "country", label: "Country", icon: MapPin },
          { key: "marital_status", label: "Marital Status", icon: User, options: [
            { value: "Single", label: "Single" },
            { value: "Married", label: "Married" },
            { value: "Divorced", label: "Divorced" },
            { value: "Widowed", label: "Widowed" },
          ]},
        ]}
      />

      {/* Employment Information */}
      <EditableCard
        title="Employment Information"
        icon={Briefcase}
        employee={employee}
        onSave={handleSave}
        fields={[
          { key: "email", label: "Work Email", icon: Mail, type: "email" },
          { key: "work_phone", label: "Work Phone", icon: Phone },
          { key: "employee_type", label: "Type", icon: Briefcase },
          { key: "engagement_type", label: "Engagement", icon: Briefcase },
          { key: "employment_status", label: "Status", icon: Briefcase, options: [
            { value: "Active", label: "Active" },
            { value: "Terminated", label: "Terminated" },
            { value: "Deceased", label: "Deceased" },
            { value: "Resigned", label: "Resigned" },
            { value: "Probation", label: "Probation" },
            { value: "Notice Period", label: "Notice Period" },
          ]},
          { key: "work_location", label: "Work Location", icon: MapPin },
          { key: "date_joined", label: "Date Joined", icon: Briefcase, type: "date" },
        ]}
      />

      {/* IDs & Documents */}
      <EditableCard
        title="IDs & Documents"
        icon={FileText}
        employee={employee}
        onSave={handleSave}
        fields={[
          { key: "national_id", label: "National ID", icon: FileText },
          { key: "tin", label: "TIN", icon: FileText },
          { key: "nssf_number", label: "NSSF Number", icon: FileText },
          { key: "passport_number", label: "Passport No.", icon: FileText },
        ]}
      />

      {/* Pay Information */}
      <EditableCard
        title="Pay Information"
        icon={DollarSign}
        employee={{
          ...employee,
          pay_rate: employee.pay_rate?.toLocaleString(),
          pay_group_name: employee.pay_groups?.name || "Unassigned",
        }}
        onSave={(updates) => {
          // Convert pay_rate back to number
          if (updates.pay_rate) updates.pay_rate = Number(updates.pay_rate.replace(/,/g, ""));
          // Don't update computed fields
          delete updates.pay_group_name;
          return handleSave(updates);
        }}
        fields={[
          { key: "pay_type", label: "Pay Type", icon: DollarSign, options: [
            { value: "hourly", label: "Hourly" },
            { value: "salary", label: "Salary" },
            { value: "piece_rate", label: "Piece Rate" },
            { value: "daily_rate", label: "Daily Rate" },
          ]},
          { key: "pay_rate", label: "Pay Rate", icon: DollarSign },
          { key: "currency", label: "Currency", icon: DollarSign },
          { key: "pay_group_name", label: "Pay Group", icon: DollarSign },
        ]}
      />

      {/* Bank Details */}
      <EditableCard
        title="Bank Details"
        icon={CreditCard}
        employee={employee}
        onSave={handleSave}
        fields={[
          { key: "bank_name", label: "Bank Name", icon: CreditCard },
          { key: "bank_branch", label: "Branch", icon: CreditCard },
          { key: "account_number", label: "Account No.", icon: CreditCard },
          { key: "account_type", label: "Account Type", icon: CreditCard, options: [
            { value: "Savings Account", label: "Savings Account" },
            { value: "Current Account", label: "Current Account" },
            { value: "Salary Account", label: "Salary Account" },
            { value: "Fixed Deposit Account", label: "Fixed Deposit Account" },
          ]},
        ]}
      />

      {/* Probation Information - only show if relevant */}
      {(employee.employment_status === "Probation" || employee.probation_status) && (
        <EditableCard
          title="Probation"
          icon={Briefcase}
          employee={employee}
          onSave={handleSave}
          fields={[
            { key: "probation_status", label: "Status", icon: Briefcase, options: [
              { value: "on_probation", label: "On Probation" },
              { value: "confirmed", label: "Confirmed" },
              { value: "extended", label: "Extended" },
            ]},
            { key: "probation_start_date", label: "Start Date", icon: Briefcase, type: "date" },
            { key: "probation_end_date", label: "End Date", icon: Briefcase, type: "date" },
          ]}
        />
      )}
    </div>
  );
}

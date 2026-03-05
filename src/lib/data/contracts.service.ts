// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface ContractTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  country_code: string | null;
  employment_type: string | null;
  body_html: string;
  placeholders: Array<{ key: string; label: string; default_value?: string }>;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeContract {
  id: string;
  organization_id: string;
  employee_id: string;
  template_id: string | null;
  contract_number: string | null;
  status: 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated';
  start_date: string | null;
  end_date: string | null;
  auto_renew: boolean;
  salary_snapshot: Record<string, any> | null;
  terms_snapshot: Record<string, any> | null;
  body_html: string | null;
  signed_by_employee_at: string | null;
  signed_by_employer_at: string | null;
  signed_by_employer_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  contract_templates?: { name: string } | null;
}

type ValidationCategory = "personal_identification" | "employment_terms" | "legal_compliance";

export interface ContractValidationIssue {
  key: string;
  label: string;
  category: ValidationCategory;
}

export class ContractsService {
  // ── Templates ──

  static async getTemplates(orgId: string) {
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data as ContractTemplate[];
  }

  static async createTemplate(template: Partial<ContractTemplate>) {
    const { data, error } = await supabase
      .from("contract_templates")
      .insert(template)
      .select()
      .single();
    if (error) throw error;
    return data as ContractTemplate;
  }

  static async updateTemplate(id: string, updates: Partial<ContractTemplate>) {
    const { data, error } = await supabase
      .from("contract_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as ContractTemplate;
  }

  // ── Employee Contracts ──

  static async getContractsByEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from("employee_contracts")
      .select("*, contract_templates(name)")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as EmployeeContract[];
  }

  static async createContract(contract: Partial<EmployeeContract>) {
    const { data, error } = await supabase
      .from("employee_contracts")
      .insert(contract)
      .select("*, contract_templates(name)")
      .single();
    if (error) throw error;
    return data as EmployeeContract;
  }

  static async updateContract(id: string, updates: Partial<EmployeeContract>) {
    const { data, error } = await supabase
      .from("employee_contracts")
      .update(updates)
      .eq("id", id)
      .select("*, contract_templates(name)")
      .single();
    if (error) throw error;
    return data as EmployeeContract;
  }

  /**
   * Validate whether an employee onboarding record is complete enough
   * to allow contract generation.
   */
  static validateEmployeeForContractGeneration(employeeData: Record<string, any>) {
    const issues: ContractValidationIssue[] = [];
    const normalized = employeeData || {};
    const hasLegalIdentifier = Boolean(
      normalized.national_id || normalized.passport_number || normalized.tin || normalized.nssf_number
    );

    const requiredChecks: Array<{ key: string; label: string; category: ValidationCategory; valid: boolean }> = [
      { key: "first_name", label: "First Name", category: "personal_identification", valid: Boolean(normalized.first_name) },
      { key: "last_name", label: "Last Name", category: "personal_identification", valid: Boolean(normalized.last_name) },
      { key: "email", label: "Email", category: "personal_identification", valid: Boolean(normalized.email) },
      { key: "country", label: "Country", category: "personal_identification", valid: Boolean(normalized.country) },

      { key: "employee_type", label: "Employee Type", category: "employment_terms", valid: Boolean(normalized.employee_type) },
      { key: "pay_type", label: "Pay Type", category: "employment_terms", valid: Boolean(normalized.pay_type) },
      {
        key: "pay_rate",
        label: "Pay Rate",
        category: "employment_terms",
        valid: normalized.pay_rate !== null && normalized.pay_rate !== undefined && `${normalized.pay_rate}` !== "",
      },
      { key: "currency", label: "Currency", category: "employment_terms", valid: Boolean(normalized.currency) },
      { key: "date_joined", label: "Date Joined", category: "employment_terms", valid: Boolean(normalized.date_joined) },

      {
        key: "legal_identifier",
        label: "At least one legal ID (National ID, Passport, TIN, or NSSF)",
        category: "legal_compliance",
        valid: hasLegalIdentifier,
      },
      { key: "employment_status", label: "Employment Status", category: "legal_compliance", valid: Boolean(normalized.employment_status) },
      { key: "date_of_birth", label: "Date of Birth", category: "legal_compliance", valid: Boolean(normalized.date_of_birth) },
    ];

    for (const check of requiredChecks) {
      if (!check.valid) {
        issues.push({ key: check.key, label: check.label, category: check.category });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      missingFieldLabels: issues.map((issue) => issue.label),
      missingByCategory: {
        personal_identification: issues.filter((i) => i.category === "personal_identification"),
        employment_terms: issues.filter((i) => i.category === "employment_terms"),
        legal_compliance: issues.filter((i) => i.category === "legal_compliance"),
      } as Record<ValidationCategory, ContractValidationIssue[]>,
    };
  }

  static buildTemplateValues(params: {
    employeeName: string;
    employeeData: Record<string, any>;
    startDate?: string;
    endDate?: string;
    contractNumber?: string;
    template?: ContractTemplate | null;
  }): Record<string, string> {
    const { employeeName, employeeData, startDate, endDate, contractNumber, template } = params;
    const departmentValue =
      employeeData?.sub_department ||
      employeeData?.department ||
      employeeData?.job_department ||
      employeeData?.division ||
      "";
    const companyNameValue =
      employeeData?.companies?.name ||
      employeeData?.organization?.name ||
      employeeData?.company_name ||
      "";
    const values: Record<string, string> = {
      employee_name: employeeName || "",
      employee_email: employeeData?.email || "",
      employee_number: employeeData?.employee_number || "",
      first_name: employeeData?.first_name || "",
      middle_name: employeeData?.middle_name || "",
      last_name: employeeData?.last_name || "",
      national_id: employeeData?.national_id || "",
      passport_number: employeeData?.passport_number || "",
      tin: employeeData?.tin || "",
      nssf_number: employeeData?.nssf_number || "",
      phone: employeeData?.phone || "",
      country: employeeData?.country || "",
      date_of_birth: employeeData?.date_of_birth || "",

      employee_type: employeeData?.employee_type || "",
      employment_status: employeeData?.employment_status || "",
      pay_rate: employeeData?.pay_rate !== undefined && employeeData?.pay_rate !== null ? String(employeeData.pay_rate) : "",
      salary: employeeData?.pay_rate !== undefined && employeeData?.pay_rate !== null ? String(employeeData.pay_rate) : "",
      pay_type: employeeData?.pay_type || "",
      currency: employeeData?.currency || "",
      date_joined: employeeData?.date_joined || "",
      start_date: startDate || employeeData?.date_joined || "",
      end_date: endDate || "",
      contract_number: contractNumber || "",

      probation_status: employeeData?.probation_status || "",
      probation_end_date: employeeData?.probation_end_date || "",
      marital_status: employeeData?.marital_status || "",
      company_name: companyNameValue || "Your Company",
      department: departmentValue || "General Department",
      job_title: employeeData?.job_title || employeeData?.position || employeeData?.employee_type || "",
      date_today: new Date().toLocaleDateString(),
    };

    for (const placeholder of template?.placeholders || []) {
      const existingValue = values[placeholder.key];
      if (existingValue !== undefined && String(existingValue).trim() !== "") continue;
      values[placeholder.key] = placeholder.default_value ?? existingValue ?? "";
    }

    return values;
  }

  static extractTemplateTokens(bodyHtml: string): string[] {
    const tokenPattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    const tokenSet = new Set<string>();
    let match: RegExpExecArray | null = null;
    while ((match = tokenPattern.exec(bodyHtml || "")) !== null) {
      tokenSet.add(match[1]);
    }
    return Array.from(tokenSet);
  }

  static validateTemplateMapping(template: ContractTemplate, values: Record<string, string>) {
    const templateTokens = this.extractTemplateTokens(template?.body_html || "");
    const placeholderLabelMap = new Map<string, string>();
    for (const placeholder of template?.placeholders || []) {
      placeholderLabelMap.set(placeholder.key, placeholder.label || placeholder.key);
    }

    const missingTokens = templateTokens.filter((token) => {
      const value = values[token];
      return value === undefined || value === null || String(value).trim() === "";
    });

    return {
      isValid: missingTokens.length === 0,
      missingTokens,
      missingTokenLabels: missingTokens.map((token) => placeholderLabelMap.get(token) || token),
    };
  }

  /**
   * Render a template body by replacing {{placeholder}} tokens with values.
   */
  static renderTemplate(bodyHtml: string, values: Record<string, string>): string {
    let rendered = bodyHtml;
    for (const [key, value] of Object.entries(values)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }
    return rendered;
  }
}

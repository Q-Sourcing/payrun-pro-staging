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

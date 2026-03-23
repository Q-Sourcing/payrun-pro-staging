import { supabase } from "@/integrations/supabase/client";

export type GlAccount = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  currency: string | null;
  isActive: boolean;
};

export type GlMappingKey =
  | "gross_pay"
  | "paye_tax"
  | "nssf_employee"
  | "nssf_employer"
  | "benefit_deductions"
  | "net_pay"
  | "fx_gain_loss";

export const GL_MAPPING_LABELS: Record<GlMappingKey, string> = {
  gross_pay: "Salary & Wages Expense (Dr)",
  paye_tax: "PAYE Tax Payable (Cr)",
  nssf_employee: "NSSF Employee Payable (Cr)",
  nssf_employer: "NSSF Employer Contribution (Cr)",
  benefit_deductions: "Other Deductions Payable (Cr)",
  net_pay: "Bank / Cash Clearing (Cr)",
  fx_gain_loss: "FX Gain / Loss (for expatriate pay runs)",
};

export const GL_MAPPING_REQUIRED: GlMappingKey[] = ["gross_pay", "paye_tax", "net_pay"];

export type SavedGlMapping = {
  id: string;
  company_id: string;
  mapping_key: string;
  zoho_account_id: string;
  zoho_account_name: string;
  bank_name: string | null;
};

export type ZohoBooksConnectionStatus = {
  connected: boolean;
  zohoBooksOrgName: string | null;
  zohoBooksOrgId: string | null;
  connectedAt: string | null;
};

export type JournalPushResult = {
  success: boolean;
  alreadyPushed?: boolean;
  zohoJournalId?: string | null;
  message: string;
  totals?: {
    grossPay: number;
    taxDeduction: number;
    benefitDeductions: number;
    netPay: number;
    employerContributions: number;
  };
};

export class ZohoBooksService {
  // --- Connection management ---

  static async startAuth(companyId: string): Promise<{ authUrl: string }> {
    const { data, error } = await supabase.functions.invoke("zoho-books-auth-start", {
      body: { companyId },
    });
    if (error) throw error;
    return data as { authUrl: string };
  }

  static async disconnect(companyId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("zoho-books-disconnect", {
      body: { companyId },
    });
    if (error) throw error;
  }

  static async getConnectionStatus(companyId: string): Promise<ZohoBooksConnectionStatus> {
    const { data, error } = await supabase
      .from("integration_tokens")
      .select("metadata, created_at")
      .eq("company_id", companyId)
      .eq("integration_name", "zoho_books")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { connected: false, zohoBooksOrgName: null, zohoBooksOrgId: null, connectedAt: null };
    }

    const meta = (data.metadata ?? {}) as Record<string, string>;
    return {
      connected: true,
      zohoBooksOrgName: meta.zoho_books_org_name ?? null,
      zohoBooksOrgId: meta.zoho_books_org_id ?? null,
      connectedAt: data.created_at,
    };
  }

  // --- Chart of accounts ---

  static async getAccounts(companyId: string, accountType?: string): Promise<GlAccount[]> {
    const { data, error } = await supabase.functions.invoke("zoho-books-get-accounts", {
      body: { companyId, accountType },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message ?? "Failed to fetch accounts");
    return data.accounts as GlAccount[];
  }

  // --- GL Mappings ---

  static async getGlMappings(companyId: string): Promise<SavedGlMapping[]> {
    const { data, error } = await supabase
      .from("zoho_books_gl_mappings")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;
    return (data ?? []) as SavedGlMapping[];
  }

  static async saveGlMapping(
    companyId: string,
    mappingKey: string,
    accountId: string,
    accountName: string,
    bankName?: string | null,
  ): Promise<void> {
    const { error } = await supabase.from("zoho_books_gl_mappings").upsert(
      {
        company_id: companyId,
        mapping_key: mappingKey,
        zoho_account_id: accountId,
        zoho_account_name: accountName,
        bank_name: bankName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,mapping_key,bank_name" },
    );
    if (error) throw error;
  }

  static async deleteGlMapping(mappingId: string): Promise<void> {
    const { error } = await supabase
      .from("zoho_books_gl_mappings")
      .delete()
      .eq("id", mappingId);
    if (error) throw error;
  }

  // --- Journal push ---

  static async pushJournal(companyId: string, payRunId: string): Promise<JournalPushResult> {
    const { data, error } = await supabase.functions.invoke("zoho-books-push-journal", {
      body: { companyId, payRunId },
    });
    if (error) throw error;
    return data as JournalPushResult;
  }

  static async getJournalRef(
    companyId: string,
    payRunId: string,
  ): Promise<{ status: string; zohoJournalId: string | null; pushedAt: string | null } | null> {
    const { data, error } = await supabase
      .from("zoho_books_journal_refs")
      .select("status, zoho_journal_id, pushed_at")
      .eq("company_id", companyId)
      .eq("pay_run_id", payRunId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      status: data.status,
      zohoJournalId: data.zoho_journal_id,
      pushedAt: data.pushed_at,
    };
  }
}

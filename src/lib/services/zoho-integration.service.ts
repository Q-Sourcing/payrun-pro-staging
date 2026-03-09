import { supabase } from "@/integrations/supabase/client";

export type ZohoSyncMode = "import" | "export" | "bidirectional";
export type ZohoSyncDirection = "import" | "export";
export type ZohoSyncAction = "create" | "update" | "skip" | "error";

export interface ZohoSyncFieldDiff {
  field: string;
  from: string | null;
  to: string | null;
}

export interface ZohoSyncPreviewRow {
  direction: ZohoSyncDirection;
  action: ZohoSyncAction;
  zohoEmployeeId: string | null;
  zohoRecordId: string | null;
  localEmployeeId: string | null;
  displayName: string;
  reason: string | null;
  warnings: string[];
  fieldDiffs: ZohoSyncFieldDiff[];
}

export interface ZohoSyncPreview {
  generatedAt: string;
  previewLimit: number | null;
  totalRows: number;
  truncated: boolean;
  rows: ZohoSyncPreviewRow[];
}

export interface ZohoSyncSummaryBucket {
  created?: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ZohoSyncSummary {
  mode: ZohoSyncMode;
  dryRun: boolean;
  imported: Required<ZohoSyncSummaryBucket>;
  exported: Omit<Required<ZohoSyncSummaryBucket>, "created">;
  warnings: string[];
}

export interface ZohoSyncResult {
  success: boolean;
  summary: ZohoSyncSummary;
  preview: ZohoSyncPreview | null;
}

export interface ZohoSyncRequest {
  organizationId: string;
  mode: ZohoSyncMode;
  dryRun?: boolean;
  previewLimit?: number;
}

export class ZohoIntegrationService {
  static async startAuth(organizationId: string) {
    const { data, error } = await supabase.functions.invoke("zoho-auth-start", {
      body: { organizationId },
    });

    if (error) throw error;
    return data as { authUrl: string };
  }

  static async disconnect(organizationId: string) {
    const { data, error } = await supabase.functions.invoke("zoho-disconnect", {
      body: { organizationId },
    });

    if (error) throw error;
    return data;
  }

  static async syncEmployees(input: ZohoSyncRequest) {
    const { data, error } = await supabase.functions.invoke("zoho-sync-employees", {
      body: input,
    });

    if (error) throw error;
    return data as ZohoSyncResult;
  }

  static previewEmployees(input: Omit<ZohoSyncRequest, "dryRun"> & { previewLimit?: number }) {
    return this.syncEmployees({ ...input, dryRun: true });
  }

  static runEmployeeSync(input: Omit<ZohoSyncRequest, "dryRun" | "previewLimit">) {
    return this.syncEmployees({ ...input, dryRun: false });
  }
}

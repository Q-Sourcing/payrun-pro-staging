import { callEdgeFunction } from "@/api/edge";

export type AuditLog = {
  id: string;
  integration_name: string | null;
  action: string | null;
  user_id: string | null;
  resource: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string | null;
  created_at: string | null;
  result: string | null;
};

export async function fetchAuditLogs(params?: {
  limit?: number;
  offset?: number;
  action?: string;
  user_id?: string;
  resource?: string;
  result?: string;
  from?: string;
  to?: string;
}): Promise<{ logs: AuditLog[]; count: number | null; limit: number; offset: number }> {
  const limit = params?.limit ?? 100;
  const offset = params?.offset ?? 0;

  const res = await callEdgeFunction<{
    success: boolean;
    logs: AuditLog[];
    page: { limit: number; offset: number; count: number | null };
  }>("platform-admin-audit-logs", {
    query: {
      limit,
      offset,
      action: params?.action,
      user_id: params?.user_id,
      resource: params?.resource,
      result: params?.result,
      from: params?.from,
      to: params?.to,
    },
  });

  return { logs: res.logs ?? [], count: res.page.count ?? null, limit: res.page.limit, offset: res.page.offset };
}









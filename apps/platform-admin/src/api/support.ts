export type DiagnosticsSummary = {
  supabaseConnected: boolean;
  rlsWarnings: string[];
  tableCounts: { table: string; rows: number }[];
  recentFailures: { id: string; message: string; created_at: string }[];
};

export type JobStat = {
  queue: string;
  pending: number;
  processing: number;
  failed: number;
};

export function getDiagnosticsPlaceholder(): DiagnosticsSummary {
  return {
    supabaseConnected: true,
    rlsWarnings: ["tenants_rls_policy check pending"],
    tableCounts: [
      { table: "tenants", rows: 0 },
      { table: "platform_admins", rows: 0 },
    ],
    recentFailures: [],
  };
}

export function getJobStatsPlaceholder(): JobStat[] {
  return [
    { queue: "email", pending: 3, processing: 1, failed: 0 },
    { queue: "reporting", pending: 1, processing: 0, failed: 0 },
  ];
}









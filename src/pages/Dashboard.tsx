import React, { useEffect, useState } from 'react';
import { useOrg } from '@/lib/tenant/OrgContext';
import { getDashboardStats, getRecentPayRuns, getCompaniesSummary } from '@/lib/services/DashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const { organizationId } = useOrg();
  const [stats, setStats] = useState<{ companies: number; employees: number; groups: number; payroll: number }>({companies:0, employees:0, groups:0, payroll:0});
  const [payRuns, setPayRuns] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    Promise.all([
      getDashboardStats(organizationId),
      getRecentPayRuns(organizationId),
      getCompaniesSummary(organizationId)
    ]).then(([stats, payRunsRes, companiesRes]) => {
      setStats(stats);
      setPayRuns(payRunsRes.data || []);
      setCompanies(companiesRes.data || []);
      setLoading(false);
    });
  }, [organizationId]);

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Organization Overview</h1>
          <p className="text-muted-foreground text-sm">Welcome back — here’s how your organization is performing.</p>
        </div>
        {companies.length > 0 && (
          <span className="bg-primary/80 text-white text-xs px-3 py-1 rounded-md font-medium shadow">Org: {companies[0].name || 'GWAZU'}</span>
        )}
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
        <MetricCard label="Total Companies" value={stats.companies} loading={loading} />
        <MetricCard label="Employees" value={stats.employees} loading={loading} />
        <MetricCard label="Active Pay Groups" value={stats.groups} loading={loading} />
        <MetricCard label="Payroll This Month" value={stats.payroll?.toLocaleString('en-US', {style:'currency',currency:'USD'})} loading={loading} />
      </div>
      {/* Recent Pay Runs */}
      <div className="mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Recent Pay Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th>Date</th>
                  <th>Pay Group</th>
                  <th>Employees</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payRuns.map(pr => (
                  <tr key={pr.id} className="border-b last:border-none">
                    <td>{pr.pay_period_start?.slice(0,10)} - {pr.pay_period_end?.slice(0,10)}</td>
                    <td>{pr.pay_group?.name}</td>
                    <td>{pr.total_employees || '-'}</td>
                    <td>{pr.total_gross?.toLocaleString('en-US', {style:'currency',currency:'USD'})}</td>
                    <td>{pr.total_net?.toLocaleString('en-US', {style:'currency',currency:'USD'})}</td>
                    <td>{pr.payroll_status}</td>
                  </tr>
                ))}
                {!loading && payRuns.length === 0 && (
                  <tr><td colSpan={6} className="text-muted-foreground py-3">No pay runs found.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      {/* Companies */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Company Summaries</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {companies.map(c => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-1">
                <div>Org Units: <span className="font-semibold">{c.org_units?.length || 0}</span></div>
                <div>Employees: <span className="font-semibold">{Array.isArray(c.employee_count) ? c.employee_count.length : 0}</span></div>
                <div>Total Payroll: <span className="font-semibold">{Array.isArray(c.payroll)&&c.payroll.length>0 ? c.payroll.map(p=>p.total_gross).reduce((a,n)=>a+n,0).toLocaleString('en-US', {style:'currency',currency:'USD'}) : '$0'}</span></div>
              </CardContent>
            </Card>
          ))}
          {!loading && companies.length === 0 && <div className="text-muted-foreground">No companies found...</div>}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, loading }: { label: string; value: any; loading: boolean }) => (
  <Card className="flex flex-col items-center justify-center py-8">
    <CardHeader className="pb-2 text-center">
      <CardTitle className="text-lg font-medium mb-2">{label}</CardTitle>
    </CardHeader>
    <CardContent className="text-2xl font-bold">
      {loading ? <span className="animate-pulse text-muted-foreground">----</span> : value ?? '--'}
    </CardContent>
  </Card>
);

export default Dashboard;

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ShieldAlert, ClipboardCheck, GraduationCap, Shield, Calendar } from 'lucide-react';
import { getDashboardKpis } from '@/lib/services/ehs.service';
import type { EhsDashboardKpis } from '@/lib/types/ehs';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#6366f1'];

export function EhsDashboard() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const [kpis, setKpis] = useState<EhsDashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    getDashboardKpis(orgId)
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  const kpiCards = [
    {
      title: 'Days Without Incident',
      value: kpis?.daysWithoutIncident ?? '-',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Incidents This Month',
      value: kpis?.totalIncidentsThisMonth ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Open Hazards',
      value: kpis?.openHazards ?? 0,
      icon: ShieldAlert,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Inspections Due',
      value: kpis?.inspectionsDue ?? 0,
      icon: ClipboardCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Expiring Certs (30d)',
      value: kpis?.expiringCertifications ?? 0,
      icon: GraduationCap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Open Corrective Actions',
      value: kpis?.openCorrectiveActions ?? 0,
      icon: Calendar,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  // Placeholder chart data
  const incidentTrend = [
    { month: 'Oct', incidents: 3, nearMisses: 5 },
    { month: 'Nov', incidents: 2, nearMisses: 4 },
    { month: 'Dec', incidents: 1, nearMisses: 6 },
    { month: 'Jan', incidents: 4, nearMisses: 3 },
    { month: 'Feb', incidents: 2, nearMisses: 7 },
    { month: 'Mar', incidents: kpis?.totalIncidentsThisMonth ?? 0, nearMisses: 2 },
  ];

  const hazardsByRisk = [
    { name: 'Low', value: 4 },
    { name: 'Medium', value: 8 },
    { name: 'High', value: 3 },
    { name: 'Critical', value: 1 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">EHS Dashboard</h1>
        <p className="text-muted-foreground">Environment, Health & Safety overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      {loading ? '...' : card.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-2 ${card.bgColor}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incident & Near Miss Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={incidentTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="incidents" fill="hsl(var(--destructive))" name="Incidents" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nearMisses" fill="hsl(var(--primary))" name="Near Misses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hazards by Risk Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Hazards by Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={hazardsByRisk} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {hazardsByRisk.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

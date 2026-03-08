// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceService } from "@/lib/services/attendance.service";
import { Users, UserCheck, UserX, Clock, Coffee, Briefcase, Home, Building2 } from "lucide-react";

interface AttendanceDashboardProps {
  organizationId: string;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export function AttendanceDashboard({ organizationId }: AttendanceDashboardProps) {
  const [stats, setStats] = useState({
    present: 0, absent: 0, late: 0, halfDay: 0,
    leave: 0, sick: 0, remote: 0, total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [organizationId]);

  const loadStats = async () => {
    try {
      const data = await AttendanceService.getTodayStats(organizationId);
      setStats(data);
    } catch (err) {
      console.error("Error loading attendance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Today's Attendance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Tracked" value={stats.total} icon={Users} color="bg-primary/10 text-primary" />
          <StatCard title="Present" value={stats.present} icon={UserCheck} color="bg-emerald-500/10 text-emerald-600" />
          <StatCard title="Absent" value={stats.absent} icon={UserX} color="bg-destructive/10 text-destructive" />
          <StatCard title="Late" value={stats.late} icon={Clock} color="bg-amber-500/10 text-amber-600" />
          <StatCard title="Half Day" value={stats.halfDay} icon={Coffee} color="bg-orange-500/10 text-orange-600" />
          <StatCard title="On Leave" value={stats.leave} icon={Briefcase} color="bg-blue-500/10 text-blue-600" />
          <StatCard title="Sick" value={stats.sick} icon={Building2} color="bg-purple-500/10 text-purple-600" />
          <StatCard title="Remote" value={stats.remote} icon={Home} color="bg-cyan-500/10 text-cyan-600" />
        </div>
      </div>
    </div>
  );
}

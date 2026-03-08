// @ts-nocheck
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { AdminAttendanceGrid } from "@/components/attendance/AdminAttendanceGrid";
import { BulkUploadAttendance } from "@/components/attendance/BulkUploadAttendance";
import { RegularizationPanel } from "@/components/attendance/RegularizationPanel";
import { ProjectAttendanceDashboard } from "@/components/attendance/ProjectAttendanceDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { AdminTimeTracking } from "@/components/attendance/AdminTimeTracking";
import { BarChart3, Users, Upload, AlertCircle, Briefcase, Timer } from "lucide-react";

export default function Attendance() {
  const { session } = useSupabaseAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadOrg();
  }, [session]);

  const loadOrg = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data) setOrganizationId(data.organization_id);
  };

  if (!organizationId) {
    return <div className="p-6"><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage organization-wide attendance</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="mark" className="gap-1.5">
            <Users className="h-4 w-4" /> Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1.5">
            <Upload className="h-4 w-4" /> Bulk Upload
          </TabsTrigger>
          <TabsTrigger value="regularization" className="gap-1.5">
            <AlertCircle className="h-4 w-4" /> Regularization
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5">
            <Briefcase className="h-4 w-4" /> By Project
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AttendanceDashboard organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="mark">
          <AdminAttendanceGrid organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkUploadAttendance organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="regularization">
          <RegularizationPanel organizationId={organizationId} mode="admin" />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectAttendanceDashboard organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

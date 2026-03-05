import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { TimesheetManager } from "@/components/timesheets/TimesheetManager";
import { TimesheetReviewPanel } from "@/components/timesheets/TimesheetReviewPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, ClipboardList } from "lucide-react";
import { RBACService } from "@/lib/services/auth/rbac";

export default function Timesheets() {
  const { userContext } = useSupabaseAuth();
  const isManager = RBACService.isOrgAdmin() || RBACService.isPlatformAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Timesheets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Log daily work hours, save drafts, and submit for approval
        </p>
      </div>

      {isManager ? (
        <Tabs defaultValue="my-timesheets">
          <TabsList>
            <TabsTrigger value="my-timesheets" className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> My Timesheets
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Review Team
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my-timesheets" className="mt-4">
            <TimesheetManager />
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            <TimesheetReviewPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <TimesheetManager />
      )}
    </div>
  );
}

// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

interface ProjectOnboardingChecklistProps {
  projectId: string;
}

const STEP_LABELS: Record<string, string> = {
  basic_info: "Basic Information",
  manager_assigned: "Responsible Manager Assigned",
  pay_types_configured: "Pay Types Configured",
  employees_assigned: "Employees Assigned",
};

const STEP_ORDER = ["basic_info", "manager_assigned", "pay_types_configured", "employees_assigned"];

export default function ProjectOnboardingChecklist({ projectId }: ProjectOnboardingChecklistProps) {
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["project-onboarding-steps", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_onboarding_steps")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  if (isLoading) return null;
  if (steps.length === 0) return null;

  const completedCount = steps.filter((s: any) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFullyOnboarded = completedCount === totalCount;

  const stepMap = new Map(steps.map((s: any) => [s.step_key, s]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Onboarding Progress</h3>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount} steps{isFullyOnboarded ? " ✓ Fully Onboarded" : ""}
        </span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      <div className="grid grid-cols-2 gap-2">
        {STEP_ORDER.map((key) => {
          const step = stepMap.get(key);
          const completed = step?.completed ?? false;
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              {completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={completed ? "text-foreground" : "text-muted-foreground"}>
                {STEP_LABELS[key] || key}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

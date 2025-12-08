import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrg } from "@/lib/tenant/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { EmployeesService } from "@/lib/data/employees.service";
import { EMPLOYEE_TYPE_TO_PROJECT_TYPE } from "@/lib/types/projects";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddProjectEmployeesDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export default function AddProjectEmployeesDialog({ project, open, onOpenChange, onAssigned }: AddProjectEmployeesDialogProps) {
  const { organizationId } = useOrg();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open || !project?.project_type) return;
      setLoading(true);
      try {
        // Fetch employees eligible for this project:
        // - category = 'projects'
        // - employee_type mapped to project's project_type
        const mapping: Record<string, string> = {
          manpower: "manpower",
          ippms: "ippms",
          expatriate: "expatriate",
        };
        const employeeType = mapping[project.project_type] || project.project_type;
        let query = supabase
          .from("employees")
          .select("id, first_name, middle_name, last_name, email, employee_type, project_id, pay_type, status")
          .eq("category", "projects")
          .eq("employee_type", employeeType)
          .is("project_id", null)
          .order("first_name");
        if (organizationId) {
          query = (query as any).eq("organization_id", organizationId);
        }
        const { data, error } = await query;
        if (error) throw error;
        setCandidates(data || []);
        setSelected({});
      } catch {
        setCandidates([]);
        setSelected({});
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, project?.project_type, organizationId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const s = search.toLowerCase();
    return candidates.filter((c) =>
      [c.first_name, c.middle_name, c.last_name, c.email].filter(Boolean).join(" ").toLowerCase().includes(s)
    );
  }, [candidates, search]);

  const assignMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await EmployeesService.assignToProject(id, project.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", project?.id] });
      qc.invalidateQueries({ queryKey: ["project-employees", project?.id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      onAssigned();
      onOpenChange(false);
    }
  });

  const onConfirm = () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length > 0) {
      assignMutation.mutate(ids);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Employees to Project</DialogTitle>
          <DialogDescription>
            Select employees to assign to {project?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." />
          </div>
          <div className="border rounded-md max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-muted-foreground">No eligible employees found.</div>
            ) : (
              <div className="divide-y">
                {filtered.map((emp) => {
                  const name = [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ");
                  const checked = !!selected[emp.id];
                  return (
                    <label key={emp.id} className="flex items-center gap-2 p-3 cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={(v) => setSelected((s) => ({ ...s, [emp.id]: !!v }))} />
                      <div className="flex-1">
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onConfirm} disabled={assignMutation.isLoading}>
              Assign Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



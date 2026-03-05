import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrg } from "@/lib/tenant/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { EmployeesService } from "@/lib/data/employees.service";
import { EMPLOYEE_TYPE_TO_PROJECT_TYPE } from "@/lib/types/projects";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AddProjectEmployeesDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export default function AddProjectEmployeesDialog({ project, open, onOpenChange, onAssigned }: AddProjectEmployeesDialogProps) {
  const { organizationId } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    pay_rate: "",
    pay_type: "salary",
    date_joined: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      try {
        const orgId = organizationId || localStorage.getItem("active_organization_id");
        // Fetch all employees in the org so assignment can pick anyone in the system.
        // employee_type and pay_type are auto-cascaded from project settings on assignment.
        let query = supabase
          .from("employees")
          .select("id, first_name, middle_name, last_name, email, employee_type, project_id, pay_type, status")
          .order("first_name");
        if (orgId) {
          query = (query as any).eq("organization_id", orgId);
        }
        const { data, error } = await query;
        if (error) throw error;
        setCandidates(data || []);
        setSelected({});
      } catch (error) {
        console.error("Failed to load employees for assignment:", error);
        setCandidates([]);
        setSelected({});
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, organizationId]);

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

  const getEmployeeTypeForProject = () => {
    const mapping: Record<string, string> = {
      manpower: "manpower",
      ippms: "ippms",
      expatriate: "expatriate",
    };
    return mapping[project?.project_type] || project?.project_type || "regular";
  };

  const getDefaultPayType = () => {
    const allowed = Array.isArray(project?.allowed_pay_types) ? project.allowed_pay_types : [];
    const first = String(allowed[0] || "").toLowerCase();
    if (first === "daily" || first === "daily_rate") return "daily_rate";
    if (first === "hourly") return "hourly";
    if (first === "piece_rate") return "piece_rate";
    if (first === "monthly" || first === "bi_weekly" || first === "salary") return "salary";
    if (project?.project_type === "ippms") return "piece_rate";
    if (project?.project_type === "manpower") return "daily_rate";
    return "salary";
  };

  useEffect(() => {
    if (!open) return;
    setCreateForm((prev) => ({ ...prev, pay_type: getDefaultPayType() }));
  }, [open, project?.project_type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateAndAssign = async () => {
    const orgId = organizationId || localStorage.getItem("active_organization_id");
    if (!orgId) {
      toast({ title: "Organization missing", description: "No active organization selected.", variant: "destructive" });
      return;
    }
    if (!createForm.first_name || !createForm.email || !createForm.pay_rate) {
      toast({ title: "Missing fields", description: "First name, email, and pay rate are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const employeeNumber = `EMP-${Date.now()}`;
      const country = project?.country || "UG";
      const currency = project?.currency || "UGX";
      const { data: inserted, error } = await supabase
        .from("employees")
        .insert([
          {
            employee_number: employeeNumber,
            first_name: createForm.first_name,
            last_name: createForm.last_name || null,
            email: createForm.email,
            pay_type: createForm.pay_type as "hourly" | "salary" | "piece_rate" | "daily_rate",
            pay_rate: Number(createForm.pay_rate),
            country,
            currency,
            date_joined: createForm.date_joined || null,
            category: "projects",
            employee_type: getEmployeeTypeForProject(),
            organization_id: orgId,
            status: "active",
          },
        ])
        .select("id")
        .single();
      if (error) throw error;

      await EmployeesService.assignToProject(inserted.id, project.id);
      toast({ title: "Employee created and assigned" });
      qc.invalidateQueries({ queryKey: ["project-employees", project?.id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      onAssigned();
      setCreateForm({
        first_name: "",
        last_name: "",
        email: "",
        pay_rate: "",
        pay_type: getDefaultPayType(),
        date_joined: "",
      });
    } catch (e: any) {
      toast({ title: "Failed to create employee", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Employees to Project</DialogTitle>
          <DialogDescription>
            Select employees to assign to {project?.name}. On assignment, employee type, pay type, country, and currency are auto-filled from project configuration.
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
              <div className="p-4 text-muted-foreground">No employees found.</div>
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

          <div className="rounded-md border p-3 space-y-3">
            <div className="text-sm font-medium">Create and assign new employee</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First name *</Label>
                <Input
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, first_name: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last name</Label>
                <Input
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, last_name: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pay rate *</Label>
                <Input
                  type="number"
                  value={createForm.pay_rate}
                  onChange={(e) => setCreateForm((s) => ({ ...s, pay_rate: e.target.value }))}
                  placeholder="e.g. 150000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pay type</Label>
                <Select value={createForm.pay_type} onValueChange={(value) => setCreateForm((s) => ({ ...s, pay_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="piece_rate">Piece Rate</SelectItem>
                    <SelectItem value="daily_rate">Daily Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date joined</Label>
                <Input
                  type="date"
                  value={createForm.date_joined}
                  onChange={(e) => setCreateForm((s) => ({ ...s, date_joined: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleCreateAndAssign} disabled={creating}>
                {creating ? "Creating..." : "Create & Assign"}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onConfirm} disabled={assignMutation.isPending}>
              Assign Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



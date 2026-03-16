import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  UserPlus,
  UserCheck,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { roleCatalog, type RoleKey } from "@/lib/obacDisplay";

// Roles eligible for approval workflows
const APPROVER_ROLES: RoleKey[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "ORG_PAYROLL_ADMIN",
  "ORG_FINANCE_APPROVER",
  "ORG_HEAD_OFFICE_PAYROLL",
];

interface WorkflowStep {
  id: string;
  workflow_id: string;
  level: number;
  approver_user_id: string | null;
  approver_role: string | null;
  sequence_number: number;
  approver?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface UserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

type ApproverMode = "role" | "individual";

export const ApproversSection = () => {
  const { organizationId } = useOrg();
  const { toast } = useToast();

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [workflowMeta, setWorkflowMeta] = useState<{
    created_by_name?: string;
    updated_by_name?: string;
    created_at?: string;
    updated_at?: string;
  } | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approverMode, setApproverMode] = useState<ApproverMode>("role");
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // ─── Get or create default workflow ───────────────────────────────────────

  const ensureDefaultWorkflow = useCallback(async (): Promise<string | null> => {
    if (!organizationId) return null;

    const { data: existing } = await (supabase as any)
      .from("approval_workflows")
      .select("id")
      .eq("org_id", organizationId)
      .eq("is_default", true)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created, error } = await (supabase as any)
      .from("approval_workflows")
      .insert({
        org_id: organizationId,
        name: "Default Payroll Workflow",
        description: "Default approval workflow for all payruns",
        is_active: true,
        is_default: true,
        version: 1,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create default workflow:", error);
      return null;
    }

    return created.id;
  }, [organizationId]);

  // ─── Fetch steps ──────────────────────────────────────────────────────────

  const fetchSteps = useCallback(async (wfId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("approval_workflow_steps")
      .select(`
        id, workflow_id, level, approver_user_id, approver_role, sequence_number,
        approver:approver_user_id(first_name, last_name, email)
      `)
      .eq("workflow_id", wfId)
      .order("level", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load approvers.", variant: "destructive" });
    } else {
      setSteps((data ?? []) as WorkflowStep[]);
    }
    setLoading(false);
  }, [toast]);

  const fetchWorkflowMeta = useCallback(async (wfId: string) => {
    const { data } = await (supabase as any)
      .from("approval_workflows")
      .select(`
        created_at, updated_at,
        creator:created_by(first_name, last_name),
        editor:updated_by(first_name, last_name)
      `)
      .eq("id", wfId)
      .maybeSingle();

    if (data) {
      const creatorName = data.creator
        ? [data.creator.first_name, data.creator.last_name].filter(Boolean).join(" ")
        : undefined;
      const editorName = data.editor
        ? [data.editor.first_name, data.editor.last_name].filter(Boolean).join(" ")
        : undefined;
      setWorkflowMeta({
        created_by_name: creatorName,
        updated_by_name: editorName,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!organizationId) return;
      const wfId = await ensureDefaultWorkflow();
      if (wfId) {
        setWorkflowId(wfId);
        await fetchSteps(wfId);
        await fetchWorkflowMeta(wfId);
      }
    };
    init();
  }, [organizationId, ensureDefaultWorkflow, fetchSteps, fetchWorkflowMeta]);

  // ─── Ensure payroll_approval_configs catch-all row ───────────────────────

  const ensureApprovalConfig = useCallback(async (wfId: string) => {
    if (!organizationId) return;

    await (supabase as any)
      .rpc("seed_default_categories", { org_id: organizationId })
      .catch(() => {});

    const { data: categories } = await (supabase as any)
      .from("employee_categories")
      .select("id, key")
      .eq("organization_id", organizationId);

    if (!categories || categories.length === 0) return;

    const { data: config, error: configErr } = await (supabase as any)
      .from("payroll_approval_configs")
      .upsert({
        organization_id: organizationId,
        name: "Default Approval Config",
        is_enabled: true,
        workflow_id: wfId,
      }, { onConflict: "organization_id,name" })
      .select("id")
      .single();

    if (configErr || !config) return;

    for (const cat of categories) {
      await (supabase as any)
        .from("payroll_approval_categories")
        .upsert({ config_id: config.id, category_id: cat.id }, { onConflict: "config_id,category_id" });
    }
  }, [organizationId]);

  // ─── Reorder ──────────────────────────────────────────────────────────────

  const swapLevels = async (a: WorkflowStep, b: WorkflowStep) => {
    setActionLoading(`swap-${a.id}-${b.id}`);
    await Promise.all([
      (supabase as any).from("approval_workflow_steps").update({ level: b.level, sequence_number: b.sequence_number }).eq("id", a.id),
      (supabase as any).from("approval_workflow_steps").update({ level: a.level, sequence_number: a.sequence_number }).eq("id", b.id),
    ]);
    if (workflowId) await fetchSteps(workflowId);
    setActionLoading(null);
  };

  const moveUp = (i: number) => { if (i > 0) swapLevels(steps[i], steps[i - 1]); };
  const moveDown = (i: number) => { if (i < steps.length - 1) swapLevels(steps[i], steps[i + 1]); };

  // ─── Remove ───────────────────────────────────────────────────────────────

  const removeStep = async (id: string) => {
    setActionLoading(`remove-${id}`);
    const { error } = await (supabase as any).from("approval_workflow_steps").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to remove approver.", variant: "destructive" });
      setActionLoading(null);
      return;
    }

    if (workflowId) {
      const remaining = steps.filter((s) => s.id !== id);
      await Promise.all(
        remaining.map((s, idx) =>
          (supabase as any).from("approval_workflow_steps")
            .update({ level: idx + 1, sequence_number: idx + 1 })
            .eq("id", s.id)
        )
      );
      await fetchSteps(workflowId);
    }
    toast({ title: "Approver removed" });
    setActionLoading(null);
  };

  // ─── Search users ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userSearch.trim() || !organizationId || approverMode !== "individual") {
      setUserOptions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await (supabase as any)
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .eq("organization_id", organizationId)
        .or(`first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);
      setUserOptions((data ?? []) as UserOption[]);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, organizationId, approverMode]);

  // ─── Add approver ─────────────────────────────────────────────────────────

  const openModal = () => {
    setSelectedUser(null);
    setSelectedRole(null);
    setUserSearch("");
    setUserOptions([]);
    setApproverMode("role");
    setModalOpen(true);
  };

  const canSave = approverMode === "role" ? !!selectedRole : !!selectedUser;

  const handleSave = async () => {
    if (!workflowId || !canSave) return;
    setSaving(true);

    const nextLevel = steps.length + 1;

    const insertPayload: Record<string, any> = {
      workflow_id: workflowId,
      level: nextLevel,
      sequence_number: nextLevel,
      notify_email: true,
      notify_in_app: true,
    };

    if (approverMode === "role" && selectedRole) {
      insertPayload.approver_role = selectedRole;
      insertPayload.approver_user_id = null;
      insertPayload.approver_type = "role";
    } else if (approverMode === "individual" && selectedUser) {
      insertPayload.approver_user_id = selectedUser.id;
      insertPayload.approver_role = null;
      insertPayload.approver_type = "individual";
    }

    const { error } = await (supabase as any).from("approval_workflow_steps").insert(insertPayload);

    if (error) {
      toast({ title: "Error", description: "Failed to add approver.", variant: "destructive" });
    } else {
      await ensureApprovalConfig(workflowId);
      const displayName = approverMode === "role" && selectedRole
        ? roleCatalog[selectedRole].label
        : [selectedUser?.first_name, selectedUser?.last_name].filter(Boolean).join(" ") || selectedUser?.email;
      toast({ title: "Approver added", description: `${displayName} added to level ${nextLevel}.` });
      setModalOpen(false);
      await fetchSteps(workflowId);
    }
    setSaving(false);
  };

  // ─── Helper: display name for a step ──────────────────────────────────────

  const getStepDisplay = (step: WorkflowStep) => {
    if (step.approver_role && step.approver_role in roleCatalog) {
      const role = roleCatalog[step.approver_role as RoleKey];
      return { name: role.label, subtitle: role.description, isRole: true };
    }
    const approver = (step as any).approver;
    const name = approver
      ? [approver.first_name, approver.last_name].filter(Boolean).join(" ") || approver.email
      : step.approver_user_id || "Unknown User";
    const email = approver?.email || "";
    return { name, subtitle: email, isRole: false };
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No organization context found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Approval Workflow</CardTitle>
          <CardDescription>
            Configure the approvers for payrun approval. Add approvers by OBAC role (recommended)
            or by individual user. Approvers are notified in the order listed.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading approvers…</span>
            </div>
          ) : steps.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <UserCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                No approvers configured yet. Click <strong>Add Approver</strong> to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {steps.map((step, index) => {
                const display = getStepDisplay(step);
                const isFirst = index === 0;
                const isLast = index === steps.length - 1;
                const isBusy = actionLoading === `remove-${step.id}` || actionLoading?.includes(step.id);

                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                      Level {step.level}
                    </Badge>

                    {display.isRole && (
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-tight truncate">{display.name}</p>
                        {display.isRole && (
                          <Badge variant="outline" className="text-[10px] shrink-0">Role</Badge>
                        )}
                      </div>
                      {display.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{display.subtitle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        disabled={isFirst || !!actionLoading} onClick={() => moveUp(index)} title="Move up">
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        disabled={isLast || !!actionLoading} onClick={() => moveDown(index)} title="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!!actionLoading} onClick={() => removeStep(step.id)} title="Remove">
                        {actionLoading === `remove-${step.id}`
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <Button onClick={openModal} variant="outline" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Approver
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Approver Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Approver</DialogTitle>
            <DialogDescription>
              Choose to assign an approver by OBAC role or by individual user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode selector */}
            <RadioGroup
              value={approverMode}
              onValueChange={(v) => {
                setApproverMode(v as ApproverMode);
                setSelectedRole(null);
                setSelectedUser(null);
                setUserSearch("");
                setUserOptions([]);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="role" id="mode-role" />
                <Label htmlFor="mode-role" className="cursor-pointer text-sm font-medium">By Role</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="individual" id="mode-individual" />
                <Label htmlFor="mode-individual" className="cursor-pointer text-sm font-medium">By Individual</Label>
              </div>
            </RadioGroup>

            {/* Role selection */}
            {approverMode === "role" && (
              <div className="space-y-2">
                <Label>Select Role</Label>
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {APPROVER_ROLES.map((roleKey) => {
                    const role = roleCatalog[roleKey];
                    const isSelected = selectedRole === roleKey;
                    return (
                      <button
                        key={roleKey}
                        className={`w-full text-left px-3 py-2.5 transition-colors text-sm ${
                          isSelected ? "bg-primary/10 border-primary/20" : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedRole(roleKey)}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className="font-medium">{role.label}</p>
                            <p className="text-xs text-muted-foreground">{role.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedRole && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium">{roleCatalog[selectedRole].label}</p>
                      <p className="text-xs text-muted-foreground">
                        Any user with this role will be eligible to approve at this level.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Individual user selection */}
            {approverMode === "individual" && (
              <>
                <div className="space-y-1.5">
                  <Label>Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name or email…"
                      className="pl-9"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setSelectedUser(null);
                      }}
                    />
                  </div>
                </div>

                {searchLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                  </div>
                )}

                {userOptions.length > 0 && !selectedUser && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {userOptions.map((u) => {
                      const label = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
                      return (
                        <button
                          key={u.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSearch(label || "");
                            setUserOptions([]);
                          }}
                        >
                          <p className="font-medium">{label}</p>
                          {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedUser && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(" ") || "User"}
                      </p>
                      {selectedUser.email && <p className="text-xs text-muted-foreground">{selectedUser.email}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs"
                      onClick={() => { setSelectedUser(null); setUserSearch(""); }}>
                      Change
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !canSave} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

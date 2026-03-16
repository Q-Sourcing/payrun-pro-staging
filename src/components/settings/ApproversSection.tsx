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
  Building2,
} from "lucide-react";

interface Approver {
  id: string;
  company_id: string;
  approver_id: string | null;
  approver_email: string;
  approver_name: string;
  step_order: number;
  created_at: string;
}

export const ApproversSection = () => {
  const { companyId, organizationId } = useOrg();
  const { toast } = useToast();

  // Resolved company — may differ from context when platform-admin picks first company
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  // ─── Resolve company ──────────────────────────────────────────────────────

  useEffect(() => {
    async function resolve() {
      setResolving(true);

      // 1. Use context companyId if available
      if (companyId) {
        setResolvedCompanyId(companyId);
        setResolving(false);
        return;
      }

      // 2. Fall back: find the first company for this org (platform admin case)
      if (organizationId) {
        const { data } = await supabase
          .from("companies")
          .select("id")
          .eq("organization_id", organizationId)
          .limit(1)
          .maybeSingle();
        if (data?.id) {
          setResolvedCompanyId(data.id);
          setResolving(false);
          return;
        }
      }

      // 3. Last resort: user's own membership
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: mem } = await supabase
          .from("user_company_memberships")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (mem?.company_id) {
          setResolvedCompanyId(mem.company_id);
          setResolving(false);
          return;
        }
      }

      setResolvedCompanyId(null);
      setResolving(false);
    }

    resolve();
  }, [companyId, organizationId]);

  // ─── Fetch approvers ──────────────────────────────────────────────────────

  const fetchApprovers = useCallback(async () => {
    if (!resolvedCompanyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("payrun_workflow_approvers")
      .select("*")
      .eq("company_id", resolvedCompanyId)
      .order("step_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load approvers.",
        variant: "destructive",
      });
    } else {
      setApprovers((data ?? []) as Approver[]);
    }
    setLoading(false);
  }, [resolvedCompanyId, toast]);

  useEffect(() => {
    if (resolvedCompanyId) fetchApprovers();
  }, [resolvedCompanyId, fetchApprovers]);

  // ─── Reorder ──────────────────────────────────────────────────────────────

  const swapSteps = async (a: Approver, b: Approver) => {
    setActionLoading(`swap-${a.id}-${b.id}`);
    const [r1, r2] = await Promise.all([
      supabase
        .from("payrun_workflow_approvers")
        .update({ step_order: b.step_order })
        .eq("id", a.id),
      supabase
        .from("payrun_workflow_approvers")
        .update({ step_order: a.step_order })
        .eq("id", b.id),
    ]);
    if (r1.error || r2.error) {
      toast({
        title: "Error",
        description: "Failed to reorder approvers.",
        variant: "destructive",
      });
    }
    await fetchApprovers();
    setActionLoading(null);
  };

  const moveUp = (i: number) => { if (i > 0) swapSteps(approvers[i], approvers[i - 1]); };
  const moveDown = (i: number) => { if (i < approvers.length - 1) swapSteps(approvers[i], approvers[i + 1]); };

  // ─── Remove + resequence ─────────────────────────────────────────────────

  const removeApprover = async (id: string) => {
    setActionLoading(`remove-${id}`);
    const { error } = await supabase
      .from("payrun_workflow_approvers")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to remove approver.", variant: "destructive" });
      setActionLoading(null);
      return;
    }

    const remaining = approvers.filter((a) => a.id !== id);
    await Promise.all(
      remaining.map((a, idx) =>
        supabase
          .from("payrun_workflow_approvers")
          .update({ step_order: idx + 1 })
          .eq("id", a.id)
      )
    );

    toast({ title: "Approver removed", description: "Step order updated." });
    await fetchApprovers();
    setActionLoading(null);
  };

  // ─── Add approver ─────────────────────────────────────────────────────────

  const openModal = () => {
    setNewName("");
    setNewEmail("");
    setNameError("");
    setEmailError("");
    setModalOpen(true);
  };

  const validateForm = () => {
    let valid = true;
    if (!newName.trim()) { setNameError("Full name is required."); valid = false; }
    else setNameError("");
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail.trim()) { setEmailError("Email address is required."); valid = false; }
    else if (!re.test(newEmail.trim())) { setEmailError("Enter a valid email address."); valid = false; }
    else setEmailError("");
    return valid;
  };

  const handleSave = async () => {
    if (!validateForm() || !resolvedCompanyId) return;
    setSaving(true);

    const nextOrder =
      approvers.length > 0 ? Math.max(...approvers.map((a) => a.step_order)) + 1 : 1;

    const { error } = await supabase.from("payrun_workflow_approvers").insert({
      company_id: resolvedCompanyId,
      approver_name: newName.trim(),
      approver_email: newEmail.trim().toLowerCase(),
      step_order: nextOrder,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add approver.", variant: "destructive" });
    } else {
      toast({ title: "Approver added", description: `${newName.trim()} added to the workflow.` });
      setModalOpen(false);
      await fetchApprovers();
    }
    setSaving(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (resolving) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </CardContent>
      </Card>
    );
  }

  if (!resolvedCompanyId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            No company is associated with your account. Please select a company first to configure approvers.
          </p>
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
            Configure the approvers for your company's payrun approval process.
            Approvers will be notified in the order listed below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading approvers…</span>
            </div>
          ) : approvers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <UserCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                No approvers configured yet. Click{" "}
                <strong>Add Approver</strong> to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {approvers.map((approver, index) => {
                const isFirst = index === 0;
                const isLast = index === approvers.length - 1;
                const isBusy =
                  actionLoading === `remove-${approver.id}` ||
                  actionLoading?.includes(approver.id);

                return (
                  <div
                    key={approver.id}
                    className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <span className="flex h-7 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      Step {approver.step_order}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {approver.approver_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {approver.approver_email}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isFirst || !!actionLoading}
                        onClick={() => moveUp(index)}
                        title="Move up"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isLast || !!actionLoading}
                        onClick={() => moveDown(index)}
                        title="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!!actionLoading}
                        onClick={() => removeApprover(approver.id)}
                        title="Remove approver"
                      >
                        {actionLoading === `remove-${approver.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
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

      {/* ── Add Approver Modal ─────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Approver</DialogTitle>
            <DialogDescription>
              Add a new approver to the payrun approval workflow. They will be
              added as the last step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="approver-name">Full Name</Label>
              <Input
                id="approver-name"
                placeholder="e.g. Jane Doe"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNameError("");
                }}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="approver-email">Email Address</Label>
              <Input
                id="approver-email"
                type="email"
                placeholder="e.g. jane.doe@company.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  UserPlus,
  UserCheck,
  Loader2,
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
  const { companyId } = useOrg();
  const { toast } = useToast();

  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchApprovers = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("payrun_workflow_approvers")
      .select("*")
      .eq("company_id", companyId)
      .order("step_order", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load approvers.", variant: "destructive" });
    } else {
      setApprovers((data ?? []) as Approver[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApprovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // ─── Reorder helpers ─────────────────────────────────────────────────────

  /** Swap step_order between two approvers in DB and re-fetch. */
  const swapSteps = async (a: Approver, b: Approver) => {
    setActionLoading(`swap-${a.id}-${b.id}`);
    const { error: errA } = await supabase
      .from("payrun_workflow_approvers")
      .update({ step_order: b.step_order })
      .eq("id", a.id);

    const { error: errB } = await supabase
      .from("payrun_workflow_approvers")
      .update({ step_order: a.step_order })
      .eq("id", b.id);

    if (errA || errB) {
      toast({ title: "Error", description: "Failed to reorder approvers.", variant: "destructive" });
    }
    await fetchApprovers();
    setActionLoading(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    swapSteps(approvers[index], approvers[index - 1]);
  };

  const moveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    swapSteps(approvers[index], approvers[index + 1]);
  };

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

    // Resequence remaining approvers
    const remaining = approvers.filter((a) => a.id !== id);
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("payrun_workflow_approvers")
        .update({ step_order: i + 1 })
        .eq("id", remaining[i].id);
    }

    toast({ title: "Approver removed", description: "Step order has been updated." });
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

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail.trim()) { setEmailError("Email address is required."); valid = false; }
    else if (!emailRe.test(newEmail.trim())) { setEmailError("Enter a valid email address."); valid = false; }
    else setEmailError("");

    return valid;
  };

  const handleSave = async () => {
    if (!validateForm() || !companyId) return;
    setSaving(true);

    const nextOrder = approvers.length > 0
      ? Math.max(...approvers.map((a) => a.step_order)) + 1
      : 1;

    const { error } = await supabase
      .from("payrun_workflow_approvers")
      .insert({
        company_id: companyId,
        approver_name: newName.trim(),
        approver_email: newEmail.trim().toLowerCase(),
        step_order: nextOrder,
      });

    if (error) {
      toast({ title: "Error", description: "Failed to add approver.", variant: "destructive" });
    } else {
      toast({ title: "Approver added", description: `${newName.trim()} has been added to the workflow.` });
      setModalOpen(false);
      await fetchApprovers();
    }
    setSaving(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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
                No approvers configured yet. Click <strong>Add Approver</strong> to get started.
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
                    {/* Step badge */}
                    <span className="flex h-7 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      Step {approver.step_order}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {approver.approver_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {approver.approver_email}
                      </p>
                    </div>

                    {/* Actions */}
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
                onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
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
                onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
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

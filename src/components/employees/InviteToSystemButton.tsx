import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { UserPlus, Globe, ShieldCheck, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InviteUserDialog, useOrgRoles } from "@/components/settings/InviteUserDialog";

const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;

async function sendSelfServiceInvite(full_name: string, email: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${INVITE_FN_URL}?action=invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ full_name, email, role: "SELF_USER" }),
  });
  return res.json();
}

interface Props {
  employeeName: string;
  employeeEmail: string;
}

export function InviteToSystemButton({ employeeName, employeeEmail }: Props) {
  const { toast } = useToast();
  const { roles } = useOrgRoles();
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selfLoading, setSelfLoading] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(false);
  const [checking, setChecking] = useState(false);

  // Check if a pending invite already exists for this email
  useEffect(() => {
    if (!employeeEmail) return;
    setChecking(true);
    supabase
      .from("user_management_invitations")
      .select("status")
      .eq("email", employeeEmail)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => {
        setPendingInvite(!!data);
        setChecking(false);
      });
  }, [employeeEmail]);

  const handleSelfService = async () => {
    if (pendingInvite) {
      toast({
        title: "Pending invite exists",
        description: `${employeeEmail} already has a pending invitation. Resend it from System Settings → User Management.`,
        variant: "destructive",
      });
      setChoiceOpen(false);
      return;
    }
    setSelfLoading(true);
    try {
      const result = await sendSelfServiceInvite(employeeName, employeeEmail);
      if (!result.success) throw new Error(result.message);
      toast({
        title: "Self-service invite sent",
        description: `${employeeName} will receive an email to access their payslips and personal info.`,
      });
      setChoiceOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Failed to send invite",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSelfLoading(false);
    }
  };

  const handleSystemUser = () => {
    if (pendingInvite) {
      toast({
        title: "Pending invite exists",
        description: `${employeeEmail} already has a pending invitation.`,
      });
      setChoiceOpen(false);
      return;
    }
    setChoiceOpen(false);
    setInviteOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setChoiceOpen(true)}
        disabled={checking}
      >
        {checking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Invite to System
        {pendingInvite && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
            Invited
          </Badge>
        )}
      </Button>

      {/* Choice Dialog */}
      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite {employeeName}
            </DialogTitle>
            <DialogDescription>
              Choose how {employeeName} should access the system. An invitation email will be sent to{" "}
              <strong>{employeeEmail}</strong>.
            </DialogDescription>
          </DialogHeader>

          {pendingInvite && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>A pending invitation already exists for this employee. You can resend or cancel it from <strong>System Settings → User Management</strong>.</p>
            </div>
          )}

          <div className="grid gap-3 py-2">
            {/* Self-Service Portal option */}
            <button
              type="button"
              disabled={selfLoading || pendingInvite}
              onClick={handleSelfService}
              className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="p-2 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {selfLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Self-Service Portal</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Employee can view their payslips, attendance records, and personal info. No admin access. Sent immediately.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {["My Payslips", "My Pay Runs", "My Attendance", "My Approvals"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* System User option */}
            <button
              type="button"
              disabled={pendingInvite}
              onClick={handleSystemUser}
              className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-sm">System User</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Full system access based on an assigned role. Opens the standard invite flow where you can pick a role and grant additional module access.
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Invite Dialog (System User path) */}
      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={() => setInviteOpen(false)}
        roles={roles}
        prefill={{ full_name: employeeName, email: employeeEmail }}
      />
    </>
  );
}

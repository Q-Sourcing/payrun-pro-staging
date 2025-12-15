import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { workflowService } from "@/lib/services/workflow.service";
import { OrgSettings, ApprovalWorkflow } from "@/lib/types/workflow";
import { WorkflowBuilder } from "./WorkflowBuilder";
import { Plus, Settings2, Pencil, Trash2, CheckCircle2 } from "lucide-react";

export const ApprovalWorkflows = () => {
    const { toast } = useToast();
    const { role, isSuperAdmin } = useUserRole();
    const isOrgAdmin = role === 'organization_admin';
    const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
    const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null | undefined>(undefined); // undefined = list view, null = create mode, object = edit mode

    // Settings Form State
    const [maxLevels, setMaxLevels] = useState(5);
    const [sequential, setSequential] = useState(true);
    const [allowDelegation, setAllowDelegation] = useState(true);
    const [rejectionComment, setRejectionComment] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // In a real app we need the organization ID.
            // workflowService.getOrgSettings needs an ID.
            // We'll rely on the service to get current user's org if we don't pass one, or we need to fetch it.
            // For now, let's assume we can get it from a hook or the service handles it.
            // BUT `workflowService.getOrgSettings(orgId)` requires an ID.
            // Services usually don't self-source context unless designed that way.
            // MultiTenantPayrollService.getCurrentOrganizationId() exists.
            // I'll grab it from there/session.

            // Temp hack: rely on service if I update it, or fetch user session here.
            // Use `useUserRole` (it might have orgId).

            // Let's defer strict OrgID fetching to a "get context" step.
            // I'll assume for now I can get it.

            // For this implementation, I will just call a helper or fetch it.
            // I'll skip the complexity of fetching orgId in this snippet and assume a fixed one or fetched one.
            // I'll try to fetch it via `supabase.auth.getUser`.
            // Try to get orgId from token/session using fixed service
            let orgId = await import("@/lib/services/multi-tenant-payroll").then(m => m.MultiTenantPayrollService.getCurrentOrganizationId());

            // Fallback to user metadata
            if (!orgId) {
                const { data: { user } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getUser());
                orgId = user?.user_metadata?.organization_id || (user?.app_metadata as any)?.organization_id;

                // SUPER ADMIN FALLBACK: If still no orgId and user is super admin, fetch the first available pay_group (acts as org)
                // This is for development/staging where the super admin might not be linked to a tenant.
                if (!orgId && isSuperAdmin) {
                    console.log("Debug: Super Admin detected without Org ID. Fetching default context...");
                    const { data: defaultOrg } = await import("@/integrations/supabase/client").then(m => m.supabase
                        .from('pay_groups')
                        .select('id')
                        .limit(1)
                        .maybeSingle()
                    );
                    if (defaultOrg) {
                        orgId = defaultOrg.id;
                        console.log("Debug: Used default pay_group as Org Context", orgId);
                    }
                }

                console.log("Debug: User Metadata", {
                    user_metadata: user?.user_metadata,
                    app_metadata: user?.app_metadata,
                    foundOrgId: orgId
                });
            }

            if (!orgId) {
                console.error("No Organization ID found in user session via Service or Metadata");
                // Optional: Attempt safe fetch if metadata is missing, but given 500 error on users table, best to fail gracefully or warn.
                toast({ title: "Error", description: "Could not identify your organization. Please ensure your session is active.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const settings = await workflowService.getOrgSettings(orgId);
            if (settings) {
                setOrgSettings(settings);
                setMaxLevels(settings.max_approval_levels);
                setSequential(settings.approvals_sequential);
                setAllowDelegation(settings.approvals_allow_delegation);
                setRejectionComment(settings.approvals_rejection_comment_required);
            } else {
                // Default defaults if not set yet (first time)
                setOrgSettings({
                    id: "new",
                    org_id: orgId,
                    max_approval_levels: 5,
                    approvals_sequential: true,
                    approvals_allow_delegation: true,
                    approvals_rejection_comment_required: true,
                    approvals_visibility_non_admin: true
                });
            }

            const wfs = await workflowService.getWorkflows(orgId);
            setWorkflows(wfs);

        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to load approval settings", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!orgSettings) return;
        try {
            const updated = await workflowService.updateOrgSettings({
                org_id: orgSettings.org_id,
                max_approval_levels: Number(maxLevels),
                approvals_sequential: sequential,
                approvals_allow_delegation: allowDelegation,
                approvals_rejection_comment_required: rejectionComment,
                approvals_visibility_non_admin: orgSettings.approvals_visibility_non_admin
            });
            setOrgSettings(updated);
            toast({ title: "Settings Saved", description: "Global approval settings updated." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        }
    };

    const handleDeleteWorkflow = async (id: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        try {
            await workflowService.deleteWorkflow(id);
            loadData();
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete workflow", variant: "destructive" });
        }
    };

    if (loading) return <div>Loading settings...</div>;

    if (editingWorkflow !== undefined) {
        return (
            <WorkflowBuilder
                workflow={editingWorkflow}
                orgSettings={orgSettings!}
                onSave={() => {
                    setEditingWorkflow(undefined);
                    loadData();
                }}
                onCancel={() => setEditingWorkflow(undefined)}
            />
        );
    }

    return (
        <div className="space-y-8">
            {/* 1. Global Org Settings (Super Admin Only) */}
            {isSuperAdmin && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-primary" />
                            <CardTitle>Organization Approval Policy</CardTitle>
                        </div>
                        <CardDescription>
                            Configure strict limits and rules for all payroll approvals in this organization.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Maximum Approval Levels</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={maxLevels}
                                    onChange={e => setMaxLevels(Number(e.target.value))}
                                    className="max-w-[150px]"
                                />
                                <p className="text-xs text-muted-foreground">Limit total approvers per workflow (1-20).</p>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label>Sequential Approvals Only</Label>
                                    <Switch checked={sequential} onCheckedChange={setSequential} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Allow Delegation</Label>
                                    <Switch checked={allowDelegation} onCheckedChange={setAllowDelegation} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Require Comments on Rejection</Label>
                                    <Switch checked={rejectionComment} onCheckedChange={setRejectionComment} />
                                </div>
                            </div>
                        </div>
                        <Separator className="bg-primary/20" />
                        <div className="flex justify-end">
                            <Button onClick={handleSaveSettings}>Save Policy Changes</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 2. Workflows List */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold">Approval Workflows</h2>
                        <p className="text-sm text-muted-foreground">Define step-by-step approval chains for payruns.</p>
                    </div>
                    {(isSuperAdmin || isOrgAdmin) && (
                        <Button onClick={() => setEditingWorkflow(null)}>
                            <Plus className="h-4 w-4 mr-2" /> New Workflow
                        </Button>
                    )}
                </div>

                <div className="grid gap-4">
                    {workflows.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground">
                                No workflows defined yet. Create your first approval chain.
                            </CardContent>
                        </Card>
                    ) : (
                        workflows.map(wf => (
                            <Card key={wf.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between p-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${wf.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium">{wf.name}</h3>
                                                <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                                                    {wf.description && <span>{wf.description}</span>}
                                                    <Badge variant="outline" className="text-xs">
                                                        Created by {wf.created_by ? 'Admin' : 'System'}
                                                    </Badge>
                                                    {!wf.is_active && <Badge variant="destructive">Inactive</Badge>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingWorkflow(wf)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteWorkflow(wf.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

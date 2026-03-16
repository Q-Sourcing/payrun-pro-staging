// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { workflowService } from "@/lib/services/workflow.service";
import {
    OrgSettings,
    ApprovalWorkflow,
    PayrollApprovalScope,
    APPROVAL_SCOPE_LABELS,
    PayrollApprovalConfig
} from "@/lib/types/workflow";
import { WorkflowBuilder } from "./WorkflowBuilder";
import {
    Plus, Pencil, Trash2, ShieldCheck, ArrowRight, Layers, LayoutGrid,
    Settings2, ListChecks, ChevronRight, Loader2, ToggleLeft, GitBranch,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EmployeeCategory {
    id: string;
    label: string;
    organization_id: string;
    active: boolean;
}

export const ApprovalWorkflows = () => {
    const { toast } = useToast();
    const { role, isSuperAdmin } = useUserRole();
    const isOrgAdmin = role === 'ORG_ADMIN';
    const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
    const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
    const [payrollConfigs, setPayrollConfigs] = useState<PayrollApprovalConfig[]>([]);
    const [categories, setCategories] = useState<EmployeeCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [activeView, setActiveView] = useState<'overview' | 'builder'>('overview');
    const [activeTab, setActiveTab] = useState('streams');
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Partial<PayrollApprovalConfig> & { categories: string[] } | null>(null);

    // Settings Form State
    const [maxLevels, setMaxLevels] = useState(5);
    const [sequential, setSequential] = useState(true);
    const [allowDelegation, setAllowDelegation] = useState(true);
    const [rejectionComment, setRejectionComment] = useState(true);
    const [payrollEnabled, setPayrollEnabled] = useState(false);
    const [enabledScopes, setEnabledScopes] = useState<PayrollApprovalScope[]>([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            let orgId = await import("@/lib/services/multi-tenant-payroll").then(m => m.MultiTenantPayrollService.getCurrentOrganizationId());

            if (!orgId) {
                const { data: { user } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getUser());
                orgId = user?.user_metadata?.organization_id || (user?.app_metadata as any)?.organization_id;

                if (!orgId && user?.id) {
                    const { data: profile } = await import("@/integrations/supabase/client").then(m => m.supabase
                        .from('user_profiles')
                        .select('organization_id')
                        .eq('id', user.id)
                        .maybeSingle()
                    );
                    if (profile?.organization_id) orgId = profile.organization_id;
                }

                if (!orgId && isSuperAdmin) {
                    const { data: defaultOrg } = await import("@/integrations/supabase/client").then(m => m.supabase
                        .from('pay_groups')
                        .select('organization_id')
                        .limit(1)
                        .maybeSingle()
                    );
                    if (defaultOrg) orgId = defaultOrg.organization_id;
                }
            }

            if (!orgId) {
                toast({ title: "Error", description: "Could not identify your organization.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const settings = await workflowService.getOrgSettings(orgId);
            if (settings) {
                const mapped: OrgSettings = { ...settings, org_id: (settings as any).organization_id || settings.org_id };
                setOrgSettings(mapped);
                setMaxLevels(mapped.max_approval_levels);
                setSequential(mapped.approvals_sequential);
                setAllowDelegation(mapped.approvals_allow_delegation);
                setRejectionComment(mapped.approvals_rejection_comment_required);
                setPayrollEnabled(mapped.payroll_approvals_enabled || false);
                setEnabledScopes(mapped.approvals_enabled_scopes || []);
            } else {
                setOrgSettings({
                    id: "new", org_id: orgId,
                    max_approval_levels: 5, approvals_sequential: true,
                    approvals_allow_delegation: true, approvals_rejection_comment_required: true,
                    approvals_visibility_non_admin: true, payroll_approvals_enabled: false,
                    approvals_enabled_scopes: []
                });
            }

            const [wfs, configs, { data: catData }] = await Promise.all([
                workflowService.getWorkflows(orgId),
                workflowService.getApprovalConfigs(orgId),
                import("@/integrations/supabase/client").then(m => m.supabase
                    .from('employee_categories').select('*').eq('organization_id', orgId).is('active', true)
                ),
            ]);
            setWorkflows(wfs);
            setPayrollConfigs(configs);
            setCategories(catData as any || []);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to load approval settings", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!orgSettings) return;
        setSavingSettings(true);
        try {
            const updated = await workflowService.updateOrgSettings({
                org_id: orgSettings.org_id,
                max_approval_levels: Number(maxLevels),
                approvals_sequential: sequential,
                approvals_allow_delegation: allowDelegation,
                approvals_rejection_comment_required: rejectionComment,
                approvals_visibility_non_admin: orgSettings.approvals_visibility_non_admin,
                payroll_approvals_enabled: payrollEnabled,
                approvals_enabled_scopes: enabledScopes
            });
            setOrgSettings(updated);
            toast({ title: "Saved", description: "Approval policy updated." });
        } catch {
            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        } finally {
            setSavingSettings(false);
        }
    };

    const toggleScope = (scope: PayrollApprovalScope) => {
        setEnabledScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
    };

    const handleSaveConfig = async () => {
        if (!editingConfig || !editingConfig.name || !orgSettings) return;
        try {
            await workflowService.updateApprovalConfig(orgSettings.org_id, {
                ...editingConfig, name: editingConfig.name, categories: editingConfig.categories
            });
            setIsConfigDialogOpen(false);
            setEditingConfig(null);
            loadData();
            toast({ title: "Saved", description: "Approval stream saved." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to save", variant: "destructive" });
        }
    };

    const handleDeleteConfig = async (id: string) => {
        if (!confirm("Delete this approval stream?")) return;
        try {
            await workflowService.deleteApprovalConfig(id);
            loadData();
            toast({ title: "Deleted" });
        } catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
    };

    const getAvailableCategories = (currentConfigId?: string) => {
        const usedIds = payrollConfigs.filter(c => c.id !== currentConfigId).flatMap(c => c.categories || []);
        return categories.filter(cat => !usedIds.includes(cat.id));
    };

    const toggleCategory = (catId: string) => {
        if (!editingConfig) return;
        const current = editingConfig.categories || [];
        setEditingConfig({
            ...editingConfig,
            categories: current.includes(catId) ? current.filter(id => id !== catId) : [...current, catId]
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading approval settings…</span>
            </div>
        );
    }

    // Full-screen workflow builder view
    if (activeView === 'builder') {
        const orgId = orgSettings?.org_id || "unknown";
        return (
            <WorkflowBuilder
                orgSettings={orgSettings || {
                    id: "temp", org_id: orgId, max_approval_levels: 5,
                    approvals_sequential: true, approvals_allow_delegation: true,
                    approvals_rejection_comment_required: true, approvals_visibility_non_admin: true,
                    payroll_approvals_enabled: true, approvals_enabled_scopes: []
                }}
                organizationId={orgId}
                onBack={() => { setActiveView('overview'); loadData(); }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Approval Workflows
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Configure approval chains, routing rules, and notifications for payroll processing.
                    </p>
                </div>
                <Button size="sm" onClick={() => setActiveView('builder')} className="gap-1.5">
                    <GitBranch className="h-4 w-4" />
                    Open Workflow Builder
                </Button>
            </div>

            {/* Tabbed Layout */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                    <TabsTrigger
                        value="streams"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2 text-sm"
                    >
                        <Layers className="h-4 w-4 mr-1.5" />
                        Approval Streams
                        {payrollConfigs.length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{payrollConfigs.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="workflows"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2 text-sm"
                    >
                        <GitBranch className="h-4 w-4 mr-1.5" />
                        Workflows
                        {workflows.length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{workflows.length}</Badge>
                        )}
                    </TabsTrigger>
                    {isSuperAdmin && (
                        <TabsTrigger
                            value="policy"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-2 text-sm"
                        >
                            <Settings2 className="h-4 w-4 mr-1.5" />
                            Global Policy
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* ─── Streams Tab ─── */}
                <TabsContent value="streams" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Map employee categories to specific approval workflows.
                        </p>
                        {(isSuperAdmin || isOrgAdmin) && orgSettings && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => { setEditingConfig({ name: '', categories: [], is_enabled: true }); setIsConfigDialogOpen(true); }}
                            >
                                <Plus className="h-3.5 w-3.5" /> New Stream
                            </Button>
                        )}
                    </div>

                    {payrollConfigs.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-lg">
                            <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-foreground">No approval streams yet</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                Create a stream to route specific employee categories through a dedicated approval workflow.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {payrollConfigs.map(config => {
                                const wf = workflows.find(w => w.id === config.workflow_id);
                                return (
                                    <div
                                        key={config.id}
                                        className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                                    >
                                        <div className={`shrink-0 p-2 rounded-lg ${config.is_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            <LayoutGrid className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground">{config.name}</span>
                                                {!config.is_enabled && <Badge variant="secondary" className="text-[10px] h-4">Disabled</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {config.categories && config.categories.length > 0 ? (
                                                    config.categories.slice(0, 3).map(catId => {
                                                        const cat = categories.find(c => c.id === catId);
                                                        return cat ? (
                                                            <Badge key={catId} variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                                {cat.label}
                                                            </Badge>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground italic">No categories</span>
                                                )}
                                                {(config.categories?.length || 0) > 3 && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                        +{(config.categories?.length || 0) - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-2">
                                            {wf ? (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span className="font-medium text-foreground">{wf.name}</span>
                                                    {wf.version && <span className="text-[10px]">v{wf.version}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No workflow</span>
                                            )}
                                        </div>

                                        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Switch
                                                checked={config.is_enabled}
                                                onCheckedChange={async (val) => {
                                                    if (!orgSettings) return;
                                                    await workflowService.updateApprovalConfig(orgSettings.org_id, {
                                                        ...config, is_enabled: val, categories: config.categories || []
                                                    } as any);
                                                    loadData();
                                                }}
                                                className="scale-90"
                                            />
                                            <Button
                                                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    setEditingConfig({
                                                        id: config.id, name: config.name, description: config.description,
                                                        is_enabled: config.is_enabled, workflow_id: config.workflow_id,
                                                        categories: config.categories || []
                                                    });
                                                    setIsConfigDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteConfig(config.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ─── Workflows Tab ─── */}
                <TabsContent value="workflows" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Define approval chains with steps, criteria, reminders, and email templates.
                        </p>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setActiveView('builder')}>
                            <Plus className="h-3.5 w-3.5" /> New Workflow
                        </Button>
                    </div>

                    {workflows.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-lg">
                            <GitBranch className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-foreground">No workflows defined</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                Create your first approval workflow to define who reviews and approves pay runs.
                            </p>
                            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setActiveView('builder')}>
                                <Plus className="h-3.5 w-3.5" /> Create Workflow
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {workflows.map(wf => (
                                <div
                                    key={wf.id}
                                    className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setActiveView('builder')}
                                >
                                    <div className={`shrink-0 p-2 rounded-lg ${wf.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        <GitBranch className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{wf.name}</span>
                                            {wf.is_default && <Badge className="text-[10px] h-4 px-1.5">Default</Badge>}
                                            {wf.version && <Badge variant="outline" className="text-[10px] h-4 px-1.5">v{wf.version}</Badge>}
                                            {!wf.is_active && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Inactive</Badge>}
                                        </div>
                                        {wf.description && (
                                            <p className="text-xs text-muted-foreground truncate">{wf.description}</p>
                                        )}
                                        {wf.applies_to_scopes && wf.applies_to_scopes.length > 0 && (
                                            <div className="flex gap-1 flex-wrap">
                                                {wf.applies_to_scopes.map(scope => (
                                                    <Badge key={scope} variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                                        {APPROVAL_SCOPE_LABELS[scope]}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ─── Global Policy Tab ─── */}
                {isSuperAdmin && (
                    <TabsContent value="policy" className="mt-6 space-y-6">
                        <p className="text-sm text-muted-foreground">
                            Organization-wide defaults that apply to all approval workflows unless overridden.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Controls */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Maximum Approval Levels</Label>
                                    <Input
                                        type="number" min={1} max={20}
                                        value={maxLevels}
                                        onChange={e => setMaxLevels(Number(e.target.value))}
                                        className="w-24 h-9"
                                    />
                                    <p className="text-xs text-muted-foreground">Limit total approvers per workflow (1–20).</p>
                                </div>

                                <Separator />

                                {[
                                    { label: 'Sequential Approvals', desc: 'Levels must be approved in order', value: sequential, set: setSequential },
                                    { label: 'Allow Delegation', desc: 'Approvers can delegate their tasks', value: allowDelegation, set: setAllowDelegation },
                                    { label: 'Require Rejection Comments', desc: 'Force users to explain rejections', value: rejectionComment, set: setRejectionComment },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-1">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-medium">{item.label}</Label>
                                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                                        </div>
                                        <Switch checked={item.value} onCheckedChange={item.set} />
                                    </div>
                                ))}
                            </div>

                            {/* Right: Scopes */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-medium">Enabled Scopes</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">Select which payroll actions require approval.</p>
                                <div className="space-y-2">
                                    {(Object.keys(APPROVAL_SCOPE_LABELS) as PayrollApprovalScope[]).map(scope => (
                                        <label
                                            key={scope}
                                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer transition-colors"
                                        >
                                            <Checkbox
                                                checked={enabledScopes.includes(scope)}
                                                onCheckedChange={() => toggleScope(scope)}
                                            />
                                            <span className="text-sm">{APPROVAL_SCOPE_LABELS[scope]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end">
                            <Button onClick={handleSaveSettings} disabled={savingSettings} size="sm">
                                {savingSettings && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                                Save Policy
                            </Button>
                        </div>
                    </TabsContent>
                )}
            </Tabs>

            {/* ─── Stream Config Dialog ─── */}
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingConfig?.id ? 'Edit Approval Stream' : 'New Approval Stream'}</DialogTitle>
                        <DialogDescription>
                            Map employee categories to a specific approval workflow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Stream Name</Label>
                            <Input
                                placeholder="e.g. Head Office Payroll"
                                value={editingConfig?.name || ''}
                                onChange={e => setEditingConfig(prev => ({ ...prev!, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Input
                                placeholder="Optional description…"
                                value={editingConfig?.description || ''}
                                onChange={e => setEditingConfig(prev => ({ ...prev!, description: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Approval Workflow</Label>
                            <Select
                                value={editingConfig?.workflow_id || ''}
                                onValueChange={val => setEditingConfig(prev => ({ ...prev!, workflow_id: val }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Select workflow…" /></SelectTrigger>
                                <SelectContent>
                                    {workflows.map(wf => (
                                        <SelectItem key={wf.id} value={wf.id}>
                                            {wf.name} {wf.version ? `(v${wf.version})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Employee Categories</Label>
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    Overlap protected
                                </span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {getAvailableCategories(editingConfig?.id).length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        All categories are assigned to other streams.
                                    </p>
                                ) : (
                                    getAvailableCategories(editingConfig?.id).map(cat => (
                                        <label
                                            key={cat.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                editingConfig?.categories?.includes(cat.id)
                                                    ? 'border-primary/30 bg-primary/5'
                                                    : 'border-border bg-card hover:bg-muted/30'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={editingConfig?.categories?.includes(cat.id)}
                                                onCheckedChange={() => toggleCategory(cat.id)}
                                            />
                                            <span className="text-sm">{cat.label}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveConfig}
                            disabled={!editingConfig?.name || (editingConfig?.categories?.length || 0) === 0}
                        >
                            Save Stream
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
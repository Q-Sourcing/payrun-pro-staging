import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Settings2, Pencil, Trash2, CheckCircle2, ShieldCheck, ListChecks, ArrowRight, Layers, LayoutGrid } from "lucide-react";
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
    const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null | undefined>(undefined);
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Partial<PayrollApprovalConfig> & { categories: string[] } | null>(null);

    // Settings Form State
    const [maxLevels, setMaxLevels] = useState(5);
    const [sequential, setSequential] = useState(true);
    const [allowDelegation, setAllowDelegation] = useState(true);
    const [rejectionComment, setRejectionComment] = useState(true);

    // NEW State
    const [payrollEnabled, setPayrollEnabled] = useState(false);
    const [enabledScopes, setEnabledScopes] = useState<PayrollApprovalScope[]>([]);

    console.log('🚧 ApprovalWorkflows Render:', { isSuperAdmin, isOrgAdmin, orgSettings: !!orgSettings, role });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            let orgId = await import("@/lib/services/multi-tenant-payroll").then(m => m.MultiTenantPayrollService.getCurrentOrganizationId());

            if (!orgId) {
                const { data: { user } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getUser());
                orgId = user?.user_metadata?.organization_id || (user?.app_metadata as any)?.organization_id;

                // Fallback: Check user_profiles (Reliable Source)
                if (!orgId && user?.id) {
                    const { data: profile } = await import("@/integrations/supabase/client").then(m => m.supabase
                        .from('user_profiles')
                        .select('organization_id')
                        .eq('id', user.id)
                        .maybeSingle()
                    );
                    if (profile?.organization_id) {
                        orgId = profile.organization_id;
                    }
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

            console.log('🏁 ApprovalWorkflows: Resolved Org ID:', orgId);

            if (!orgId) {
                toast({ title: "Error", description: "Could not identify your organization.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const settings = await workflowService.getOrgSettings(orgId);
            if (settings) {
                const mappedSettings: OrgSettings = {
                    ...settings,
                    org_id: (settings as any).organization_id || settings.org_id
                };
                setOrgSettings(mappedSettings);
                setMaxLevels(mappedSettings.max_approval_levels);
                setSequential(mappedSettings.approvals_sequential);
                setAllowDelegation(mappedSettings.approvals_allow_delegation);
                setRejectionComment(mappedSettings.approvals_rejection_comment_required);
                setPayrollEnabled(mappedSettings.payroll_approvals_enabled || false);
                setEnabledScopes(mappedSettings.approvals_enabled_scopes || []);
            } else {
                setOrgSettings({
                    id: "new",
                    org_id: orgId,
                    max_approval_levels: 5,
                    approvals_sequential: true,
                    approvals_allow_delegation: true,
                    approvals_rejection_comment_required: true,
                    approvals_visibility_non_admin: true,
                    payroll_approvals_enabled: false,
                    approvals_enabled_scopes: []
                });
            }

            const wfs = await workflowService.getWorkflows(orgId);
            setWorkflows(wfs);

            const configs = await workflowService.getApprovalConfigs(orgId);
            setPayrollConfigs(configs);

            // Load categories
            const { data: catData } = await import("@/integrations/supabase/client").then(m => m.supabase
                .from('employee_categories')
                .select('*')
                .eq('organization_id', orgId)
                .is('active', true)
            );
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
            toast({ title: "Settings Saved", description: "Global approval settings updated." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        }
    };

    const toggleScope = (scope: PayrollApprovalScope) => {
        setEnabledScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
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

    const handleSaveConfig = async () => {
        if (!editingConfig || !editingConfig.name || !orgSettings) return;
        try {
            await workflowService.updateApprovalConfig(orgSettings.org_id, {
                ...editingConfig,
                name: editingConfig.name,
                categories: editingConfig.categories
            });
            setIsConfigDialogOpen(false);
            setEditingConfig(null);
            loadData();
            toast({ title: "Success", description: "Approval configuration saved." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
        }
    };

    const handleDeleteConfig = async (id: string) => {
        if (!confirm("Delete this payroll approval stream?")) return;
        try {
            await workflowService.deleteApprovalConfig(id);
            loadData();
            toast({ title: "Deleted", description: "Configuration removed." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete configuration", variant: "destructive" });
        }
    };

    const getAvailableCategories = (currentConfigId?: string) => {
        // Find categories already used in other configs
        const usedCategoryIds = payrollConfigs
            .filter(c => c.id !== currentConfigId)
            .flatMap(c => c.categories || []);

        return categories.filter(cat => !usedCategoryIds.includes(cat.id));
    };

    const toggleCategory = (catId: string) => {
        if (!editingConfig) return;
        const current = editingConfig.categories || [];
        if (current.includes(catId)) {
            setEditingConfig({ ...editingConfig, categories: current.filter(id => id !== catId) });
        } else {
            setEditingConfig({ ...editingConfig, categories: [...current, catId] });
        }
    };

    if (loading) return <div>Loading settings...</div>;

    if (editingWorkflow !== undefined) {
        return (
            <WorkflowBuilder
                workflow={editingWorkflow}
                orgSettings={orgSettings || {
                    id: "temp",
                    org_id: "unknown",
                    max_approval_levels: 5,
                    approvals_sequential: true,
                    approvals_allow_delegation: true,
                    approvals_rejection_comment_required: true,
                    approvals_visibility_non_admin: true,
                    payroll_approvals_enabled: true,
                    approvals_enabled_scopes: []
                }}
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
            {/* 1. SECTION HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Payroll Approvals</h3>
                        <p className="text-slate-500">Configure independent approval flows for different payroll streams and employee categories.</p>
                    </div>
                </div>
                {(isSuperAdmin || isOrgAdmin) && orgSettings && (
                    <Button
                        onClick={() => {
                            setEditingConfig({ name: '', categories: [], is_enabled: true });
                            setIsConfigDialogOpen(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-600/10 h-11 px-6"
                    >
                        <Plus className="h-5 w-5 mr-2" /> New Approval Stream
                    </Button>
                )}

            </div>

            {/* 2. DIVIDER */}
            <Separator className="bg-slate-100" />

            {/* 3. PAYROLL CONFIGS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {payrollConfigs.length === 0 ? (
                    <div className="lg:col-span-2 py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Layers className="h-8 w-8 text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">No Approval Streams</h4>
                        <p className="text-slate-500 max-w-xs mt-1">Start by creating an approval stream for specific employee categories.</p>
                    </div>
                ) : (
                    payrollConfigs.map(config => (
                        <Card key={config.id} className="border-slate-200 overflow-hidden rounded-3xl group transition-all hover:border-teal-500/30 hover:shadow-xl hover:shadow-slate-200/50">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${config.is_enabled ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                                            <LayoutGrid className="h-4 w-4" />
                                        </div>
                                        <CardTitle className="text-lg font-bold text-slate-900">{config.name}</CardTitle>
                                    </div>
                                    <Switch
                                        checked={config.is_enabled}
                                        onCheckedChange={async (val) => {
                                            if (!orgSettings) return;
                                            await workflowService.updateApprovalConfig(orgSettings.org_id, {
                                                ...config,
                                                is_enabled: val,
                                                categories: config.categories || []
                                            } as any);
                                            loadData();
                                        }}
                                        className="data-[state=checked]:bg-teal-600"
                                    />
                                </div>
                                <CardDescription className="line-clamp-1">{config.description || 'No description provided.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Categories Badge Area */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Categories</Label>
                                    <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                                        {config.categories && config.categories.length > 0 ? (
                                            config.categories.map(catId => {
                                                const cat = categories.find(c => c.id === catId);
                                                return cat ? (
                                                    <Badge key={catId} variant="secondary" className="bg-slate-100 text-slate-600 border-none hover:bg-slate-200 rounded-lg px-2.5 py-1">
                                                        {cat.label}
                                                    </Badge>
                                                ) : null;
                                            })
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No categories assigned</span>
                                        )}
                                    </div>
                                </div>

                                {/* Workflow Summary Area */}
                                <div className="space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approval Workflow</Label>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ArrowRight className="h-4 w-4 text-teal-500" />
                                            <span className="text-sm font-semibold text-slate-700">
                                                {workflows.find(w => w.id === config.workflow_id)?.name || 'No workflow selected'}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-bold h-5 px-2 bg-white text-slate-500 rounded-full border-slate-200">
                                            {workflows.find(w => w.id === config.workflow_id)?.version ? `v${workflows.find(w => w.id === config.workflow_id)?.version}` : ''}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                                        onClick={() => {
                                            setEditingConfig({
                                                id: config.id,
                                                name: config.name,
                                                description: config.description,
                                                is_enabled: config.is_enabled,
                                                workflow_id: config.workflow_id,
                                                categories: config.categories || []
                                            });
                                            setIsConfigDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" /> Edit Stream
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 rounded-xl border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                                        onClick={() => handleDeleteConfig(config.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Organization Approval Policy (Global Config) */}
            {isSuperAdmin && (
                <div className="space-y-6">
                    <Separator className="bg-slate-100 mb-8" />
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-teal-600" />
                        <h4 className="text-lg font-bold text-slate-900">Global Approval Policy</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700">Maximum Approval Levels</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={maxLevels}
                                    onChange={e => setMaxLevels(Number(e.target.value))}
                                    className="max-w-[120px] h-10 border-slate-200"
                                />
                                <p className="text-xs text-slate-400">Limit total approvers per workflow (1-20).</p>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center justify-between group">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-slate-700">Sequential Approvals</Label>
                                        <p className="text-xs text-slate-400">Force levels to be approved in order.</p>
                                    </div>
                                    <Switch checked={sequential} onCheckedChange={setSequential} className="data-[state=checked]:bg-teal-600" />
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-slate-700">Allow Delegation</Label>
                                        <p className="text-xs text-slate-400">Approvers can delegate their tasks.</p>
                                    </div>
                                    <Switch checked={allowDelegation} onCheckedChange={setAllowDelegation} className="data-[state=checked]:bg-teal-600" />
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-slate-700">Require Comments</Label>
                                        <p className="text-xs text-slate-400">Force users to explain rejections.</p>
                                    </div>
                                    <Switch checked={rejectionComment} onCheckedChange={setRejectionComment} className="data-[state=checked]:bg-teal-600" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <ListChecks className="h-5 w-5 text-teal-600" />
                                <Label className="text-base font-bold text-slate-900">Enabled Scopes</Label>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {(Object.keys(APPROVAL_SCOPE_LABELS) as PayrollApprovalScope[]).map((scope) => (
                                    <div key={scope} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer">
                                        <Checkbox
                                            id={`scope-${scope}`}
                                            checked={enabledScopes.includes(scope)}
                                            onCheckedChange={() => toggleScope(scope)}
                                            className="data-[state=checked]:bg-teal-600 border-slate-300"
                                        />
                                        <Label
                                            htmlFor={`scope-${scope}`}
                                            className="text-sm font-medium cursor-pointer flex-1"
                                        >
                                            {APPROVAL_SCOPE_LABELS[scope]}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-end">
                        <Button onClick={handleSaveSettings} className="bg-slate-900 hover:bg-slate-800 h-11 px-8 rounded-xl font-medium">
                            Save Default Policies
                        </Button>
                    </div>
                </div>
            )}

            {isSuperAdmin && <Separator className="bg-slate-100 mt-12 mb-8" />}

            {/* Workflow Builder Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900">Custom Approval Workflows</h4>
                        <p className="text-sm text-slate-500">Define specific approval chains for complex payroll scenarios.</p>
                    </div>
                    {(isSuperAdmin || isOrgAdmin) && orgSettings && (
                        <Button onClick={() => setEditingWorkflow(null)} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
                            <Plus className="h-4 w-4 mr-2" /> New Workflow
                        </Button>
                    )}

                </div>

                <div className="grid gap-4">
                    {workflows.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                            No custom workflows defined.
                        </div>
                    ) : (
                        workflows.map(wf => (
                            <div key={wf.id} className="group flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500/30 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${wf.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900">{wf.name}</h3>
                                            {wf.version && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-200">v{wf.version}</Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                            {wf.description && <span className="mr-2">{wf.description}</span>}
                                            <div className="flex gap-1.5">
                                                {wf.applies_to_scopes?.map(scope => (
                                                    <Badge key={scope} variant="secondary" className="text-[10px] px-2 py-0 bg-slate-100 text-slate-600 border-none">
                                                        {APPROVAL_SCOPE_LABELS[scope]}
                                                    </Badge>
                                                ))}
                                            </div>
                                            {!wf.is_active && <Badge variant="destructive" className="h-4 px-1.5 text-[10px] rounded-sm">Inactive</Badge>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingWorkflow(wf)} className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDeleteWorkflow(wf.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 4. MODALS AND DIALOGS */}
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-teal-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Layers className="h-24 w-24" />
                        </div>
                        <DialogTitle className="text-2xl font-bold mb-2">
                            {editingConfig?.id ? 'Edit Approval Stream' : 'New Approval Stream'}
                        </DialogTitle>
                        <p className="text-teal-50/80 text-sm max-w-md">
                            Define which employee categories follow this approval path and assign a workflow.
                        </p>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-slate-700">Stream Name</Label>
                                <Input
                                    placeholder="e.g. Head Office Payroll"
                                    value={editingConfig?.name || ''}
                                    onChange={e => setEditingConfig(prev => ({ ...prev!, name: e.target.value }))}
                                    className="h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-slate-700">Approval Workflow</Label>
                                <Select
                                    value={editingConfig?.workflow_id || ''}
                                    onValueChange={val => setEditingConfig(prev => ({ ...prev!, workflow_id: val }))}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                        <SelectValue placeholder="Select workflow" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {workflows.map(wf => (
                                            <SelectItem key={wf.id} value={wf.id}>{wf.name} (v{wf.version})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">Description</Label>
                            <Input
                                placeholder="Purpose of this configuration..."
                                value={editingConfig?.description || ''}
                                onChange={e => setEditingConfig(prev => ({ ...prev!, description: e.target.value }))}
                                className="h-11 rounded-xl border-slate-200"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-700">Included Employee Categories</Label>
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    Overlap Protected
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {getAvailableCategories(editingConfig?.id).length === 0 ? (
                                    <div className="col-span-2 text-center py-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
                                        No more categories available for assignment.
                                    </div>
                                ) : (
                                    getAvailableCategories(editingConfig?.id).map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all cursor-pointer ${editingConfig?.categories?.includes(cat.id)
                                                ? 'border-teal-500 bg-teal-50/30'
                                                : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                                                }`}
                                            onClick={() => toggleCategory(cat.id)}
                                        >
                                            <Checkbox
                                                checked={editingConfig?.categories?.includes(cat.id)}
                                                onCheckedChange={() => toggleCategory(cat.id)}
                                                className="data-[state=checked]:bg-teal-600 border-slate-300"
                                            />
                                            <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-slate-400 italic">
                                * Categories already assigned to other streams are hidden to prevent conflicts.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-6 flex justify-between gap-3 border-t border-slate-100">
                        <Button variant="ghost" className="rounded-xl h-11 px-8 text-slate-500" onClick={() => setIsConfigDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-10 font-bold"
                            onClick={handleSaveConfig}
                            disabled={!editingConfig?.name || editingConfig?.categories?.length === 0}
                        >
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

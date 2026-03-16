// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  ApprovalWorkflowStep,
  PayrollApprovalScope,
  APPROVAL_SCOPE_LABELS,
  PayrollApprovalConfig,
  ApproverType,
  APPROVER_TYPE_META,
} from "@/lib/types/workflow";
import { roleCatalog, type RoleKey } from "@/lib/obacDisplay";
import { ApproverTypeModal } from "./ApproverTypeModal";
import { ApprovalFlowChart } from "./ApprovalFlowChart";
import { ApprovalCriteriaBuilder } from "./ApprovalCriteriaBuilder";
import { ApprovalFollowupConfig } from "./ApprovalFollowupConfig";
import { ApprovalWorkflowMessages } from "./ApprovalWorkflowMessages";
import {
  Plus, Trash2, ShieldCheck, ArrowRight, Loader2, GitBranch,
  MoreVertical, Copy, Pencil, Star, ArrowUp, ArrowDown,
  GripVertical, ChevronDown, ChevronUp, Settings2, ListChecks,
  X, Info, Lightbulb,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface EmployeeCategory {
  id: string;
  label: string;
  organization_id: string;
  active: boolean;
}

const BANNER_DISMISSED_KEY = "approval-guidance-banner-dismissed";

export const ApprovalWorkflows = () => {
  const { toast } = useToast();
  const { role, isSuperAdmin } = useUserRole();
  const isOrgAdmin = role === "ORG_ADMIN";

  // Data
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [payrollConfigs, setPayrollConfigs] = useState<PayrollApprovalConfig[]>([]);
  const [categories, setCategories] = useState<EmployeeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [steps, setSteps] = useState<Partial<ApprovalWorkflowStep>[]>([]);
  const [activeTab, setActiveTab] = useState("approvers");

  // Editing
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [autoAction, setAutoAction] = useState<'none' | 'auto_approve' | 'auto_reject'>('none');
  const [activeAnchor, setActiveAnchor] = useState('details');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Routing
  const [routingExpanded, setRoutingExpanded] = useState(true);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<PayrollApprovalConfig> & { categories: string[] } | null>(null);

  // Global Policy slide-over
  const [policyOpen, setPolicyOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [maxLevels, setMaxLevels] = useState(5);
  const [sequential, setSequential] = useState(true);
  const [allowDelegation, setAllowDelegation] = useState(true);
  const [rejectionComment, setRejectionComment] = useState(true);
  const [payrollEnabled, setPayrollEnabled] = useState(false);
  const [enabledScopes, setEnabledScopes] = useState<PayrollApprovalScope[]>([]);

  // Guidance banner
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem(BANNER_DISMISSED_KEY) === "true"; } catch { return false; }
  });

  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem(BANNER_DISMISSED_KEY, "true"); } catch {}
  };

  // ─── Data Loading ───
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
            .from('user_profiles').select('organization_id').eq('id', user.id).maybeSingle()
          );
          if (profile?.organization_id) orgId = profile.organization_id;
        }
        if (!orgId && isSuperAdmin) {
          const { data: defaultOrg } = await import("@/integrations/supabase/client").then(m => m.supabase
            .from('pay_groups').select('organization_id').limit(1).maybeSingle()
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

  // ─── Workflow Selection ───
  useEffect(() => {
    if (!selectedId) {
      setSelectedWorkflow(null);
      setSteps([]);
      return;
    }
    const load = async () => {
      try {
        const wf = await workflowService.getWorkflowWithSteps(selectedId);
        setSelectedWorkflow(wf);
        setSteps(wf?.steps || []);
        setEditName(wf?.name || "");
        setEditDescription(wf?.description || "");
        setEditActive(wf?.is_active ?? true);
      } catch (e) { console.error(e); }
    };
    load();
  }, [selectedId]);

  // ─── Step Operations ───
  const handleAddStep = (stepData: {
    approver_type: ApproverType;
    approver_role?: string;
    approver_user_id?: string;
    approver_designation_id?: string;
    approver_department_id?: string;
    approver_group_id?: string;
  }) => {
    const newLevel = steps.length + 1;
    setSteps([...steps, { level: newLevel, sequence_number: newLevel, notify_email: true, notify_in_app: true, ...stepData }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, level: i + 1, sequence_number: i + 1 })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, level: i + 1, sequence_number: i + 1 })));
  };

  const getStepLabel = (step: Partial<ApprovalWorkflowStep>) => {
    const type = step.approver_type || 'role';
    const meta = APPROVER_TYPE_META[type as ApproverType];
    if (type === 'role' && step.approver_role) {
      const r = roleCatalog[step.approver_role as RoleKey];
      return r?.label || step.approver_role;
    }
    if (type === 'individual' && step.approver_user) {
      return `${step.approver_user.first_name} ${step.approver_user.last_name}`;
    }
    return meta?.label || type;
  };

  // ─── Workflow CRUD ───
  const handleSaveWorkflow = async () => {
    if (!editName.trim()) {
      toast({ title: "Error", description: "Workflow name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (selectedId && selectedWorkflow) {
        await workflowService.updateWorkflow(selectedId, { name: editName, description: editDescription, is_active: editActive });
        await workflowService.updateWorkflowSteps(selectedId, steps as any);
        toast({ title: "Workflow updated" });
      } else {
        const orgId = orgSettings?.org_id || "";
        const newWf = await workflowService.createWorkflow({
          org_id: orgId, name: editName, description: editDescription, is_active: editActive, is_default: false,
        }, steps as any);
        setSelectedId(newWf.id);
        toast({ title: "Workflow created" });
      }
      await loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleNewWorkflow = () => {
    setSelectedId(null);
    setSelectedWorkflow(null);
    setSteps([]);
    setEditName("New Workflow");
    setEditDescription("");
    setEditActive(true);
    setActiveTab("approvers");
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newWf = await workflowService.duplicateWorkflow(id);
      await loadData();
      setSelectedId(newWf.id);
      toast({ title: "Workflow duplicated" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await workflowService.deleteWorkflow(id);
      if (selectedId === id) setSelectedId(null);
      await loadData();
      toast({ title: "Workflow deleted" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await workflowService.setDefaultWorkflow(orgSettings?.org_id || "", id);
      await loadData();
      toast({ title: "Default workflow updated" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleInlineRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await workflowService.updateWorkflow(id, { name: renameValue });
      setRenamingId(null);
      await loadData();
    } catch { /* ignore */ }
  };

  // ─── Routing / Streams ───
  const handleSaveConfig = async () => {
    if (!editingConfig || !editingConfig.name || !orgSettings) return;
    try {
      await workflowService.updateApprovalConfig(orgSettings.org_id, {
        ...editingConfig, name: editingConfig.name, categories: editingConfig.categories
      });
      setIsConfigDialogOpen(false);
      setEditingConfig(null);
      loadData();
      toast({ title: "Saved", description: "Route saved." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Delete this route?")) return;
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

  // ─── Global Policy ───
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
      toast({ title: "Saved", description: "Global policy updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally { setSavingSettings(false); }
  };

  const toggleScope = (scope: PayrollApprovalScope) => {
    setEnabledScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  // ─── Category chips for a workflow ───
  const getCategoryChipsForWorkflow = (workflowId: string) => {
    const configs = payrollConfigs.filter(c => c.workflow_id === workflowId);
    const catIds = configs.flatMap(c => c.categories || []);
    return categories.filter(cat => catIds.includes(cat.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading approval settings…</span>
      </div>
    );
  }

  const orgId = orgSettings?.org_id || "";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* ─── Guidance Banner ─── */}
        {!bannerDismissed && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 mb-3 shrink-0">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">How approvals work:</span> Create a workflow → assign approvers → route employee categories to it.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs text-muted-foreground" onClick={dismissBanner}>
              Dismiss
            </Button>
          </div>
        )}

        {/* ─── Two-Panel Layout ─── */}
        <div className="flex border rounded-xl overflow-hidden bg-card flex-1 min-h-0">

          {/* ═══ LEFT PANEL ═══ */}
          <div className="w-[280px] border-r bg-muted/30 flex flex-col shrink-0 min-h-0">
            {/* Workflow list header */}
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Workflows</h3>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleNewWorkflow}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>

            {/* Workflow list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {workflows.length === 0 ? (
                <div className="py-8 text-center">
                  <GitBranch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No workflows yet</p>
                </div>
              ) : (
                workflows.map(wf => {
                  const catChips = getCategoryChipsForWorkflow(wf.id);
                  return (
                    <Tooltip key={wf.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                            selectedId === wf.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted border border-transparent'
                          }`}
                          onClick={() => setSelectedId(wf.id)}
                          onDoubleClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {renamingId === wf.id ? (
                                <Input
                                  autoFocus
                                  className="h-6 text-xs px-1"
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onBlur={() => handleInlineRename(wf.id)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleInlineRename(wf.id); if (e.key === 'Escape') setRenamingId(null); }}
                                  onClick={e => e.stopPropagation()}
                                />
                              ) : (
                                <p className="text-sm font-medium truncate">{wf.name}</p>
                              )}
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <Badge variant={wf.is_active ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                                  {wf.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {wf.is_default && (
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5">
                                    <Star className="h-2.5 w-2.5" /> Default
                                  </Badge>
                                )}
                              </div>
                              {catChips.length > 0 && (
                                <div className="flex gap-1 flex-wrap mt-1.5">
                                  {catChips.slice(0, 3).map(cat => (
                                    <Badge key={cat.id} variant="outline" className="text-[9px] h-4 px-1 font-normal">
                                      {cat.label}
                                    </Badge>
                                  ))}
                                  {catChips.length > 3 && (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal">
                                      +{catChips.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleSetDefault(wf.id); }}>
                                  <Star className="h-3 w-3 mr-2" /> Set as Default
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDuplicate(wf.id); }}>
                                  <Copy className="h-3 w-3 mr-2" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete(wf.id); }}>
                                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-[200px]">
                        Click to configure steps, criteria, and notifications
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>

            {/* ─── Routing Section ─── */}
            <div className="border-t-2 border-border shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => setRoutingExpanded(!routingExpanded)}
                  >
                    Routing
                    {routingExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[200px]">
                  Map employee groups to specific workflows
                </TooltipContent>
              </Tooltip>

              {routingExpanded && (
                <div className="px-3 pb-3 space-y-1.5">
                  {payrollConfigs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic text-center py-2">No routes defined</p>
                  ) : (
                    payrollConfigs.map(config => {
                      const wf = workflows.find(w => w.id === config.workflow_id);
                      const configCats = (config.categories || [])
                        .map(cId => categories.find(c => c.id === cId))
                        .filter(Boolean);
                      return (
                        <div
                          key={config.id}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors ${
                            config.workflow_id === selectedId ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                          onClick={() => {
                            if (config.workflow_id) setSelectedId(config.workflow_id);
                          }}
                        >
                          <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                            {configCats.length > 0 ? (
                              configCats.slice(0, 2).map(cat => (
                                <Badge key={cat!.id} variant="outline" className="text-[9px] h-4 px-1 font-normal shrink-0">
                                  {cat!.label}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic">{config.name}</span>
                            )}
                            {configCats.length > 2 && (
                              <span className="text-muted-foreground">+{configCats.length - 2}</span>
                            )}
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[80px]">{wf?.name || "—"}</span>
                          <Button
                            variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={e => { e.stopPropagation(); handleDeleteConfig(config.id); }}
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="w-full h-7 text-[11px] gap-1 text-muted-foreground"
                    onClick={() => { setEditingConfig({ name: '', categories: [], is_enabled: true }); setIsConfigDialogOpen(true); }}
                  >
                    <Plus className="h-3 w-3" /> Add Route
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT PANEL — Scroll-spy layout ═══ */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {!selectedId && !editName ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Select a workflow to configure it</p>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleNewWorkflow}>
                    <Plus className="h-3.5 w-3.5" /> Create your first workflow
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0">
                {/* Anchor Nav (sticky left column) */}
                <nav className="w-[160px] shrink-0 border-r bg-muted/20 py-4 px-2 sticky top-0 self-start">
                  {[
                    { id: 'details', label: 'Approval Details' },
                    { id: 'criteria', label: 'Criteria' },
                    { id: 'approvers', label: 'Approvers' },
                    { id: 'messages', label: 'Messages' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const el = document.getElementById(`section-${item.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors mb-0.5 ${
                        activeAnchor === item.id
                          ? 'text-primary font-semibold border-l-2 border-primary bg-primary/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted border-l-2 border-transparent'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* Scrollable content column */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-5 space-y-5"
                    onScroll={() => {
                      const container = scrollContainerRef.current;
                      if (!container) return;
                      const sections = ['details', 'criteria', 'approvers', 'messages'];
                      for (const id of sections) {
                        const el = document.getElementById(`section-${id}`);
                        if (el) {
                          const rect = el.getBoundingClientRect();
                          const containerRect = container.getBoundingClientRect();
                          if (rect.top <= containerRect.top + 100) {
                            setActiveAnchor(id);
                          }
                        }
                      }
                    }}
                  >
                    {/* ── Section 1: Approval Details ── */}
                    <Card id="section-details">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">Approval Details</CardTitle>
                            <CardDescription>Basic details of this approval workflow.</CardDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch checked={editActive} onCheckedChange={setEditActive} />
                            <Label className="text-xs">{editActive ? 'Active' : 'Inactive'}</Label>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Workflow Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="e.g. Standard Payroll Approval"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Description</Label>
                          <Textarea
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            placeholder="Optional description of this workflow…"
                            className="min-h-[72px] text-sm resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* ── Section 2: Criteria ── */}
                    <Card id="section-criteria">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">Criteria</CardTitle>
                        <CardDescription>This workflow will trigger when the following conditions are met.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedId ? (
                          <ApprovalCriteriaBuilder workflowId={selectedId} organizationId={orgId} />
                        ) : (
                          <div className="py-8 text-center border-2 border-dashed rounded-lg">
                            <p className="text-sm text-muted-foreground">Save the workflow first to set criteria.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* ── Section 3: Approvers ── */}
                    <Card id="section-approvers">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">Approvers</CardTitle>
                        <CardDescription>Configure who approves this workflow and in what order.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Manual approver chain */}
                        <div className={autoAction !== 'none' ? 'opacity-40 pointer-events-none' : ''}>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Configure Manually</Label>
                          <div className="space-y-2">
                            {steps.length === 0 ? (
                              <div className="py-6 text-center border-2 border-dashed rounded-lg">
                                <p className="text-sm text-muted-foreground">No approval steps yet.</p>
                              </div>
                            ) : (
                              steps.map((step, index) => {
                                const type = step.approver_type || 'role';
                                const meta = APPROVER_TYPE_META[type as ApproverType];
                                const label = getStepLabel(step);
                                return (
                                  <div key={index} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
                                    <Badge variant="secondary" className="text-xs font-semibold shrink-0">L{step.level}</Badge>
                                    <span className="text-sm shrink-0">{meta?.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{label}</p>
                                      <p className="text-[10px] text-muted-foreground">{meta?.label}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => moveStep(index, 'up')}>
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === steps.length - 1} onClick={() => moveStep(index, 'down')}>
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeStep(index)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddModalOpen(true)}>
                              <Plus className="h-3 w-3" /> Add Approver
                            </Button>
                          </div>
                        </div>

                        {/* OR Divider */}
                        <div className="flex items-center gap-3">
                          <Separator className="flex-1" />
                          <span className="text-xs font-medium text-muted-foreground">(OR)</span>
                          <Separator className="flex-1" />
                        </div>

                        {/* Auto-action option */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Auto-action</Label>
                          <RadioGroup value={autoAction} onValueChange={(v) => setAutoAction(v as any)} className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="none" id="aa-none" />
                              <Label htmlFor="aa-none" className="text-sm cursor-pointer">None</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="auto_approve" id="aa-approve" />
                              <Label htmlFor="aa-approve" className="text-sm cursor-pointer">Auto Approve</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="auto_reject" id="aa-reject" />
                              <Label htmlFor="aa-reject" className="text-sm cursor-pointer">Auto Reject</Label>
                            </div>
                          </RadioGroup>
                          {autoAction !== 'none' && (
                            <p className="text-xs text-muted-foreground italic bg-muted/50 rounded px-3 py-2">
                              Steps are ignored when auto-action is selected. The pay run will be automatically {autoAction === 'auto_approve' ? 'approved' : 'rejected'}.
                            </p>
                          )}
                        </div>

                        {/* Flow Preview */}
                        <Separator />
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Flow Preview</Label>
                          <div className="border rounded-lg p-2 bg-muted/20 overflow-x-auto">
                            <ApprovalFlowChart steps={autoAction !== 'none' ? [] : steps} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ── Section 4: Messages ── */}
                    <Card id="section-messages">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">Messages</CardTitle>
                        <CardDescription>Configure the emails sent at each stage of this workflow.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {selectedId ? (
                          <>
                            <ApprovalWorkflowMessages workflowId={selectedId} />

                            {/* Follow-up Reminders (inside Messages card) */}
                            <Separator />
                            <ApprovalFollowupConfig workflowId={selectedId} />
                          </>
                        ) : (
                          <div className="py-8 text-center border-2 border-dashed rounded-lg">
                            <p className="text-sm text-muted-foreground">Save the workflow first to configure messages.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sticky bottom action bar */}
                  <div className="shrink-0 border-t bg-card px-5 py-3 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        setSelectedId(null);
                        setSelectedWorkflow(null);
                        setEditName("");
                        setEditDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveWorkflow} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Save Workflow
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Route Config Dialog ─── */}
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingConfig?.id ? 'Edit Route' : 'New Route'}</DialogTitle>
              <DialogDescription>Map employee categories to a specific approval workflow.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Route Name</Label>
                <Input
                  placeholder="e.g. Head Office Payroll"
                  value={editingConfig?.name || ''}
                  onChange={e => setEditingConfig(prev => ({ ...prev!, name: e.target.value }))}
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
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Overlap protected</span>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {getAvailableCategories(editingConfig?.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">All categories are assigned to other routes.</p>
                  ) : (
                    getAvailableCategories(editingConfig?.id).map(cat => (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          editingConfig?.categories?.includes(cat.id) ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox checked={editingConfig?.categories?.includes(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} />
                        <span className="text-sm">{cat.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveConfig} disabled={!editingConfig?.name || (editingConfig?.categories?.length || 0) === 0}>
                Save Route
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Global Policy Sheet ─── */}
        <Sheet open={policyOpen} onOpenChange={setPolicyOpen}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Global Policy
              </SheetTitle>
              <SheetDescription>
                Organization-wide defaults that apply to all approval workflows.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
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

              <Separator />

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
                      <Checkbox checked={enabledScopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} />
                      <span className="text-sm">{APPROVAL_SCOPE_LABELS[scope]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveSettings} disabled={savingSettings} size="sm">
                  {savingSettings && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Save Policy
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Add Approver Modal */}
        <ApproverTypeModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          organizationId={orgId}
          onAdd={handleAddStep}
        />
      </div>
    </TooltipProvider>
  );
};

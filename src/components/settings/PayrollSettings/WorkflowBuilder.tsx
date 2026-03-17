// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { workflowService } from "@/lib/services/workflow.service";
import {
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  OrgSettings,
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
  Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, Star,
  MoreVertical, Copy, Pencil, Loader2, ShieldCheck, GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkflowBuilderProps {
  orgSettings: OrgSettings;
  organizationId: string;
  onBack?: () => void;
}

export const WorkflowBuilder = ({ orgSettings, organizationId, onBack }: WorkflowBuilderProps) => {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [steps, setSteps] = useState<Partial<ApprovalWorkflowStep>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("approvers");

  // Editing state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Add approver modal
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Load workflows
  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const wfs = await workflowService.getWorkflows(organizationId);
      setWorkflows(wfs);
      if (wfs.length > 0 && !selectedId) {
        setSelectedId(wfs[0].id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [organizationId, selectedId]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  // Load selected workflow details
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
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [selectedId]);

  // Step operations
  const handleAddStep = (stepData: {
    approver_type: ApproverType;
    approver_role?: string;
    approver_user_id?: string;
    approver_designation_id?: string;
    approver_department_id?: string;
    approver_group_id?: string;
  }) => {
    const newLevel = steps.length + 1;
    setSteps([...steps, {
      level: newLevel,
      sequence_number: newLevel,
      notify_email: true,
      notify_in_app: true,
      ...stepData,
    }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({
      ...s, level: i + 1, sequence_number: i + 1,
    }));
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, level: i + 1, sequence_number: i + 1 })));
  };

  // Save workflow
  const handleSaveWorkflow = async () => {
    if (!editName.trim()) {
      toast({ title: "Error", description: "Workflow name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (selectedId && selectedWorkflow) {
        await workflowService.updateWorkflow(selectedId, {
          name: editName,
          description: editDescription,
          is_active: editActive,
        });
        await workflowService.updateWorkflowSteps(selectedId, steps as any);
        toast({ title: "Workflow updated" });
      } else {
        const newWf = await workflowService.createWorkflow({
          org_id: organizationId,
          name: editName,
          description: editDescription,
          is_active: editActive,
          is_default: false,
        }, steps as any);
        setSelectedId(newWf.id);
        toast({ title: "Workflow created" });
      }
      await loadWorkflows();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Workflow actions
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
      await loadWorkflows();
      setSelectedId(newWf.id);
      toast({ title: "Workflow duplicated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workflowService.deleteWorkflow(id);
      if (selectedId === id) setSelectedId(null);
      await loadWorkflows();
      toast({ title: "Workflow deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await workflowService.setDefaultWorkflow(organizationId, id);
      await loadWorkflows();
      toast({ title: "Default workflow updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleInlineRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await workflowService.updateWorkflow(id, { name: renameValue });
      setRenamingId(null);
      await loadWorkflows();
    } catch { /* ignore */ }
  };

  // Step display helper
  const getStepLabel = (step: Partial<ApprovalWorkflowStep>) => {
    const type = step.approver_type || 'role';
    const meta = APPROVER_TYPE_META[type as ApproverType];

    if (type === 'role' && step.approver_role) {
      const role = roleCatalog[step.approver_role as RoleKey];
      return role?.label || step.approver_role;
    }
    if (type === 'individual' && step.approver_user) {
      return `${step.approver_user.first_name} ${step.approver_user.last_name}`;
    }
    return meta?.label || type;
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading workflows…</div>;
  }

  return (
    <div className="flex h-full gap-0 border rounded-xl overflow-hidden bg-card">
      {/* LEFT PANEL — Workflow List */}
      <div className="w-72 border-r bg-muted/30 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-bold text-foreground">Workflows</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{workflows.length} workflow(s)</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {workflows.map(wf => (
            <div
              key={wf.id}
              className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                selectedId === wf.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted border border-transparent'
              }`}
              onClick={() => setSelectedId(wf.id)}
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
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">{wf.steps?.length || 0} steps</span>
                    {wf.is_default && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5">
                        <Star className="h-2.5 w-2.5" /> Default
                      </Badge>
                    )}
                    <Badge variant={wf.is_active ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenamingId(wf.id); setRenameValue(wf.name); }}>
                      <Pencil className="h-3 w-3 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetDefault(wf.id); }}>
                      <Star className="h-3 w-3 mr-2" /> Set as Default
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(wf.id); }}>
                      <Copy className="h-3 w-3 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(wf.id); }}>
                      <Trash2 className="h-3 w-3 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 border-t">
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleNewWorkflow}>
            <Plus className="h-3 w-3" /> Add Workflow
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL — Workflow Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {!selectedId && !editName ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a workflow from the left or create a new one.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="h-8 text-sm font-semibold border-transparent hover:border-border focus:border-border bg-transparent px-1"
                  placeholder="Workflow name"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={editActive} onCheckedChange={setEditActive} />
                  <Label className="text-xs">{editActive ? 'Active' : 'Inactive'}</Label>
                </div>
              </div>
              <Input
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="h-7 text-xs text-muted-foreground border-transparent hover:border-border focus:border-border bg-transparent px-1"
                placeholder="Description (optional)"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-4 pt-2 border-b">
                <TabsList className="h-9">
                  <TabsTrigger value="approvers" className="text-xs">Approvers</TabsTrigger>
                  <TabsTrigger value="criteria" className="text-xs">Criteria</TabsTrigger>
                  <TabsTrigger value="followup" className="text-xs">Follow-up</TabsTrigger>
                  <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
                </TabsList>
              </div>

              {/* Approvers Tab */}
              <TabsContent value="approvers" className="flex-1 p-4 space-y-4 mt-0">
                <div className="space-y-2">
                  {steps.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground">No approval steps. Add the first approver to get started.</p>
                    </div>
                  ) : (
                    steps.map((step, index) => {
                      const type = step.approver_type || 'role';
                      const meta = APPROVER_TYPE_META[type as ApproverType];
                      const label = getStepLabel(step);

                      return (
                        <div key={index} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />

                          <Badge variant="secondary" className="text-xs font-semibold shrink-0">
                            L{step.level}
                          </Badge>

                          <span className="text-sm shrink-0">{meta?.icon}</span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{label}</p>
                            <p className="text-[10px] text-muted-foreground">{meta?.label}</p>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0}
                              onClick={() => moveStep(index, 'up')}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === steps.length - 1}
                              onClick={() => moveStep(index, 'down')}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => removeStep(index)}>
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

                {/* Flow chart */}
                <Separator />
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Flow Preview</Label>
                  <div className="border rounded-lg p-2 bg-muted/20 overflow-x-auto">
                    <ApprovalFlowChart steps={steps} />
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveWorkflow} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {selectedWorkflow ? 'Update Workflow' : 'Create Workflow'}
                  </Button>
                </div>
              </TabsContent>

              {/* Criteria Tab */}
              <TabsContent value="criteria" className="flex-1 p-4 mt-0">
                {selectedId ? (
                  <ApprovalCriteriaBuilder workflowId={selectedId} organizationId={organizationId} />
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">Save the workflow first to add criteria.</p>
                )}
              </TabsContent>

              {/* Follow-up Tab */}
              <TabsContent value="followup" className="flex-1 p-4 mt-0">
                {selectedId ? (
                  <ApprovalFollowupConfig workflowId={selectedId} />
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">Save the workflow first to configure follow-ups.</p>
                )}
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="flex-1 p-4 mt-0">
                {selectedId ? (
                  <ApprovalWorkflowMessages workflowId={selectedId} />
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">Save the workflow first to configure messages.</p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Add Approver Modal */}
      <ApproverTypeModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        organizationId={organizationId}
        onAdd={handleAddStep}
      />
    </div>
  );
};

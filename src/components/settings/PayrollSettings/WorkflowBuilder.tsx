import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    ApprovalWorkflow,
    ApprovalWorkflowStep,
    OrgSettings,
    PayrollApprovalScope,
    APPROVAL_SCOPE_LABELS,
    APPROVER_ROLES,
    ApproverType
} from "@/lib/types/workflow";
import { workflowService } from "@/lib/services/workflow.service";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Shield, Shuffle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface WorkflowBuilderProps {
    workflow?: ApprovalWorkflow | null;
    orgSettings: OrgSettings;
    onSave: () => void;
    onCancel: () => void;
}

export const WorkflowBuilder = ({ workflow, orgSettings, onSave, onCancel }: WorkflowBuilderProps) => {
    const { toast } = useToast();
    const [name, setName] = useState(workflow?.name || "");
    const [description, setDescription] = useState(workflow?.description || "");
    const [isActive, setIsActive] = useState(workflow?.is_active ?? true);
    const [appliesToScopes, setAppliesToScopes] = useState<PayrollApprovalScope[]>(workflow?.applies_to_scopes || []);
    const [steps, setSteps] = useState<Partial<ApprovalWorkflowStep>[]>([]);
    const [users, setUsers] = useState<{ id: string, first_name: string, last_name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUsers();
        if (workflow?.id) {
            loadSteps(workflow.id);
        } else {
            setSteps([{
                level: 1,
                sequence_number: 1,
                notify_email: true,
                notify_in_app: true,
                approver_type: 'role',
                approver_role: 'PAYROLL_ADMIN'
            }]);
        }
    }, [workflow]);

    const loadUsers = async () => {
        const { data } = await (supabase
            .from('user_profiles') as any)
            .select('id, first_name, last_name');
        if (data) setUsers(data as any);
    };

    const loadSteps = async (workflowId: string) => {
        const wf = await workflowService.getWorkflowWithSteps(workflowId);
        if (wf?.steps) {
            setSteps(wf.steps);
        }
    };

    const handleAddStep = () => {
        if (orgSettings && steps.length >= orgSettings.max_approval_levels) {
            toast({ title: "Limit Reached", description: `Maximum ${orgSettings.max_approval_levels} approval levels allowed.`, variant: "destructive" });
            return;
        }
        const newLevel = steps.length + 1;
        setSteps([...steps, {
            level: newLevel,
            sequence_number: newLevel,
            notify_email: true,
            notify_in_app: true,
            approver_type: 'role'
        }]);
    };

    const handleRemoveStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
            ...step,
            level: i + 1,
            sequence_number: i + 1
        }));
        setSteps(newSteps);
    };

    const updateStep = (index: number, updates: Partial<ApprovalWorkflowStep>) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setSteps(newSteps);
    };

    const toggleScope = (scope: PayrollApprovalScope) => {
        setAppliesToScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: "Error", description: "Workflow name is required", variant: "destructive" });
            return;
        }

        if (appliesToScopes.length === 0) {
            toast({ title: "Error", description: "Please select at least one approval scope", variant: "destructive" });
            return;
        }

        // Validate steps
        for (const step of steps) {
            if (step.approver_type === 'individual' && !step.approver_user_id) {
                toast({ title: "Error", description: `Please select an individual approver for Level ${step.level}`, variant: "destructive" });
                return;
            }
            if (step.approver_type === 'role' && !step.approver_role) {
                toast({ title: "Error", description: `Please select a role for Level ${step.level}`, variant: "destructive" });
                return;
            }
            if (step.approver_type === 'hybrid' && !step.approver_role) {
                toast({ title: "Error", description: `Please select a primary role for Level ${step.level}`, variant: "destructive" });
                return;
            }
        }

        setLoading(true);
        try {
            const workflowData = {
                org_id: orgSettings?.org_id || "",
                name,
                description,
                is_active: isActive,
                is_default: workflow?.is_default || false,
                applies_to_scopes: appliesToScopes
            };

            if (workflow?.id) {
                await workflowService.updateWorkflow(workflow.id, workflowData);
                await workflowService.updateWorkflowSteps(workflow.id, steps as any);
                toast({ title: "Success", description: "Workflow updated" });
            } else {
                await workflowService.createWorkflow(workflowData, steps as any);
                toast({ title: "Success", description: "Workflow created" });
            }
            onSave();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* 1. Header Area (Unified with page) */}
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">{workflow ? `Edit Workflow: ${workflow.name}` : "Create New Workflow"}</h3>
                <p className="text-slate-500">Configure rules and approval levels for specific payroll actions.</p>
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-12">
                {/* Section 1: Basic Info & Scopes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="name" className="text-sm font-semibold">Workflow Name</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Executive Payroll Approval" className="h-10" />
                        </div>

                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
                            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Applies to head office and executive payruns" className="h-10" />
                        </div>

                        <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-100 w-fit">
                            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                            <Label htmlFor="active" className="cursor-pointer font-medium text-slate-700">Active & Enabled</Label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-sm font-bold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" /> Applies To Scopes
                        </Label>
                        <div className="grid grid-cols-1 gap-2 p-4 bg-white rounded-lg border border-slate-100">
                            {(Object.keys(APPROVAL_SCOPE_LABELS) as PayrollApprovalScope[]).map((scope) => (
                                <div key={scope} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`wf-scope-${scope}`}
                                        checked={appliesToScopes.includes(scope)}
                                        onCheckedChange={() => toggleScope(scope)}
                                    />
                                    <Label
                                        htmlFor={`wf-scope-${scope}`}
                                        className="text-xs font-medium cursor-pointer text-slate-600"
                                    >
                                        {APPROVAL_SCOPE_LABELS[scope]}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">This workflow will be triggered for these selected actions.</p>
                    </div>
                </div>

                <Separator />

                {/* Section 2: Approval Steps */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <Shuffle className="h-4 w-4 text-primary" /> Approval Sequence
                            </h3>
                            <p className="text-xs text-muted-foreground">Define who approves and in what order ({steps.length}/{orgSettings?.max_approval_levels || 5} levels used).</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleAddStep} disabled={steps.length >= (orgSettings?.max_approval_levels || 5)} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Plus className="h-4 w-4 mr-2" /> Add Level
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {steps.map((step, index) => (
                            <div key={index} className="relative flex flex-col md:flex-row items-start gap-4 p-5 border-2 rounded-xl bg-white hover:border-primary/30 transition-all shadow-sm">
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="bg-slate-900 text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">
                                        {step.level}
                                    </div>
                                    <div className="md:hidden font-bold">Level {step.level}</div>
                                </div>

                                <div className="flex-1 space-y-4 w-full">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="space-y-2 flex-1">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Approver Assignment</Label>
                                            <Tabs
                                                value={step.approver_type || 'role'}
                                                onValueChange={val => updateStep(index, { approver_type: val as ApproverType })}
                                                className="w-full"
                                            >
                                                <TabsList className="grid grid-cols-3 w-full h-9 p-1">
                                                    <TabsTrigger value="role" className="text-[10px] sm:text-xs">By Role</TabsTrigger>
                                                    <TabsTrigger value="individual" className="text-[10px] sm:text-xs">Individual</TabsTrigger>
                                                    <TabsTrigger value="hybrid" className="text-[10px] sm:text-xs">Hybrid</TabsTrigger>
                                                </TabsList>
                                            </Tabs>
                                        </div>

                                        <div className="space-y-2 flex-[2]">
                                            {(step.approver_type === 'role' || step.approver_type === 'hybrid') && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        {step.approver_type === 'hybrid' ? 'Primary Role' : 'Assign to Role'}
                                                    </Label>
                                                    <Select
                                                        value={step.approver_role}
                                                        onValueChange={val => updateStep(index, { approver_role: val })}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select System Role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(Object.entries(APPROVER_ROLES)).map(([key, label]) => (
                                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {(step.approver_type === 'individual' || step.approver_type === 'hybrid') && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        {step.approver_type === 'hybrid' ? 'Fallback Approver' : 'Assign to User'}
                                                    </Label>
                                                    <Select
                                                        value={step.approver_type === 'hybrid' ? step.fallback_user_id : step.approver_user_id}
                                                        onValueChange={val => updateStep(index,
                                                            step.approver_type === 'hybrid'
                                                                ? { fallback_user_id: val }
                                                                : { approver_user_id: val }
                                                        )}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select Employee" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map(u => (
                                                                <SelectItem key={u.id} value={u.id}>
                                                                    {u.first_name} {u.last_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-50">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={step.notify_email}
                                                onCheckedChange={checked => updateStep(index, { notify_email: checked })}
                                            />
                                            <Label className="text-xs font-medium">Email Alerts</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={step.notify_in_app}
                                                onCheckedChange={checked => updateStep(index, { notify_in_app: checked })}
                                            />
                                            <Label className="text-xs font-medium">In-App Alerts</Label>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={() => handleRemoveStep(index)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {steps.length === 0 && (
                        <Card className="border-dashed bg-slate-50/30">
                            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-white rounded-full border shadow-sm mb-4">
                                    <Plus className="h-6 w-6 text-slate-400" />
                                </div>
                                <h4 className="font-semibold text-slate-600">No approval levels defined</h4>
                                <p className="text-sm text-slate-400 max-w-[300px] mt-1">Add at least one level to determine who must approve actions in this workflow.</p>
                                <Button variant="outline" size="sm" onClick={handleAddStep} className="mt-4">
                                    Create Level 1
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={onCancel} className="text-slate-500 hover:text-slate-900">Discard Changes</Button>
                    <Button onClick={handleSave} disabled={loading} className="px-8 bg-slate-900 hover:bg-slate-800">
                        {loading ? "Saving Rules..." : workflow ? "Update Workflow" : "Create Workflow"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

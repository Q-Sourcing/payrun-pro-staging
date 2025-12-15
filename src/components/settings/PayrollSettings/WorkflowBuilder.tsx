import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ApprovalWorkflow, ApprovalWorkflowStep, OrgSettings } from "@/lib/types/workflow";
import { workflowService } from "@/lib/services/workflow.service";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, GripVertical } from "lucide-react";

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
    const [steps, setSteps] = useState<Partial<ApprovalWorkflowStep>[]>([]);
    const [users, setUsers] = useState<{ id: string, first_name: string, last_name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUsers();
        if (workflow?.id) {
            loadSteps(workflow.id);
        } else {
            // Default 1 step
            setSteps([{ level: 1, sequence_number: 1, notify_email: true, notify_in_app: true }]);
        }
    }, [workflow]);

    const loadUsers = async () => {
        const { data } = await supabase
            .from('user_profiles')
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
        if (steps.length >= orgSettings.max_approval_levels) {
            toast({ title: "Limit Reached", description: `Maximum ${orgSettings.max_approval_levels} approval levels allowed.`, variant: "destructive" });
            return;
        }
        const newLevel = steps.length + 1;
        setSteps([...steps, {
            level: newLevel,
            sequence_number: newLevel,
            notify_email: true,
            notify_in_app: true
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

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: "Error", description: "Workflow name is required", variant: "destructive" });
            return;
        }

        // Validate steps
        for (const step of steps) {
            if (!step.approver_user_id) {
                toast({ title: "Error", description: `Please select an approver for Level ${step.level}`, variant: "destructive" });
                return;
            }
        }

        setLoading(true);
        try {
            if (workflow?.id) {
                // Update
                await workflowService.updateWorkflow(workflow.id, { name, description, is_active: isActive });
                await workflowService.updateWorkflowSteps(workflow.id, steps as any);
                toast({ title: "Success", description: "Workflow updated" });
            } else {
                // Create
                await workflowService.createWorkflow({
                    org_id: orgSettings.org_id,
                    name,
                    description,
                    is_active: isActive,
                    is_default: false // Logic for default can be added later
                }, steps as any);
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
        <Card>
            <CardHeader>
                <CardTitle>{workflow ? "Edit Workflow" : "Create Workflow"}</CardTitle>
                <CardDescription>Define the approval steps for this workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="name">Workflow Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Payroll Approval" />
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Applies to all local payrolls" />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                        <Label htmlFor="active">Active</Label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold">Approval Steps ({steps.length}/{orgSettings.max_approval_levels})</h3>
                        <Button variant="outline" size="sm" onClick={handleAddStep} disabled={steps.length >= orgSettings.max_approval_levels}>
                            <Plus className="h-4 w-4 mr-2" /> Add Step
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {steps.map((step, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 border rounded-md bg-muted/30">
                                <div className="mt-3 text-sm font-bold text-muted-foreground w-6 text-center">{step.level}</div>

                                <div className="flex-1 grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Approver</Label>
                                        <Select
                                            value={step.approver_user_id}
                                            onValueChange={val => updateStep(index, { approver_user_id: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select User" />
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

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center space-x-2 mt-6">
                                            <Switch
                                                checked={step.notify_email}
                                                onCheckedChange={checked => updateStep(index, { notify_email: checked })}
                                            />
                                            <Label className="text-xs">Email</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-6">
                                            <Switch
                                                checked={step.notify_in_app}
                                                onCheckedChange={checked => updateStep(index, { notify_in_app: checked })}
                                            />
                                            <Label className="text-xs">In-App</Label>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="ghost" size="icon" className="text-destructive mt-2" onClick={() => handleRemoveStep(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {steps.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No steps defined. Add a step to start.
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Workflow"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

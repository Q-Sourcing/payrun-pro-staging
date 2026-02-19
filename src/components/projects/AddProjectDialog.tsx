import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_TYPE_PAY_TYPES, formatPayType } from "@/lib/types/projects";

interface AddProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectAdded: () => void;
}

const AddProjectDialog = ({ open, onOpenChange, onProjectAdded }: AddProjectDialogProps) => {
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        status: "active",
        start_date: "",
        end_date: "",
        project_type: "" as "manpower" | "ippms" | "expatriate" | "",
        project_subtype: "" as "daily" | "bi_weekly" | "monthly" | "",
        supports_all_pay_types: false,
        allowed_pay_types: [] as string[],
        client_name: "",
        location: "",
        contract_value: "",
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Auto-generate project code from name
    const generateCode = (name: string) => {
        // Take first 3 letters of each word, uppercase, join with dash
        const words = name.trim().split(/\s+/).filter(w => w.length > 0);
        const code = words
            .map(word => word.substring(0, 3).toUpperCase())
            .join('-');
        return code;
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            code: generateCode(name)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.code || !formData.project_type) {
            toast({
                title: "Error",
                description: "Please fill in all required fields (Name, Code, Project Employee Type)",
                variant: "destructive",
            });
            return;
        }

        // Validate pay types
        if (!formData.supports_all_pay_types && formData.allowed_pay_types.length === 0) {
            toast({
                title: "Error",
                description: "Please select at least one pay type or enable 'Supports all pay types'",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from("projects").insert([
                {
                    name: formData.name,
                    code: formData.code.toUpperCase(),
                    description: formData.description || null,
                    status: formData.status,
                    start_date: formData.start_date || null,
                    end_date: formData.end_date || null,
                    project_type: formData.project_type,
                    project_subtype: formData.project_type === "manpower" ? formData.project_subtype || null : null,
                    supports_all_pay_types: formData.supports_all_pay_types,
                    allowed_pay_types: formData.supports_all_pay_types ? null : formData.allowed_pay_types,
                    client_name: formData.client_name || null,
                    location: formData.location || null,
                    contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
                } as any,
            ]);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Project created successfully",
            });

            setFormData({
                name: "",
                code: "",
                description: "",
                status: "active",
                start_date: "",
                end_date: "",
                project_type: "",
                project_subtype: "",
                supports_all_pay_types: false,
                allowed_pay_types: [],
                client_name: "",
                location: "",
                contract_value: "",
            });
            onProjectAdded();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error creating project:", error);

            if (error.code === "23505") {
                toast({
                    title: "Error",
                    description: "A project with this name or code already exists",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to create project",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] modern-dialog max-h-[90vh] overflow-y-auto">
                <DialogHeader className="modern-dialog-header">
                    <DialogTitle className="modern-dialog-title">Create Project</DialogTitle>
                    <DialogDescription className="modern-dialog-description">
                        Add a new project to organize employees and pay groups
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g., Kampala Road Construction"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Project Code *</Label>
                        <Input
                            id="code"
                            value={formData.code}
                            readOnly
                            placeholder="Auto-generated from name"
                            className="bg-slate-50"
                        />
                        <p className="text-xs text-muted-foreground">Auto-generated from project name</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="project_type">Project (Employee) Type *</Label>
                        <Select
                            value={formData.project_type}
                            onValueChange={(value) => setFormData({
                                ...formData,
                                project_type: value as "manpower" | "ippms" | "expatriate",
                                project_subtype: value !== "manpower" ? "" : formData.project_subtype,
                                allowed_pay_types: [] // Reset pay types when project type changes
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select project employee type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manpower">Manpower</SelectItem>
                                <SelectItem value="ippms">IPPMS</SelectItem>
                                <SelectItem value="expatriate">Expatriate</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">The employee type for this project (determines available pay types)</p>
                    </div>

                    {formData.project_type === "manpower" && (
                        <div className="space-y-2">
                            <Label htmlFor="project_subtype">Manpower Type *</Label>
                            <Select
                                value={formData.project_subtype}
                                onValueChange={(value) => setFormData({ ...formData, project_subtype: value as "daily" | "bi_weekly" | "monthly" })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select manpower type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {formData.project_type && (
                        <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="supports_all_pay_types"
                                    checked={formData.supports_all_pay_types}
                                    onCheckedChange={(checked) => setFormData({
                                        ...formData,
                                        supports_all_pay_types: checked as boolean,
                                        allowed_pay_types: checked ? [] : formData.allowed_pay_types
                                    })}
                                />
                                <Label htmlFor="supports_all_pay_types" className="font-medium cursor-pointer">
                                    This project supports all pay types for {formData.project_type}
                                </Label>
                            </div>

                            {!formData.supports_all_pay_types && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-sm">Allowed Pay Types *</Label>
                                    <div className="space-y-2">
                                        {PROJECT_TYPE_PAY_TYPES[formData.project_type as keyof typeof PROJECT_TYPE_PAY_TYPES].map((payType) => (
                                            <div key={payType} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`pay_type_${payType}`}
                                                    checked={formData.allowed_pay_types.includes(payType)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setFormData({
                                                                ...formData,
                                                                allowed_pay_types: [...formData.allowed_pay_types, payType]
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                allowed_pay_types: formData.allowed_pay_types.filter(pt => pt !== payType)
                                                            });
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`pay_type_${payType}`} className="cursor-pointer">
                                                    {formatPayType(payType)}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Select which pay types are allowed for this project</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description for this project"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="client_name">Client Name</Label>
                        <Input
                            id="client_name"
                            value={formData.client_name}
                            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                            placeholder="e.g., Ministry of Works"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g., Kampala"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contract_value">Contract Value</Label>
                            <Input
                                id="contract_value"
                                type="number"
                                value={formData.contract_value}
                                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                                placeholder="e.g., 500000"
                            />
                        </div>
                    </div>



                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Creating..." : "Create Project"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddProjectDialog;

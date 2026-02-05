import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { workflowService, NotificationTemplate } from "@/lib/services/workflow.service";
import { Mail, Pencil, RefreshCw, ChevronRight, Info } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const PayrollNotificationTemplates = () => {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            // We assume getOrgSettings or similar gives us the org context, 
            // but the service method will handle fetching for current user's org + defaults
            const data = await workflowService.getNotificationTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Failed to load templates", error);
            // toast({ title: "Error", description: "Could not load email templates", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingTemplate) return;
        try {
            await workflowService.updateNotificationTemplate(editingTemplate.id, {
                subject: editingTemplate.subject,
                body_content: editingTemplate.body_content,
                is_active: editingTemplate.is_active
            });
            toast({ title: "Success", description: "Email template updated." });
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-slate-900">Email Templates</h3>
                    <p className="text-sm text-slate-500">Customize the automated emails sent during approval workflows.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadTemplates} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            <div className="grid gap-4">
                {templates.map(template => (
                    <div
                        key={template.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-500/30 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${template.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">{template.name}</h4>
                                <p className="text-xs text-slate-500">Trigger: <span className="font-medium font-mono bg-slate-100 px-1 rounded">{template.trigger_event}</span></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge variant={template.is_active ? 'default' : 'secondary'} className={template.is_active ? "bg-teal-600" : ""}>
                                {template.is_active ? 'Active' : 'Disabled'}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(template)}>
                                Edit <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                ))}

                {templates.length === 0 && !loading && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                        <Mail className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No templates found</p>
                        <p className="text-xs text-slate-400 mt-1">Run pending migrations to seed default templates.</p>
                    </div>
                )}
            </div>

            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Template: {editingTemplate?.name}</DialogTitle>
                        <DialogDescription>
                            Configure the email content for the <strong>{editingTemplate?.trigger_event}</strong> event.
                        </DialogDescription>
                    </DialogHeader>

                    {editingTemplate && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                            {/* Left Column: Editor */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-semibold">Template Status</Label>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={editingTemplate.is_active}
                                                onCheckedChange={val => setEditingTemplate({ ...editingTemplate, is_active: val })}
                                            />
                                            <span className="text-sm text-slate-600">{editingTemplate.is_active ? 'Active' : 'Disabled'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Subject Line</Label>
                                    <Input
                                        value={editingTemplate.subject}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                        className="font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Email Body (HTML Supported)</Label>
                                        <Button variant="ghost" size="sm" onClick={() => setPreviewMode(!previewMode)} className="h-6 text-xs px-2">
                                            {previewMode ? 'Edit Source' : 'Preview Render'}
                                        </Button>
                                    </div>

                                    {previewMode ? (
                                        <div
                                            className="min-h-[300px] p-4 rounded-md border border-slate-200 bg-white prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: editingTemplate.body_content }}
                                        />
                                    ) : (
                                        <Textarea
                                            value={editingTemplate.body_content}
                                            onChange={e => setEditingTemplate({ ...editingTemplate, body_content: e.target.value })}
                                            className="min-h-[300px] font-mono text-sm"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Variables & Help */}
                            <div className="space-y-6">
                                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm">
                                    <h5 className="font-bold flex items-center gap-2 mb-2">
                                        <Info className="h-4 w-4" /> Available Variables
                                    </h5>
                                    <p className="mb-3 opacity-90">Click to copy into your template.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {editingTemplate.available_variables?.map(variable => (
                                            <Badge
                                                key={variable}
                                                className="bg-white text-blue-700 hover:bg-blue-100 cursor-pointer border-blue-200"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`{{${variable}}}`);
                                                    toast({ title: "Copied", description: `{{${variable}}} copied to clipboard` });
                                                }}
                                            >
                                                {`{{${variable}}}`}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Quick Tips</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-slate-500 space-y-2">
                                        <p>• Use <strong>HTML tags</strong> like &lt;b&gt;, &lt;p&gt;, &lt;ul&gt; for formatting.</p>
                                        <p>• Variables are replaced automatically at runtime.</p>
                                        <p>• Keep subject lines concise for better mobile visibility.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-8 pt-4 border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

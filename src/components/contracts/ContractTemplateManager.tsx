// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ScrollText, Eye } from "lucide-react";
import { ContractsService, ContractTemplate } from "@/lib/data/contracts.service";
import { ContractTemplateForm } from "./ContractTemplateForm";
import { useOrg } from "@/lib/tenant/OrgContext";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ContractTemplateManager() {
  const { organizationId: orgId } = useOrg();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractTemplate | null>(null);
  const [viewTarget, setViewTarget] = useState<ContractTemplate | null>(null);

  const fetchTemplates = async () => {
    if (!orgId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ContractsService.getTemplates(orgId);
      setTemplates(data);
    } catch (e: any) {
      toast({ title: "Failed to load templates", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [orgId]);

  const handleSave = async (data: any) => {
    if (editingTemplate) {
      await ContractsService.updateTemplate(editingTemplate.id, data);
      toast({ title: "Template updated" });
    } else {
      await ContractsService.createTemplate({ ...data, organization_id: orgId });
      toast({ title: "Template created" });
    }
    setEditingTemplate(null);
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await ContractsService.updateTemplate(deleteTarget.id, { is_active: false });
      toast({ title: "Template deleted" });
      setDeleteTarget(null);
      fetchTemplates();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (t: ContractTemplate) => {
    setEditingTemplate(t);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" /> Contract Templates
            </CardTitle>
            <CardDescription>Create and manage reusable contract templates for your organization.</CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading templates…</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No templates yet. Create your first contract template.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Employment Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.country_code ? <Badge variant="outline">{t.country_code}</Badge> : "—"}</TableCell>
                    <TableCell>{t.employment_type ? <Badge variant="secondary" className="capitalize">{t.employment_type}</Badge> : "—"}</TableCell>
                    <TableCell>v{t.version}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewTarget(t)} title="View template">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <ContractTemplateForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate "{deleteTarget?.name}". Existing contracts using this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewTarget} onOpenChange={(open) => { if (!open) setViewTarget(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name || "Template Preview"}</DialogTitle>
            <DialogDescription>
              Full read-only details for the selected contract template.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm rounded-md border p-4 bg-muted/10">
                <div>
                  <p className="text-muted-foreground">Template Name</p>
                  <p className="font-medium">{viewTarget.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">v{viewTarget.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{viewTarget.is_active ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-medium">{viewTarget.country_code || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employment Type</p>
                  <p className="font-medium capitalize">{viewTarget.employment_type || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Organization ID</p>
                  <p className="font-mono text-xs break-all">{viewTarget.organization_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium">{viewTarget.description || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(viewTarget.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{new Date(viewTarget.updated_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-md border p-4 bg-muted/10">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Placeholders ({viewTarget.placeholders?.length || 0})
                </p>
                {!viewTarget.placeholders || viewTarget.placeholders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No custom placeholders defined.</p>
                ) : (
                  <div className="space-y-2">
                    {viewTarget.placeholders.map((p: any) => (
                      <div key={p.key} className="flex items-center gap-2 rounded border p-2 text-sm">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${p.key}}}`}</code>
                        <span className="font-medium">{p.label || p.key}</span>
                        {p.default_value ? <span className="text-muted-foreground">default: {p.default_value}</span> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border p-4 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Template Body</p>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: viewTarget.body_html || "<p>No template body available.</p>" }}
                />
              </div>

              <div className="rounded-md border p-4 bg-muted/10">
                <p className="text-xs font-medium text-muted-foreground mb-2">Template Body (Raw HTML)</p>
                <pre className="text-xs whitespace-pre-wrap break-words font-mono max-h-56 overflow-y-auto">
                  {viewTarget.body_html || "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy } from "lucide-react";
import { ContractTemplate } from "@/lib/data/contracts.service";
import { toast } from "@/hooks/use-toast";

const BUILT_IN_PLACEHOLDERS = [
  { key: "employee_name", label: "Employee Name" },
  { key: "employee_number", label: "Employee Number" },
  { key: "job_title", label: "Job Title" },
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date" },
  { key: "salary", label: "Salary" },
  { key: "company_name", label: "Company Name" },
  { key: "department", label: "Department" },
];

const EMPLOYMENT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "expatriate", label: "Expatriate" },
];

interface Placeholder {
  key: string;
  label: string;
  default_value?: string;
}

interface ContractTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ContractTemplate | null;
  onSave: (data: {
    name: string;
    description: string | null;
    country_code: string | null;
    employment_type: string | null;
    body_html: string;
    placeholders: Placeholder[];
  }) => Promise<void>;
}

export function ContractTemplateForm({ open, onOpenChange, template, onSave }: ContractTemplateFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDefault, setNewDefault] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setDescription(template?.description ?? "");
      setCountryCode(template?.country_code ?? "");
      setEmploymentType(template?.employment_type ?? "");
      setBodyHtml(template?.body_html ?? "");
      setPlaceholders((template?.placeholders as Placeholder[]) ?? []);
      setNewKey(""); setNewLabel(""); setNewDefault("");
    }
  }, [open, template]);

  const handleAddPlaceholder = () => {
    if (!newKey.trim()) return;
    if (placeholders.some((p) => p.key === newKey.trim())) {
      toast({ title: "Duplicate key", description: "This placeholder key already exists.", variant: "destructive" });
      return;
    }
    setPlaceholders([...placeholders, { key: newKey.trim(), label: newLabel.trim() || newKey.trim(), default_value: newDefault.trim() || undefined }]);
    setNewKey("");
    setNewLabel("");
    setNewDefault("");
  };

  const handleRemovePlaceholder = (key: string) => {
    setPlaceholders(placeholders.filter((p) => p.key !== key));
  };

  const insertPlaceholder = (key: string) => {
    setBodyHtml((prev) => prev + `{{${key}}}`);
    toast({ title: "Inserted", description: `{{${key}}} added to body.` });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        country_code: countryCode || null,
        employment_type: employmentType || null,
        body_html: bodyHtml,
        placeholders,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error saving template", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Build preview by replacing placeholders with sample values
  const previewHtml = () => {
    let html = bodyHtml;
    for (const p of [...BUILT_IN_PLACEHOLDERS, ...placeholders]) {
      const val = (p as any).default_value || `[${p.label}]`;
      html = html.replaceAll(`{{${p.key}}}`, val);
    }
    return html;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Contract Template"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="editor" className="mt-2">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* ── Editor Tab ── */}
          <TabsContent value="editor" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Employment Contract" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="e.g. UG, KE, TZ" />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick-insert placeholder badges */}
            <div className="space-y-2">
              <Label>Available Placeholders (click to insert)</Label>
              <div className="flex flex-wrap gap-1.5">
                {[...BUILT_IN_PLACEHOLDERS, ...placeholders].map((p) => (
                  <Badge
                    key={p.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => insertPlaceholder(p.key)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    {`{{${p.key}}}`}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Body HTML</Label>
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<h1>Employment Contract</h1><p>This contract is between {{company_name}} and {{employee_name}}...</p>"
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
          </TabsContent>

          {/* ── Placeholders Tab ── */}
          <TabsContent value="placeholders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Built-in Placeholders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {BUILT_IN_PLACEHOLDERS.map((p) => (
                    <Badge key={p.key} variant="secondary">{`{{${p.key}}}`} — {p.label}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Custom Placeholders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {placeholders.map((p) => (
                  <div key={p.key} className="flex items-center gap-2 rounded-md border p-2">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${p.key}}}`}</code>
                    <span className="text-sm flex-1">{p.label}</span>
                    {p.default_value && <span className="text-xs text-muted-foreground">default: {p.default_value}</span>}
                    <Button size="icon" variant="ghost" onClick={() => handleRemovePlaceholder(p.key)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-end gap-2 pt-2 border-t">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Key</Label>
                    <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. probation_period" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Label</Label>
                    <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Probation Period" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Default</Label>
                    <Input value={newDefault} onChange={(e) => setNewDefault(e.target.value)} placeholder="3 months" className="h-8 text-sm" />
                  </div>
                  <Button size="sm" onClick={handleAddPlaceholder}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Preview Tab ── */}
          <TabsContent value="preview">
            <Card>
              <CardContent className="pt-6">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: previewHtml() }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : template ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

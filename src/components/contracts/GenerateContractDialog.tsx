// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { ContractsService, ContractTemplate } from "@/lib/data/contracts.service";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  organizationId: string;
  employeeName: string;
  employeeData: Record<string, any>;
  onContractCreated: () => void;
}

export function GenerateContractDialog({ open, onOpenChange, employeeId, organizationId, employeeName, employeeData, onContractCreated }: Props) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && organizationId) {
      ContractsService.getTemplates(organizationId).then(setTemplates).catch(() => {});
    }
  }, [open, organizationId]);

  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      // Build placeholder values from employee data
      const values: Record<string, string> = {
        employee_name: employeeName,
        employee_email: employeeData.email || "",
        employee_number: employeeData.employee_number || "",
        pay_rate: String(employeeData.pay_rate || ""),
        pay_type: employeeData.pay_type || "",
        country: employeeData.country || "",
        currency: employeeData.currency || "",
        start_date: startDate || "___________",
        end_date: endDate || "___________",
        date_today: new Date().toLocaleDateString(),
      };
      setPreviewHtml(ContractsService.renderTemplate(tpl.body_html, values));
    } else {
      setPreviewHtml("");
    }
  }, [selectedTemplateId, templates, employeeData, startDate, endDate]);

  const handleSubmit = async () => {
    if (!selectedTemplateId) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const tpl = templates.find((t) => t.id === selectedTemplateId)!;
      const salarySnapshot = {
        pay_rate: employeeData.pay_rate,
        pay_type: employeeData.pay_type,
        currency: employeeData.currency,
      };

      await ContractsService.createContract({
        organization_id: organizationId,
        employee_id: employeeId,
        template_id: selectedTemplateId,
        contract_number: contractNumber || null,
        status: "draft",
        start_date: startDate || null,
        end_date: endDate || null,
        auto_renew: autoRenew,
        salary_snapshot: salarySnapshot,
        body_html: previewHtml,
        notes: notes || null,
      });

      toast({ title: "Contract created" });
      onContractCreated();
      onOpenChange(false);
      // Reset
      setSelectedTemplateId("");
      setContractNumber("");
      setStartDate("");
      setEndDate("");
      setAutoRenew(false);
      setNotes("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Contract</DialogTitle>
          <DialogDescription>Create a contract for {employeeName} from a template.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selection */}
          <div className="space-y-2">
            <Label>Contract Template</Label>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates available. Create one in Settings first.</p>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.country_code && `(${t.country_code})`} {t.employment_type && `— ${t.employment_type}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contract Number</Label>
              <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="e.g. CTR-2026-001" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Auto-renew
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>

          {/* Preview */}
          {previewHtml && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto bg-muted/30 text-sm prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !selectedTemplateId}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

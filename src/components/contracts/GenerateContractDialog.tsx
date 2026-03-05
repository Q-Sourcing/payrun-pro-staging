// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { ContractsService, ContractTemplate } from "@/lib/data/contracts.service";
import { useToast } from "@/hooks/use-toast";
import { AllowancesSection, AllowanceItem, DEFAULT_ALLOWANCES, serializeAllowances } from "@/components/employees/AllowancesSection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  organizationId: string;
  employeeName: string;
  employeeData: Record<string, any>;
  onContractCreated: () => void;
}

/** Mandatory fields that must be present on employeeData before contract can be generated */
const MANDATORY_FIELDS: { key: string; label: string }[] = [
  { key: "first_name", label: "First Name" },
  { key: "email", label: "Email" },
  { key: "national_id", label: "National ID" },
  { key: "pay_rate", label: "Pay Rate" },
  { key: "currency", label: "Currency" },
  { key: "country", label: "Country" },
  { key: "date_joined", label: "Date Joined" },
];

function getMissingFields(data: Record<string, any>): string[] {
  return MANDATORY_FIELDS.filter((f) => !data[f.key] && data[f.key] !== 0).map((f) => f.label);
}

/** Build allowance text for contract body injection */
function buildAllowanceText(allowances: AllowanceItem[], currency: string): string {
  const active = allowances.filter((a) => a.enabled && a.amount !== "");
  if (!active.length) return "No additional allowances.";
  return active
    .map((a) => `${a.label}: ${currency} ${Number(a.amount).toLocaleString()}`)
    .join("\n");
}

/** 15-day probation reminder: compute probation end as join + 15 days */
function compute15DayProbation(dateJoined: string | null): string {
  if (!dateJoined) return "";
  const d = new Date(dateJoined);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}

export function GenerateContractDialog({
  open,
  onOpenChange,
  employeeId,
  organizationId,
  employeeName,
  employeeData,
  onContractCreated,
}: Props) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [allowances, setAllowances] = useState<AllowanceItem[]>(DEFAULT_ALLOWANCES);
  const { toast } = useToast();

  // Validation gate
  const missingFields = getMissingFields(employeeData);
  const isGateLocked = missingFields.length > 0;

  // Auto-compute 15-day probation end
  const auto15DayProbation = compute15DayProbation(employeeData.date_joined || null);

  useEffect(() => {
    if (open && organizationId) {
      ContractsService.getTemplates(organizationId).then(setTemplates).catch(() => {});
    }
    // Reset allowances on open
    if (open) {
      setAllowances(DEFAULT_ALLOWANCES);
      // Pre-fill start date from date_joined
      if (employeeData.date_joined) setStartDate(employeeData.date_joined);
    }
  }, [open, organizationId]);

  // Re-render preview when key fields change
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) { setPreviewHtml(""); return; }

    const allowanceText = buildAllowanceText(allowances, employeeData.currency || "UGX");
    const values: Record<string, string> = {
      employee_name: employeeName,
      employee_email: employeeData.email || "",
      employee_number: employeeData.employee_number || "",
      pay_rate: String(employeeData.pay_rate || ""),
      pay_type: employeeData.pay_type || "",
      country: employeeData.country || "",
      currency: employeeData.currency || "",
      national_id: employeeData.national_id || "",
      // Project-level data reusability
      client_name: employeeData.client_name || employeeData.project_client || "",
      site_location: employeeData.location || employeeData.project_location || "",
      project_code: employeeData.project_code || "",
      project_name: employeeData.project_name || "",
      // Dates
      start_date: startDate || "___________",
      end_date: endDate || "___________",
      date_today: new Date().toLocaleDateString(),
      probation_end_date: auto15DayProbation || "___________",
      // Allowances
      allowances: allowanceText,
    };
    setPreviewHtml(ContractsService.renderTemplate(tpl.body_html, values));
  }, [selectedTemplateId, templates, employeeData, startDate, endDate, allowances]);

  const handleSubmit = async () => {
    if (isGateLocked) {
      toast({ title: "Complete mandatory fields first", variant: "destructive" });
      return;
    }
    if (!selectedTemplateId) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const salarySnapshot = {
        pay_rate: employeeData.pay_rate,
        pay_type: employeeData.pay_type,
        currency: employeeData.currency,
        allowances: serializeAllowances(allowances),
        // Project data snapshot
        client_name: employeeData.client_name || employeeData.project_client || "",
        project_code: employeeData.project_code || "",
      };

      // Auto-save 15-day probation reminder to employee record
      if (auto15DayProbation && employeeId) {
        await import("@/integrations/supabase/client").then(({ supabase }) =>
          supabase
            .from("employees")
            .update({
              probation_end_date: auto15DayProbation,
              probation_status: "active",
            })
            .eq("id", employeeId)
        );
      }

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

      toast({ title: "Contract created", description: `15-day probation reminder set for ${auto15DayProbation || "N/A"}.` });
      onContractCreated();
      onOpenChange(false);
      setSelectedTemplateId("");
      setContractNumber("");
      setStartDate("");
      setEndDate("");
      setAutoRenew(false);
      setNotes("");
      setAllowances(DEFAULT_ALLOWANCES);
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
          {/* Validation Gate */}
          {isGateLocked ? (
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/40">
              <Lock className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Contract generation is locked.</p>
                <p className="text-sm">Complete the following mandatory fields on the employee profile first:</p>
                <ul className="list-disc list-inside text-sm space-y-0.5">
                  {missingFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-primary/30 bg-primary/5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                All mandatory fields verified. Contract generation is unlocked.
              </AlertDescription>
            </Alert>
          )}

          {/* Project context info (data reusability) */}
          {(employeeData.project_name || employeeData.client_name) && (
            <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project Context</p>
              <div className="flex flex-wrap gap-2">
                {employeeData.project_name && (
                  <Badge variant="outline" className="text-xs">📁 {employeeData.project_name}</Badge>
                )}
                {employeeData.client_name && (
                  <Badge variant="outline" className="text-xs">🏢 {employeeData.client_name}</Badge>
                )}
                {employeeData.project_location && (
                  <Badge variant="outline" className="text-xs">📍 {employeeData.project_location}</Badge>
                )}
              </div>
            </div>
          )}

          {/* 15-day probation reminder info */}
          {auto15DayProbation && (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Auto 15-day probation reminder</strong> will be set to{" "}
                <strong>{new Date(auto15DayProbation).toLocaleDateString()}</strong> on contract creation.
              </p>
            </div>
          )}

          {/* Template selection */}
          <div className="space-y-2">
            <Label>Contract Template</Label>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates available. Create one in Settings first.</p>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isGateLocked}>
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

          {/* Allowances */}
          <AllowancesSection
            allowances={allowances}
            onChange={setAllowances}
            currency={employeeData.currency || "UGX"}
            readOnly={isGateLocked}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contract Number</Label>
              <Input
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="e.g. CTR-2026-001"
                disabled={isGateLocked}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Auto-renew
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} disabled={isGateLocked} />
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isGateLocked} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isGateLocked} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              disabled={isGateLocked}
            />
          </div>

          {/* Preview */}
          {previewHtml && !isGateLocked && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="border rounded-md p-4 max-h-60 overflow-y-auto bg-muted/30 text-sm prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !selectedTemplateId || isGateLocked}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
            ) : isGateLocked ? (
              <><Lock className="h-4 w-4 mr-2" /> Locked</>
            ) : (
              "Create Contract"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

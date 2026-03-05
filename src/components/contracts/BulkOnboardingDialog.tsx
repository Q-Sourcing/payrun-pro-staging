// @ts-nocheck
import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Download, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContractsService } from "@/lib/data/contracts.service";
import { AllowancesSection, AllowanceItem, DEFAULT_ALLOWANCES, serializeAllowances } from "@/components/employees/AllowancesSection";
import { useActiveProjects } from "@/hooks/useActiveProjects";

interface BulkRow {
  first_name: string;
  last_name: string;
  email: string;
  employee_type: string;
  country: string;
  pay_rate: number;
  currency?: string;
  phone?: string;
  national_id?: string;
  date_joined?: string;
  probation_end_date?: string;
  bank_name?: string;
  account_number?: string;
  // validation
  _valid?: boolean;
  _errors?: string[];
  _status?: "pending" | "imported" | "failed";
  _message?: string;
}

const REQUIRED_COLS = ["first_name", "last_name", "email", "employee_type", "country", "pay_rate"];

/** Template includes all optional allowance-compatible fields */
const TEMPLATE_DATA = [
  {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane.doe@company.com",
    employee_type: "manpower",
    country: "Uganda",
    currency: "UGX",
    pay_rate: 1500000,
    national_id: "CM12345678",
    phone: "+256700000000",
    date_joined: "2025-01-15",
    bank_name: "Stanbic Bank",
    account_number: "9030012345678",
  },
];

/** Build 15-day probation end from date_joined */
function calc15DayProbation(dateJoined: string | null): string {
  if (!dateJoined) return "";
  const d = new Date(dateJoined);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  onComplete: () => void;
}

export function BulkOnboardingDialog({ open, onOpenChange, organizationId, onComplete }: Props) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [generateContracts, setGenerateContracts] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(DEFAULT_ALLOWANCES);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { projects: activeProjects } = useActiveProjects(["manpower", "ippms"]);

  // Load contract templates when org changes
  const loadTemplates = async () => {
    if (!organizationId) return;
    try {
      const list = await ContractsService.getTemplates(organizationId);
      setTemplates(list);
      if (list.length > 0 && !selectedTemplateId) setSelectedTemplateId(list[0].id);
    } catch { /* ignore */ }
  };

  // Lazy load templates when user ticks "generate contracts"
  const handleGenerateContractsToggle = (checked: boolean) => {
    setGenerateContracts(checked);
    if (checked && templates.length === 0) loadTemplates();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff Onboarding");
    XLSX.writeFile(wb, "bulk_onboarding_template.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Cap at 100
      const capped = raw.slice(0, 100);

      const validated: BulkRow[] = capped.map((r) => {
        const errs: string[] = [];
        for (const col of REQUIRED_COLS) {
          if (!r[col] && r[col] !== 0) errs.push(`Missing: ${col}`);
        }
        if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errs.push("Invalid email format");
        if (r.pay_rate && isNaN(Number(r.pay_rate))) errs.push("pay_rate must be a number");
        if (capped.length > 100) errs.push("Max 100 rows per upload");
        return {
          ...r,
          pay_rate: Number(r.pay_rate) || 0,
          _valid: errs.length === 0,
          _errors: errs,
          _status: "pending",
        };
      });

      setRows(validated);
      setDone(false);
      setProgress(0);
      // Load templates lazily
      if (generateContracts) loadTemplates();
    };
    reader.readAsBinaryString(file);
  };

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  const handleImport = async () => {
    if (!validRows.length) return;
    if (!selectedProjectId) {
      toast({ title: "Select a project first", description: "A Project is required before staff can be registered.", variant: "destructive" });
      return;
    }

    setImporting(true);
    let processed = 0;
    const updatedRows = [...rows];

    // Fetch selected project for data reusability
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, name, code, client_name, location, responsible_manager_id")
      .eq("id", selectedProjectId)
      .single();

    const allowanceRecord = serializeAllowances(allowances);

    // Get a contract template if needed
    let tpl: any = null;
    if (generateContracts && selectedTemplateId) {
      tpl = templates.find((t) => t.id === selectedTemplateId);
    }

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (!row._valid) continue;

      try {
        // Generate employee number
        const { data: empNum } = await supabase.rpc("generate_employee_number", {
          in_sub_department: null,
          in_country: row.country,
          in_employee_type: row.employee_type,
          in_pay_group_id: null,
        });

        const probationEnd = calc15DayProbation(row.date_joined || null);

        const { data: employee, error: empError } = await supabase
          .from("employees")
          .insert({
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            employee_type: row.employee_type,
            country: row.country,
            currency: row.currency || "UGX",
            pay_rate: row.pay_rate,
            pay_type: "salary",
            national_id: row.national_id || null,
            phone: row.phone || null,
            date_joined: row.date_joined || null,
            probation_end_date: probationEnd || null,
            probation_status: probationEnd ? "active" : "not_applicable",
            bank_name: row.bank_name || null,
            account_number: row.account_number || null,
            organization_id: organizationId,
            employee_number: empNum || `BULK-${Date.now()}-${i}`,
            status: "active",
            // Project linkage (data reusability)
            project_id: selectedProjectId,
            // Auto-assign responsible manager from project
            reporting_manager_id: projectData?.responsible_manager_id || null,
          })
          .select()
          .single();

        if (empError) throw empError;

        // Auto-generate contract if enabled
        if (generateContracts && tpl && employee) {
          const allowanceText = Object.entries(allowanceRecord)
            .map(([k, v]) => `${k}: ${row.currency || "UGX"} ${Number(v).toLocaleString()}`)
            .join("\n");

          const placeholderValues = {
            employee_name: `${row.first_name} ${row.last_name}`.trim(),
            employee_email: row.email,
            employee_number: employee.employee_number,
            pay_rate: String(row.pay_rate),
            currency: row.currency || "UGX",
            country: row.country,
            national_id: row.national_id || "",
            client_name: projectData?.client_name || "",
            site_location: projectData?.location || "",
            project_name: projectData?.name || "",
            project_code: projectData?.code || "",
            start_date: row.date_joined || new Date().toISOString().slice(0, 10),
            probation_end_date: probationEnd || "",
            date_today: new Date().toLocaleDateString(),
            allowances: allowanceText || "No additional allowances.",
          };

          const renderedHtml = ContractsService.renderTemplate(tpl.body_html, placeholderValues);

          await ContractsService.createContract({
            organization_id: organizationId,
            employee_id: employee.id,
            template_id: tpl.id,
            status: "draft",
            start_date: row.date_joined || null,
            salary_snapshot: {
              pay_rate: row.pay_rate,
              currency: row.currency || "UGX",
              allowances: allowanceRecord,
              project_code: projectData?.code || "",
              client_name: projectData?.client_name || "",
            },
            body_html: renderedHtml,
            notes: `Auto-generated via bulk onboarding. Project: ${projectData?.name || selectedProjectId}`,
          });
        }

        updatedRows[i] = { ...row, _status: "imported" };
      } catch (err: any) {
        updatedRows[i] = { ...row, _status: "failed", _message: err.message };
      }

      processed++;
      setProgress(Math.round((processed / validRows.length) * 100));
    }

    setRows(updatedRows);
    setImporting(false);
    setDone(true);

    const imported = updatedRows.filter((r) => r._status === "imported").length;
    const failed = updatedRows.filter((r) => r._status === "failed").length;

    toast({
      title: "Bulk import complete",
      description: `${imported} staff imported${generateContracts ? " with contracts" : ""}, ${failed} failed, ${invalidRows.length} skipped.`,
    });

    if (imported > 0) onComplete();
  };

  const reset = () => {
    setRows([]);
    setProgress(0);
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Staff Onboarding
          </DialogTitle>
          <DialogDescription>
            Upload up to 100 staff via XLSX. Each staff member will be auto-linked to the selected project and can receive a batch-generated contract.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Step 1: Project Selection (required gate) */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              Select Active Project <span className="text-destructive">*</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-project">Project (IPPMS / Manpower)</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="bulk-project" className="max-w-sm">
                  <SelectValue placeholder="Choose an active project…" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.project_type.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeProjects.length === 0 && (
                <p className="text-xs text-destructive">No active IPPMS/Manpower projects found. Create one first.</p>
              )}
              {selectedProjectId && (() => {
                const p = activeProjects.find((x) => x.id === selectedProjectId);
                return p ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {p.client_name && <Badge variant="outline" className="text-xs">🏢 {p.client_name}</Badge>}
                    {p.location && <Badge variant="outline" className="text-xs">📍 {p.location}</Badge>}
                    {p.responsible_manager_name && <Badge variant="outline" className="text-xs">👤 Manager: {p.responsible_manager_name}</Badge>}
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Step 2: Allowances */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              Configure Allowances (applied to all staff)
            </p>
            <AllowancesSection allowances={allowances} onChange={setAllowances} currency="UGX" />
          </div>

          {/* Step 3: Contract generation option */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              Auto-generate Contracts
            </p>
            <div className="flex items-center gap-3">
              <Checkbox
                id="gen-contracts"
                checked={generateContracts}
                onCheckedChange={handleGenerateContractsToggle}
              />
              <Label htmlFor="gen-contracts" className="cursor-pointer text-sm">
                Automatically batch-generate individual draft contracts for all successfully imported staff
              </Label>
            </div>
            {generateContracts && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="bulk-template">Contract Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id="bulk-template" className="max-w-sm">
                    <SelectValue placeholder={templates.length ? "Choose template…" : "Loading templates…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground">No templates found. Create one in Settings → Contracts.</p>
                )}
              </div>
            )}
          </div>

          {/* Step 4: Upload */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
              Upload Staff List (max 100 rows)
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Download Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" /> Upload File
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              {rows.length > 0 && !importing && (
                <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
              )}
            </div>

            {rows.length > 0 && (
              <div className="flex gap-3 flex-wrap text-sm">
                <Badge variant="outline">{rows.length} total rows</Badge>
                <Badge className="bg-primary/15 text-primary border-primary/30">{validRows.length} valid</Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive">{invalidRows.length} with errors</Badge>
                )}
              </div>
            )}
          </div>

          {/* Validation errors */}
          {invalidRows.length > 0 && (
            <Alert variant="destructive" className="bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">{invalidRows.length} rows have validation errors and will be skipped:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  {invalidRows.slice(0, 5).map((r, i) => (
                    <li key={i}>{r.email || r.first_name || `Row ${i + 1}`}: {r._errors?.join(", ")}</li>
                  ))}
                  {invalidRows.length > 5 && <li>…and {invalidRows.length - 5} more</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Importing staff{generateContracts ? " and generating contracts" : ""}…</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          )}

          {/* Results table */}
          {rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={!r._valid ? "opacity-60" : ""}>
                      <TableCell>
                        {r._status === "imported" ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : r._status === "failed" ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : !r._valid ? (
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{[r.first_name, r.last_name].filter(Boolean).join(" ")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                      <TableCell className="text-sm">{r.employee_type}</TableCell>
                      <TableCell className="text-sm">{r.pay_rate?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r._errors?.join(", ") || r._message || (r._status === "imported" ? "✓ Imported" : "")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {done && (
            <Alert className="border-primary/30 bg-primary/5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Import complete! {rows.filter((r) => r._status === "imported").length} staff registered
                {generateContracts ? " with auto-generated draft contracts" : ""}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={handleImport}
            disabled={importing || validRows.length === 0 || !selectedProjectId}
          >
            {importing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
            ) : (
              `Import ${validRows.length} Staff${generateContracts ? " + Contracts" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

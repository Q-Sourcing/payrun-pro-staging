// @ts-nocheck
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkRow {
  first_name: string;
  last_name: string;
  email: string;
  employee_type: string;
  country: string;
  pay_rate: number;
  phone?: string;
  date_joined?: string;
  probation_end_date?: string;
  // validation
  _valid?: boolean;
  _errors?: string[];
  _status?: "pending" | "imported" | "failed";
  _message?: string;
}

const REQUIRED_COLS = ["first_name", "last_name", "email", "employee_type", "country", "pay_rate"];

const TEMPLATE_DATA = [
  {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane.doe@company.com",
    employee_type: "permanent",
    country: "Uganda",
    pay_rate: 1500000,
    phone: "+256700000000",
    date_joined: "2025-01-15",
    probation_end_date: "2025-07-15",
  },
];

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
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
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

      const validated: BulkRow[] = raw.map((r) => {
        const errs: string[] = [];
        for (const col of REQUIRED_COLS) {
          if (!r[col] && r[col] !== 0) errs.push(`Missing ${col}`);
        }
        if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errs.push("Invalid email");
        if (r.pay_rate && isNaN(Number(r.pay_rate))) errs.push("pay_rate must be a number");
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
    };
    reader.readAsBinaryString(file);
  };

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    let processed = 0;

    const updatedRows = [...rows];

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (!row._valid) continue;

      try {
        // Generate employee number via RPC
        const { data: empNum } = await supabase.rpc("generate_employee_number", {
          in_sub_department: null,
          in_country: row.country,
          in_employee_type: row.employee_type,
          in_pay_group_id: null,
        });

        const { error } = await supabase.from("employees").insert({
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          employee_type: row.employee_type,
          country: row.country,
          pay_rate: row.pay_rate,
          pay_type: "salary",
          phone: row.phone || null,
          date_joined: row.date_joined || null,
          probation_end_date: row.probation_end_date || null,
          probation_status: row.probation_end_date ? "active" : "not_applicable",
          organization_id: organizationId,
          employee_number: empNum || `EMP-BULK-${Date.now()}-${i}`,
          status: "active",
        });

        updatedRows[i] = {
          ...row,
          _status: error ? "failed" : "imported",
          _message: error?.message,
        };
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
      description: `${imported} imported, ${failed} failed, ${invalidRows.length} skipped (validation errors).`,
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Staff Onboarding
          </DialogTitle>
          <DialogDescription>
            Upload an XLSX file to import multiple employees at once. Download the template to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Actions */}
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

          {/* Summary badges */}
          {rows.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{rows.length} total rows</Badge>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validRows.length} valid
              </Badge>
              {invalidRows.length > 0 && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  <XCircle className="h-3 w-3 mr-1" />
                  {invalidRows.length} invalid
                </Badge>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">Importing... {progress}%</p>
            </div>
          )}

          {/* Validation errors summary */}
          {invalidRows.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {invalidRows.length} row(s) have validation errors and will be skipped. Fix them in your file and re-upload.
              </AlertDescription>
            </Alert>
          )}

          {/* Table preview */}
          {rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead>Probation End</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx} className={!row._valid ? "opacity-50" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell>{row.first_name} {row.last_name}</TableCell>
                      <TableCell className="text-xs">{row.email}</TableCell>
                      <TableCell>{row.employee_type}</TableCell>
                      <TableCell>{row.country}</TableCell>
                      <TableCell>{Number(row.pay_rate).toLocaleString()}</TableCell>
                      <TableCell>{row.probation_end_date || "—"}</TableCell>
                      <TableCell>
                        {row._status === "imported" && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Imported
                          </Badge>
                        )}
                        {row._status === "failed" && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" title={row._message}>
                            <XCircle className="h-3 w-3 mr-1" /> Failed
                          </Badge>
                        )}
                        {row._status === "pending" && row._valid && (
                          <Badge variant="outline">Ready</Badge>
                        )}
                        {!row._valid && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" title={row._errors?.join(", ")}>
                            <AlertTriangle className="h-3 w-3 mr-1" /> {row._errors?.join(", ")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && validRows.length > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${validRows.length} Employee${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

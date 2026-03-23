// @ts-nocheck
import { useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";

import { ArrowLeft, HardHat, Download, FileUp, Upload, CheckCircle2, XCircle, Loader2, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { getCurrencyCodeFromCountryCode } from "@/lib/constants/countries";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ImportRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  phone: string;
  personal_email: string;
  national_id: string;
  tin: string;
  nssf_number: string;
  passport_number: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  citizenship: string;
  marital_status: string;
  employee_type: string;
  pay_type: string;
  pay_frequency: string;
  pay_rate: string;
  currency: string;
  country: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  account_type: string;
  date_joined: string;
  designation: string;
  errors: string[];
};

type ImportResult = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  success: boolean;
  error?: string;
};

type Stage = "idle" | "importing" | "done";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TEMPLATE_HEADERS = [
  "first_name", "last_name", "phone", "personal_email", "national_id", "tin",
  "nssf_number", "passport_number", "gender", "date_of_birth", "nationality",
  "citizenship", "marital_status", "employee_type", "pay_type", "pay_frequency",
  "pay_rate", "currency", "country", "bank_name", "bank_branch", "account_number",
  "account_type", "date_joined", "designation",
];

const REQUIRED_FIELDS = ["first_name", "employee_type", "pay_type", "pay_rate", "country"] as const;

const FIELD_ALIASES: Record<string, string> = {
  "first name": "first_name",
  "last name": "last_name",
  "employee type": "employee_type",
  "pay type": "pay_type",
  "pay rate": "pay_rate",
  "date of birth": "date_of_birth",
  "date joined": "date_joined",
  "bank name": "bank_name",
  "bank branch": "bank_branch",
  "account number": "account_number",
  "account type": "account_type",
  "national id": "national_id",
  "nssf number": "nssf_number",
  "passport number": "passport_number",
  "personal email": "personal_email",
  "pay frequency": "pay_frequency",
};

const FIXED_COLUMN_ORDER = ["first_name", "last_name", "phone", "employee_type", "pay_type", "pay_rate", "country"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const normalizeHeader = (h: string): string => {
  const trimmed = String(h || "").trim().toLowerCase().replace(/\s+/g, " ");
  return FIELD_ALIASES[trimmed] || trimmed.replace(/[ -]+/g, "_");
};

const parseExcelDate = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const raw = String(value).trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const validateRow = (raw: Record<string, string>, rowNumber: number): ImportRow => {
  const row: ImportRow = {
    rowNumber,
    first_name: String(raw.first_name || "").trim(),
    last_name: String(raw.last_name || "").trim(),
    phone: String(raw.phone || "").trim(),
    personal_email: String(raw.personal_email || "").trim(),
    national_id: String(raw.national_id || "").trim(),
    tin: String(raw.tin || "").trim(),
    nssf_number: String(raw.nssf_number || "").trim(),
    passport_number: String(raw.passport_number || "").trim(),
    gender: String(raw.gender || "").trim().toLowerCase(),
    date_of_birth: parseExcelDate(raw.date_of_birth),
    nationality: String(raw.nationality || "").trim(),
    citizenship: String(raw.citizenship || "").trim(),
    marital_status: String(raw.marital_status || "").trim().toLowerCase(),
    employee_type: String(raw.employee_type || "").trim().toLowerCase(),
    pay_type: String(raw.pay_type || "").trim().toLowerCase(),
    pay_frequency: String(raw.pay_frequency || "").trim().toLowerCase(),
    pay_rate: String(raw.pay_rate || "").trim(),
    currency: String(raw.currency || "").trim().toUpperCase(),
    country: String(raw.country || "").trim().toUpperCase(),
    bank_name: String(raw.bank_name || "").trim(),
    bank_branch: String(raw.bank_branch || "").trim(),
    account_number: String(raw.account_number || "").trim(),
    account_type: String(raw.account_type || "").trim().toLowerCase(),
    date_joined: parseExcelDate(raw.date_joined),
    designation: String(raw.designation || "").trim(),
    errors: [],
  };

  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!row[field]) errors.push(`${field} is required`);
  }
  if (row.pay_rate && (isNaN(Number(row.pay_rate)) || Number(row.pay_rate) < 0)) {
    errors.push("pay_rate must be a valid number");
  }
  if (!row.currency && row.country) {
    row.currency = getCurrencyCodeFromCountryCode(row.country) || "";
  }

  row.errors = errors;
  return row;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProjectStaffBulkImport() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { organizationId } = useOrg();
  const { toast } = useToast();

  const orgId = organizationId || localStorage.getItem("active_organization_id");

  // Project selector
  const [selectedProjectId, setSelectedProjectId] = useState<string>(routeProjectId || "");

  // Excel tab state
  const [xlsxRows, setXlsxRows] = useState<ImportRow[]>([]);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste tab state
  const [pasteText, setPasteText] = useState("");
  const [pasteRows, setPasteRows] = useState<ImportRow[]>([]);
  const [showPastePreview, setShowPastePreview] = useState(false);

  // Import state
  const [stage, setStage] = useState<Stage>("idle");
  const [importProgress, setImportProgress] = useState(0);
  const [importCounter, setImportCounter] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  // ---------------------------------------------------------------------------
  // Projects query
  // ---------------------------------------------------------------------------
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-bulk-import", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, code, project_type, project_subtype, allowed_pay_types, supports_all_pay_types, country, currency")
        .eq("organization_id", orgId)
        .order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.name}${p.code ? ` (${p.code})` : ""}`,
  }));

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // ---------------------------------------------------------------------------
  // Download template
  // ---------------------------------------------------------------------------
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const sampleRows = [
      {
        first_name: "James", last_name: "Okello", phone: "+256700123456",
        personal_email: "james.okello@example.com", national_id: "CM1234567891",
        tin: "1001234567", nssf_number: "NSSF001234", passport_number: "",
        gender: "male", date_of_birth: "1990-03-15", nationality: "Ugandan",
        citizenship: "UG", marital_status: "married", employee_type: "manpower",
        pay_type: "daily_rate", pay_frequency: "daily", pay_rate: 35000,
        currency: "UGX", country: "UG", bank_name: "Stanbic Bank", bank_branch: "Kampala",
        account_number: "9030012345678", account_type: "savings",
        date_joined: "2026-01-06", designation: "Site Foreman",
      },
      {
        first_name: "Mary", last_name: "Nakato", phone: "+256772234567",
        personal_email: "mary.nakato@example.com", national_id: "CM9876543210",
        tin: "1009876543", nssf_number: "NSSF009876", passport_number: "",
        gender: "female", date_of_birth: "1995-07-22", nationality: "Ugandan",
        citizenship: "UG", marital_status: "single", employee_type: "ippms",
        pay_type: "piece_rate", pay_frequency: "bi_weekly", pay_rate: 1200,
        currency: "UGX", country: "UG", bank_name: "Centenary Bank", bank_branch: "Jinja",
        account_number: "2150098765432", account_type: "savings",
        date_joined: "2026-01-06", designation: "Field Worker",
      },
      {
        first_name: "David", last_name: "Mwangi", phone: "+254722345678",
        personal_email: "d.mwangi@company.com", national_id: "",
        tin: "", nssf_number: "", passport_number: "KE1234567",
        gender: "male", date_of_birth: "1985-11-30", nationality: "Kenyan",
        citizenship: "KE", marital_status: "married", employee_type: "expatriate",
        pay_type: "salary", pay_frequency: "monthly", pay_rate: 4500,
        currency: "USD", country: "UG", bank_name: "DFCU Bank", bank_branch: "Kampala",
        account_number: "01143210987654", account_type: "current",
        date_joined: "2026-02-01", designation: "Senior Engineer",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: TEMPLATE_HEADERS });
    XLSX.utils.book_append_sheet(wb, ws, "ProjectStaffTemplate");

    const refRows = [
      { field: "employee_type", value: "manpower", notes: "Daily/piece-rate field workers" },
      { field: "employee_type", value: "ippms", notes: "IPPMS project workers" },
      { field: "employee_type", value: "expatriate", notes: "Foreign/expat staff" },
      { field: "pay_type", value: "salary", notes: "Fixed monthly/periodic salary" },
      { field: "pay_type", value: "daily_rate", notes: "Paid per working day" },
      { field: "pay_type", value: "piece_rate", notes: "Paid per unit/piece of work" },
      { field: "pay_frequency", value: "daily", notes: "" },
      { field: "pay_frequency", value: "bi_weekly", notes: "" },
      { field: "pay_frequency", value: "monthly", notes: "" },
      { field: "gender", value: "male", notes: "" },
      { field: "gender", value: "female", notes: "" },
      { field: "gender", value: "other", notes: "" },
      { field: "account_type", value: "savings", notes: "" },
      { field: "account_type", value: "current", notes: "" },
      { field: "account_type", value: "mobile_money", notes: "" },
      { field: "marital_status", value: "single", notes: "" },
      { field: "marital_status", value: "married", notes: "" },
      { field: "marital_status", value: "divorced", notes: "" },
      { field: "marital_status", value: "widowed", notes: "" },
      { field: "country", value: "UG", notes: "Uganda" },
      { field: "country", value: "KE", notes: "Kenya" },
      { field: "country", value: "TZ", notes: "Tanzania" },
      { field: "country", value: "RW", notes: "Rwanda" },
      { field: "country", value: "SS", notes: "South Sudan" },
      { field: "currency", value: "UGX", notes: "Ugandan Shilling" },
      { field: "currency", value: "KES", notes: "Kenyan Shilling" },
      { field: "currency", value: "TZS", notes: "Tanzanian Shilling" },
      { field: "currency", value: "RWF", notes: "Rwandan Franc" },
      { field: "currency", value: "SSP", notes: "South Sudanese Pound" },
      { field: "currency", value: "USD", notes: "US Dollar" },
    ];
    const refWs = XLSX.utils.json_to_sheet(refRows, { header: ["field", "value", "notes"] });
    XLSX.utils.book_append_sheet(wb, refWs, "Reference");

    XLSX.writeFile(wb, "project_staff_bulk_import_template.xlsx");
  };

  // ---------------------------------------------------------------------------
  // Parse XLSX / CSV
  // ---------------------------------------------------------------------------
  const parseXlsxFile = async (file: File) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("No worksheet found.");
      const sheet = wb.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!jsonRows.length) throw new Error("No data rows found.");

      const parsed: ImportRow[] = jsonRows.map((raw, idx) => {
        const normalized: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          normalized[normalizeHeader(k)] = String(v ?? "").trim();
        }
        return validateRow(normalized, idx + 2);
      });
      setXlsxRows(parsed);
    } catch (e: any) {
      toast({ title: "Parse error", description: e?.message || "Could not parse file.", variant: "destructive" });
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .xlsx, .xls, or .csv file.", variant: "destructive" });
      return;
    }
    setXlsxFile(file);
    setXlsxRows([]);
    parseXlsxFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] || null);
  }, []);

  // ---------------------------------------------------------------------------
  // Parse pasted text
  // ---------------------------------------------------------------------------
  const parsePasteText = (text: string) => {
    const lines = text.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.trim());
    if (lines.length < 2) return;

    const firstLine = lines[0];
    const delimiter = firstLine.includes("\t") ? "\t" : ",";
    const rawHeaders = firstLine.split(delimiter).map(normalizeHeader);

    // Detect if first row looks like headers (contains known field names)
    const knownFields = new Set(TEMPLATE_HEADERS);
    const knownFieldAliasValues = new Set(Object.values(FIELD_ALIASES));
    const isHeaderRow = rawHeaders.some((h) => knownFields.has(h) || knownFieldAliasValues.has(h));

    let headers: string[];
    let dataLines: string[];

    if (isHeaderRow) {
      headers = rawHeaders;
      dataLines = lines.slice(1);
    } else {
      headers = FIXED_COLUMN_ORDER;
      dataLines = lines;
    }

    const parsed: ImportRow[] = dataLines.map((line, idx) => {
      const cells = line.split(delimiter);
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => {
        raw[h] = String(cells[i] ?? "").trim().replace(/^"|"$/g, "");
      });
      return validateRow(raw, idx + 1);
    });

    setPasteRows(parsed);
    setShowPastePreview(true);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (text) {
      setPasteText(text);
      parsePasteText(text);
    }
  };

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------
  const runImport = async (rows: ImportRow[]) => {
    if (!orgId) {
      toast({ title: "No organization", description: "Select an organization first.", variant: "destructive" });
      return;
    }
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (!validRows.length) return;

    setStage("importing");
    setImportProgress(0);
    setImportCounter({ current: 0, total: validRows.length });
    setImportResults([]);

    const results: ImportResult[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportCounter({ current: i + 1, total: validRows.length });
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));

      const ts = Date.now();
      try {
        const { error } = await supabase.from("employees").insert([{
          employee_number: `PS-${ts}-${i}`,
          first_name: row.first_name,
          last_name: row.last_name || null,
          email: row.personal_email || `ps.${ts}.${i}@placeholder.local`,
          personal_email: row.personal_email || null,
          phone: row.phone || null,
          gender: row.gender || null,
          date_of_birth: row.date_of_birth || null,
          national_id: row.national_id || null,
          nationality: row.nationality || null,
          citizenship: row.citizenship || null,
          tin: row.tin || null,
          nssf_number: row.nssf_number || null,
          passport_number: row.passport_number || null,
          marital_status: row.marital_status || null,
          pay_type: row.pay_type,
          pay_rate: Number(row.pay_rate) || 0,
          pay_frequency: row.pay_frequency || null,
          country: row.country,
          currency: row.currency || getCurrencyCodeFromCountryCode(row.country) || "USD",
          status: "active",
          employment_status: "Active",
          bank_name: row.bank_name || null,
          bank_branch: row.bank_branch || null,
          account_number: row.account_number || null,
          account_type: row.account_type || null,
          date_joined: row.date_joined || null,
          designation_id: row.designation || null,
          category: "projects",
          employee_type: row.employee_type,
          organization_id: orgId,
          project_id: selectedProjectId || null,
        }]);

        results.push({
          rowNumber: row.rowNumber,
          first_name: row.first_name,
          last_name: row.last_name,
          success: !error,
          error: error?.message,
        });
      } catch (e: any) {
        results.push({
          rowNumber: row.rowNumber,
          first_name: row.first_name,
          last_name: row.last_name,
          success: false,
          error: e?.message || "Unknown error",
        });
      }
    }

    setImportResults(results);
    setStage("done");

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    toast({
      title: "Import complete",
      description: `${succeeded} imported · ${failed} failed`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const resetState = () => {
    setXlsxRows([]);
    setXlsxFile(null);
    setPasteRows([]);
    setPasteText("");
    setShowPastePreview(false);
    setImportResults([]);
    setImportProgress(0);
    setImportCounter({ current: 0, total: 0 });
    setStage("idle");
  };

  // ---------------------------------------------------------------------------
  // Shared preview table
  // ---------------------------------------------------------------------------
  const PreviewTable = ({ rows }: { rows: ImportRow[] }) => {
    const validCount = rows.filter((r) => r.errors.length === 0).length;
    const errorCount = rows.length - validCount;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Badge className="bg-green-600 hover:bg-green-600 text-white">{validCount} rows ready</Badge>
          {errorCount > 0 && <Badge variant="destructive">{errorCount} rows with errors</Badge>}
        </div>
        <div className="border rounded-md max-h-72 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Row#</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Employee Type</TableHead>
                <TableHead>Pay Type</TableHead>
                <TableHead>Pay Rate</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowNumber} className={row.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell>{row.rowNumber}</TableCell>
                  <TableCell>{row.first_name || "-"}</TableCell>
                  <TableCell>{row.last_name || "-"}</TableCell>
                  <TableCell>{row.employee_type || "-"}</TableCell>
                  <TableCell>{row.pay_type || "-"}</TableCell>
                  <TableCell>{row.pay_rate || "-"}</TableCell>
                  <TableCell>{row.country || "-"}</TableCell>
                  <TableCell>
                    {row.errors.length === 0 ? (
                      <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Valid
                      </Badge>
                    ) : (
                      <div className="space-y-0.5">
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" /> Error
                        </Badge>
                        <p className="text-xs text-destructive">{row.errors.join("; ")}</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Import results card
  // ---------------------------------------------------------------------------
  if (stage === "done") {
    const succeeded = importResults.filter((r) => r.success).length;
    const failed = importResults.filter((r) => !r.success).length;
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b bg-background sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <HardHat className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-lg font-semibold truncate">Bulk Import — Project Staff</h1>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold text-green-700">{succeeded} Imported</span>
                </div>
                {failed > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-lg font-semibold text-destructive">{failed} Failed</span>
                  </div>
                )}
              </div>

              {failed > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Failed rows:</p>
                  <div className="border rounded-md overflow-auto max-h-60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults
                          .filter((r) => !r.success)
                          .map((r) => (
                            <TableRow key={r.rowNumber} className="bg-red-50 dark:bg-red-950/20">
                              <TableCell>{r.rowNumber}</TableCell>
                              <TableCell>{[r.first_name, r.last_name].filter(Boolean).join(" ") || "-"}</TableCell>
                              <TableCell className="text-xs text-destructive">{r.error}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetState}>Import More</Button>
                <Button onClick={() => navigate("/employees")}>View Employees</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main layout
  // ---------------------------------------------------------------------------
  const xlsxValidRows = xlsxRows.filter((r) => r.errors.length === 0);
  const pasteValidRows = pasteRows.filter((r) => r.errors.length === 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-background sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <HardHat className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-lg font-semibold truncate">Bulk Import — Project Staff</h1>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">

        {/* Project selector */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-48 max-w-sm space-y-1">
                <label className="text-sm font-medium">Project</label>
                {routeProjectId ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted text-sm">
                    <HardHat className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedProject ? `${selectedProject.name}${selectedProject.code ? ` (${selectedProject.code})` : ""}` : routeProjectId}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">Locked</Badge>
                  </div>
                ) : (
                  <SearchableSelect
                    options={projectOptions}
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                    placeholder="Search and select a project..."
                    emptyMessage="No projects found"
                  />
                )}
              </div>
              {selectedProject && (
                <div className="flex flex-wrap gap-2 text-xs pt-4">
                  {selectedProject.project_type && (
                    <Badge variant="outline">{selectedProject.project_type}</Badge>
                  )}
                  {selectedProject.country && (
                    <Badge variant="outline">{selectedProject.country}</Badge>
                  )}
                  {selectedProject.currency && (
                    <Badge variant="outline">{selectedProject.currency}</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Import methods tabs */}
        <Tabs defaultValue="excel">
          <TabsList className="mb-4">
            <TabsTrigger value="excel">
              <FileUp className="h-4 w-4 mr-2" />
              Excel / CSV Upload
            </TabsTrigger>
            <TabsTrigger value="paste">
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Paste from Spreadsheet
            </TabsTrigger>
          </TabsList>

          {/* ---------------------------------------------------------------- */}
          {/* Tab 1: Excel / CSV                                                */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="excel" className="space-y-5">

            {/* Step A: Download template */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Step A — Download Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Download the pre-filled template with sample rows and a Reference sheet showing valid values.
                  </p>
                  <Button variant="outline" onClick={downloadTemplate} className="shrink-0">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template (.xlsx)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step B: Upload & validate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Step B — Upload & Validate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop zone */}
                <div
                  className={[
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/20",
                  ].join(" ")}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Drag & drop your file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground">Accepts .xlsx, .xls, .csv</p>
                  {xlsxFile && (
                    <p className="mt-3 text-xs text-primary font-medium">{xlsxFile.name}</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </div>

                {/* Validation results */}
                {xlsxRows.length > 0 && <PreviewTable rows={xlsxRows} />}
              </CardContent>
            </Card>

            {/* Step C: Import */}
            {xlsxRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Step C — Import
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stage === "importing" && (
                    <div className="space-y-2">
                      <Progress value={importProgress} />
                      <p className="text-sm text-muted-foreground">
                        Importing {importCounter.current} of {importCounter.total}...
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      disabled={xlsxValidRows.length === 0 || stage === "importing"}
                      onClick={() => runImport(xlsxRows)}
                    >
                      {stage === "importing" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import {xlsxValidRows.length} Valid Row{xlsxValidRows.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                    {xlsxValidRows.length === 0 && xlsxRows.length > 0 && (
                      <Alert className="flex-1">
                        <AlertDescription className="text-sm">
                          All rows have validation errors. Fix the file and re-upload.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* Tab 2: Paste from spreadsheet                                    */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="paste" className="space-y-5">

            {/* Instructions */}
            <Alert>
              <AlertDescription className="space-y-3">
                <p className="text-sm">
                  Copy rows directly from Excel or Google Sheets (including the header row), then paste below.
                  Columns should be in this order:
                  <code className="ml-1 text-xs bg-muted px-1 py-0.5 rounded">
                    first_name, last_name, phone, employee_type, pay_type, pay_rate, country
                  </code>
                </p>
                {/* Example table */}
                <div className="overflow-auto rounded border bg-background">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-muted">
                        {["first_name", "last_name", "phone", "employee_type", "pay_type", "pay_rate", "country"].map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-semibold border-r last:border-r-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1 border-r">James</td>
                        <td className="px-2 py-1 border-r">Okello</td>
                        <td className="px-2 py-1 border-r">+256700123456</td>
                        <td className="px-2 py-1 border-r">manpower</td>
                        <td className="px-2 py-1 border-r">daily_rate</td>
                        <td className="px-2 py-1 border-r">35000</td>
                        <td className="px-2 py-1">UG</td>
                      </tr>
                      <tr className="bg-muted/30">
                        <td className="px-2 py-1 border-r">Mary</td>
                        <td className="px-2 py-1 border-r">Nakato</td>
                        <td className="px-2 py-1 border-r">+256772234567</td>
                        <td className="px-2 py-1 border-r">ippms</td>
                        <td className="px-2 py-1 border-r">piece_rate</td>
                        <td className="px-2 py-1 border-r">1200</td>
                        <td className="px-2 py-1">UG</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </AlertDescription>
            </Alert>

            {/* Paste area or preview */}
            {!showPastePreview ? (
              <Card>
                <CardContent className="pt-5">
                  <textarea
                    className="w-full min-h-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                    placeholder="Paste your spreadsheet data here (Ctrl+V / Cmd+V)..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    onPaste={handlePaste}
                  />
                  {pasteText && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => parsePasteText(pasteText)}>
                        Parse Pasted Data
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Preview ({pasteRows.length} rows detected)</p>
                    <Button variant="outline" size="sm" onClick={() => { setShowPastePreview(false); setPasteRows([]); }}>
                      Edit / Re-paste
                    </Button>
                  </div>
                  <PreviewTable rows={pasteRows} />
                </CardContent>
              </Card>
            )}

            {/* Import button */}
            {pasteRows.length > 0 && (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  {stage === "importing" && (
                    <div className="space-y-2">
                      <Progress value={importProgress} />
                      <p className="text-sm text-muted-foreground">
                        Importing {importCounter.current} of {importCounter.total}...
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      disabled={pasteValidRows.length === 0 || stage === "importing"}
                      onClick={() => runImport(pasteRows)}
                    >
                      {stage === "importing" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import {pasteValidRows.length} Valid Row{pasteValidRows.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                    {pasteValidRows.length === 0 && pasteRows.length > 0 && (
                      <Alert className="flex-1">
                        <AlertDescription className="text-sm">
                          All rows have validation errors. Fix the data and re-paste.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky bottom bar */}
      <div className="border-t bg-background px-6 py-3 flex items-center gap-3 sticky bottom-0 z-10">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Download, FileUp, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from '@/lib/auth/OrgProvider';
import { getCurrencyCodeFromCountryCode } from "@/lib/constants/countries";
import { ContractsService, type ContractTemplate } from "@/lib/data/contracts.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BulkImportEmployeesXlsxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeesAdded: () => void;
}

type EmployeePayType = "hourly" | "salary" | "piece_rate" | "daily_rate";

type TemplateProject = {
  id: string;
  name: string;
  code: string;
  status: string | null;
  project_type: string | null;
  supports_all_pay_types: boolean | null;
  allowed_pay_types: string[] | null;
  country?: string | null;
  currency?: string | null;
};

type ParsedImportRow = {
  rowNumber: number;
  data: {
    employee_number: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    gender: string;
    national_id: string;
    pay_type: string;
    pay_rate: string;
    project_code: string;
    employee_type: string;
    date_joined: string;
    country: string;
    currency: string;
    status: string;
  };
  errors: string[];
};

type ImportStage = "idle" | "validating" | "importing" | "done";

const REQUIRED_HEADERS = ["first_name", "email", "pay_type", "pay_rate"] as const;
const TEMPLATE_HEADERS = [
  "employee_number",
  "first_name",
  "last_name",
  "email",
  "phone",
  "gender",
  "national_id",
  "pay_type",
  "pay_rate",
  "project_code",
  "employee_type",
  "date_joined",
  "country",
  "currency",
  "status",
];
const VALID_PAY_TYPES: EmployeePayType[] = ["hourly", "salary", "piece_rate", "daily_rate"];
const VALID_EMPLOYEE_TYPES = ["regular", "manpower", "ippms", "expatriate", "interns", "contractor"];
const VALID_STATUS = ["active", "inactive"];

const normalizeHeader = (header: string) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, "_");

const parseExcelDate = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    const mm = String(date.m).padStart(2, "0");
    const dd = String(date.d).padStart(2, "0");
    return `${date.y}-${mm}-${dd}`;
  }
  const raw = String(value).trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toEmployeePayTypes = (project: TemplateProject): EmployeePayType[] => {
  if (project.supports_all_pay_types) return VALID_PAY_TYPES;
  const mapped = new Set<EmployeePayType>();
  const allowed = Array.isArray(project.allowed_pay_types) ? project.allowed_pay_types : [];
  allowed.forEach((payType) => {
    if (payType === "daily") mapped.add("daily_rate");
    if (payType === "monthly" || payType === "bi_weekly" || payType === "salary") mapped.add("salary");
    if (payType === "hourly") mapped.add("hourly");
    if (payType === "piece_rate") mapped.add("piece_rate");
    if (payType === "daily_rate") mapped.add("daily_rate");
  });
  return Array.from(mapped);
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const BulkImportEmployeesXlsxDialog = ({ open, onOpenChange, onEmployeesAdded }: BulkImportEmployeesXlsxDialogProps) => {
  const { toast } = useToast();
  const { organizationId, companyId } = useOrg();

  const [file, setFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<TemplateProject[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [stage, setStage] = useState<ImportStage>("idle");
  const [progress, setProgress] = useState(0);
  const [autoGenerateContracts, setAutoGenerateContracts] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [summary, setSummary] = useState({ createdEmployees: 0, createdContracts: 0, errors: 0 });

  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);

  useEffect(() => {
    if (!open) return;
    const loadReferences = async () => {
      const orgId = organizationId || localStorage.getItem("active_organization_id");
      if (!orgId) return;

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, code, status, project_type, supports_all_pay_types, allowed_pay_types")
        .eq("organization_id", orgId)
        .order("name");
      if (!projectsError) {
        setProjects((projectsData || []) as unknown as TemplateProject[]);
      }

      try {
        const templateData = await ContractsService.getTemplates(orgId);
        setTemplates(templateData);
      } catch {
        setTemplates([]);
      }
    };

    void loadReferences();
  }, [open, organizationId]);

  const handleFileFromDrop = (dropped: File | null) => {
    if (!dropped) return;
    if (!dropped.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Invalid file",
        description: "Please upload an .xlsx file.",
        variant: "destructive",
      });
      return;
    }
    setFile(dropped);
    setRows([]);
    setSummary({ createdEmployees: 0, createdContracts: 0, errors: 0 });
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sampleRows = [
      {
        employee_number: "EMP-1001",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "+256700000000",
        gender: "male",
        national_id: "CM1234567890",
        pay_type: "salary",
        pay_rate: 3500000,
        project_code: projects[0]?.code || "",
        employee_type: "regular",
        date_joined: "2026-02-01",
        country: "UG",
        currency: "UGX",
        status: "active",
      },
    ];
    const templateSheet = XLSX.utils.json_to_sheet(sampleRows, { header: TEMPLATE_HEADERS });
    XLSX.utils.book_append_sheet(workbook, templateSheet, "EmployeesTemplate");

    const referenceRows: Array<Record<string, string>> = [
      { group: "pay_type", value: "hourly", notes: "Allowed value" },
      { group: "pay_type", value: "salary", notes: "Allowed value" },
      { group: "pay_type", value: "piece_rate", notes: "Allowed value" },
      { group: "pay_type", value: "daily_rate", notes: "Allowed value" },
      { group: "employee_type", value: "regular", notes: "Default if blank" },
      { group: "employee_type", value: "manpower", notes: "Project-linked employees" },
      { group: "employee_type", value: "ippms", notes: "Project-linked employees" },
      { group: "employee_type", value: "expatriate", notes: "Project-linked employees" },
      { group: "status", value: "active", notes: "Default if blank" },
      { group: "status", value: "inactive", notes: "Allowed value" },
      { group: "country", value: "Use ISO code e.g. UG", notes: "Country code" },
    ];
    projects.forEach((project) => {
      referenceRows.push({
        group: "project_code",
        value: project.code,
        notes: `${project.name}${project.status === "active" ? "" : " (inactive)"}`,
      });
    });

    const referenceSheet = XLSX.utils.json_to_sheet(referenceRows, { header: ["group", "value", "notes"] });
    XLSX.utils.book_append_sheet(workbook, referenceSheet, "Reference");

    XLSX.writeFile(workbook, "employee_bulk_onboarding_template.xlsx");
  };

  const parseAndValidate = async () => {
    if (!file) return;
    const orgId = organizationId || localStorage.getItem("active_organization_id");
    if (!orgId) {
      toast({
        title: "Organization not found",
        description: "Select an organization and try again.",
        variant: "destructive",
      });
      return;
    }

    setStage("validating");
    setProgress(10);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("File does not contain any worksheet.");
      }
      const sheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (!jsonRows.length) {
        throw new Error("No data rows found in the uploaded file.");
      }

      const normalizedRows = jsonRows.map((row, index) => {
        const normalized: Record<string, string> = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[normalizeHeader(key)] = String(value ?? "").trim();
        });
        return {
          rowNumber: index + 2,
          normalized,
        };
      });

      const projectsByCode = new Map<string, TemplateProject>();
      projects.forEach((project) => {
        projectsByCode.set(project.code.toLowerCase(), project);
      });

      const emailIndex = new Map<string, number[]>();
      normalizedRows.forEach((row) => {
        const email = String(row.normalized.email || "").toLowerCase();
        if (!email) return;
        const existing = emailIndex.get(email) || [];
        existing.push(row.rowNumber);
        emailIndex.set(email, existing);
      });

      const emailCandidates = Array.from(
        new Set(
          normalizedRows
            .map((r) => String(r.normalized.email || "").trim())
            .filter(Boolean)
            .flatMap((email) => [email, email.toLowerCase()]),
        ),
      );
      let existingEmailSet = new Set<string>();
      if (emailCandidates.length > 0) {
        const { data: existingEmailsData } = await supabase
          .from("employees")
          .select("email")
          .eq("organization_id", orgId)
          .in("email", emailCandidates);
        existingEmailSet = new Set((existingEmailsData || []).map((item) => String(item.email || "").toLowerCase()));
      }

      setProgress(55);
      const parsedRows: ParsedImportRow[] = normalizedRows.map(({ rowNumber, normalized }) => {
        const payRateString = String(normalized.pay_rate || "");
        const payRate = Number(payRateString);
        const payType = String(normalized.pay_type || "").toLowerCase();
        const projectCode = String(normalized.project_code || "").trim();
        const project = projectCode ? projectsByCode.get(projectCode.toLowerCase()) : undefined;
        const employeeType = String(normalized.employee_type || "").toLowerCase();
        const joined = parseExcelDate(normalized.date_joined);

        const data = {
          employee_number: String(normalized.employee_number || "").trim(),
          first_name: String(normalized.first_name || "").trim(),
          last_name: String(normalized.last_name || "").trim(),
          email: String(normalized.email || "").trim(),
          phone: String(normalized.phone || "").trim(),
          gender: String(normalized.gender || "").trim(),
          national_id: String(normalized.national_id || "").trim(),
          pay_type: payType,
          pay_rate: payRateString,
          project_code: projectCode,
          employee_type: employeeType || "regular",
          date_joined: joined,
          country: String(normalized.country || "").trim().toUpperCase(),
          currency: String(normalized.currency || "").trim().toUpperCase(),
          status: String(normalized.status || "").trim().toLowerCase() || "active",
        };

        const errors: string[] = [];

        REQUIRED_HEADERS.forEach((field) => {
          if (!String(data[field] || "").trim()) {
            errors.push(`${field} is required`);
          }
        });

        if (data.pay_rate && (!Number.isFinite(payRate) || payRate <= 0)) {
          errors.push("pay_rate must be a positive number");
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push("email is invalid");
        }
        if (data.pay_type && !VALID_PAY_TYPES.includes(data.pay_type as EmployeePayType)) {
          errors.push(`pay_type must be one of: ${VALID_PAY_TYPES.join(", ")}`);
        }
        if (data.employee_type && !VALID_EMPLOYEE_TYPES.includes(data.employee_type)) {
          errors.push(`employee_type must be one of: ${VALID_EMPLOYEE_TYPES.join(", ")}`);
        }
        if (data.status && !VALID_STATUS.includes(data.status)) {
          errors.push("status must be active or inactive");
        }

        if (projectCode) {
          if (!project) {
            errors.push(`project_code "${projectCode}" was not found`);
          } else if (project.status !== "active") {
            errors.push(`project_code "${projectCode}" is not active`);
          } else {
            const allowedPayTypes = toEmployeePayTypes(project);
            if (allowedPayTypes.length > 0 && !allowedPayTypes.includes(data.pay_type as EmployeePayType)) {
              errors.push(`pay_type "${data.pay_type}" is not valid for project ${projectCode}`);
            }
          }
        }

        const emailLower = data.email.toLowerCase();
        if (emailLower && emailIndex.get(emailLower)?.length && (emailIndex.get(emailLower)?.length || 0) > 1) {
          errors.push("email is duplicated in this file");
        }
        if (emailLower && existingEmailSet.has(emailLower)) {
          errors.push("email already exists");
        }

        if (!data.currency && data.country) {
          data.currency = getCurrencyCodeFromCountryCode(data.country);
        }
        if (!data.country && project?.country) {
          data.country = project.country;
        }
        if (!data.currency && project?.currency) {
          data.currency = project.currency;
        }
        if (!data.country) {
          errors.push("country is required");
        }
        if (!data.currency) {
          errors.push("currency is required");
        }

        return { rowNumber, data, errors };
      });

      setRows(parsedRows);
      setProgress(100);
      setStage("idle");
    } catch (error) {
      setStage("idle");
      setProgress(0);
      const message = error instanceof Error ? error.message : "Unable to parse this file.";
      toast({
        title: "Validation failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const importValidRows = async () => {
    const orgId = organizationId || localStorage.getItem("active_organization_id");
    if (!orgId) return;
    if (!validRows.length) return;
    if (autoGenerateContracts && !selectedTemplateId) {
      toast({
        title: "Select a contract template",
        description: "Pick a template to auto-generate contracts.",
        variant: "destructive",
      });
      return;
    }

    setStage("importing");
    setProgress(10);
    try {
      const projectsByCode = new Map<string, TemplateProject>();
      projects.forEach((project) => projectsByCode.set(project.code.toLowerCase(), project));

      const employeesToInsert = validRows.map((row, index) => {
        const project = row.data.project_code ? projectsByCode.get(row.data.project_code.toLowerCase()) : undefined;
        const generatedNumber = `EMP-${Date.now()}-${index + 1}`;
        return {
          employee_number: row.data.employee_number || generatedNumber,
          first_name: row.data.first_name,
          last_name: row.data.last_name || null,
          email: row.data.email,
          phone: row.data.phone || null,
          gender: row.data.gender || null,
          national_id: row.data.national_id || null,
          pay_type: row.data.pay_type as EmployeePayType,
          pay_rate: Number(row.data.pay_rate),
          project_id: project?.id || null,
          category: project ? "projects" : "head_office",
          employee_type: row.data.employee_type || "regular",
          date_joined: row.data.date_joined || null,
          country: row.data.country,
          currency: row.data.currency,
          status: row.data.status || "active",
          organization_id: orgId,
          company_id: companyId || null,
        };
      });

      const { data: insertedEmployees, error: insertError } = await supabase
        .from("employees")
        .insert(employeesToInsert)
        .select("id, first_name, last_name, employee_number, email, pay_rate, pay_type, currency, date_joined");
      if (insertError) throw insertError;

      let contractsCreated = 0;
      setProgress(60);

      if (autoGenerateContracts && selectedTemplateId && insertedEmployees && insertedEmployees.length > 0) {
        const template = templates.find((item) => item.id === selectedTemplateId) || null;
        const contractRows = insertedEmployees.map((employee) => {
          const values: Record<string, string> = {
            employee_name: [employee.first_name, employee.last_name].filter(Boolean).join(" "),
            employee_email: employee.email || "",
            employee_number: employee.employee_number || "",
            pay_rate: String(employee.pay_rate || ""),
            pay_type: String(employee.pay_type || ""),
            currency: String(employee.currency || ""),
            start_date: employee.date_joined || "",
            end_date: "",
            date_today: new Date().toLocaleDateString(),
          };
          const bodyHtml = template ? ContractsService.renderTemplate(template.body_html, values) : null;

          return {
            organization_id: orgId,
            employee_id: employee.id,
            template_id: selectedTemplateId,
            status: "draft",
            start_date: employee.date_joined || null,
            end_date: null,
            auto_renew: false,
            salary_snapshot: {
              pay_rate: employee.pay_rate,
              pay_type: employee.pay_type,
              currency: employee.currency,
            },
            body_html: bodyHtml,
          };
        });

        for (const batch of chunk(contractRows, 100)) {
          const { error: contractError } = await supabase.from("employee_contracts").insert(batch);
          if (contractError) throw contractError;
          contractsCreated += batch.length;
        }
      }

      const createdEmployeesCount = insertedEmployees?.length || 0;
      setSummary({
        createdEmployees: createdEmployeesCount,
        createdContracts: contractsCreated,
        errors: rows.length - validRows.length,
      });
      setProgress(100);
      setStage("done");

      toast({
        title: "Bulk import completed",
        description: `${createdEmployeesCount} employees created, ${contractsCreated} contracts generated, ${rows.length - validRows.length} rows skipped.`,
      });
      onEmployeesAdded();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setStage("idle");
      setProgress(0);
      toast({
        title: "Import failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Staff Onboarding (XLSX)</DialogTitle>
          <DialogDescription>
            Download the template, upload completed rows, review validation, then import valid employees in batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Template columns include first_name, last_name, email, pay_type, pay_rate, project_code, employee_type, date_joined and more.
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download XLSX Template
                </Button>
              </div>
            </CardContent>
          </Card>

          <div
            className="rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0] || null;
              handleFileFromDrop(dropped);
            }}
          >
            <FileUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm mb-3">Drag and drop your `.xlsx` file here, or choose a file.</p>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => handleFileFromDrop(e.target.files?.[0] || null)}
              className="text-sm"
            />
            {file && <p className="mt-2 text-xs text-muted-foreground">Selected: {file.name}</p>}
            <div className="mt-3">
              <Button onClick={parseAndValidate} disabled={!file || stage === "validating" || stage === "importing"}>
                {stage === "validating" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Validate File
                  </>
                )}
              </Button>
            </div>
          </div>

          {(stage === "validating" || stage === "importing" || stage === "done") && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {stage === "validating" && "Validating rows..."}
                {stage === "importing" && "Importing valid rows and generating contracts..."}
                {stage === "done" && "Import completed."}
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="default">{validRows.length} valid</Badge>
                  <Badge variant="destructive">{rows.length - validRows.length} with errors</Badge>
                </div>

                <div className="border rounded-md max-h-[280px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Validation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>{[row.data.first_name, row.data.last_name].filter(Boolean).join(" ") || "-"}</TableCell>
                          <TableCell>{row.data.email || "-"}</TableCell>
                          <TableCell>{row.data.project_code || "-"}</TableCell>
                          <TableCell>
                            {row.errors.length === 0 ? (
                              <Badge className="bg-green-600 hover:bg-green-600">Valid</Badge>
                            ) : (
                              <Badge variant="destructive">Invalid</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.errors.length === 0 ? (
                              <span className="text-green-700">Ready to import</span>
                            ) : (
                              row.errors.join("; ")
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 rounded-md border p-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-generate-contracts"
                      checked={autoGenerateContracts}
                      onCheckedChange={(checked) => setAutoGenerateContracts(checked === true)}
                    />
                    <Label htmlFor="auto-generate-contracts">Auto-generate contracts for imported employees</Label>
                  </div>

                  {autoGenerateContracts && (
                    <div className="max-w-md space-y-2">
                      <Label>Contract template</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={importValidRows}
                    disabled={validRows.length === 0 || stage === "importing" || (autoGenerateContracts && !selectedTemplateId)}
                  >
                    {stage === "importing" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import Valid Rows"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {stage === "done" && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm">
                  Summary: <strong>{summary.createdEmployees}</strong> employees created,{" "}
                  <strong>{summary.createdContracts}</strong> contracts generated, <strong>{summary.errors}</strong> rows had validation errors.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportEmployeesXlsxDialog;

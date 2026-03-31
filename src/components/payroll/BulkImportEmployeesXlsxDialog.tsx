import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
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
    // Core
    employee_number: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    personal_email: string;
    phone: string;
    work_phone: string;
    // Personal
    gender: string;
    date_of_birth: string;
    nationality: string;
    citizenship: string;
    // Identity docs
    national_id: string;
    passport_number: string;
    tin: string;
    nssf_number: string;
    social_security_number: string;
    // Job / org
    designation: string;
    sub_department: string;
    work_location: string;
    employee_type: string;
    employee_category: string;
    engagement_type: string;
    date_joined: string;
    // Pay
    pay_type: string;
    pay_rate: string;
    pay_frequency: string;
    pay_group_name: string;
    country: string;
    currency: string;
    status: string;
    // Project linkage
    project_code: string;
    // Bank
    bank_name: string;
    bank_branch: string;
    account_number: string;
    account_type: string;
  };
  errors: string[];
};

type ImportStage = "idle" | "validating" | "importing" | "done";

const REQUIRED_HEADERS = ["first_name", "email", "pay_type", "pay_rate", "country", "employee_type"] as const;
const TEMPLATE_HEADERS = [
  // Core identity
  "Employee Number",
  "First Name",
  "Middle Name",
  "Last Name",
  "Email",
  "Personal Email",
  "Phone",
  "Work Phone",
  // Personal
  "Gender",
  "Date of Birth",
  "Nationality",
  "Citizenship",
  // Identity docs
  "National ID",
  "Passport Number",
  "TIN",
  "NSSF Number",
  "Social Security Number",
  // Job / org
  "Designation",
  "Sub Department",
  "Work Location",
  "Employee Type",
  "Employee Category",
  "Engagement Type",
  "Date Joined",
  // Pay
  "Pay Type",
  "Pay Rate",
  "Pay Frequency",
  "Pay Group Name",
  "Country",
  "Currency",
  "Status",
  // Project
  "Project Code",
  // Bank
  "Bank Name",
  "Bank Branch",
  "Account Number",
  "Account Type",
];
const VALID_PAY_TYPES: EmployeePayType[] = ["hourly", "salary", "piece_rate", "daily_rate"];
const VALID_EMPLOYEE_TYPES = ["regular", "manpower", "ippms", "expatriate", "interns", "contractor"];
const VALID_EMPLOYEE_CATEGORIES = ["Intern", "Trainee", "Temporary", "Permanent", "On Contract", "Casual"];
const VALID_ENGAGEMENT_TYPES = ["Permanent", "Contract", "Temporary", "Casual", "Trainee", "Intern"];
const VALID_PAY_FREQUENCIES = ["daily", "bi_weekly", "monthly"];
const VALID_GENDERS = ["Male", "Female", "Other"];
const VALID_ACCOUNT_TYPES = ["savings", "current", "mobile_money"];
const VALID_STATUS = ["active", "inactive"];

const FIELD_LABELS: Record<string, string> = {
  employee_number:        "Employee Number",
  first_name:             "First Name",
  middle_name:            "Middle Name",
  last_name:              "Last Name",
  email:                  "Email",
  personal_email:         "Personal Email",
  phone:                  "Phone",
  work_phone:             "Work Phone",
  gender:                 "Gender",
  date_of_birth:          "Date of Birth",
  nationality:            "Nationality",
  citizenship:            "Citizenship",
  national_id:            "National ID",
  passport_number:        "Passport Number",
  tin:                    "TIN",
  nssf_number:            "NSSF Number",
  social_security_number: "Social Security Number",
  designation:            "Designation",
  sub_department:         "Sub Department",
  work_location:          "Work Location",
  employee_type:          "Employee Type",
  employee_category:      "Employee Category",
  engagement_type:        "Engagement Type",
  date_joined:            "Date Joined",
  pay_type:               "Pay Type",
  pay_rate:               "Pay Rate",
  pay_frequency:          "Pay Frequency",
  pay_group_name:         "Pay Group Name",
  country:                "Country",
  currency:               "Currency",
  status:                 "Status",
  project_code:           "Project Code",
  bank_name:              "Bank Name",
  bank_branch:            "Bank Branch",
  account_number:         "Account Number",
  account_type:           "Account Type",
};

const normalizeHeader = (header: string) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, "_");

/** Convert 0-based column index to Excel letter (A, B, … Z, AA, AB …) */
const colLetter = (idx: number): string => {
  let s = "";
  let n = idx + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/**
 * Try to match `value` to one of `validValues` with fuzzy tolerance:
 * 1. Exact match  2. Case-insensitive  3. Separator-normalised (spaces/dashes → underscores)
 * Returns the canonical valid value on match, null otherwise.
 */
const normalizeEnum = (value: string, validValues: string[]): string | null => {
  if (!value) return null;
  if (validValues.includes(value)) return value;
  const lower = value.toLowerCase();
  const exact = validValues.find(v => v.toLowerCase() === lower);
  if (exact) return exact;
  const norm = lower.replace(/[\s-]+/g, "_");
  return validValues.find(v => v.toLowerCase().replace(/[\s-]+/g, "_") === norm) ?? null;
};

/** Build an enum validation error with a "did you mean?" hint when possible. */
const enumError = (field: string, raw: string, validValues: string[]): string => {
  const norm = raw.toLowerCase().replace(/[\s_-]+/g, "");
  const suggestion = validValues.find(v => {
    const vn = v.toLowerCase().replace(/[\s_-]+/g, "");
    return vn.startsWith(norm.slice(0, 4)) || norm.startsWith(vn.slice(0, 4));
  });
  const base = `${field} "${raw}" is not valid`;
  return suggestion
    ? `${base} — did you mean "${suggestion}"? Valid: ${validValues.join(", ")}`
    : `${base} — valid values: ${validValues.join(", ")}`;
};

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
  const [payGroups, setPayGroups] = useState<{ id: string; name: string }[]>([]);
  const [orgDepts, setOrgDepts] = useState<string[]>([]);
  const [orgDesignations, setOrgDesignations] = useState<string[]>([]);
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

      // Pay groups (org-scoped — name shown in template, UUID resolved on import)
      const { data: pgData } = await supabase
        .from("pay_groups")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name");
      setPayGroups((pgData || []) as { id: string; name: string }[]);

      // Org departments (for sub_department dropdown)
      const { data: deptData } = await supabase
        .from("org_departments")
        .select("name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      setOrgDepts((deptData || []).map(d => d.name));

      // Designations
      const { data: desigData } = await supabase
        .from("designations")
        .select("name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      setOrgDesignations((desigData || []).map(d => d.name));
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

  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const payGroupNames = payGroups.map(pg => pg.name);
    const activeProjects = projects.filter(p => p.status === "active");

    // ── Hidden _Lists sheet for org-specific dropdown data ──────────────────
    const listsSheet = wb.addWorksheet("_Lists", { state: "hidden" });
    payGroupNames.forEach((n, i) => { listsSheet.getCell(i + 1, 1).value = n; });
    orgDepts.forEach((n, i)        => { listsSheet.getCell(i + 1, 2).value = n; });
    orgDesignations.forEach((n, i) => { listsSheet.getCell(i + 1, 3).value = n; });
    activeProjects.forEach((p, i)  => { listsSheet.getCell(i + 1, 4).value = p.code; });

    // ── Sheet 1: Field Guide ─────────────────────────────────────────────────
    const guideSheet = wb.addWorksheet("Field Guide");
    guideSheet.columns = [
      { header: "Column Name",  key: "field",        width: 24 },
      { header: "Required",     key: "required",     width: 14 },
      { header: "Description",  key: "description",  width: 52 },
      { header: "Valid Values", key: "valid_values", width: 58 },
    ];
    guideSheet.getRow(1).font = { bold: true };
    guideSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    const requiredGuideRows = [
      { field: "First Name",    required: "★ REQUIRED", description: "Employee first name",                         valid_values: "" },
      { field: "Email",         required: "★ REQUIRED", description: "Work email — must be unique within this org", valid_values: "" },
      { field: "Employee Type", required: "★ REQUIRED", description: "Employment classification",                   valid_values: VALID_EMPLOYEE_TYPES.join(", ") },
      { field: "Pay Type",      required: "★ REQUIRED", description: "Payment method",                              valid_values: VALID_PAY_TYPES.join(", ") },
      { field: "Pay Rate",      required: "★ REQUIRED", description: "Pay amount — positive number",                valid_values: "" },
      { field: "Country",       required: "★ REQUIRED", description: "Country ISO code",                            valid_values: "UG, KE, TZ, SS, RW" },
    ];
    const optionalGuideRows = [
      { field: "Employee Number",        required: "optional", description: "Leave blank to auto-generate",                         valid_values: "" },
      { field: "Middle Name",            required: "optional", description: "Middle name",                                          valid_values: "" },
      { field: "Last Name",              required: "optional", description: "Last name",                                            valid_values: "" },
      { field: "Personal Email",         required: "optional", description: "Personal email address",                               valid_values: "" },
      { field: "Phone",                  required: "optional", description: "Phone with country code",                              valid_values: "" },
      { field: "Work Phone",             required: "optional", description: "Work phone number",                                    valid_values: "" },
      { field: "Gender",                 required: "optional", description: "Employee gender",                                      valid_values: VALID_GENDERS.join(", ") },
      { field: "Date of Birth",          required: "optional", description: "Date of birth — YYYY-MM-DD",                          valid_values: "" },
      { field: "Nationality",            required: "optional", description: "Nationality (e.g. Ugandan)",                          valid_values: "" },
      { field: "Citizenship",            required: "optional", description: "Citizenship",                                         valid_values: "" },
      { field: "National ID",            required: "optional", description: "National ID number",                                   valid_values: "" },
      { field: "Passport Number",        required: "optional", description: "Passport number",                                      valid_values: "" },
      { field: "TIN",                    required: "optional", description: "Tax Identification Number",                            valid_values: "" },
      { field: "NSSF Number",            required: "optional", description: "NSSF / pension fund number",                           valid_values: "" },
      { field: "Social Security Number", required: "optional", description: "Social security number",                               valid_values: "" },
      { field: "Designation",            required: "optional", description: "Job title / role",                                     valid_values: orgDesignations.join(", ") || "e.g. Engineer, Accountant" },
      { field: "Sub Department",         required: "optional", description: "Department / unit",                                    valid_values: orgDepts.join(", ") || "e.g. Finance, Operations" },
      { field: "Work Location",          required: "optional", description: "Primary work location",                                valid_values: "" },
      { field: "Employee Category",      required: "optional", description: "Employee category",                                    valid_values: VALID_EMPLOYEE_CATEGORIES.join(", ") },
      { field: "Engagement Type",        required: "optional", description: "Engagement type",                                      valid_values: VALID_ENGAGEMENT_TYPES.join(", ") },
      { field: "Date Joined",            required: "optional", description: "Date joined — YYYY-MM-DD",                             valid_values: "" },
      { field: "Pay Frequency",          required: "optional", description: "How often the employee is paid",                       valid_values: VALID_PAY_FREQUENCIES.join(", ") },
      { field: "Pay Group Name",         required: "optional", description: "Pay group — see Reference sheet",                      valid_values: payGroupNames.join(", ") || "Leave blank if not applicable" },
      { field: "Currency",               required: "optional", description: "Currency code — auto-detected from country if blank",  valid_values: "UGX, KES, TZS, SSP, RWF" },
      { field: "Status",                 required: "optional", description: "Employment status — defaults to active",               valid_values: VALID_STATUS.join(", ") },
      { field: "Project Code",           required: "optional", description: "Project code — see Reference sheet",                   valid_values: activeProjects.map(p => p.code).join(", ") || "" },
      { field: "Bank Name",              required: "optional", description: "Bank name",                                            valid_values: "" },
      { field: "Bank Branch",            required: "optional", description: "Bank branch",                                          valid_values: "" },
      { field: "Account Number",         required: "optional", description: "Bank account number",                                  valid_values: "" },
      { field: "Account Type",           required: "optional", description: "Bank account type",                                    valid_values: VALID_ACCOUNT_TYPES.join(", ") },
    ];

    [...requiredGuideRows, ...optionalGuideRows].forEach(rowData => {
      const row = guideSheet.addRow(rowData);
      if (rowData.required === "★ REQUIRED") {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } };
        });
      }
    });

    // ── Sheet 2: Import Data ─────────────────────────────────────────────────
    const dataSheet = wb.addWorksheet("Import Data");
    dataSheet.columns = TEMPLATE_HEADERS.map(h => ({ header: h, key: h, width: 22 }));
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    dataSheet.addRow({
      "Employee Number":        "EMP-1001",
      "First Name":             "John",
      "Middle Name":            "",
      "Last Name":              "Doe",
      "Email":                  "john.doe@example.com",
      "Personal Email":         "",
      "Phone":                  "+256700000000",
      "Work Phone":             "",
      "Gender":                 "Male",
      "Date of Birth":          "1990-05-15",
      "Nationality":            "Ugandan",
      "Citizenship":            "Ugandan",
      "National ID":            "CM1234567890",
      "Passport Number":        "",
      "TIN":                    "",
      "NSSF Number":            "",
      "Social Security Number": "",
      "Designation":            orgDesignations[0] || "Technician",
      "Sub Department":         orgDepts[0] || "",
      "Work Location":          "Kampala",
      "Employee Type":          "regular",
      "Employee Category":      "Permanent",
      "Engagement Type":        "Permanent",
      "Date Joined":            "2026-02-01",
      "Pay Type":               "salary",
      "Pay Rate":               3500000,
      "Pay Frequency":          "monthly",
      "Pay Group Name":         payGroupNames[0] || "",
      "Country":                "UG",
      "Currency":               "UGX",
      "Status":                 "active",
      "Project Code":           activeProjects[0]?.code || "",
      "Bank Name":              "Stanbic Bank",
      "Bank Branch":            "Kampala",
      "Account Number":         "9030012345678",
      "Account Type":           "savings",
    });

    // ── Dropdown validations ─────────────────────────────────────────────────
    const addDropdown = (colHeader: string, formulae: string[], promptText: string) => {
      const colIdx = TEMPLATE_HEADERS.indexOf(colHeader) + 1; // 1-based
      if (colIdx < 1) return;
      for (let r = 2; r <= 100; r++) {
        dataSheet.getCell(r, colIdx).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae,
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "Invalid value",
          error: `Please select from the list: ${promptText}`,
          showInputMessage: true,
          promptTitle: "Valid values",
          prompt: promptText,
        };
      }
    };

    // Static enum dropdowns (inline formulae)
    addDropdown("Employee Type",     [`"${VALID_EMPLOYEE_TYPES.join(",")}"`],     VALID_EMPLOYEE_TYPES.join(", "));
    addDropdown("Pay Type",          [`"${VALID_PAY_TYPES.join(",")}"`],          VALID_PAY_TYPES.join(", "));
    addDropdown("Gender",            [`"${VALID_GENDERS.join(",")}"`],            VALID_GENDERS.join(", "));
    addDropdown("Employee Category", [`"${VALID_EMPLOYEE_CATEGORIES.join(",")}"`],VALID_EMPLOYEE_CATEGORIES.join(", "));
    addDropdown("Engagement Type",   [`"${VALID_ENGAGEMENT_TYPES.join(",")}"`],   VALID_ENGAGEMENT_TYPES.join(", "));
    addDropdown("Pay Frequency",     [`"${VALID_PAY_FREQUENCIES.join(",")}"`],    VALID_PAY_FREQUENCIES.join(", "));
    addDropdown("Account Type",      [`"${VALID_ACCOUNT_TYPES.join(",")}"`],      VALID_ACCOUNT_TYPES.join(", "));
    addDropdown("Status",            [`"${VALID_STATUS.join(",")}"`],             VALID_STATUS.join(", "));

    // Org-specific dropdowns — reference hidden _Lists sheet
    if (payGroupNames.length > 0)
      addDropdown("Pay Group Name", [`'_Lists'!$A$1:$A$${payGroupNames.length}`], payGroupNames.join(", "));
    if (orgDepts.length > 0)
      addDropdown("Sub Department", [`'_Lists'!$B$1:$B$${orgDepts.length}`], orgDepts.join(", "));
    if (orgDesignations.length > 0)
      addDropdown("Designation",    [`'_Lists'!$C$1:$C$${orgDesignations.length}`], orgDesignations.join(", "));
    if (activeProjects.length > 0)
      addDropdown("Project Code",   [`'_Lists'!$D$1:$D$${activeProjects.length}`], activeProjects.map(p => p.code).join(", "));

    // ── Sheet 3: Reference ───────────────────────────────────────────────────
    const refSheet = wb.addWorksheet("Reference");
    refSheet.columns = [
      { header: "Group", key: "group", width: 22 },
      { header: "Value", key: "value", width: 30 },
      { header: "Notes", key: "notes", width: 30 },
    ];
    refSheet.getRow(1).font = { bold: true };
    refSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    const refRows = [
      { group: "★ Required Fields", value: "First Name",    notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Email",         notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Pay Type",      notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Pay Rate",      notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Country",       notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Employee Type", notes: "REQUIRED" },
      ...VALID_PAY_TYPES.map(v          => ({ group: "Pay Type",          value: v, notes: "Allowed" })),
      ...VALID_EMPLOYEE_TYPES.map(v     => ({ group: "Employee Type",     value: v, notes: "Allowed" })),
      ...VALID_EMPLOYEE_CATEGORIES.map(v=> ({ group: "Employee Category", value: v, notes: "Allowed" })),
      ...VALID_ENGAGEMENT_TYPES.map(v   => ({ group: "Engagement Type",   value: v, notes: "Allowed" })),
      ...VALID_PAY_FREQUENCIES.map(v    => ({ group: "Pay Frequency",     value: v, notes: "Allowed" })),
      ...VALID_GENDERS.map(v            => ({ group: "Gender",            value: v, notes: "Allowed" })),
      ...VALID_ACCOUNT_TYPES.map(v      => ({ group: "Account Type",      value: v, notes: "Allowed" })),
      ...VALID_STATUS.map(v             => ({ group: "Status",            value: v, notes: "Allowed" })),
      { group: "Country", value: "UG", notes: "Uganda" },
      { group: "Country", value: "KE", notes: "Kenya" },
      { group: "Country", value: "TZ", notes: "Tanzania" },
      { group: "Country", value: "SS", notes: "South Sudan" },
      { group: "Country", value: "RW", notes: "Rwanda" },
      ...payGroups.map(pg      => ({ group: "Pay Group Name", value: pg.name, notes: "Your org's pay group" })),
      ...orgDepts.map(d        => ({ group: "Sub Department", value: d,       notes: "Your org's department" })),
      ...orgDesignations.map(d => ({ group: "Designation",   value: d,       notes: "Your org's designation" })),
      ...activeProjects.map(p  => ({ group: "Project Code",  value: p.code,  notes: p.name })),
    ];
    refRows.forEach(r => refSheet.addRow(r));

    // ── Download ─────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_bulk_import_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
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
      // Prefer the named data sheet; fall back to first sheet that isn't the guide or reference
      const importSheetName =
        workbook.SheetNames.find(n => n === "Import Data") ??
        workbook.SheetNames.find(n => !["Field Guide", "Reference"].includes(n)) ??
        workbook.SheetNames[0];
      if (!importSheetName) {
        throw new Error("File does not contain any worksheet.");
      }
      const sheet = workbook.Sheets[importSheetName];
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
        const rawPayType = String(normalized.pay_type || "").trim();
        const payType = normalizeEnum(rawPayType, VALID_PAY_TYPES) ?? rawPayType.toLowerCase();
        const projectCode = String(normalized.project_code || "").trim();
        const project = projectCode ? projectsByCode.get(projectCode.toLowerCase()) : undefined;
        const rawEmployeeType = String(normalized.employee_type || "").trim();
        const employeeType = normalizeEnum(rawEmployeeType, VALID_EMPLOYEE_TYPES) ?? rawEmployeeType.toLowerCase();
        const rawGender = String(normalized.gender || "").trim();
        const gender = normalizeEnum(rawGender, VALID_GENDERS) ?? rawGender;
        const rawCategory = String(normalized.employee_category || "").trim();
        const employeeCategory = normalizeEnum(rawCategory, VALID_EMPLOYEE_CATEGORIES) ?? rawCategory;
        const rawEngagement = String(normalized.engagement_type || "").trim();
        const engagementType = normalizeEnum(rawEngagement, VALID_ENGAGEMENT_TYPES) ?? rawEngagement;
        const rawFrequency = String(normalized.pay_frequency || "").trim();
        const payFrequency = normalizeEnum(rawFrequency, VALID_PAY_FREQUENCIES) ?? rawFrequency.toLowerCase();
        const rawAccountType = String(normalized.account_type || "").trim();
        const accountType = normalizeEnum(rawAccountType, VALID_ACCOUNT_TYPES) ?? rawAccountType.toLowerCase();
        const rawStatus = String(normalized.status || "").trim();
        const status = normalizeEnum(rawStatus, VALID_STATUS) ?? rawStatus.toLowerCase();
        const joined = parseExcelDate(normalized.date_joined);
        const dob = parseExcelDate(normalized.date_of_birth);

        const data = {
          // Core identity
          employee_number: String(normalized.employee_number || "").trim(),
          first_name: String(normalized.first_name || "").trim(),
          middle_name: String(normalized.middle_name || "").trim(),
          last_name: String(normalized.last_name || "").trim(),
          email: String(normalized.email || "").trim(),
          personal_email: String(normalized.personal_email || "").trim(),
          phone: String(normalized.phone || "").trim(),
          work_phone: String(normalized.work_phone || "").trim(),
          // Personal
          gender,
          date_of_birth: dob,
          nationality: String(normalized.nationality || "").trim(),
          citizenship: String(normalized.citizenship || "").trim(),
          // Identity docs
          national_id: String(normalized.national_id || "").trim(),
          passport_number: String(normalized.passport_number || "").trim(),
          tin: String(normalized.tin || "").trim(),
          nssf_number: String(normalized.nssf_number || "").trim(),
          social_security_number: String(normalized.social_security_number || "").trim(),
          // Job / org
          designation: String(normalized.designation || "").trim(),
          sub_department: String(normalized.sub_department || "").trim(),
          work_location: String(normalized.work_location || "").trim(),
          employee_type: employeeType || "regular",
          employee_category: employeeCategory,
          engagement_type: engagementType,
          date_joined: joined,
          // Pay
          pay_type: payType,
          pay_rate: payRateString,
          pay_frequency: payFrequency,
          pay_group_name: String(normalized.pay_group_name || "").trim(),
          country: String(normalized.country || "").trim().toUpperCase(),
          currency: String(normalized.currency || "").trim().toUpperCase(),
          status: status || "active",
          // Project
          project_code: projectCode,
          // Bank
          bank_name: String(normalized.bank_name || "").trim(),
          bank_branch: String(normalized.bank_branch || "").trim(),
          account_number: String(normalized.account_number || "").trim(),
          account_type: accountType,
        };

        const errors: string[] = [];

        REQUIRED_HEADERS.forEach((field) => {
          if (!String(data[field] || "").trim()) {
            errors.push(`${FIELD_LABELS[field] || field} is required`);
          }
        });

        if (data.pay_rate && (!Number.isFinite(payRate) || payRate <= 0)) {
          errors.push("pay_rate must be a positive number");
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push("email is invalid");
        }
        if (data.pay_type && !VALID_PAY_TYPES.includes(data.pay_type as EmployeePayType)) {
          errors.push(enumError("Pay Type", rawPayType, VALID_PAY_TYPES));
        }
        if (data.employee_type && !VALID_EMPLOYEE_TYPES.includes(data.employee_type)) {
          errors.push(enumError("Employee Type", rawEmployeeType, VALID_EMPLOYEE_TYPES));
        }
        if (data.status && !VALID_STATUS.includes(data.status)) {
          errors.push(enumError("Status", rawStatus, VALID_STATUS));
        }
        if (data.gender && !VALID_GENDERS.includes(data.gender)) {
          errors.push(enumError("Gender", rawGender, VALID_GENDERS));
        }
        if (data.employee_category && !VALID_EMPLOYEE_CATEGORIES.includes(data.employee_category)) {
          errors.push(enumError("Employee Category", rawCategory, VALID_EMPLOYEE_CATEGORIES));
        }
        if (data.engagement_type && !VALID_ENGAGEMENT_TYPES.includes(data.engagement_type)) {
          errors.push(enumError("Engagement Type", rawEngagement, VALID_ENGAGEMENT_TYPES));
        }
        if (data.pay_frequency && !VALID_PAY_FREQUENCIES.includes(data.pay_frequency)) {
          errors.push(enumError("Pay Frequency", rawFrequency, VALID_PAY_FREQUENCIES));
        }
        if (data.account_type && !VALID_ACCOUNT_TYPES.includes(data.account_type)) {
          errors.push(enumError("Account Type", rawAccountType, VALID_ACCOUNT_TYPES));
        }
        // Date format validation — flag if a value was provided but couldn't be parsed
        if (String(normalized.date_of_birth || "").trim() && !data.date_of_birth) {
          errors.push("date_of_birth is invalid — use YYYY-MM-DD or a recognisable date format");
        }
        if (String(normalized.date_joined || "").trim() && !data.date_joined) {
          errors.push("date_joined is invalid — use YYYY-MM-DD or a recognisable date format");
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
          // Core identity
          employee_number: row.data.employee_number || generatedNumber,
          first_name: row.data.first_name,
          middle_name: row.data.middle_name || null,
          last_name: row.data.last_name || null,
          email: row.data.email,
          personal_email: row.data.personal_email || null,
          phone: row.data.phone || null,
          work_phone: row.data.work_phone || null,
          // Personal
          gender: row.data.gender || null,
          date_of_birth: row.data.date_of_birth || null,
          nationality: row.data.nationality || null,
          citizenship: row.data.citizenship || null,
          // Identity docs
          national_id: row.data.national_id || null,
          passport_number: row.data.passport_number || null,
          tin: row.data.tin || null,
          nssf_number: row.data.nssf_number || null,
          social_security_number: row.data.social_security_number || null,
          // Job / org
          designation: row.data.designation || null,
          sub_department: row.data.sub_department || null,
          work_location: row.data.work_location || null,
          employee_type: row.data.employee_type || "regular",
          employee_category: row.data.employee_category || null,
          engagement_type: row.data.engagement_type || null,
          date_joined: row.data.date_joined || null,
          // Pay
          pay_type: row.data.pay_type as EmployeePayType,
          pay_rate: Number(row.data.pay_rate),
          pay_frequency: row.data.pay_frequency || null,
          pay_group_id: payGroups.find(pg =>
            pg.name.toLowerCase() === (row.data.pay_group_name || "").toLowerCase()
          )?.id || null,
          country: row.data.country,
          currency: row.data.currency,
          status: row.data.status || "active",
          // Project linkage
          project_id: project?.id || null,
          category: project ? "projects" : "head_office",
          // Bank
          bank_name: row.data.bank_name || null,
          bank_branch: row.data.bank_branch || null,
          account_number: row.data.account_number || null,
          account_type: row.data.account_type || null,
          // Multi-tenancy
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
                <Button variant="outline" onClick={() => downloadTemplate().catch(console.error)}>
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

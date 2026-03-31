// @ts-nocheck
import { useState, useRef, useEffect } from "react";
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
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContractsService } from "@/lib/data/contracts.service";
import { AllowancesSection, AllowanceItem, DEFAULT_ALLOWANCES, serializeAllowances } from "@/components/employees/AllowancesSection";
import { useActiveProjects } from "@/hooks/useActiveProjects";

interface BulkRow {
  // Required
  first_name: string;
  last_name: string;
  email: string;
  employee_type: string;
  pay_type: string;
  pay_rate: number;
  country: string;
  // Optional identity
  employee_number?: string;
  middle_name?: string;
  personal_email?: string;
  phone?: string;
  work_phone?: string;
  // Optional personal
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  citizenship?: string;
  // Optional docs
  national_id?: string;
  passport_number?: string;
  tin?: string;
  nssf_number?: string;
  social_security_number?: string;
  // Optional job / org
  designation?: string;
  sub_department?: string;
  work_location?: string;
  employee_category?: string;
  engagement_type?: string;
  date_joined?: string;
  pay_frequency?: string;
  // Optional bank
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  account_type?: string;
  currency?: string;
  // System / derived
  probation_end_date?: string;
  // validation
  _valid?: boolean;
  _errors?: string[];
  _status?: "pending" | "imported" | "failed";
  _message?: string;
}

const REQUIRED_COLS = ["first_name", "last_name", "email", "employee_type", "pay_type", "pay_rate", "country"];

const VALID_PAY_TYPES_OB   = ["hourly", "salary", "piece_rate", "daily_rate"];
const VALID_EMP_TYPES_OB   = ["regular", "manpower", "ippms", "expatriate", "interns", "contractor"];
const VALID_GENDERS_OB     = ["Male", "Female", "Other"];
const VALID_CATEGORIES_OB  = ["Intern", "Trainee", "Temporary", "Permanent", "On Contract", "Casual"];
const VALID_ENGAGEMENTS_OB = ["Permanent", "Contract", "Temporary", "Casual", "Trainee", "Intern"];
const VALID_FREQUENCIES_OB = ["daily", "bi_weekly", "monthly"];
const VALID_ACC_TYPES_OB   = ["savings", "current", "mobile_money"];

const normalizeEnumOB = (value: string, validValues: string[]): string | null => {
  if (!value) return null;
  if (validValues.includes(value)) return value;
  const lower = value.toLowerCase();
  const exact = validValues.find(v => v.toLowerCase() === lower);
  if (exact) return exact;
  const norm = lower.replace(/[\s-]+/g, "_");
  return validValues.find(v => v.toLowerCase().replace(/[\s-]+/g, "_") === norm) ?? null;
};

const enumErrorOB = (field: string, raw: string, validValues: string[]): string => {
  const norm = raw.toLowerCase().replace(/[\s_-]+/g, "");
  const suggestion = validValues.find(v => {
    const vn = v.toLowerCase().replace(/[\s_-]+/g, "");
    return vn.startsWith(norm.slice(0, 4)) || norm.startsWith(vn.slice(0, 4));
  });
  const base = `${field} "${raw}" is not valid`;
  return suggestion
    ? `${base} — did you mean "${suggestion}"?`
    : `${base} — valid: ${validValues.join(", ")}`;
};

const isValidDateString = (value: unknown): boolean => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

const FIELD_LABELS_OB: Record<string, string> = {
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

const normalizeKeyOB = (header: string): string =>
  String(header || "").trim().toLowerCase().replace(/[ -]+/g, "_");

/** Template includes all supported fields */
const TEMPLATE_DATA = [
  {
    // Required
    first_name: "Jane",
    last_name: "Doe",
    email: "jane.doe@company.com",
    employee_type: "manpower",
    pay_type: "salary",
    pay_rate: 1500000,
    country: "UG",
    // Optional identity
    employee_number: "",
    middle_name: "",
    personal_email: "",
    phone: "+256700000000",
    work_phone: "",
    // Optional personal
    gender: "Female",
    date_of_birth: "1992-03-10",
    nationality: "Ugandan",
    citizenship: "Ugandan",
    // Optional docs
    national_id: "CM12345678",
    passport_number: "",
    tin: "",
    nssf_number: "",
    social_security_number: "",
    // Optional job / org
    designation: "Site Worker",
    sub_department: "",
    work_location: "Site A",
    employee_category: "Permanent",
    engagement_type: "Contract",
    date_joined: "2025-01-15",
    pay_frequency: "monthly",
    // Optional bank
    bank_name: "Stanbic Bank",
    bank_branch: "Kampala",
    account_number: "9030012345678",
    account_type: "savings",
    currency: "UGX",
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
  const [payGroups, setPayGroups] = useState<{ id: string; name: string }[]>([]);
  const [orgDepts, setOrgDepts] = useState<string[]>([]);
  const [orgDesignations, setOrgDesignations] = useState<string[]>([]);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(DEFAULT_ALLOWANCES);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { projects: activeProjects } = useActiveProjects(["manpower", "ippms"]);

  // Load org-specific reference data (pay groups, departments, designations) when dialog opens
  useEffect(() => {
    if (!open || !organizationId) return;
    const loadOrgData = async () => {
      const [pgRes, deptRes, desigRes] = await Promise.all([
        supabase.from("pay_groups").select("id, name").eq("organization_id", organizationId).order("name"),
        supabase.from("org_departments").select("name").eq("organization_id", organizationId).eq("is_active", true).order("name"),
        supabase.from("designations").select("name").eq("organization_id", organizationId).eq("is_active", true).order("name"),
      ]);
      setPayGroups((pgRes.data || []) as { id: string; name: string }[]);
      setOrgDepts((deptRes.data || []).map((d: any) => d.name));
      setOrgDesignations((desigRes.data || []).map((d: any) => d.name));
    };
    void loadOrgData();
  }, [open, organizationId]);

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

  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const pgNames = payGroups.map(pg => pg.name);

    // ── Hidden _Lists sheet for org-specific dropdown data ──────────────────
    const listsSheet = wb.addWorksheet("_Lists", { state: "hidden" });
    pgNames.forEach((n, i)           => { listsSheet.getCell(i + 1, 1).value = n; });
    orgDepts.forEach((n, i)          => { listsSheet.getCell(i + 1, 2).value = n; });
    orgDesignations.forEach((n, i)   => { listsSheet.getCell(i + 1, 3).value = n; });

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
      { field: "First Name",    required: "★ REQUIRED", description: "Employee first name",             valid_values: "" },
      { field: "Last Name",     required: "★ REQUIRED", description: "Employee last name",              valid_values: "" },
      { field: "Email",         required: "★ REQUIRED", description: "Work email — must be unique",     valid_values: "" },
      { field: "Employee Type", required: "★ REQUIRED", description: "Employment classification",       valid_values: VALID_EMP_TYPES_OB.join(", ") },
      { field: "Pay Type",      required: "★ REQUIRED", description: "Payment method",                  valid_values: VALID_PAY_TYPES_OB.join(", ") },
      { field: "Pay Rate",      required: "★ REQUIRED", description: "Pay amount — positive number",    valid_values: "" },
      { field: "Country",       required: "★ REQUIRED", description: "Country ISO code",                valid_values: "UG, KE, TZ, SS, RW" },
    ];
    const optionalGuideRows = [
      { field: "Employee Number",        required: "optional", description: "Leave blank to auto-generate",                   valid_values: "" },
      { field: "Middle Name",            required: "optional", description: "Middle name",                                    valid_values: "" },
      { field: "Personal Email",         required: "optional", description: "Personal email address",                         valid_values: "" },
      { field: "Phone",                  required: "optional", description: "Phone with country code",                        valid_values: "" },
      { field: "Work Phone",             required: "optional", description: "Work phone number",                              valid_values: "" },
      { field: "Gender",                 required: "optional", description: "Employee gender",                                valid_values: VALID_GENDERS_OB.join(", ") },
      { field: "Date of Birth",          required: "optional", description: "Date of birth — YYYY-MM-DD",                    valid_values: "" },
      { field: "Nationality",            required: "optional", description: "Nationality",                                   valid_values: "" },
      { field: "Citizenship",            required: "optional", description: "Citizenship",                                   valid_values: "" },
      { field: "National ID",            required: "optional", description: "National ID number",                             valid_values: "" },
      { field: "Passport Number",        required: "optional", description: "Passport number",                                valid_values: "" },
      { field: "TIN",                    required: "optional", description: "Tax Identification Number",                      valid_values: "" },
      { field: "NSSF Number",            required: "optional", description: "NSSF / pension fund number",                     valid_values: "" },
      { field: "Social Security Number", required: "optional", description: "Social security number",                         valid_values: "" },
      { field: "Designation",            required: "optional", description: "Job title / role",                               valid_values: orgDesignations.join(", ") || "e.g. Engineer, Accountant" },
      { field: "Sub Department",         required: "optional", description: "Department / unit",                              valid_values: orgDepts.join(", ") || "e.g. Finance, Operations" },
      { field: "Work Location",          required: "optional", description: "Primary work location",                          valid_values: "" },
      { field: "Employee Category",      required: "optional", description: "Employee category",                              valid_values: VALID_CATEGORIES_OB.join(", ") },
      { field: "Engagement Type",        required: "optional", description: "Engagement type",                                valid_values: VALID_ENGAGEMENTS_OB.join(", ") },
      { field: "Date Joined",            required: "optional", description: "Date joined — YYYY-MM-DD",                       valid_values: "" },
      { field: "Pay Frequency",          required: "optional", description: "How often the employee is paid",                 valid_values: VALID_FREQUENCIES_OB.join(", ") },
      { field: "Pay Group Name",         required: "optional", description: "Pay group name — see Reference sheet",           valid_values: pgNames.join(", ") || "Leave blank if not applicable" },
      { field: "Currency",               required: "optional", description: "Currency — auto-detected from country if blank", valid_values: "UGX, KES, TZS, SSP, RWF" },
      { field: "Bank Name",              required: "optional", description: "Bank name",                                      valid_values: "" },
      { field: "Bank Branch",            required: "optional", description: "Bank branch",                                    valid_values: "" },
      { field: "Account Number",         required: "optional", description: "Bank account number",                            valid_values: "" },
      { field: "Account Type",           required: "optional", description: "Bank account type",                              valid_values: VALID_ACC_TYPES_OB.join(", ") },
    ];

    [...requiredGuideRows, ...optionalGuideRows].forEach(rowData => {
      const row = guideSheet.addRow(rowData);
      if (rowData.required === "★ REQUIRED") {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } };
        });
      }
    });

    // ── Sheet 2: Staff Onboarding ─────────────────────────────────────────────
    const TMPL_KEYS = Object.keys(TEMPLATE_DATA[0]);
    const displayHeaders = TMPL_KEYS.map(k => FIELD_LABELS_OB[k] || k);

    const dataSheet = wb.addWorksheet("Staff Onboarding");
    dataSheet.columns = displayHeaders.map(h => ({ header: h, key: h, width: 22 }));
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    // Sample row — use org-specific values where available
    const sampleSrc = {
      ...TEMPLATE_DATA[0],
      pay_group_name: pgNames[0] || "",
      designation: orgDesignations[0] || TEMPLATE_DATA[0].designation,
      sub_department: orgDepts[0] || TEMPLATE_DATA[0].sub_department,
    };
    const sampleRow: Record<string, unknown> = {};
    for (const k of TMPL_KEYS) {
      sampleRow[FIELD_LABELS_OB[k] || k] = (sampleSrc as Record<string, unknown>)[k];
    }
    dataSheet.addRow(sampleRow);

    // ── Dropdown validations ─────────────────────────────────────────────────
    const addDropdown = (backendKey: string, formulae: string[], promptText: string) => {
      const displayName = FIELD_LABELS_OB[backendKey] || backendKey;
      const colIdx = displayHeaders.indexOf(displayName) + 1; // 1-based
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
    addDropdown("employee_type",     [`"${VALID_EMP_TYPES_OB.join(",")}"`],    VALID_EMP_TYPES_OB.join(", "));
    addDropdown("pay_type",          [`"${VALID_PAY_TYPES_OB.join(",")}"`],    VALID_PAY_TYPES_OB.join(", "));
    addDropdown("gender",            [`"${VALID_GENDERS_OB.join(",")}"`],      VALID_GENDERS_OB.join(", "));
    addDropdown("employee_category", [`"${VALID_CATEGORIES_OB.join(",")}"`],   VALID_CATEGORIES_OB.join(", "));
    addDropdown("engagement_type",   [`"${VALID_ENGAGEMENTS_OB.join(",")}"`],  VALID_ENGAGEMENTS_OB.join(", "));
    addDropdown("pay_frequency",     [`"${VALID_FREQUENCIES_OB.join(",")}"`],  VALID_FREQUENCIES_OB.join(", "));
    addDropdown("account_type",      [`"${VALID_ACC_TYPES_OB.join(",")}"`],    VALID_ACC_TYPES_OB.join(", "));

    // Org-specific dropdowns — reference hidden _Lists sheet
    if (pgNames.length > 0)
      addDropdown("pay_group_name", [`'_Lists'!$A$1:$A$${pgNames.length}`], pgNames.join(", "));
    if (orgDepts.length > 0)
      addDropdown("sub_department", [`'_Lists'!$B$1:$B$${orgDepts.length}`], orgDepts.join(", "));
    if (orgDesignations.length > 0)
      addDropdown("designation",    [`'_Lists'!$C$1:$C$${orgDesignations.length}`], orgDesignations.join(", "));

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
      { group: "★ Required Fields", value: "Last Name",     notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Email",         notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Employee Type", notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Pay Type",      notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Pay Rate",      notes: "REQUIRED" },
      { group: "★ Required Fields", value: "Country",       notes: "REQUIRED" },
      ...payGroups.map(pg      => ({ group: "Pay Group Name",    value: pg.name, notes: "Your org's pay group" })),
      ...orgDepts.map(d        => ({ group: "Sub Department",    value: d,       notes: "Your org's department" })),
      ...orgDesignations.map(d => ({ group: "Designation",       value: d,       notes: "Your org's designation" })),
      ...VALID_EMP_TYPES_OB.map(v    => ({ group: "Employee Type",     value: v, notes: "Allowed" })),
      ...VALID_PAY_TYPES_OB.map(v    => ({ group: "Pay Type",          value: v, notes: "Allowed" })),
      ...VALID_GENDERS_OB.map(v      => ({ group: "Gender",            value: v, notes: "Allowed" })),
      ...VALID_CATEGORIES_OB.map(v   => ({ group: "Employee Category", value: v, notes: "Allowed" })),
      ...VALID_ENGAGEMENTS_OB.map(v  => ({ group: "Engagement Type",   value: v, notes: "Allowed" })),
      ...VALID_FREQUENCIES_OB.map(v  => ({ group: "Pay Frequency",     value: v, notes: "Allowed" })),
      ...VALID_ACC_TYPES_OB.map(v    => ({ group: "Account Type",      value: v, notes: "Allowed" })),
    ];
    refRows.forEach(r => refSheet.addRow(r));

    // ── Download ─────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_onboarding_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      // Prefer the named data sheet; skip Field Guide
      const dataSheetName =
        wb.SheetNames.find(n => n === "Staff Onboarding") ??
        wb.SheetNames.find(n => n !== "Field Guide") ??
        wb.SheetNames[0];
      const ws = wb.Sheets[dataSheetName];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Remap display-name headers to backend keys
      const remapped = raw.map((r: any) => {
        const out: any = {};
        for (const [k, v] of Object.entries(r)) {
          out[normalizeKeyOB(k)] = v;
        }
        return out;
      });

      // Cap at 100
      const capped = remapped.slice(0, 100);

      const validated: BulkRow[] = capped.map((r) => {
        const errs: string[] = [];

        // Required fields
        for (const col of REQUIRED_COLS) {
          if (!r[col] && r[col] !== 0) errs.push(`Missing: ${FIELD_LABELS_OB[col] || col}`);
        }

        // Format checks
        if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errs.push("email format is invalid");
        if (r.pay_rate && isNaN(Number(r.pay_rate))) errs.push("pay_rate must be a number");

        // Enum validation with fuzzy normalization and "did you mean" hints
        const payTypeNorm = normalizeEnumOB(String(r.pay_type || ""), VALID_PAY_TYPES_OB);
        if (r.pay_type && !payTypeNorm) errs.push(enumErrorOB("pay_type", String(r.pay_type), VALID_PAY_TYPES_OB));

        const empTypeNorm = normalizeEnumOB(String(r.employee_type || ""), VALID_EMP_TYPES_OB);
        if (r.employee_type && !empTypeNorm) errs.push(enumErrorOB("employee_type", String(r.employee_type), VALID_EMP_TYPES_OB));

        if (r.gender && !normalizeEnumOB(String(r.gender), VALID_GENDERS_OB))
          errs.push(enumErrorOB("gender", String(r.gender), VALID_GENDERS_OB));

        if (r.employee_category && !normalizeEnumOB(String(r.employee_category), VALID_CATEGORIES_OB))
          errs.push(enumErrorOB("employee_category", String(r.employee_category), VALID_CATEGORIES_OB));

        if (r.engagement_type && !normalizeEnumOB(String(r.engagement_type), VALID_ENGAGEMENTS_OB))
          errs.push(enumErrorOB("engagement_type", String(r.engagement_type), VALID_ENGAGEMENTS_OB));

        if (r.pay_frequency && !normalizeEnumOB(String(r.pay_frequency), VALID_FREQUENCIES_OB))
          errs.push(enumErrorOB("pay_frequency", String(r.pay_frequency), VALID_FREQUENCIES_OB));

        if (r.account_type && !normalizeEnumOB(String(r.account_type), VALID_ACC_TYPES_OB))
          errs.push(enumErrorOB("account_type", String(r.account_type), VALID_ACC_TYPES_OB));

        // Date format checks
        if (r.date_joined && !isValidDateString(r.date_joined))
          errs.push("date_joined is invalid — use YYYY-MM-DD");
        if (r.date_of_birth && !isValidDateString(r.date_of_birth))
          errs.push("date_of_birth is invalid — use YYYY-MM-DD");

        return {
          ...r,
          // Apply normalised enum values back onto the row
          pay_type: payTypeNorm ?? String(r.pay_type || ""),
          employee_type: empTypeNorm ?? String(r.employee_type || ""),
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
            // Required
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            employee_type: row.employee_type,
            pay_type: row.pay_type || "salary",
            pay_rate: row.pay_rate,
            country: row.country,
            // Optional identity
            employee_number: empNum || `BULK-${Date.now()}-${i}`,
            middle_name: row.middle_name || null,
            personal_email: row.personal_email || null,
            phone: row.phone || null,
            work_phone: row.work_phone || null,
            // Optional personal
            gender: row.gender || null,
            date_of_birth: row.date_of_birth || null,
            nationality: row.nationality || null,
            citizenship: row.citizenship || null,
            // Optional docs
            national_id: row.national_id || null,
            passport_number: row.passport_number || null,
            tin: row.tin || null,
            nssf_number: row.nssf_number || null,
            social_security_number: row.social_security_number || null,
            // Optional job / org
            designation: row.designation || null,
            sub_department: row.sub_department || null,
            work_location: row.work_location || null,
            employee_category: row.employee_category || null,
            engagement_type: row.engagement_type || null,
            date_joined: row.date_joined || null,
            pay_frequency: row.pay_frequency || null,
            // Probation
            probation_end_date: probationEnd || null,
            probation_status: probationEnd ? "active" : "not_applicable",
            // Optional bank
            bank_name: row.bank_name || null,
            bank_branch: row.bank_branch || null,
            account_number: row.account_number || null,
            account_type: row.account_type || null,
            currency: row.currency || "UGX",
            // System
            organization_id: organizationId,
            status: "active",
            // Project linkage
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
              <Button variant="outline" size="sm" onClick={() => downloadTemplate().catch(console.error)}>
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

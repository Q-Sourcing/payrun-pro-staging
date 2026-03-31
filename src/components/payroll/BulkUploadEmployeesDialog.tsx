import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOrg } from '@/lib/auth/OrgProvider';

interface BulkUploadEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeesAdded: () => void;
}

// ---------------------------------------------------------------------------
// Field label mapping (display names → used in error messages and template)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Enum constants
// ---------------------------------------------------------------------------
const VALID_PAY_TYPES_CSV   = ["hourly", "salary", "piece_rate", "daily_rate"];
const VALID_EMP_TYPES_CSV   = ["regular", "manpower", "ippms", "expatriate", "interns", "contractor"];
const VALID_GENDERS_CSV     = ["Male", "Female", "Other"];
const VALID_CATEGORIES_CSV  = ["Intern", "Trainee", "Temporary", "Permanent", "On Contract", "Casual"];
const VALID_ENGAGEMENTS_CSV = ["Permanent", "Contract", "Temporary", "Casual", "Trainee", "Intern"];
const VALID_FREQUENCIES_CSV = ["daily", "bi_weekly", "monthly"];
const VALID_ACC_TYPES_CSV   = ["savings", "current", "mobile_money"];
const VALID_STATUS_CSV      = ["active", "inactive"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fuzzy enum match: exact → case-insensitive → separator-normalised. */
const normalizeEnumCSV = (value: string, validValues: string[]): string | null => {
  if (!value) return null;
  if (validValues.includes(value)) return value;
  const lower = value.toLowerCase();
  const exact = validValues.find(v => v.toLowerCase() === lower);
  if (exact) return exact;
  const norm = lower.replace(/[\s-]+/g, "_");
  return validValues.find(v => v.toLowerCase().replace(/[\s-]+/g, "_") === norm) ?? null;
};

/** Error message with "did you mean?" hint when a close match exists. */
const enumErrorCSV = (field: string, raw: string, validValues: string[]): string => {
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

const isValidDate = (value: string): boolean => {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ValidationRow = {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const BulkUploadEmployeesDialog = ({ open, onOpenChange, onEmployeesAdded }: BulkUploadEmployeesDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationRows, setValidationRows] = useState<ValidationRow[]>([]);
  const [payGroups, setPayGroups] = useState<{ id: string; name: string }[]>([]);
  const [orgDepts, setOrgDepts] = useState<string[]>([]);
  const [orgDesignations, setOrgDesignations] = useState<string[]>([]);
  const { toast } = useToast();
  const { organizationId } = useOrg();

  // Load org-specific data whenever the dialog opens
  useEffect(() => {
    if (!open || !organizationId) return;
    Promise.all([
      supabase.from("pay_groups").select("id, name").eq("organization_id", organizationId).eq("is_active", true).order("name"),
      supabase.from("org_departments").select("name").eq("organization_id", organizationId).eq("is_active", true).order("name"),
      supabase.from("designations").select("name").eq("organization_id", organizationId).eq("is_active", true).order("name"),
    ]).then(([pgRes, deptRes, desigRes]) => {
      setPayGroups(pgRes.data ?? []);
      setOrgDepts((deptRes.data ?? []).map((d: any) => d.name));
      setOrgDesignations((desigRes.data ?? []).map((d: any) => d.name));
    });
  }, [open, organizationId]);

  const REQUIRED_FIELDS = ["first_name", "email", "country", "currency", "pay_type", "pay_rate"] as const;
  const OPTIONAL_FIELDS = [
    "employee_number", "middle_name", "last_name", "personal_email", "phone", "work_phone",
    "gender", "date_of_birth", "nationality", "citizenship",
    "national_id", "passport_number", "tin", "nssf_number", "social_security_number",
    "designation", "sub_department", "work_location",
    "employee_type", "employee_category", "engagement_type", "date_joined",
    "pay_frequency", "pay_group_id", "status",
    "bank_name", "bank_branch", "account_number", "account_type",
  ] as const;

  const validRows = validationRows.filter(r => r.errors.length === 0);
  const invalidRows = validationRows.filter(r => r.errors.length > 0);

  // ---------------------------------------------------------------------------
  // Template download
  // ---------------------------------------------------------------------------
  const downloadTemplate = () => {
    const headers = [
      "Employee Number", "First Name*", "Middle Name", "Last Name", "Email*",
      "Personal Email", "Phone", "Work Phone",
      "Gender", "Date of Birth", "Nationality", "Citizenship",
      "National ID", "Passport Number", "TIN", "NSSF Number", "Social Security Number",
      "Designation", "Sub Department", "Work Location",
      "Employee Type", "Employee Category", "Engagement Type", "Date Joined",
      "Pay Type*", "Pay Rate*", "Pay Frequency", "Pay Group Name", "Country*", "Currency*", "Status",
      "Bank Name", "Bank Branch", "Account Number", "Account Type",
    ];

    // * marks REQUIRED fields — parser strips them automatically on upload
    const sampleData = [
      "EMP-023,John,M,Doe,john.doe@example.com,,+256700000000,,Male,1990-05-15,Ugandan,Ugandan,CM1234567890,,,,,,Technician,,Kampala,regular,Permanent,Permanent,2026-01-10,salary,5000000,monthly,,UG,UGX,active,Stanbic Bank,Kampala,9030012345678,savings",
      ",Jane,,Smith,jane.smith@example.com,,+254700000000,,Female,1985-08-20,Kenyan,Kenyan,,,,,,,Engineer,,Nairobi,expatriate,On Contract,Contract,2026-02-01,hourly,1500,,KE,KES,active,,,,",
    ];

    const csvContent = [headers.join(","), ...sampleData].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_upload_template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Parse
  // ---------------------------------------------------------------------------
  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];
    // Strip trailing * (required markers) from headers, then normalize to backend keys
    const headers = lines[0].split(",").map(h => {
      const cleaned = h.trim().replace(/\*$/, "").trim();
      return cleaned.toLowerCase().replace(/[ -]+/g, "_");
    });
    const employees = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const employee: any = {};
      headers.forEach((header, index) => {
        employee[header] = values[index] ?? "";
      });
      employees.push({ ...employee, _rowNumber: i + 1 });
    }
    return employees;
  };

  // ---------------------------------------------------------------------------
  // Normalize + Validate
  // ---------------------------------------------------------------------------
  const normalizeRow = (raw: any): any => {
    const row: any = {};
    Object.keys(raw).forEach(key => {
      if (key === "_rowNumber") return;
      const v = raw[key];
      row[key] = typeof v === "string" ? v.trim() : v;
    });

    // Null-out empty optional fields
    OPTIONAL_FIELDS.forEach(field => {
      if (row[field] === "") row[field] = null;
    });

    // Numeric pay_rate
    if (row.pay_rate === "" || row.pay_rate === null || row.pay_rate === undefined) {
      row.pay_rate = null;
    } else {
      const n = Number(row.pay_rate);
      row.pay_rate = Number.isFinite(n) ? n : NaN;
    }

    // Defaults
    row.status = normalizeEnumCSV(row.status ?? "", VALID_STATUS_CSV) ?? "active";
    row.employee_type = normalizeEnumCSV(row.employee_type ?? "", VALID_EMP_TYPES_CSV) ?? row.employee_type ?? "regular";

    // Fuzzy-normalise all other enum fields
    if (row.pay_type)          row.pay_type          = normalizeEnumCSV(row.pay_type,          VALID_PAY_TYPES_CSV)   ?? row.pay_type;
    if (row.gender)            row.gender            = normalizeEnumCSV(row.gender,            VALID_GENDERS_CSV)     ?? row.gender;
    if (row.employee_category) row.employee_category = normalizeEnumCSV(row.employee_category, VALID_CATEGORIES_CSV)  ?? row.employee_category;
    if (row.engagement_type)   row.engagement_type   = normalizeEnumCSV(row.engagement_type,   VALID_ENGAGEMENTS_CSV) ?? row.engagement_type;
    if (row.pay_frequency)     row.pay_frequency     = normalizeEnumCSV(row.pay_frequency,     VALID_FREQUENCIES_CSV) ?? row.pay_frequency;
    if (row.account_type)      row.account_type      = normalizeEnumCSV(row.account_type,      VALID_ACC_TYPES_CSV)   ?? row.account_type;

    return row;
  };

  const validateRow = (row: any, rawRowNumber: number, emailsSeen: Set<string>): string[] => {
    const errors: string[] = [];

    // Required fields
    REQUIRED_FIELDS.forEach(field => {
      if (field === "pay_rate") {
        if (row.pay_rate === null || Number.isNaN(row.pay_rate)) errors.push(`${FIELD_LABELS[field] || field} is required and must be numeric`);
      } else if (!row[field]) {
        errors.push(`${FIELD_LABELS[field] || field} is required`);
      }
    });

    // Email format
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push("email format is invalid");
    }

    // Duplicate email within file
    if (row.email) {
      const lower = row.email.toLowerCase();
      if (emailsSeen.has(lower)) {
        errors.push("email is duplicated in this file");
      } else {
        emailsSeen.add(lower);
      }
    }

    // Enum validations
    if (row.pay_type && !VALID_PAY_TYPES_CSV.includes(row.pay_type))
      errors.push(enumErrorCSV("Pay Type", row.pay_type, VALID_PAY_TYPES_CSV));
    if (row.employee_type && !VALID_EMP_TYPES_CSV.includes(row.employee_type))
      errors.push(enumErrorCSV("Employee Type", row.employee_type, VALID_EMP_TYPES_CSV));
    if (row.gender && !VALID_GENDERS_CSV.includes(row.gender))
      errors.push(enumErrorCSV("Gender", row.gender, VALID_GENDERS_CSV));
    if (row.employee_category && !VALID_CATEGORIES_CSV.includes(row.employee_category))
      errors.push(enumErrorCSV("Employee Category", row.employee_category, VALID_CATEGORIES_CSV));
    if (row.engagement_type && !VALID_ENGAGEMENTS_CSV.includes(row.engagement_type))
      errors.push(enumErrorCSV("Engagement Type", row.engagement_type, VALID_ENGAGEMENTS_CSV));
    if (row.pay_frequency && !VALID_FREQUENCIES_CSV.includes(row.pay_frequency))
      errors.push(enumErrorCSV("Pay Frequency", row.pay_frequency, VALID_FREQUENCIES_CSV));
    if (row.account_type && !VALID_ACC_TYPES_CSV.includes(row.account_type))
      errors.push(enumErrorCSV("Account Type", row.account_type, VALID_ACC_TYPES_CSV));

    // Date format
    if (row.date_joined && !isValidDate(row.date_joined))
      errors.push("date_joined is invalid — use YYYY-MM-DD");
    if (row.date_of_birth && !isValidDate(row.date_of_birth))
      errors.push("date_of_birth is invalid — use YYYY-MM-DD");

    return errors;
  };

  // ---------------------------------------------------------------------------
  // File select — auto-validate immediately
  // ---------------------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      toast({ title: "Error", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
    setValidationRows([]);

    const text = await selectedFile.text();
    const parsed = parseCSV(text);
    if (!parsed.length) return;

    const emailsSeen = new Set<string>();
    const results: ValidationRow[] = parsed.map(raw => {
      const row = normalizeRow(raw);
      const errors = validateRow(row, raw._rowNumber, emailsSeen);
      return { rowNumber: raw._rowNumber, data: row, errors };
    });
    setValidationRows(results);
  };

  // ---------------------------------------------------------------------------
  // Upload — only valid rows
  // ---------------------------------------------------------------------------
  const handleUpload = async () => {
    if (!file || validRows.length === 0) return;
    setLoading(true);
    try {
      const finalOrgId =
        organizationId ||
        localStorage.getItem("active_organization_id") ||
        "00000000-0000-0000-0000-000000000001";

      // Check duplicate employee_numbers against DB
      const providedIds = validRows.map(r => r.data.employee_number).filter(Boolean);
      if (providedIds.length > 0) {
        const { data: existing, error: chkErr } = await supabase
          .from("employees")
          .select("employee_number")
          .in("employee_number", providedIds);
        if (chkErr) throw chkErr;
        if (existing && existing.length > 0) {
          toast({
            title: "Duplicate Employee ID",
            description: `Employee number ${existing[0].employee_number} already exists. Remove or change it in the CSV.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Check duplicate emails against DB
      const emails = validRows.map(r => r.data.email).filter(Boolean);
      if (emails.length > 0) {
        const { data: existingEmails } = await supabase
          .from("employees")
          .select("email")
          .eq("organization_id", finalOrgId)
          .in("email", emails);
        if (existingEmails && existingEmails.length > 0) {
          toast({
            title: "Email already exists",
            description: `${existingEmails[0].email} already has an employee record. Remove it from the CSV.`,
            variant: "destructive",
          });
          return;
        }
      }

      const rowsToInsert = validRows.map(r => ({ ...r.data, organization_id: finalOrgId }));

      const { error } = await supabase.from("employees").insert(rowsToInsert);
      if (error) throw error;

      toast({
        title: "Success",
        description: invalidRows.length > 0
          ? `Uploaded ${validRows.length} employee(s). ${invalidRows.length} row(s) skipped due to errors.`
          : `Successfully uploaded ${validRows.length} employee(s)`,
      });

      setFile(null);
      setValidationRows([]);
      onEmployeesAdded();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload employees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees</DialogTitle>
          <DialogDescription>
            Upload multiple employees at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Format guide */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">CSV Format</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Columns marked with <strong>*</strong> in the template are <strong>required</strong></li>
                      <li>• Required: First Name, Email, Country, Currency, Pay Type, Pay Rate</li>
                      <li>• <strong>Pay Type:</strong> salary | hourly | piece_rate | daily_rate</li>
                      <li>• <strong>Employee Type:</strong> regular | manpower | ippms | expatriate | interns | contractor</li>
                      <li>• <strong>Gender:</strong> Male | Female | Other &nbsp;·&nbsp; <strong>Status:</strong> active (default) | inactive</li>
                      <li>• <strong>Employee Category:</strong> Intern | Trainee | Temporary | Permanent | On Contract | Casual</li>
                      <li>• <strong>Engagement Type:</strong> Permanent | Contract | Temporary | Casual | Trainee | Intern</li>
                      <li>• <strong>Pay Frequency:</strong> daily | bi_weekly | monthly &nbsp;·&nbsp; <strong>Account Type:</strong> savings | current | mobile_money</li>
                      <li>• Dates: YYYY-MM-DD format</li>
                      {payGroups.length > 0 && (
                        <li>• <strong>Pay Group Name</strong> — your org's pay groups: {payGroups.map(pg => pg.name).join(", ")}</li>
                      )}
                      {orgDepts.length > 0 && (
                        <li>• <strong>Sub Department</strong> — your org's departments: {orgDepts.join(", ")}</li>
                      )}
                      {orgDesignations.length > 0 && (
                        <li>• <strong>Designation</strong> — your org's designations: {orgDesignations.join(", ")}</li>
                      )}
                    </ul>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>

          {/* Validation results */}
          {validationRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Validation results:</span>
                <Badge className="bg-green-600 hover:bg-green-600">{validRows.length} valid</Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive">{invalidRows.length} with errors</Badge>
                )}
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-md border max-h-48 overflow-y-auto text-sm">
                  {invalidRows.map(row => (
                    <div key={row.rowNumber} className="flex gap-2 items-start px-3 py-2 border-b last:border-b-0">
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Row {row.rowNumber}</span>
                        {row.data.first_name && <span className="text-muted-foreground"> — {row.data.first_name}</span>}
                        <ul className="text-xs text-destructive mt-0.5 space-y-0.5 list-disc list-inside">
                          {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validRows.length > 0 && invalidRows.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  All rows are valid and ready to upload.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={validRows.length === 0 || loading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading
                ? "Uploading..."
                : validRows.length > 0
                  ? `Upload ${validRows.length} Employee${validRows.length !== 1 ? "s" : ""}`
                  : "Upload Employees"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadEmployeesDialog;

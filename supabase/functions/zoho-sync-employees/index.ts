import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import { createServiceRoleClient, handleCorsPreflight, jsonResponse } from "../_shared/platform-admin-auth.ts";
import {
  ZOHO_INTEGRATION_NAME,
  buildZohoEmployeePayload,
  getRecordValue,
  getValidZohoAccessToken,
  getZohoConfig,
  requireOrgIntegrationAccess,
  zohoFetch,
} from "../_shared/zoho.ts";

const PayloadSchema = z.object({
  organizationId: z.string().uuid(),
  mode: z.enum(["import", "export", "bidirectional"]),
  dryRun: z.boolean().optional().default(false),
  previewLimit: z.number().int().min(1).max(250).optional(),
});

type ZohoEmployeeRecord = Record<string, unknown>;
type ZohoSyncMode = z.infer<typeof PayloadSchema>["mode"];
type SyncDirection = "import" | "export";
type SyncAction = "create" | "update" | "skip" | "error";

type SummaryBucket = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

type ZohoSyncSummary = {
  mode: ZohoSyncMode;
  dryRun: boolean;
  imported: SummaryBucket;
  exported: Omit<SummaryBucket, "created">;
  warnings: string[];
};

type ZohoSyncFieldDiff = {
  field: string;
  from: string | null;
  to: string | null;
};

type ZohoSyncPreviewRow = {
  direction: SyncDirection;
  action: SyncAction;
  zohoEmployeeId: string | null;
  zohoRecordId: string | null;
  localEmployeeId: string | null;
  displayName: string;
  reason: string | null;
  warnings: string[];
  fieldDiffs: ZohoSyncFieldDiff[];
};

type ZohoSyncPreview = {
  generatedAt: string;
  previewLimit: number | null;
  totalRows: number;
  truncated: boolean;
  rows: ZohoSyncPreviewRow[];
};

type ZohoMappedEmployee = ReturnType<typeof mapZohoEmployee>;

type CompanyRow = {
  id: string;
  name: string;
  currency: string | null;
  country_id: string | null;
};

type CountryRow = {
  id: string;
  code: string;
};

type CompanyUnitRow = {
  id: string;
  company_id: string;
  name: string;
};

type ExternalIdRow = {
  id: string;
  employee_id: string;
  external_id: string;
  external_record_id: string | null;
  external_label: string | null;
};

type EmployeeRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  personal_email: string | null;
  phone: string | null;
  work_phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  nationality: string | null;
  citizenship: string | null;
  tin: string | null;
  nssf_number: string | null;
  passport_number: string | null;
  engagement_type: string | null;
  employment_status: string | null;
  designation: string | null;
  work_location: string | null;
  date_joined: string | null;
  company_id: string | null;
  company_unit_id: string | null;
  status: string | null;
  country: string | null;
  currency: string | null;
};

type ImportEmployeePayload = {
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  personal_email: string | null;
  phone: string | null;
  work_phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  nationality: string | null;
  citizenship: string | null;
  tin: string | null;
  nssf_number: string | null;
  passport_number: null;
  engagement_type: string | null;
  employment_status: string;
  designation: string | null;
  work_location: string | null;
  date_joined: string | null;
  company_id: string | null;
  company_unit_id: string | null;
};

type ImportPlan = {
  preview: ZohoSyncPreviewRow;
  employeePayload: ImportEmployeePayload | null;
  existingEmployee: EmployeeRow | null;
  externalMapping: ExternalIdRow | null;
  countryCode: string | null;
  currency: string | null;
  shouldTouchMapping: boolean;
};

type ExportPlan = {
  preview: ZohoSyncPreviewRow;
  employee: EmployeeRow | null;
  externalMapping: ExternalIdRow | null;
  desiredPayload: Record<string, string>;
};

const DEFAULT_PREVIEW_LIMIT = 100;

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function normalizeDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function buildDisplayName(parts: Array<string | null | undefined>, fallback: string) {
  const value = parts.map((part) => normalizeDisplayValue(part)).filter(Boolean).join(" ");
  return value || fallback;
}

function toStatus(employmentStatus: string | null | undefined) {
  return employmentStatus === "Active" ? "active" : "inactive";
}

function pushWarning(summary: ZohoSyncSummary, warningSet: Set<string>, message: string) {
  if (warningSet.has(message)) return;
  warningSet.add(message);
  summary.warnings.push(message);
}

function diffField(field: string, from: unknown, to: unknown): ZohoSyncFieldDiff | null {
  const left = normalizeDisplayValue(from);
  const right = normalizeDisplayValue(to);
  if (left === right) return null;
  return { field, from: left, to: right };
}

function collectDiffs(entries: Array<ZohoSyncFieldDiff | null>) {
  return entries.filter((entry): entry is ZohoSyncFieldDiff => Boolean(entry));
}

function mapZohoEmployee(record: ZohoEmployeeRecord) {
  return {
    recordId: getRecordValue(record, ["recordId", "pkId"]),
    employeeId: getRecordValue(record, ["Employee ID", "EmployeeID"]),
    firstName: getRecordValue(record, ["First Name", "FirstName"]),
    middleName: getRecordValue(record, ["Middle Name", "Middle_Name"]),
    lastName: getRecordValue(record, ["Last Name", "LastName"]),
    workEmail: getRecordValue(record, ["Email address", "Work Email address", "EmailID"]),
    personalEmail: getRecordValue(record, ["Personal Email Address", "Other_Email"]),
    workPhone: getRecordValue(record, ["Work Phone Number", "Work_phone"]),
    mobile: getRecordValue(record, ["Personal Mobile Number", "Mobile"]),
    gender: getRecordValue(record, ["Gender"]),
    dateOfBirth: getRecordValue(record, ["Date of Birth", "Date_of_birth"]),
    employeeStatus: getRecordValue(record, ["Employee Status", "Employeestatus"]),
    engagementType: getRecordValue(record, ["Engagement Type", "Employee_type"]),
    businessUnit: getRecordValue(record, ["Business Unit", "Entity1"]),
    department: getRecordValue(record, ["Department"]),
    designation: getRecordValue(record, ["Designation"]),
    workLocation: getRecordValue(record, ["Work Location", "LocationName"]),
    dateOfJoining: getRecordValue(record, ["Date of Joining", "Dateofjoining"]),
    nationality: getRecordValue(record, ["Nationality"]),
    citizenship: getRecordValue(record, ["Citizenship", "Citizenship1"]),
    nationalId: getRecordValue(record, ["National Id Number", "National_Id_Number"]),
    tin: getRecordValue(record, ["Tax Identification Number", "Tax_Identification_Number"]),
    nssfNumber: getRecordValue(record, ["Social Security Number", "Social_Security_Number_Two"]),
  };
}

async function fetchAllZohoEmployees(accessToken: string) {
  const config = getZohoConfig();
  const allRecords: ZohoEmployeeRecord[] = [];
  let startIndex = 1;
  const pageSize = 200;

  while (true) {
    const url = new URL(`${config.peopleBaseUrl}/api/forms/${config.employeeViewName}/records`);
    url.searchParams.set("sIndex", String(startIndex));
    url.searchParams.set("rec_limit", String(pageSize));

    const data = await zohoFetch(url.toString(), accessToken);
    const records = Array.isArray(data)
      ? (data as ZohoEmployeeRecord[])
      : Array.isArray((data as any)?.response?.result)
        ? ((data as any).response.result as ZohoEmployeeRecord[])
        : [];

    allRecords.push(...records);

    if (records.length < pageSize) break;
    startIndex += pageSize;
  }

  return allRecords;
}

function mapLocalEmployeeToZohoPayload(employee: Record<string, unknown>, companyName?: string | null, companyUnitName?: string | null) {
  return buildZohoEmployeePayload({
    FirstName: String(employee.first_name || ""),
    Middle_Name: employee.middle_name ? String(employee.middle_name) : null,
    LastName: employee.last_name ? String(employee.last_name) : null,
    EmailID: String(employee.email || ""),
    Other_Email: employee.personal_email ? String(employee.personal_email) : null,
    Work_phone: employee.work_phone ? String(employee.work_phone) : null,
    Mobile: employee.phone ? String(employee.phone) : null,
    Gender: employee.gender ? String(employee.gender) : null,
    Date_of_birth: employee.date_of_birth ? String(employee.date_of_birth) : null,
    Employeestatus: employee.employment_status ? String(employee.employment_status) : null,
    Employee_type: employee.engagement_type ? String(employee.engagement_type) : null,
    Entity1: companyName || null,
    Department: companyUnitName || null,
    Designation: employee.designation ? String(employee.designation) : null,
    LocationName: employee.work_location ? String(employee.work_location) : null,
    Dateofjoining: employee.date_joined ? String(employee.date_joined) : null,
    Nationality: employee.nationality ? String(employee.nationality) : null,
    Citizenship1: employee.citizenship ? String(employee.citizenship) : null,
    National_Id_Number: employee.national_id ? String(employee.national_id) : null,
    Tax_Identification_Number: employee.tin ? String(employee.tin) : null,
    Social_Security_Number_Two: employee.nssf_number ? String(employee.nssf_number) : null,
  });
}

function buildImportFieldDiffs(
  existingEmployee: EmployeeRow | null,
  payload: ImportEmployeePayload,
  currentCompanyName: string | null,
  currentUnitName: string | null,
  nextCompanyName: string | null,
  nextUnitName: string | null,
) {
  return collectDiffs([
    diffField("first_name", existingEmployee?.first_name, payload.first_name),
    diffField("middle_name", existingEmployee?.middle_name, payload.middle_name),
    diffField("last_name", existingEmployee?.last_name, payload.last_name),
    diffField("email", existingEmployee?.email, payload.email),
    diffField("personal_email", existingEmployee?.personal_email, payload.personal_email),
    diffField("phone", existingEmployee?.phone, payload.phone),
    diffField("work_phone", existingEmployee?.work_phone, payload.work_phone),
    diffField("gender", existingEmployee?.gender, payload.gender),
    diffField("date_of_birth", existingEmployee?.date_of_birth, payload.date_of_birth),
    diffField("national_id", existingEmployee?.national_id, payload.national_id),
    diffField("nationality", existingEmployee?.nationality, payload.nationality),
    diffField("citizenship", existingEmployee?.citizenship, payload.citizenship),
    diffField("tin", existingEmployee?.tin, payload.tin),
    diffField("nssf_number", existingEmployee?.nssf_number, payload.nssf_number),
    diffField("engagement_type", existingEmployee?.engagement_type, payload.engagement_type),
    diffField("employment_status", existingEmployee?.employment_status, payload.employment_status),
    diffField("designation", existingEmployee?.designation, payload.designation),
    diffField("work_location", existingEmployee?.work_location, payload.work_location),
    diffField("date_joined", existingEmployee?.date_joined, payload.date_joined),
    diffField("company", currentCompanyName, nextCompanyName),
    diffField("company_unit", currentUnitName, nextUnitName),
  ]);
}

function buildExportFieldDiffs(currentZoho: ZohoMappedEmployee, desiredPayload: Record<string, string>) {
  return collectDiffs([
    "FirstName" in desiredPayload ? diffField("first_name", currentZoho.firstName, desiredPayload.FirstName) : null,
    "Middle_Name" in desiredPayload ? diffField("middle_name", currentZoho.middleName, desiredPayload.Middle_Name) : null,
    "LastName" in desiredPayload ? diffField("last_name", currentZoho.lastName, desiredPayload.LastName) : null,
    "EmailID" in desiredPayload ? diffField("email", currentZoho.workEmail, desiredPayload.EmailID) : null,
    "Other_Email" in desiredPayload ? diffField("personal_email", currentZoho.personalEmail, desiredPayload.Other_Email) : null,
    "Work_phone" in desiredPayload ? diffField("work_phone", currentZoho.workPhone, desiredPayload.Work_phone) : null,
    "Mobile" in desiredPayload ? diffField("phone", currentZoho.mobile, desiredPayload.Mobile) : null,
    "Gender" in desiredPayload ? diffField("gender", currentZoho.gender, desiredPayload.Gender) : null,
    "Date_of_birth" in desiredPayload ? diffField("date_of_birth", currentZoho.dateOfBirth, desiredPayload.Date_of_birth) : null,
    "Employeestatus" in desiredPayload ? diffField("employment_status", currentZoho.employeeStatus, desiredPayload.Employeestatus) : null,
    "Employee_type" in desiredPayload ? diffField("engagement_type", currentZoho.engagementType, desiredPayload.Employee_type) : null,
    "Entity1" in desiredPayload ? diffField("company", currentZoho.businessUnit, desiredPayload.Entity1) : null,
    "Department" in desiredPayload ? diffField("company_unit", currentZoho.department, desiredPayload.Department) : null,
    "Designation" in desiredPayload ? diffField("designation", currentZoho.designation, desiredPayload.Designation) : null,
    "LocationName" in desiredPayload ? diffField("work_location", currentZoho.workLocation, desiredPayload.LocationName) : null,
    "Dateofjoining" in desiredPayload ? diffField("date_joined", currentZoho.dateOfJoining, desiredPayload.Dateofjoining) : null,
    "Nationality" in desiredPayload ? diffField("nationality", currentZoho.nationality, desiredPayload.Nationality) : null,
    "Citizenship1" in desiredPayload ? diffField("citizenship", currentZoho.citizenship, desiredPayload.Citizenship1) : null,
    "National_Id_Number" in desiredPayload ? diffField("national_id", currentZoho.nationalId, desiredPayload.National_Id_Number) : null,
    "Tax_Identification_Number" in desiredPayload ? diffField("tin", currentZoho.tin, desiredPayload.Tax_Identification_Number) : null,
    "Social_Security_Number_Two" in desiredPayload ? diffField("nssf_number", currentZoho.nssfNumber, desiredPayload.Social_Security_Number_Two) : null,
  ]);
}

async function buildImportPlans(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  zohoEmployees: ZohoEmployeeRecord[],
  summary: ZohoSyncSummary,
  warningSet: Set<string>,
) {
  const companyRes = await (supabaseAdmin as any)
    .from("companies")
    .select("id, name, currency, country_id")
    .eq("organization_id", organizationId);
  const companies = (companyRes.data || []) as CompanyRow[];

  const companyIds = companies.map((item) => item.id);
  const countryRes = companyIds.length
    ? await (supabaseAdmin as any).from("countries").select("id, code")
    : { data: [], error: null };
  const countries = new Map(((countryRes.data || []) as CountryRow[]).map((item) => [item.id, item.code]));
  const companyCountryCode = new Map(companies.map((item) => [item.id, item.country_id ? countries.get(item.country_id) || "UG" : "UG"]));
  const companyNameToId = new Map(companies.map((item) => [normalize(item.name), item.id]));
  const companyNameById = new Map(companies.map((item) => [item.id, item.name]));
  const companyCurrencyById = new Map(companies.map((item) => [item.id, item.currency || "UGX"]));

  const unitsRes = companyIds.length
    ? await (supabaseAdmin as any).from("company_units").select("id, company_id, name").in("company_id", companyIds)
    : { data: [], error: null };
  const units = (unitsRes.data || []) as CompanyUnitRow[];
  const unitsByCompany = new Map<string, Map<string, string>>();
  const unitNameById = new Map<string, string>();
  units.forEach((unit) => {
    if (!unitsByCompany.has(unit.company_id)) unitsByCompany.set(unit.company_id, new Map());
    unitsByCompany.get(unit.company_id)!.set(normalize(unit.name), unit.id);
    unitNameById.set(unit.id, unit.name);
  });

  const externalIdsRes = await (supabaseAdmin as any)
    .from("employee_external_ids")
    .select("id, employee_id, external_id, external_record_id, external_label")
    .eq("organization_id", organizationId)
    .eq("provider", ZOHO_INTEGRATION_NAME);
  const externalIds = (externalIdsRes.data || []) as ExternalIdRow[];
  const externalById = new Map(externalIds.map((item) => [item.external_id, item]));

  const mappedEmployeeIds = Array.from(new Set(externalIds.map((item) => item.employee_id).filter(Boolean)));
  const employeesRes = mappedEmployeeIds.length
    ? await (supabaseAdmin as any)
      .from("employees")
      .select("id, first_name, middle_name, last_name, email, personal_email, phone, work_phone, gender, date_of_birth, national_id, nationality, citizenship, tin, nssf_number, passport_number, engagement_type, employment_status, designation, work_location, date_joined, company_id, company_unit_id, status, country, currency")
      .eq("organization_id", organizationId)
      .in("id", mappedEmployeeIds)
    : { data: [], error: null };
  const employeesById = new Map(((employeesRes.data || []) as EmployeeRow[]).map((item) => [item.id, item]));

  const plans: ImportPlan[] = [];

  for (const rawRecord of zohoEmployees) {
    const record = mapZohoEmployee(rawRecord);
    const rowWarnings: string[] = [];

    if (!record.employeeId) {
      const reason = "Zoho employee record is missing Employee ID.";
      pushWarning(summary, warningSet, reason);
      summary.imported.skipped += 1;
      plans.push({
        preview: {
          direction: "import",
          action: "skip",
          zohoEmployeeId: null,
          zohoRecordId: record.recordId,
          localEmployeeId: null,
          displayName: buildDisplayName([record.firstName, record.middleName, record.lastName], "Unnamed Zoho employee"),
          reason,
          warnings: [reason],
          fieldDiffs: [],
        },
        employeePayload: null,
        existingEmployee: null,
        externalMapping: null,
        countryCode: null,
        currency: null,
        shouldTouchMapping: false,
      });
      continue;
    }

    const existingExternal = externalById.get(record.employeeId) || null;
    const existingEmployee = existingExternal?.employee_id ? employeesById.get(existingExternal.employee_id) || null : null;
    const companyId = record.businessUnit ? companyNameToId.get(normalize(record.businessUnit)) || null : null;
    const companyUnitId = companyId && record.department
      ? unitsByCompany.get(companyId)?.get(normalize(record.department)) || null
      : null;

    if (record.businessUnit && !companyId) {
      const warning = `No matching company found for Zoho Business Unit "${record.businessUnit}".`;
      rowWarnings.push(warning);
      pushWarning(summary, warningSet, warning);
    }

    if (record.department && companyId && !companyUnitId) {
      const warning = `No matching company unit found for Zoho Department "${record.department}".`;
      rowWarnings.push(warning);
      pushWarning(summary, warningSet, warning);
    }

    const employeePayload: ImportEmployeePayload = {
      first_name: record.firstName || "Unknown",
      middle_name: record.middleName || null,
      last_name: record.lastName || null,
      email: record.workEmail || `${record.employeeId.toLowerCase()}@placeholder.local`,
      personal_email: record.personalEmail || null,
      phone: record.mobile || null,
      work_phone: record.workPhone || null,
      gender: record.gender || null,
      date_of_birth: record.dateOfBirth || null,
      national_id: record.nationalId || null,
      nationality: record.nationality || null,
      citizenship: record.citizenship || null,
      tin: record.tin || null,
      nssf_number: record.nssfNumber || null,
      passport_number: null,
      engagement_type: record.engagementType || null,
      employment_status: record.employeeStatus || "Active",
      designation: record.designation || null,
      work_location: record.workLocation || null,
      date_joined: record.dateOfJoining || null,
      company_id: companyId,
      company_unit_id: companyUnitId,
    };

    if (existingExternal && !existingEmployee) {
      const reason = `Existing Zoho mapping points to missing local employee ${existingExternal.employee_id}.`;
      const warnings = [...rowWarnings, reason];
      pushWarning(summary, warningSet, reason);
      summary.imported.failed += 1;
      plans.push({
        preview: {
          direction: "import",
          action: "error",
          zohoEmployeeId: record.employeeId,
          zohoRecordId: record.recordId,
          localEmployeeId: existingExternal.employee_id,
          displayName: buildDisplayName([record.firstName, record.middleName, record.lastName], record.employeeId),
          reason,
          warnings,
          fieldDiffs: [],
        },
        employeePayload,
        existingEmployee: null,
        externalMapping: existingExternal,
        countryCode: null,
        currency: null,
        shouldTouchMapping: false,
      });
      continue;
    }

    if (existingEmployee) {
      const fieldDiffs = buildImportFieldDiffs(
        existingEmployee,
        employeePayload,
        existingEmployee.company_id ? companyNameById.get(existingEmployee.company_id) || null : null,
        existingEmployee.company_unit_id ? unitNameById.get(existingEmployee.company_unit_id) || null : null,
        companyId ? companyNameById.get(companyId) || record.businessUnit || null : null,
        companyUnitId ? unitNameById.get(companyUnitId) || record.department || null : null,
      );
      const action: SyncAction = fieldDiffs.length > 0 ? "update" : "skip";
      if (action === "update") {
        summary.imported.updated += 1;
      } else {
        summary.imported.skipped += 1;
      }

      plans.push({
        preview: {
          direction: "import",
          action,
          zohoEmployeeId: record.employeeId,
          zohoRecordId: record.recordId,
          localEmployeeId: existingEmployee.id,
          displayName: buildDisplayName(
            [existingEmployee.first_name, existingEmployee.middle_name, existingEmployee.last_name],
            record.employeeId,
          ),
          reason: action === "update" ? "Local employee will be updated from Zoho." : "No inbound changes detected.",
          warnings: rowWarnings,
          fieldDiffs,
        },
        employeePayload,
        existingEmployee,
        externalMapping: existingExternal,
        countryCode: existingEmployee.country,
        currency: existingEmployee.currency,
        shouldTouchMapping: true,
      });
      continue;
    }

    const createFieldDiffs = buildImportFieldDiffs(
      null,
      employeePayload,
      null,
      null,
      companyId ? companyNameById.get(companyId) || record.businessUnit || null : null,
      companyUnitId ? unitNameById.get(companyUnitId) || record.department || null : null,
    );
    summary.imported.created += 1;
    plans.push({
      preview: {
        direction: "import",
        action: "create",
        zohoEmployeeId: record.employeeId,
        zohoRecordId: record.recordId,
        localEmployeeId: null,
        displayName: buildDisplayName([record.firstName, record.middleName, record.lastName], record.employeeId),
        reason: "A new local employee will be created from Zoho.",
        warnings: rowWarnings,
        fieldDiffs: createFieldDiffs,
      },
      employeePayload,
      existingEmployee: null,
      externalMapping: null,
      countryCode: companyId ? companyCountryCode.get(companyId) || "UG" : "UG",
      currency: companyId ? companyCurrencyById.get(companyId) || "UGX" : "UGX",
      shouldTouchMapping: false,
    });
  }

  return plans;
}

async function buildExportPlans(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  zohoEmployees: ZohoEmployeeRecord[],
  summary: ZohoSyncSummary,
  warningSet: Set<string>,
) {
  const employeesRes = await (supabaseAdmin as any)
    .from("employees")
    .select("id, first_name, middle_name, last_name, email, personal_email, phone, work_phone, gender, date_of_birth, national_id, tin, nssf_number, engagement_type, employment_status, designation, work_location, date_joined, nationality, citizenship, company_id, company_unit_id, status, country, currency")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  const employees = (employeesRes.data || []) as EmployeeRow[];

  const mappingsRes = await (supabaseAdmin as any)
    .from("employee_external_ids")
    .select("id, employee_id, external_id, external_record_id, external_label")
    .eq("organization_id", organizationId)
    .eq("provider", ZOHO_INTEGRATION_NAME);
  const mappings = (mappingsRes.data || []) as ExternalIdRow[];
  const mappingByEmployeeId = new Map(mappings.map((item) => [item.employee_id, item]));

  const companyIds = Array.from(new Set(employees.map((item) => item.company_id || "").filter(Boolean)));
  const unitIds = Array.from(new Set(employees.map((item) => item.company_unit_id || "").filter(Boolean)));
  const companiesRes = companyIds.length
    ? await (supabaseAdmin as any).from("companies").select("id, name").in("id", companyIds)
    : { data: [], error: null };
  const companyUnitsRes = unitIds.length
    ? await (supabaseAdmin as any).from("company_units").select("id, name").in("id", unitIds)
    : { data: [], error: null };
  const companyNameById = new Map(((companiesRes.data || []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]));
  const unitNameById = new Map(((companyUnitsRes.data || []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]));

  const zohoByRecordId = new Map<string, ZohoMappedEmployee>();
  const zohoByEmployeeId = new Map<string, ZohoMappedEmployee>();
  for (const rawRecord of zohoEmployees) {
    const mapped = mapZohoEmployee(rawRecord);
    if (mapped.recordId) zohoByRecordId.set(mapped.recordId, mapped);
    if (mapped.employeeId) zohoByEmployeeId.set(mapped.employeeId, mapped);
  }

  const plans: ExportPlan[] = [];

  for (const employee of employees) {
    const mapping = mappingByEmployeeId.get(employee.id) || null;
    const displayName = buildDisplayName([employee.first_name, employee.middle_name, employee.last_name], employee.email || employee.id);

    if (!mapping?.external_record_id) {
      summary.exported.skipped += 1;
      plans.push({
        preview: {
          direction: "export",
          action: "skip",
          zohoEmployeeId: mapping?.external_id || null,
          zohoRecordId: mapping?.external_record_id || null,
          localEmployeeId: employee.id,
          displayName,
          reason: "Employee is not linked to a Zoho record yet.",
          warnings: [],
          fieldDiffs: [],
        },
        employee,
        externalMapping: mapping,
        desiredPayload: {},
      });
      continue;
    }

    const desiredPayload = mapLocalEmployeeToZohoPayload(
      employee,
      employee.company_id ? companyNameById.get(employee.company_id) || null : null,
      employee.company_unit_id ? unitNameById.get(employee.company_unit_id) || null : null,
    );

    if (Object.keys(desiredPayload).length === 0) {
      summary.exported.skipped += 1;
      plans.push({
        preview: {
          direction: "export",
          action: "skip",
          zohoEmployeeId: mapping.external_id,
          zohoRecordId: mapping.external_record_id,
          localEmployeeId: employee.id,
          displayName,
          reason: "No outbound fields are available to sync.",
          warnings: [],
          fieldDiffs: [],
        },
        employee,
        externalMapping: mapping,
        desiredPayload,
      });
      continue;
    }

    const currentZoho = zohoByRecordId.get(mapping.external_record_id) || zohoByEmployeeId.get(mapping.external_id) || null;
    if (!currentZoho) {
      const warning = `Could not load the current Zoho record for local employee ${employee.id}.`;
      pushWarning(summary, warningSet, warning);
      summary.exported.failed += 1;
      plans.push({
        preview: {
          direction: "export",
          action: "error",
          zohoEmployeeId: mapping.external_id,
          zohoRecordId: mapping.external_record_id,
          localEmployeeId: employee.id,
          displayName,
          reason: "Current Zoho record could not be loaded for comparison.",
          warnings: [warning],
          fieldDiffs: [],
        },
        employee,
        externalMapping: mapping,
        desiredPayload,
      });
      continue;
    }

    const fieldDiffs = buildExportFieldDiffs(currentZoho, desiredPayload);
    const action: SyncAction = fieldDiffs.length > 0 ? "update" : "skip";
    if (action === "update") {
      summary.exported.updated += 1;
    } else {
      summary.exported.skipped += 1;
    }

    plans.push({
      preview: {
        direction: "export",
        action,
        zohoEmployeeId: mapping.external_id,
        zohoRecordId: mapping.external_record_id,
        localEmployeeId: employee.id,
        displayName,
        reason: action === "update" ? "Zoho employee will be updated from local data." : "No outbound changes detected.",
        warnings: [],
        fieldDiffs,
      },
      employee,
      externalMapping: mapping,
      desiredPayload,
    });
  }

  return plans;
}

async function executeImportPlans(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  plans: ImportPlan[],
) {
  for (const plan of plans) {
    if (!plan.employeePayload) continue;

    try {
      if (plan.preview.action === "update" && plan.existingEmployee) {
        const { error: updateError } = await (supabaseAdmin as any)
          .from("employees")
          .update({
            ...plan.employeePayload,
            updated_at: new Date().toISOString(),
            status: toStatus(plan.employeePayload.employment_status),
          })
          .eq("id", plan.existingEmployee.id)
          .eq("organization_id", organizationId);
        if (updateError) throw updateError;
      }

      if (plan.preview.action === "create") {
        const { data: createdEmployee, error: createError } = await (supabaseAdmin as any)
          .from("employees")
          .insert({
            employee_number: `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            organization_id: organizationId,
            first_name: plan.employeePayload.first_name,
            middle_name: plan.employeePayload.middle_name,
            last_name: plan.employeePayload.last_name,
            email: plan.employeePayload.email,
            personal_email: plan.employeePayload.personal_email,
            phone: plan.employeePayload.phone,
            work_phone: plan.employeePayload.work_phone,
            gender: plan.employeePayload.gender,
            date_of_birth: plan.employeePayload.date_of_birth,
            national_id: plan.employeePayload.national_id,
            nationality: plan.employeePayload.nationality,
            citizenship: plan.employeePayload.citizenship,
            tin: plan.employeePayload.tin,
            nssf_number: plan.employeePayload.nssf_number,
            engagement_type: plan.employeePayload.engagement_type,
            employment_status: plan.employeePayload.employment_status,
            designation: plan.employeePayload.designation,
            work_location: plan.employeePayload.work_location,
            date_joined: plan.employeePayload.date_joined,
            company_id: plan.employeePayload.company_id,
            company_unit_id: plan.employeePayload.company_unit_id,
            category: "head_office",
            employee_type: "regular",
            pay_type: "salary",
            pay_rate: 0,
            country: plan.countryCode || "UG",
            currency: plan.currency || "UGX",
            status: toStatus(plan.employeePayload.employment_status),
          })
          .select("id")
          .single();
        if (createError) throw createError;

        if (plan.preview.zohoEmployeeId) {
          const { error: mappingError } = await (supabaseAdmin as any)
            .from("employee_external_ids")
            .insert({
              organization_id: organizationId,
              employee_id: createdEmployee.id,
              provider: ZOHO_INTEGRATION_NAME,
              external_id: plan.preview.zohoEmployeeId,
              external_record_id: plan.preview.zohoRecordId,
              external_label: plan.preview.zohoEmployeeId,
              metadata: { source: "zoho_people" },
              last_seen_at: new Date().toISOString(),
              last_inbound_synced_at: new Date().toISOString(),
            });
          if (mappingError) throw mappingError;
        }
      }

      if (plan.externalMapping && plan.shouldTouchMapping) {
        const { error: mappingUpdateError } = await (supabaseAdmin as any)
          .from("employee_external_ids")
          .update({
            external_record_id: plan.preview.zohoRecordId,
            external_label: plan.preview.zohoEmployeeId,
            last_seen_at: new Date().toISOString(),
            last_inbound_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.externalMapping.id);
        if (mappingUpdateError) throw mappingUpdateError;
      }
    } catch (error) {
      console.error("Zoho import apply failed:", error);
      throw error;
    }
  }
}

async function executeExportPlans(
  accessToken: string,
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  plans: ExportPlan[],
) {
  const config = getZohoConfig();

  for (const plan of plans) {
    if (plan.preview.action !== "update" || !plan.externalMapping?.external_record_id) continue;

    const body = new URLSearchParams();
    body.set("recordId", plan.externalMapping.external_record_id);
    body.set("inputData", JSON.stringify(plan.desiredPayload));

    await zohoFetch(`${config.peopleBaseUrl}/api/forms/json/${config.employeeFormLink}/updateRecord`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const { error } = await (supabaseAdmin as any)
      .from("employee_external_ids")
      .update({
        last_outbound_synced_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.externalMapping.id);

    if (error) throw error;
  }
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { organizationId, mode, dryRun, previewLimit } = parsed.data;
    const supabaseAdmin = createServiceRoleClient();
    const { user } = await requireOrgIntegrationAccess(supabaseAdmin, req, organizationId);
    const { accessToken } = await getValidZohoAccessToken(supabaseAdmin, organizationId);

    const startedAt = new Date().toISOString();
    const syncId = crypto.randomUUID();
    let syncLogId: string | null = null;

    if (!dryRun) {
      const { data: syncLog, error: logError } = await (supabaseAdmin as any)
        .from("sync_logs")
        .insert({
          organization_id: organizationId,
          sync_id: syncId,
          type: "employees",
          direction: mode,
          status: "processing",
          started_at: startedAt,
          records_processed: 0,
          records_failed: 0,
          metadata: { provider: ZOHO_INTEGRATION_NAME, initiated_by: user.id, dry_run: false },
        })
        .select("id")
        .single();

      if (logError) throw logError;
      syncLogId = syncLog.id;
    }

    const summary: ZohoSyncSummary = {
      mode,
      dryRun,
      imported: { created: 0, updated: 0, skipped: 0, failed: 0 },
      exported: { updated: 0, skipped: 0, failed: 0 },
      warnings: [],
    };
    const warningSet = new Set<string>();

    const zohoEmployees = await fetchAllZohoEmployees(accessToken);
    const importPlans = mode === "import" || mode === "bidirectional"
      ? await buildImportPlans(supabaseAdmin, organizationId, zohoEmployees, summary, warningSet)
      : [];
    const exportPlans = mode === "export" || mode === "bidirectional"
      ? await buildExportPlans(supabaseAdmin, organizationId, zohoEmployees, summary, warningSet)
      : [];

    if (!dryRun) {
      if (importPlans.length > 0) {
        await executeImportPlans(supabaseAdmin, organizationId, importPlans);
      }
      if (exportPlans.length > 0) {
        await executeExportPlans(accessToken, supabaseAdmin, exportPlans);
      }
    }

    const previewRows = [...importPlans.map((plan) => plan.preview), ...exportPlans.map((plan) => plan.preview)];
    const effectivePreviewLimit = dryRun ? previewLimit || DEFAULT_PREVIEW_LIMIT : null;
    const preview: ZohoSyncPreview | null = dryRun
      ? {
        generatedAt: new Date().toISOString(),
        previewLimit: effectivePreviewLimit,
        totalRows: previewRows.length,
        truncated: previewRows.length > effectivePreviewLimit,
        rows: previewRows.slice(0, effectivePreviewLimit),
      }
      : null;

    if (syncLogId) {
      const totalFailed = summary.imported.failed + summary.exported.failed;
      const totalProcessed =
        summary.imported.created +
        summary.imported.updated +
        summary.imported.skipped +
        summary.exported.updated +
        summary.exported.skipped;

      await (supabaseAdmin as any)
        .from("sync_logs")
        .update({
          status: totalFailed > 0 ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          records_processed: totalProcessed,
          records_failed: totalFailed,
          error_message: totalFailed > 0 ? "One or more records failed during Zoho employee sync" : null,
          metadata: { provider: ZOHO_INTEGRATION_NAME, summary, initiated_by: user.id, dry_run: false },
        })
        .eq("id", syncLogId);
    }

    return jsonResponse({ success: true, summary, preview }, { status: 200 });
  } catch (error) {
    console.error("zoho-sync-employees error:", error);
    return jsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Zoho employee sync failed" },
      { status: 500 },
    );
  }
});

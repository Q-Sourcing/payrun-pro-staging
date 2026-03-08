import { supabase } from "@/integrations/supabase/client";

export interface EmployeeAddressRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  address_type: "present" | "permanent" | "mailing" | "other";
  line_1: string;
  line_2?: string | null;
  city?: string | null;
  district?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  is_primary?: boolean;
  source?: "manual" | "zoho_people";
}

export interface EmployeeDependentRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  full_name: string;
  relationship: string;
  date_of_birth?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  source?: "manual" | "zoho_people";
}

export interface EmployeeEducationRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  institution_name: string;
  degree_diploma?: string | null;
  specialization?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  date_of_completion?: string | null;
  source?: "manual" | "zoho_people";
}

export interface EmployeeWorkExperienceRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  employer_name: string;
  job_title?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  job_description?: string | null;
  relevant?: boolean;
  source?: "manual" | "zoho_people";
}

export interface EmployeeDocumentRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  document_type: string;
  title: string;
  description?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  external_document_id?: string | null;
  source?: "manual" | "zoho_people";
  uploaded_at?: string;
}

type TableName =
  | "employee_addresses"
  | "employee_dependents"
  | "employee_education"
  | "employee_work_experience"
  | "employee_documents";

async function listByEmployee<T>(table: TableName, employeeId: string): Promise<T[]> {
  const { data, error } = await (supabase as any)
    .from(table)
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error loading ${table}:`, error);
    throw new Error(`Failed to load ${table}`);
  }

  return (data || []) as T[];
}

async function createRecord<T>(table: TableName, payload: Partial<T>): Promise<T> {
  const { data, error } = await (supabase as any)
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error(`Error creating ${table}:`, error);
    throw new Error(`Failed to create ${table}`);
  }

  return data as T;
}

async function updateRecord<T>(table: TableName, id: string, payload: Partial<T>): Promise<T> {
  const { data, error } = await (supabase as any)
    .from(table)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error(`Error updating ${table}:`, error);
    throw new Error(`Failed to update ${table}`);
  }

  return data as T;
}

async function deleteRecord(table: TableName, id: string): Promise<void> {
  const { error } = await (supabase as any).from(table).delete().eq("id", id);

  if (error) {
    console.error(`Error deleting ${table}:`, error);
    throw new Error(`Failed to delete ${table}`);
  }
}

export class EmployeeHrRecordsService {
  static listAddresses(employeeId: string) {
    return listByEmployee<EmployeeAddressRecord>("employee_addresses", employeeId);
  }

  static createAddress(payload: Partial<EmployeeAddressRecord>) {
    return createRecord<EmployeeAddressRecord>("employee_addresses", payload);
  }

  static updateAddress(id: string, payload: Partial<EmployeeAddressRecord>) {
    return updateRecord<EmployeeAddressRecord>("employee_addresses", id, payload);
  }

  static deleteAddress(id: string) {
    return deleteRecord("employee_addresses", id);
  }

  static listDependents(employeeId: string) {
    return listByEmployee<EmployeeDependentRecord>("employee_dependents", employeeId);
  }

  static createDependent(payload: Partial<EmployeeDependentRecord>) {
    return createRecord<EmployeeDependentRecord>("employee_dependents", payload);
  }

  static updateDependent(id: string, payload: Partial<EmployeeDependentRecord>) {
    return updateRecord<EmployeeDependentRecord>("employee_dependents", id, payload);
  }

  static deleteDependent(id: string) {
    return deleteRecord("employee_dependents", id);
  }

  static listEducation(employeeId: string) {
    return listByEmployee<EmployeeEducationRecord>("employee_education", employeeId);
  }

  static createEducation(payload: Partial<EmployeeEducationRecord>) {
    return createRecord<EmployeeEducationRecord>("employee_education", payload);
  }

  static updateEducation(id: string, payload: Partial<EmployeeEducationRecord>) {
    return updateRecord<EmployeeEducationRecord>("employee_education", id, payload);
  }

  static deleteEducation(id: string) {
    return deleteRecord("employee_education", id);
  }

  static listWorkExperience(employeeId: string) {
    return listByEmployee<EmployeeWorkExperienceRecord>("employee_work_experience", employeeId);
  }

  static createWorkExperience(payload: Partial<EmployeeWorkExperienceRecord>) {
    return createRecord<EmployeeWorkExperienceRecord>("employee_work_experience", payload);
  }

  static updateWorkExperience(id: string, payload: Partial<EmployeeWorkExperienceRecord>) {
    return updateRecord<EmployeeWorkExperienceRecord>("employee_work_experience", id, payload);
  }

  static deleteWorkExperience(id: string) {
    return deleteRecord("employee_work_experience", id);
  }

  static listDocuments(employeeId: string) {
    return listByEmployee<EmployeeDocumentRecord>("employee_documents", employeeId);
  }

  static createDocument(payload: Partial<EmployeeDocumentRecord>) {
    return createRecord<EmployeeDocumentRecord>("employee_documents", payload);
  }

  static updateDocument(id: string, payload: Partial<EmployeeDocumentRecord>) {
    return updateRecord<EmployeeDocumentRecord>("employee_documents", id, payload);
  }

  static deleteDocument(id: string) {
    return deleteRecord("employee_documents", id);
  }
}

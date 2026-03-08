// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type {
  EhsRiskAssessment, EhsRiskAssessmentItem, EhsPpeType, EhsPpeRecord,
  EhsPermit, EhsEnvironmentalIncident, EhsEmergencyDrill, EhsComplianceRequirement
} from '@/lib/types/ehs-phase2';

// ─── Risk Assessments ────────────────────────────────────
export async function getRiskAssessments(orgId: string, projectId?: string) {
  let q = supabase.from('ehs_risk_assessments').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data as EhsRiskAssessment[];
}

export async function createRiskAssessment(ra: Partial<EhsRiskAssessment>) {
  const { data, error } = await supabase.from('ehs_risk_assessments').insert(ra).select().single();
  if (error) throw error;
  return data as EhsRiskAssessment;
}

export async function updateRiskAssessment(id: string, updates: Partial<EhsRiskAssessment>) {
  const { data, error } = await supabase.from('ehs_risk_assessments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsRiskAssessment;
}

export async function getRiskAssessmentItems(assessmentId: string) {
  const { data, error } = await supabase.from('ehs_risk_assessment_items').select('*').eq('assessment_id', assessmentId).order('sort_order');
  if (error) throw error;
  return data as EhsRiskAssessmentItem[];
}

export async function upsertRiskAssessmentItems(items: Partial<EhsRiskAssessmentItem>[]) {
  const { data, error } = await supabase.from('ehs_risk_assessment_items').upsert(items).select();
  if (error) throw error;
  return data as EhsRiskAssessmentItem[];
}

// ─── PPE ─────────────────────────────────────────────────
export async function getPpeTypes(orgId: string) {
  const { data, error } = await supabase.from('ehs_ppe_types').select('*').eq('organization_id', orgId).order('name');
  if (error) throw error;
  return data as EhsPpeType[];
}

export async function createPpeType(t: Partial<EhsPpeType>) {
  const { data, error } = await supabase.from('ehs_ppe_types').insert(t).select().single();
  if (error) throw error;
  return data as EhsPpeType;
}

export async function getPpeRecords(orgId: string, projectId?: string) {
  let q = supabase.from('ehs_ppe_records').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data as EhsPpeRecord[];
}

export async function createPpeRecord(r: Partial<EhsPpeRecord>) {
  const { data, error } = await supabase.from('ehs_ppe_records').insert(r).select().single();
  if (error) throw error;
  return data as EhsPpeRecord;
}

export async function updatePpeRecord(id: string, updates: Partial<EhsPpeRecord>) {
  const { data, error } = await supabase.from('ehs_ppe_records').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsPpeRecord;
}

// ─── Permits ─────────────────────────────────────────────
export async function getPermits(orgId: string, projectId?: string) {
  let q = supabase.from('ehs_permits').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data as EhsPermit[];
}

export async function createPermit(p: Partial<EhsPermit>) {
  const { data, error } = await supabase.from('ehs_permits').insert(p).select().single();
  if (error) throw error;
  return data as EhsPermit;
}

export async function updatePermit(id: string, updates: Partial<EhsPermit>) {
  const { data, error } = await supabase.from('ehs_permits').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsPermit;
}

// ─── Environmental Incidents ─────────────────────────────
export async function getEnvironmentalIncidents(orgId: string, projectId?: string) {
  let q = supabase.from('ehs_environmental_incidents').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data as EhsEnvironmentalIncident[];
}

export async function createEnvironmentalIncident(i: Partial<EhsEnvironmentalIncident>) {
  const { data, error } = await supabase.from('ehs_environmental_incidents').insert(i).select().single();
  if (error) throw error;
  return data as EhsEnvironmentalIncident;
}

export async function updateEnvironmentalIncident(id: string, updates: Partial<EhsEnvironmentalIncident>) {
  const { data, error } = await supabase.from('ehs_environmental_incidents').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsEnvironmentalIncident;
}

// ─── Emergency Drills ────────────────────────────────────
export async function getEmergencyDrills(orgId: string, projectId?: string) {
  let q = supabase.from('ehs_emergency_drills').select('*').eq('organization_id', orgId).order('scheduled_date', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data as EhsEmergencyDrill[];
}

export async function createEmergencyDrill(d: Partial<EhsEmergencyDrill>) {
  const { data, error } = await supabase.from('ehs_emergency_drills').insert(d).select().single();
  if (error) throw error;
  return data as EhsEmergencyDrill;
}

export async function updateEmergencyDrill(id: string, updates: Partial<EhsEmergencyDrill>) {
  const { data, error } = await supabase.from('ehs_emergency_drills').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsEmergencyDrill;
}

// ─── Compliance ──────────────────────────────────────────
export async function getComplianceRequirements(orgId: string) {
  const { data, error } = await supabase.from('ehs_compliance_requirements').select('*').eq('organization_id', orgId).order('regulation_name');
  if (error) throw error;
  return data as EhsComplianceRequirement[];
}

export async function createComplianceRequirement(c: Partial<EhsComplianceRequirement>) {
  const { data, error } = await supabase.from('ehs_compliance_requirements').insert(c).select().single();
  if (error) throw error;
  return data as EhsComplianceRequirement;
}

export async function updateComplianceRequirement(id: string, updates: Partial<EhsComplianceRequirement>) {
  const { data, error } = await supabase.from('ehs_compliance_requirements').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsComplianceRequirement;
}

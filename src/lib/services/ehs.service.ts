// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type {
  EhsIncident, EhsHazard, EhsInspection, EhsInspectionItem,
  EhsInspectionTemplate, EhsTrainingRecord, EhsCorrectiveAction,
  EhsDashboardKpis
} from '@/lib/types/ehs';

// ─── Incidents ───────────────────────────────────────────
export async function getIncidents(orgId: string, projectId?: string) {
  let query = supabase.from('ehs_incidents').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data as EhsIncident[];
}

export async function getIncident(id: string) {
  const { data, error } = await supabase.from('ehs_incidents').select('*').eq('id', id).single();
  if (error) throw error;
  return data as EhsIncident;
}

export async function createIncident(incident: Partial<EhsIncident>) {
  const { data, error } = await supabase.from('ehs_incidents').insert(incident).select().single();
  if (error) throw error;
  return data as EhsIncident;
}

export async function updateIncident(id: string, updates: Partial<EhsIncident>) {
  const { data, error } = await supabase.from('ehs_incidents').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsIncident;
}

// ─── Hazards ─────────────────────────────────────────────
export async function getHazards(orgId: string, projectId?: string) {
  let query = supabase.from('ehs_hazards').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data as EhsHazard[];
}

export async function createHazard(hazard: Partial<EhsHazard>) {
  const { data, error } = await supabase.from('ehs_hazards').insert(hazard).select().single();
  if (error) throw error;
  return data as EhsHazard;
}

export async function updateHazard(id: string, updates: Partial<EhsHazard>) {
  const { data, error } = await supabase.from('ehs_hazards').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsHazard;
}

// ─── Inspections ─────────────────────────────────────────
export async function getInspections(orgId: string, projectId?: string) {
  let query = supabase.from('ehs_inspections').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data as EhsInspection[];
}

export async function createInspection(inspection: Partial<EhsInspection>) {
  const { data, error } = await supabase.from('ehs_inspections').insert(inspection).select().single();
  if (error) throw error;
  return data as EhsInspection;
}

export async function updateInspection(id: string, updates: Partial<EhsInspection>) {
  const { data, error } = await supabase.from('ehs_inspections').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsInspection;
}

// ─── Inspection Items ────────────────────────────────────
export async function getInspectionItems(inspectionId: string) {
  const { data, error } = await supabase.from('ehs_inspection_items').select('*').eq('inspection_id', inspectionId);
  if (error) throw error;
  return data as EhsInspectionItem[];
}

export async function upsertInspectionItems(items: Partial<EhsInspectionItem>[]) {
  const { data, error } = await supabase.from('ehs_inspection_items').upsert(items).select();
  if (error) throw error;
  return data as EhsInspectionItem[];
}

// ─── Inspection Templates ────────────────────────────────
export async function getInspectionTemplates(orgId: string) {
  const { data, error } = await supabase.from('ehs_inspection_templates').select('*').eq('organization_id', orgId).order('name');
  if (error) throw error;
  return data as EhsInspectionTemplate[];
}

export async function createInspectionTemplate(template: Partial<EhsInspectionTemplate>) {
  const { data, error } = await supabase.from('ehs_inspection_templates').insert(template).select().single();
  if (error) throw error;
  return data as EhsInspectionTemplate;
}

// ─── Training Records ────────────────────────────────────
export async function getTrainingRecords(orgId: string, projectId?: string) {
  let query = supabase.from('ehs_training_records').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data as EhsTrainingRecord[];
}

export async function createTrainingRecord(record: Partial<EhsTrainingRecord>) {
  const { data, error } = await supabase.from('ehs_training_records').insert(record).select().single();
  if (error) throw error;
  return data as EhsTrainingRecord;
}

export async function updateTrainingRecord(id: string, updates: Partial<EhsTrainingRecord>) {
  const { data, error } = await supabase.from('ehs_training_records').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsTrainingRecord;
}

// ─── Corrective Actions ──────────────────────────────────
export async function getCorrectiveActions(orgId: string, projectId?: string) {
  let query = supabase.from('ehs_corrective_actions').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data as EhsCorrectiveAction[];
}

export async function createCorrectiveAction(action: Partial<EhsCorrectiveAction>) {
  const { data, error } = await supabase.from('ehs_corrective_actions').insert(action).select().single();
  if (error) throw error;
  return data as EhsCorrectiveAction;
}

export async function updateCorrectiveAction(id: string, updates: Partial<EhsCorrectiveAction>) {
  const { data, error } = await supabase.from('ehs_corrective_actions').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EhsCorrectiveAction;
}

// ─── Dashboard KPIs ──────────────────────────────────────
export async function getDashboardKpis(orgId: string): Promise<EhsDashboardKpis> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

  const [incidents, hazards, inspections, training, cas, lastIncident] = await Promise.all([
    supabase.from('ehs_incidents').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).gte('created_at', firstOfMonth),
    supabase.from('ehs_hazards').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).neq('status', 'resolved'),
    supabase.from('ehs_inspections').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'scheduled').lte('scheduled_date', now.toISOString().split('T')[0]),
    supabase.from('ehs_training_records').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).lte('expiry_date', thirtyDaysFromNow).neq('status', 'expired'),
    supabase.from('ehs_corrective_actions').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).neq('status', 'closed'),
    supabase.from('ehs_incidents').select('incident_date')
      .eq('organization_id', orgId).neq('severity', 'near_miss')
      .order('incident_date', { ascending: false }).limit(1),
  ]);

  const lastIncidentDate = lastIncident.data?.[0]?.incident_date;
  const daysWithout = lastIncidentDate
    ? Math.floor((now.getTime() - new Date(lastIncidentDate).getTime()) / 86400000)
    : 999;

  return {
    totalIncidentsThisMonth: incidents.count ?? 0,
    openHazards: hazards.count ?? 0,
    inspectionsDue: inspections.count ?? 0,
    expiringCertifications: training.count ?? 0,
    daysWithoutIncident: daysWithout,
    openCorrectiveActions: cas.count ?? 0,
  };
}

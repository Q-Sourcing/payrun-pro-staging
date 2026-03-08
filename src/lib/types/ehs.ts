// EHS Module TypeScript Types

export type EhsIncidentType = 'injury' | 'fatality' | 'property_damage' | 'environmental_spill' | 'near_miss' | 'unsafe_condition' | 'unsafe_act';
export type EhsIncidentSeverity = 'near_miss' | 'first_aid' | 'medical_treatment' | 'lost_time_injury' | 'fatality';
export type EhsIncidentStatus = 'reported' | 'under_investigation' | 'root_cause_identified' | 'corrective_action' | 'closed';
export type EhsHazardRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type EhsHazardStatus = 'reported' | 'assigned' | 'mitigation_in_progress' | 'resolved';
export type EhsObservationType = 'hazard' | 'safety_observation';
export type EhsInspectionType = 'daily' | 'weekly' | 'monthly' | 'compliance_audit';
export type EhsInspectionStatus = 'scheduled' | 'in_progress' | 'completed';
export type EhsInspectionResult = 'pass' | 'fail' | 'needs_attention';
export type EhsTrainingType = 'first_aid' | 'fire_safety' | 'working_at_height' | 'equipment_operation' | 'hazmat_handling' | 'other';
export type EhsTrainingStatus = 'valid' | 'expired' | 'expiring_soon';
export type EhsCaSourceType = 'incident' | 'hazard' | 'inspection';
export type EhsCaPriority = 'low' | 'medium' | 'high' | 'critical';
export type EhsCaStatus = 'open' | 'in_progress' | 'closed' | 'overdue';

export interface EhsIncident {
  id: string;
  organization_id: string;
  project_id?: string | null;
  company_id?: string | null;
  incident_number: string;
  title: string;
  description?: string | null;
  incident_date: string;
  incident_time?: string | null;
  site_location?: string | null;
  reported_by?: string | null;
  employees_involved?: string[];
  supervisor_id?: string | null;
  incident_type: EhsIncidentType;
  severity: EhsIncidentSeverity;
  classification?: string | null;
  immediate_action_taken?: string | null;
  photos?: string[];
  status: EhsIncidentStatus;
  investigator_id?: string | null;
  root_cause?: string | null;
  root_cause_category?: string | null;
  lost_days?: number;
  injury_type?: string | null;
  body_part_affected?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsHazard {
  id: string;
  organization_id: string;
  project_id?: string | null;
  company_id?: string | null;
  hazard_number: string;
  site_location?: string | null;
  description: string;
  risk_level: EhsHazardRiskLevel;
  photos?: string[];
  reported_by?: string | null;
  observation_type: EhsObservationType;
  assigned_to?: string | null;
  status: EhsHazardStatus;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsInspectionTemplate {
  id: string;
  organization_id: string;
  name: string;
  category?: string | null;
  checklist_items: Array<{ item: string; category: string }>;
  created_at: string;
  updated_at: string;
}

export interface EhsInspection {
  id: string;
  organization_id: string;
  project_id?: string | null;
  company_id?: string | null;
  inspection_number: string;
  type: EhsInspectionType;
  template_id?: string | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  inspector_id?: string | null;
  status: EhsInspectionStatus;
  overall_score?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsInspectionItem {
  id: string;
  inspection_id: string;
  checklist_item: string;
  category?: string | null;
  result?: EhsInspectionResult | null;
  finding_text?: string | null;
  photo_url?: string | null;
  auto_hazard_id?: string | null;
  created_at: string;
}

export interface EhsTrainingRecord {
  id: string;
  organization_id: string;
  project_id?: string | null;
  employee_id: string;
  training_type: EhsTrainingType;
  course_name: string;
  trainer?: string | null;
  provider?: string | null;
  completed_date?: string | null;
  expiry_date?: string | null;
  certificate_number?: string | null;
  certificate_url?: string | null;
  status: EhsTrainingStatus;
  created_at: string;
  updated_at: string;
}

export interface EhsCorrectiveAction {
  id: string;
  organization_id: string;
  project_id?: string | null;
  source_type: EhsCaSourceType;
  source_id: string;
  description: string;
  assigned_to?: string | null;
  responsible_person?: string | null;
  due_date?: string | null;
  closed_at?: string | null;
  priority: EhsCaPriority;
  status: EhsCaStatus;
  evidence_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Dashboard KPI types
export interface EhsDashboardKpis {
  totalIncidentsThisMonth: number;
  openHazards: number;
  inspectionsDue: number;
  expiringCertifications: number;
  daysWithoutIncident: number;
  openCorrectiveActions: number;
}

// Severity display helpers
export const SEVERITY_LABELS: Record<EhsIncidentSeverity, string> = {
  near_miss: 'Near Miss',
  first_aid: 'First Aid',
  medical_treatment: 'Medical Treatment',
  lost_time_injury: 'Lost Time Injury',
  fatality: 'Fatality',
};

export const SEVERITY_COLORS: Record<EhsIncidentSeverity, string> = {
  near_miss: 'bg-blue-100 text-blue-800',
  first_aid: 'bg-yellow-100 text-yellow-800',
  medical_treatment: 'bg-orange-100 text-orange-800',
  lost_time_injury: 'bg-red-100 text-red-800',
  fatality: 'bg-red-200 text-red-900',
};

export const RISK_LEVEL_COLORS: Record<EhsHazardRiskLevel, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const PRIORITY_COLORS: Record<EhsCaPriority, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const INCIDENT_TYPE_LABELS: Record<EhsIncidentType, string> = {
  injury: 'Injury',
  fatality: 'Fatality',
  property_damage: 'Property Damage',
  environmental_spill: 'Environmental Spill',
  near_miss: 'Near Miss',
  unsafe_condition: 'Unsafe Condition',
  unsafe_act: 'Unsafe Act',
};

export const INSPECTION_TYPE_LABELS: Record<EhsInspectionType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  compliance_audit: 'Compliance Audit',
};

export const TRAINING_TYPE_LABELS: Record<EhsTrainingType, string> = {
  first_aid: 'First Aid',
  fire_safety: 'Fire Safety',
  working_at_height: 'Working at Height',
  equipment_operation: 'Equipment Operation',
  hazmat_handling: 'Hazmat Handling',
  other: 'Other',
};

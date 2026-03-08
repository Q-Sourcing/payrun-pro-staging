// EHS Phase 2 TypeScript Types

export type EhsRiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
export type EhsRiskConsequence = 'insignificant' | 'minor' | 'moderate' | 'major' | 'catastrophic';
export type EhsRiskAssessmentStatus = 'draft' | 'active' | 'archived';
export type EhsPpeCondition = 'new' | 'good' | 'fair' | 'poor' | 'condemned';
export type EhsPpeStatus = 'issued' | 'returned' | 'lost' | 'condemned';
export type EhsPermitType = 'hot_work' | 'confined_space' | 'excavation' | 'working_at_height' | 'electrical' | 'other';
export type EhsPermitStatus = 'requested' | 'approved' | 'active' | 'expired' | 'cancelled';
export type EhsEnvironmentalType = 'spill' | 'emission' | 'waste_violation' | 'noise' | 'water_contamination' | 'other';
export type EhsEnvironmentalSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type EhsDrillType = 'fire' | 'evacuation' | 'earthquake' | 'chemical_spill' | 'medical' | 'other';
export type EhsDrillStatus = 'planned' | 'completed' | 'cancelled';
export type EhsComplianceStatus = 'compliant' | 'non_compliant' | 'partially_compliant' | 'under_review';

export interface EhsRiskAssessment {
  id: string;
  organization_id: string;
  project_id?: string | null;
  company_id?: string | null;
  assessment_number: string;
  title: string;
  description?: string | null;
  job_activity?: string | null;
  location?: string | null;
  assessed_by?: string | null;
  approved_by?: string | null;
  assessment_date: string;
  review_date?: string | null;
  status: EhsRiskAssessmentStatus;
  created_at: string;
  updated_at: string;
}

export interface EhsRiskAssessmentItem {
  id: string;
  assessment_id: string;
  hazard_description: string;
  consequence?: string | null;
  existing_controls?: string | null;
  likelihood_before: EhsRiskLikelihood;
  consequence_before: EhsRiskConsequence;
  risk_score_before?: number | null;
  additional_controls?: string | null;
  likelihood_after?: EhsRiskLikelihood | null;
  consequence_after?: EhsRiskConsequence | null;
  risk_score_after?: number | null;
  responsible_person?: string | null;
  sort_order: number;
  created_at: string;
}

export interface EhsPpeType {
  id: string;
  organization_id: string;
  name: string;
  category?: string | null;
  inspection_interval_days?: number | null;
  lifespan_months?: number | null;
  created_at: string;
  updated_at: string;
}

export interface EhsPpeRecord {
  id: string;
  organization_id: string;
  project_id?: string | null;
  ppe_type_id: string;
  employee_id: string;
  serial_number?: string | null;
  issued_date: string;
  returned_date?: string | null;
  last_inspection_date?: string | null;
  next_inspection_date?: string | null;
  condition: EhsPpeCondition;
  status: EhsPpeStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsPermit {
  id: string;
  organization_id: string;
  project_id?: string | null;
  permit_number: string;
  permit_type: EhsPermitType;
  title: string;
  description?: string | null;
  location?: string | null;
  requested_by?: string | null;
  approved_by?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  status: EhsPermitStatus;
  precautions?: string | null;
  emergency_procedures?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsEnvironmentalIncident {
  id: string;
  organization_id: string;
  project_id?: string | null;
  incident_number: string;
  type: EhsEnvironmentalType;
  severity: EhsEnvironmentalSeverity;
  title: string;
  description?: string | null;
  location?: string | null;
  incident_date: string;
  reported_by?: string | null;
  containment_actions?: string | null;
  cleanup_actions?: string | null;
  regulatory_notification?: boolean;
  status: string;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsEmergencyDrill {
  id: string;
  organization_id: string;
  project_id?: string | null;
  drill_type: EhsDrillType;
  title: string;
  description?: string | null;
  scheduled_date: string;
  actual_date?: string | null;
  duration_minutes?: number | null;
  participants_count?: number | null;
  evacuation_time_seconds?: number | null;
  status: EhsDrillStatus;
  observations?: string | null;
  improvements?: string | null;
  conducted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EhsComplianceRequirement {
  id: string;
  organization_id: string;
  regulation_name: string;
  regulation_body?: string | null;
  requirement_description: string;
  category?: string | null;
  compliance_status: EhsComplianceStatus;
  due_date?: string | null;
  last_audit_date?: string | null;
  next_audit_date?: string | null;
  responsible_person?: string | null;
  evidence_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Display helpers
export const LIKELIHOOD_LABELS: Record<EhsRiskLikelihood, string> = {
  rare: 'Rare', unlikely: 'Unlikely', possible: 'Possible', likely: 'Likely', almost_certain: 'Almost Certain',
};

export const CONSEQUENCE_LABELS: Record<EhsRiskConsequence, string> = {
  insignificant: 'Insignificant', minor: 'Minor', moderate: 'Moderate', major: 'Major', catastrophic: 'Catastrophic',
};

export const PERMIT_TYPE_LABELS: Record<EhsPermitType, string> = {
  hot_work: 'Hot Work', confined_space: 'Confined Space', excavation: 'Excavation',
  working_at_height: 'Working at Height', electrical: 'Electrical', other: 'Other',
};

export const PERMIT_STATUS_COLORS: Record<EhsPermitStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800', cancelled: 'bg-muted text-muted-foreground',
};

export const PPE_CONDITION_COLORS: Record<EhsPpeCondition, string> = {
  new: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800', poor: 'bg-orange-100 text-orange-800', condemned: 'bg-red-100 text-red-800',
};

export const ENV_SEVERITY_COLORS: Record<EhsEnvironmentalSeverity, string> = {
  minor: 'bg-yellow-100 text-yellow-800', moderate: 'bg-orange-100 text-orange-800',
  major: 'bg-red-100 text-red-800', critical: 'bg-red-200 text-red-900',
};

export const DRILL_TYPE_LABELS: Record<EhsDrillType, string> = {
  fire: 'Fire', evacuation: 'Evacuation', earthquake: 'Earthquake',
  chemical_spill: 'Chemical Spill', medical: 'Medical', other: 'Other',
};

export const COMPLIANCE_STATUS_COLORS: Record<EhsComplianceStatus, string> = {
  compliant: 'bg-green-100 text-green-800', non_compliant: 'bg-red-100 text-red-800',
  partially_compliant: 'bg-yellow-100 text-yellow-800', under_review: 'bg-blue-100 text-blue-800',
};

export function getRiskColor(score: number | null | undefined): string {
  if (!score) return 'bg-muted text-muted-foreground';
  if (score <= 4) return 'bg-green-100 text-green-800';
  if (score <= 9) return 'bg-yellow-100 text-yellow-800';
  if (score <= 15) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export function getRiskLabel(score: number | null | undefined): string {
  if (!score) return 'N/A';
  if (score <= 4) return 'Low';
  if (score <= 9) return 'Medium';
  if (score <= 15) return 'High';
  return 'Critical';
}

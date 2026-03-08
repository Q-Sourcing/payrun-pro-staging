
-- =============================================
-- EHS Module Phase 1 — Tables, Enums, RLS, Triggers
-- =============================================

-- 1. Create enums
CREATE TYPE public.ehs_incident_type AS ENUM (
  'injury', 'fatality', 'property_damage', 'environmental_spill',
  'near_miss', 'unsafe_condition', 'unsafe_act'
);

CREATE TYPE public.ehs_incident_severity AS ENUM (
  'near_miss', 'first_aid', 'medical_treatment', 'lost_time_injury', 'fatality'
);

CREATE TYPE public.ehs_incident_status AS ENUM (
  'reported', 'under_investigation', 'root_cause_identified', 'corrective_action', 'closed'
);

CREATE TYPE public.ehs_hazard_risk_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE public.ehs_hazard_status AS ENUM ('reported', 'assigned', 'mitigation_in_progress', 'resolved');

CREATE TYPE public.ehs_observation_type AS ENUM ('hazard', 'safety_observation');

CREATE TYPE public.ehs_inspection_type AS ENUM ('daily', 'weekly', 'monthly', 'compliance_audit');

CREATE TYPE public.ehs_inspection_status AS ENUM ('scheduled', 'in_progress', 'completed');

CREATE TYPE public.ehs_inspection_result AS ENUM ('pass', 'fail', 'needs_attention');

CREATE TYPE public.ehs_training_type AS ENUM (
  'first_aid', 'fire_safety', 'working_at_height',
  'equipment_operation', 'hazmat_handling', 'other'
);

CREATE TYPE public.ehs_training_status AS ENUM ('valid', 'expired', 'expiring_soon');

CREATE TYPE public.ehs_ca_source_type AS ENUM ('incident', 'hazard', 'inspection');

CREATE TYPE public.ehs_ca_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE public.ehs_ca_status AS ENUM ('open', 'in_progress', 'closed', 'overdue');

-- 2. ehs_incidents
CREATE TABLE public.ehs_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  company_id uuid REFERENCES public.companies(id),
  incident_number text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  incident_time time,
  site_location text,
  reported_by uuid REFERENCES public.employees(id),
  employees_involved uuid[] DEFAULT '{}',
  supervisor_id uuid REFERENCES public.employees(id),
  incident_type public.ehs_incident_type NOT NULL DEFAULT 'near_miss',
  severity public.ehs_incident_severity NOT NULL DEFAULT 'near_miss',
  classification text,
  immediate_action_taken text,
  photos text[] DEFAULT '{}',
  status public.ehs_incident_status NOT NULL DEFAULT 'reported',
  investigator_id uuid REFERENCES public.employees(id),
  root_cause text,
  root_cause_category text,
  lost_days integer DEFAULT 0,
  injury_type text,
  body_part_affected text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate incident number
CREATE OR REPLACE FUNCTION public.ehs_generate_incident_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 'INC-(\d+)') AS integer)), 0) + 1
  INTO next_num
  FROM public.ehs_incidents
  WHERE organization_id = NEW.organization_id;
  NEW.incident_number := 'INC-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ehs_incident_number
  BEFORE INSERT ON public.ehs_incidents
  FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_incident_number();

CREATE TRIGGER trg_ehs_incidents_updated_at
  BEFORE UPDATE ON public.ehs_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.ehs_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_incidents_org_access" ON public.ehs_incidents
  FOR ALL USING (organization_id = public.current_org_id());

-- 3. ehs_hazards
CREATE TABLE public.ehs_hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  company_id uuid REFERENCES public.companies(id),
  hazard_number text NOT NULL DEFAULT '',
  site_location text,
  description text NOT NULL,
  risk_level public.ehs_hazard_risk_level NOT NULL DEFAULT 'medium',
  photos text[] DEFAULT '{}',
  reported_by uuid REFERENCES public.employees(id),
  observation_type public.ehs_observation_type NOT NULL DEFAULT 'hazard',
  assigned_to uuid REFERENCES public.employees(id),
  status public.ehs_hazard_status NOT NULL DEFAULT 'reported',
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.ehs_generate_hazard_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(hazard_number FROM 'HAZ-(\d+)') AS integer)), 0) + 1
  INTO next_num
  FROM public.ehs_hazards
  WHERE organization_id = NEW.organization_id;
  NEW.hazard_number := 'HAZ-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ehs_hazard_number
  BEFORE INSERT ON public.ehs_hazards
  FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_hazard_number();

CREATE TRIGGER trg_ehs_hazards_updated_at
  BEFORE UPDATE ON public.ehs_hazards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.ehs_hazards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_hazards_org_access" ON public.ehs_hazards
  FOR ALL USING (organization_id = public.current_org_id());

-- 4. ehs_inspection_templates
CREATE TABLE public.ehs_inspection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  category text,
  checklist_items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ehs_inspection_templates_updated_at
  BEFORE UPDATE ON public.ehs_inspection_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.ehs_inspection_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_inspection_templates_org_access" ON public.ehs_inspection_templates
  FOR ALL USING (organization_id = public.current_org_id());

-- 5. ehs_inspections
CREATE TABLE public.ehs_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  company_id uuid REFERENCES public.companies(id),
  inspection_number text NOT NULL DEFAULT '',
  type public.ehs_inspection_type NOT NULL DEFAULT 'daily',
  template_id uuid REFERENCES public.ehs_inspection_templates(id),
  scheduled_date date,
  completed_date date,
  inspector_id uuid REFERENCES public.employees(id),
  status public.ehs_inspection_status NOT NULL DEFAULT 'scheduled',
  overall_score numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.ehs_generate_inspection_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(inspection_number FROM 'INS-(\d+)') AS integer)), 0) + 1
  INTO next_num
  FROM public.ehs_inspections
  WHERE organization_id = NEW.organization_id;
  NEW.inspection_number := 'INS-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ehs_inspection_number
  BEFORE INSERT ON public.ehs_inspections
  FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_inspection_number();

CREATE TRIGGER trg_ehs_inspections_updated_at
  BEFORE UPDATE ON public.ehs_inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.ehs_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_inspections_org_access" ON public.ehs_inspections
  FOR ALL USING (organization_id = public.current_org_id());

-- 6. ehs_inspection_items
CREATE TABLE public.ehs_inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.ehs_inspections(id) ON DELETE CASCADE,
  checklist_item text NOT NULL,
  category text,
  result public.ehs_inspection_result,
  finding_text text,
  photo_url text,
  auto_hazard_id uuid REFERENCES public.ehs_hazards(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ehs_inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_inspection_items_access" ON public.ehs_inspection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ehs_inspections i
      WHERE i.id = inspection_id AND i.organization_id = public.current_org_id()
    )
  );

-- 7. ehs_training_records
CREATE TABLE public.ehs_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  training_type public.ehs_training_type NOT NULL DEFAULT 'other',
  course_name text NOT NULL,
  trainer text,
  provider text,
  completed_date date,
  expiry_date date,
  certificate_number text,
  certificate_url text,
  status public.ehs_training_status NOT NULL DEFAULT 'valid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ehs_training_records_updated_at
  BEFORE UPDATE ON public.ehs_training_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.ehs_training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_training_records_org_access" ON public.ehs_training_records
  FOR ALL USING (organization_id = public.current_org_id());

-- 8. ehs_corrective_actions
CREATE TABLE public.ehs_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  source_type public.ehs_ca_source_type NOT NULL,
  source_id uuid NOT NULL,
  description text NOT NULL,
  assigned_to uuid REFERENCES public.employees(id),
  responsible_person uuid REFERENCES public.employees(id),
  due_date date,
  closed_at timestamptz,
  priority public.ehs_ca_priority NOT NULL DEFAULT 'medium',
  status public.ehs_ca_status NOT NULL DEFAULT 'open',
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ehs_corrective_actions_updated_at
  BEFORE UPDATE ON public.ehs_corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.ehs_corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehs_corrective_actions_org_access" ON public.ehs_corrective_actions
  FOR ALL USING (organization_id = public.current_org_id());

-- 9. Indexes for performance
CREATE INDEX idx_ehs_incidents_org ON public.ehs_incidents(organization_id);
CREATE INDEX idx_ehs_incidents_project ON public.ehs_incidents(project_id);
CREATE INDEX idx_ehs_incidents_status ON public.ehs_incidents(status);
CREATE INDEX idx_ehs_hazards_org ON public.ehs_hazards(organization_id);
CREATE INDEX idx_ehs_hazards_status ON public.ehs_hazards(status);
CREATE INDEX idx_ehs_inspections_org ON public.ehs_inspections(organization_id);
CREATE INDEX idx_ehs_inspections_status ON public.ehs_inspections(status);
CREATE INDEX idx_ehs_training_org ON public.ehs_training_records(organization_id);
CREATE INDEX idx_ehs_training_expiry ON public.ehs_training_records(expiry_date);
CREATE INDEX idx_ehs_ca_org ON public.ehs_corrective_actions(organization_id);
CREATE INDEX idx_ehs_ca_status ON public.ehs_corrective_actions(status);

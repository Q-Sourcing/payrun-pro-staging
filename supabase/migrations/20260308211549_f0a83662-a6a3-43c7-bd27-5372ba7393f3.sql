
-- Phase 2: Risk Assessments
CREATE TYPE public.ehs_risk_likelihood AS ENUM ('rare', 'unlikely', 'possible', 'likely', 'almost_certain');
CREATE TYPE public.ehs_risk_consequence AS ENUM ('insignificant', 'minor', 'moderate', 'major', 'catastrophic');
CREATE TYPE public.ehs_risk_assessment_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.ehs_ppe_condition AS ENUM ('new', 'good', 'fair', 'poor', 'condemned');
CREATE TYPE public.ehs_ppe_status AS ENUM ('issued', 'returned', 'lost', 'condemned');
CREATE TYPE public.ehs_permit_type AS ENUM ('hot_work', 'confined_space', 'excavation', 'working_at_height', 'electrical', 'other');
CREATE TYPE public.ehs_permit_status AS ENUM ('requested', 'approved', 'active', 'expired', 'cancelled');
CREATE TYPE public.ehs_environmental_type AS ENUM ('spill', 'emission', 'waste_violation', 'noise', 'water_contamination', 'other');
CREATE TYPE public.ehs_environmental_severity AS ENUM ('minor', 'moderate', 'major', 'critical');
CREATE TYPE public.ehs_drill_type AS ENUM ('fire', 'evacuation', 'earthquake', 'chemical_spill', 'medical', 'other');
CREATE TYPE public.ehs_drill_status AS ENUM ('planned', 'completed', 'cancelled');
CREATE TYPE public.ehs_compliance_status AS ENUM ('compliant', 'non_compliant', 'partially_compliant', 'under_review');

-- Risk Assessments (JHAs)
CREATE TABLE public.ehs_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  company_id uuid REFERENCES public.companies(id),
  assessment_number text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text,
  job_activity text,
  location text,
  assessed_by uuid REFERENCES public.employees(id),
  approved_by uuid REFERENCES public.employees(id),
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  review_date date,
  status public.ehs_risk_assessment_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Risk Assessment Items (hazards within a JHA)
CREATE TABLE public.ehs_risk_assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.ehs_risk_assessments(id) ON DELETE CASCADE,
  hazard_description text NOT NULL,
  consequence text,
  existing_controls text,
  likelihood_before public.ehs_risk_likelihood NOT NULL DEFAULT 'possible',
  consequence_before public.ehs_risk_consequence NOT NULL DEFAULT 'moderate',
  risk_score_before integer GENERATED ALWAYS AS (
    (CASE likelihood_before
      WHEN 'rare' THEN 1 WHEN 'unlikely' THEN 2 WHEN 'possible' THEN 3 WHEN 'likely' THEN 4 WHEN 'almost_certain' THEN 5 END)
    * (CASE consequence_before
      WHEN 'insignificant' THEN 1 WHEN 'minor' THEN 2 WHEN 'moderate' THEN 3 WHEN 'major' THEN 4 WHEN 'catastrophic' THEN 5 END)
  ) STORED,
  additional_controls text,
  likelihood_after public.ehs_risk_likelihood DEFAULT 'unlikely',
  consequence_after public.ehs_risk_consequence DEFAULT 'minor',
  risk_score_after integer GENERATED ALWAYS AS (
    (CASE likelihood_after
      WHEN 'rare' THEN 1 WHEN 'unlikely' THEN 2 WHEN 'possible' THEN 3 WHEN 'likely' THEN 4 WHEN 'almost_certain' THEN 5 END)
    * (CASE consequence_after
      WHEN 'insignificant' THEN 1 WHEN 'minor' THEN 2 WHEN 'moderate' THEN 3 WHEN 'major' THEN 4 WHEN 'catastrophic' THEN 5 END)
  ) STORED,
  responsible_person uuid REFERENCES public.employees(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PPE Management
CREATE TABLE public.ehs_ppe_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  category text,
  inspection_interval_days integer DEFAULT 90,
  lifespan_months integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ehs_ppe_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  ppe_type_id uuid NOT NULL REFERENCES public.ehs_ppe_types(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  serial_number text,
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  returned_date date,
  last_inspection_date date,
  next_inspection_date date,
  condition public.ehs_ppe_condition NOT NULL DEFAULT 'new',
  status public.ehs_ppe_status NOT NULL DEFAULT 'issued',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permits to Work
CREATE TABLE public.ehs_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  permit_number text NOT NULL DEFAULT '',
  permit_type public.ehs_permit_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  location text,
  requested_by uuid REFERENCES public.employees(id),
  approved_by uuid REFERENCES public.employees(id),
  valid_from timestamptz,
  valid_until timestamptz,
  status public.ehs_permit_status NOT NULL DEFAULT 'requested',
  precautions text,
  emergency_procedures text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Environmental Incidents
CREATE TABLE public.ehs_environmental_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  incident_number text NOT NULL DEFAULT '',
  type public.ehs_environmental_type NOT NULL DEFAULT 'other',
  severity public.ehs_environmental_severity NOT NULL DEFAULT 'minor',
  title text NOT NULL,
  description text,
  location text,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  reported_by uuid REFERENCES public.employees(id),
  containment_actions text,
  cleanup_actions text,
  regulatory_notification boolean DEFAULT false,
  status text NOT NULL DEFAULT 'reported',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Emergency Drills
CREATE TABLE public.ehs_emergency_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  drill_type public.ehs_drill_type NOT NULL DEFAULT 'fire',
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  actual_date date,
  duration_minutes integer,
  participants_count integer,
  evacuation_time_seconds integer,
  status public.ehs_drill_status NOT NULL DEFAULT 'planned',
  observations text,
  improvements text,
  conducted_by uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compliance Tracking
CREATE TABLE public.ehs_compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  regulation_name text NOT NULL,
  regulation_body text,
  requirement_description text NOT NULL,
  category text,
  compliance_status public.ehs_compliance_status NOT NULL DEFAULT 'under_review',
  due_date date,
  last_audit_date date,
  next_audit_date date,
  responsible_person uuid REFERENCES public.employees(id),
  evidence_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-number triggers
CREATE OR REPLACE FUNCTION public.ehs_generate_assessment_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(assessment_number FROM 'RA-(\d+)') AS integer)), 0) + 1 INTO next_num
  FROM public.ehs_risk_assessments WHERE organization_id = NEW.organization_id;
  NEW.assessment_number := 'RA-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ehs_assessment_number BEFORE INSERT ON public.ehs_risk_assessments
FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_assessment_number();

CREATE OR REPLACE FUNCTION public.ehs_generate_permit_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(permit_number FROM 'PTW-(\d+)') AS integer)), 0) + 1 INTO next_num
  FROM public.ehs_permits WHERE organization_id = NEW.organization_id;
  NEW.permit_number := 'PTW-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ehs_permit_number BEFORE INSERT ON public.ehs_permits
FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_permit_number();

CREATE OR REPLACE FUNCTION public.ehs_generate_env_incident_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 'ENV-(\d+)') AS integer)), 0) + 1 INTO next_num
  FROM public.ehs_environmental_incidents WHERE organization_id = NEW.organization_id;
  NEW.incident_number := 'ENV-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ehs_env_incident_number BEFORE INSERT ON public.ehs_environmental_incidents
FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_env_incident_number();

-- updated_at triggers
CREATE TRIGGER set_ehs_risk_assessments_updated_at BEFORE UPDATE ON public.ehs_risk_assessments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_ehs_ppe_types_updated_at BEFORE UPDATE ON public.ehs_ppe_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_ehs_ppe_records_updated_at BEFORE UPDATE ON public.ehs_ppe_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_ehs_permits_updated_at BEFORE UPDATE ON public.ehs_permits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_ehs_env_incidents_updated_at BEFORE UPDATE ON public.ehs_environmental_incidents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_ehs_drills_updated_at BEFORE UPDATE ON public.ehs_emergency_drills
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_ehs_compliance_updated_at BEFORE UPDATE ON public.ehs_compliance_requirements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- RLS Policies
ALTER TABLE public.ehs_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_risk_assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_ppe_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_ppe_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_environmental_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_emergency_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehs_compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON public.ehs_risk_assessments FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "org_access" ON public.ehs_risk_assessment_items FOR ALL TO authenticated
  USING (assessment_id IN (SELECT id FROM public.ehs_risk_assessments WHERE organization_id = public.current_org_id()))
  WITH CHECK (assessment_id IN (SELECT id FROM public.ehs_risk_assessments WHERE organization_id = public.current_org_id()));

CREATE POLICY "org_access" ON public.ehs_ppe_types FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "org_access" ON public.ehs_ppe_records FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "org_access" ON public.ehs_permits FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "org_access" ON public.ehs_environmental_incidents FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "org_access" ON public.ehs_emergency_drills FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "org_access" ON public.ehs_compliance_requirements FOR ALL TO authenticated
  USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

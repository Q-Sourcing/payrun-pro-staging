-- Zoho HR integration foundation:
-- - Core HR master fields on employees
-- - External employee identity mapping
-- - Tenant-safe integration storage
-- - HR catalog tables
-- - Phase 2/3 employee HR subrecords and documents

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper for org-scoped RLS on new HR tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.organization_id = target_org_id
  );
$$;

COMMENT ON FUNCTION public.user_belongs_to_org(uuid)
IS 'Returns true when the authenticated user belongs to the provided organization.';

-- ---------------------------------------------------------------------------
-- HR catalogs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.engagement_types (name, description, sort_order)
VALUES
  ('Permanent', 'Ongoing employment with no fixed end date', 1),
  ('Contract', 'Fixed-term agreement such as 6 months or 1 year', 2),
  ('Temporary', 'Short-term employment, often project-based', 3),
  ('Casual', 'Work provided only when needed with no guaranteed hours', 4),
  ('Trainee', 'An employee undergoing training in the organization', 5),
  ('Intern', 'Usually a student gaining work experience', 6)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  active = true,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.nationalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.nationalities (name)
VALUES
  ('Afghan'),
  ('Albanian'),
  ('Algerian'),
  ('American'),
  ('Andorran'),
  ('Angolan'),
  ('Antiguan and Barbudan'),
  ('Argentine'),
  ('Armenian'),
  ('Australian'),
  ('Austrian'),
  ('Azerbaijani'),
  ('Bahamian'),
  ('Bahraini'),
  ('Bangladeshi'),
  ('Barbadian'),
  ('Belarusian'),
  ('Belgian'),
  ('Belizean'),
  ('Beninese'),
  ('Bhutanese'),
  ('Bolivian'),
  ('Bosnian'),
  ('Botswanan'),
  ('Brazilian'),
  ('British'),
  ('Bruneian'),
  ('Bulgarian'),
  ('Burkinabe'),
  ('Burmese'),
  ('Burundian'),
  ('Cambodian'),
  ('Cameroonian'),
  ('Canadian'),
  ('Cape Verdean'),
  ('Central African'),
  ('Chadian'),
  ('Chilean'),
  ('Chinese'),
  ('Colombian'),
  ('Comorian'),
  ('Congolese'),
  ('Costa Rican'),
  ('Croatian'),
  ('Cuban'),
  ('Cypriot'),
  ('Czech'),
  ('Danish'),
  ('Djiboutian'),
  ('Dominican'),
  ('Dutch'),
  ('Ecuadorean'),
  ('Egyptian'),
  ('Emirati'),
  ('Equatorial Guinean'),
  ('Eritrean'),
  ('Estonian'),
  ('Eswatini'),
  ('Ethiopian'),
  ('Fijian'),
  ('Filipino'),
  ('Finnish'),
  ('French'),
  ('Gabonese'),
  ('Gambian'),
  ('Georgian'),
  ('German'),
  ('Ghanaian'),
  ('Greek'),
  ('Grenadian'),
  ('Guatemalan'),
  ('Guinean'),
  ('Guyanese'),
  ('Haitian'),
  ('Honduran'),
  ('Hungarian'),
  ('Icelandic'),
  ('Indian'),
  ('Indonesian'),
  ('Iranian'),
  ('Iraqi'),
  ('Irish'),
  ('Israeli'),
  ('Italian'),
  ('Ivorian'),
  ('Jamaican'),
  ('Japanese'),
  ('Jordanian'),
  ('Kazakh'),
  ('Kenyan'),
  ('Kiribati'),
  ('Kuwaiti'),
  ('Kyrgyz'),
  ('Laotian'),
  ('Latvian'),
  ('Lebanese'),
  ('Liberian'),
  ('Libyan'),
  ('Liechtensteiner'),
  ('Lithuanian'),
  ('Luxembourger'),
  ('Malagasy'),
  ('Malawian'),
  ('Malaysian'),
  ('Maldivian'),
  ('Malian'),
  ('Maltese'),
  ('Marshallese'),
  ('Mauritanian'),
  ('Mauritian'),
  ('Mexican'),
  ('Micronesian'),
  ('Moldovan'),
  ('Monacan'),
  ('Mongolian'),
  ('Montenegrin'),
  ('Moroccan'),
  ('Mozambican'),
  ('Namibian'),
  ('Nauruan'),
  ('Nepalese'),
  ('New Zealander'),
  ('Nicaraguan'),
  ('Nigerien'),
  ('Nigerian'),
  ('North Korean'),
  ('North Macedonian'),
  ('Norwegian'),
  ('Omani'),
  ('Pakistani'),
  ('Palauan'),
  ('Palestinian'),
  ('Panamanian'),
  ('Papua New Guinean'),
  ('Paraguayan'),
  ('Peruvian'),
  ('Polish'),
  ('Portuguese'),
  ('Qatari'),
  ('Romanian'),
  ('Russian'),
  ('Rwandan'),
  ('Saint Kitts and Nevis'),
  ('Saint Lucian'),
  ('Salvadoran'),
  ('Samoan'),
  ('San Marinese'),
  ('Sao Tomean'),
  ('Saudi'),
  ('Scottish'),
  ('Senegalese'),
  ('Serbian'),
  ('Seychellois'),
  ('Sierra Leonean'),
  ('Singaporean'),
  ('Slovak'),
  ('Slovenian'),
  ('Solomon Islander'),
  ('Somali'),
  ('South African'),
  ('South Korean'),
  ('South Sudanese'),
  ('Spanish'),
  ('Sri Lankan'),
  ('Sudanese'),
  ('Surinamese'),
  ('Swedish'),
  ('Swiss'),
  ('Syrian'),
  ('Taiwanese'),
  ('Tajik'),
  ('Tanzanian'),
  ('Thai'),
  ('Timorese'),
  ('Togolese'),
  ('Tongan'),
  ('Trinidadian and Tobagonian'),
  ('Tunisian'),
  ('Turkish'),
  ('Turkmen'),
  ('Tuvaluan'),
  ('Ugandan'),
  ('Ukrainian'),
  ('Uruguayan'),
  ('Uzbek'),
  ('Vanuatuan'),
  ('Venezuelan'),
  ('Vietnamese'),
  ('Welsh'),
  ('Yemeni'),
  ('Zambian'),
  ('Zimbabwean')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.engagement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nationalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read engagement types" ON public.engagement_types;
CREATE POLICY "Authenticated users can read engagement types"
ON public.engagement_types
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read nationalities" ON public.nationalities;
CREATE POLICY "Authenticated users can read nationalities"
ON public.nationalities
FOR SELECT
USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Extend employees with HR master fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS engagement_type text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS citizenship text,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS work_phone text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS work_location text;

COMMENT ON COLUMN public.employees.engagement_type IS 'HR employment classification synced from Zoho People Engagement Type.';
COMMENT ON COLUMN public.employees.nationality IS 'Employee nationality/demonym.';
COMMENT ON COLUMN public.employees.citizenship IS 'Employee citizenship.';
COMMENT ON COLUMN public.employees.personal_email IS 'Personal/non-work email address.';
COMMENT ON COLUMN public.employees.work_phone IS 'Organization-issued work phone number.';
COMMENT ON COLUMN public.employees.designation IS 'Job title or designation.';
COMMENT ON COLUMN public.employees.work_location IS 'Primary work location.';

-- ---------------------------------------------------------------------------
-- External employee identities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('zoho_people')),
  external_id text NOT NULL,
  external_record_id text,
  external_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  last_inbound_synced_at timestamptz,
  last_outbound_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_external_ids_org_provider_external_id_idx
  ON public.employee_external_ids(organization_id, provider, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS employee_external_ids_employee_provider_idx
  ON public.employee_external_ids(employee_id, provider);

CREATE INDEX IF NOT EXISTS employee_external_ids_org_employee_idx
  ON public.employee_external_ids(organization_id, employee_id);

ALTER TABLE public.employee_external_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read employee external IDs" ON public.employee_external_ids;
CREATE POLICY "Org members can read employee external IDs"
ON public.employee_external_ids
FOR SELECT
USING (public.user_belongs_to_org(organization_id));

-- ---------------------------------------------------------------------------
-- Tenant-safe integration tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.integration_tokens
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS api_domain text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.integration_tokens
  DROP CONSTRAINT IF EXISTS integration_tokens_integration_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS integration_tokens_org_name_unique_idx
  ON public.integration_tokens(organization_id, integration_name)
  WHERE organization_id IS NOT NULL;

ALTER TABLE public.sync_configurations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_unit_id uuid REFERENCES public.company_units(id) ON DELETE SET NULL;

ALTER TABLE public.sync_configurations
  DROP CONSTRAINT IF EXISTS sync_configurations_frequency_check;

ALTER TABLE public.sync_configurations
  ADD CONSTRAINT sync_configurations_frequency_check
  CHECK (frequency IN ('manual', 'realtime', 'hourly', 'daily', 'weekly'));

ALTER TABLE public.sync_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_unit_id uuid REFERENCES public.company_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS sync_configurations_org_integration_idx
  ON public.sync_configurations(organization_id, integration_name);

CREATE UNIQUE INDEX IF NOT EXISTS sync_configurations_org_name_unique_idx
  ON public.sync_configurations(organization_id, integration_name, name)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sync_logs_org_started_at_idx
  ON public.sync_logs(organization_id, started_at DESC);

ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access to integration data" ON public.integration_tokens;
DROP POLICY IF EXISTS "Admin access to sync configurations" ON public.sync_configurations;
DROP POLICY IF EXISTS "Admin access to sync logs" ON public.sync_logs;

DROP POLICY IF EXISTS "Org members can read sync configurations" ON public.sync_configurations;
CREATE POLICY "Org members can read sync configurations"
ON public.sync_configurations
FOR SELECT
USING (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Org members can read sync logs" ON public.sync_logs;
CREATE POLICY "Org members can read sync logs"
ON public.sync_logs
FOR SELECT
USING (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id));

-- integration_tokens intentionally has no direct client policies. Service-role
-- edge functions bypass RLS while client sessions cannot read secrets.

-- ---------------------------------------------------------------------------
-- Phase 2 HR subrecords
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  address_type text NOT NULL CHECK (address_type IN ('present', 'permanent', 'mailing', 'other')),
  line_1 text NOT NULL,
  line_2 text,
  city text,
  district text,
  state_region text,
  postal_code text,
  country text,
  is_primary boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'zoho_people')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  contact_phone text,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'zoho_people')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  degree_diploma text,
  specialization text,
  start_date date,
  end_date date,
  date_of_completion date,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'zoho_people')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_work_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employer_name text NOT NULL,
  job_title text,
  from_date date,
  to_date date,
  job_description text,
  relevant boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'zoho_people')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Phase 3 documents and attachments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  title text NOT NULL,
  description text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  external_document_id text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'zoho_people')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.employee_addresses IS 'Normalized employee address records for HR master data.';
COMMENT ON TABLE public.employee_dependents IS 'Employee dependent records synced from HR systems or entered locally.';
COMMENT ON TABLE public.employee_education IS 'Employee education history.';
COMMENT ON TABLE public.employee_work_experience IS 'Employee prior work experience records.';
COMMENT ON TABLE public.employee_documents IS 'Employee document metadata with storage references.';

ALTER TABLE public.employee_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage employee addresses" ON public.employee_addresses;
CREATE POLICY "Org members can manage employee addresses"
ON public.employee_addresses
FOR ALL
USING (public.user_belongs_to_org(organization_id))
WITH CHECK (public.user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Org members can manage employee dependents" ON public.employee_dependents;
CREATE POLICY "Org members can manage employee dependents"
ON public.employee_dependents
FOR ALL
USING (public.user_belongs_to_org(organization_id))
WITH CHECK (public.user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Org members can manage employee education" ON public.employee_education;
CREATE POLICY "Org members can manage employee education"
ON public.employee_education
FOR ALL
USING (public.user_belongs_to_org(organization_id))
WITH CHECK (public.user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Org members can manage employee work experience" ON public.employee_work_experience;
CREATE POLICY "Org members can manage employee work experience"
ON public.employee_work_experience
FOR ALL
USING (public.user_belongs_to_org(organization_id))
WITH CHECK (public.user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Org members can manage employee documents" ON public.employee_documents;
CREATE POLICY "Org members can manage employee documents"
ON public.employee_documents
FOR ALL
USING (public.user_belongs_to_org(organization_id))
WITH CHECK (public.user_belongs_to_org(organization_id));

-- ---------------------------------------------------------------------------
-- Keep employee_master view aligned with the base table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.employee_master AS
SELECT
  id,
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) AS organization_id,
  first_name,
  last_name,
  CASE
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL THEN first_name
    WHEN last_name IS NOT NULL THEN last_name
    ELSE ''
  END AS name,
  email,
  personal_email,
  phone,
  work_phone,
  employee_number,
  employee_type,
  employee_category,
  engagement_type,
  employment_status,
  designation,
  work_location,
  nationality,
  citizenship,
  date_joined,
  country,
  currency,
  company_id,
  company_unit_id,
  pay_group_id,
  status,
  user_id,
  created_at,
  updated_at
FROM public.employees;

GRANT SELECT ON public.employee_master TO authenticated;
GRANT SELECT ON public.employee_master TO anon;

COMMIT;

-- ==========================================================
-- 🔥 MANUAL MULTI-TENANT DEPLOYMENT SQL
-- ==========================================================
-- Author: Nalungu Kevin Colin
-- Purpose: Run this SQL in Supabase SQL Editor to deploy multi-tenant system
-- ==========================================================

-- STEP 1: Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STEP 2: Add organization_id to existing tables
ALTER TABLE pay_groups 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE pay_runs 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE pay_items 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE expatriate_pay_groups 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE expatriate_pay_run_items 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- STEP 3: Create default organization and assign existing data
INSERT INTO organizations (id, name, description, active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'GWAZU', 'Default organization for existing data', true)
ON CONFLICT (id) DO NOTHING;

-- Update existing data to reference default organization
UPDATE pay_groups 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE employees 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE pay_runs 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE pay_items 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE expatriate_pay_groups 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE expatriate_pay_run_items 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

-- STEP 4: Add foreign key constraints
ALTER TABLE pay_groups 
ADD CONSTRAINT fk_pay_groups_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE employees 
ADD CONSTRAINT fk_employees_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE pay_runs 
ADD CONSTRAINT fk_pay_runs_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE pay_items 
ADD CONSTRAINT fk_pay_items_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE expatriate_pay_groups 
ADD CONSTRAINT fk_expatriate_pay_groups_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE expatriate_pay_run_items 
ADD CONSTRAINT fk_expatriate_pay_run_items_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- STEP 5: Make organization_id NOT NULL
ALTER TABLE pay_groups 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE employees 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE pay_runs 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE pay_items 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE expatriate_pay_groups 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE expatriate_pay_run_items 
ALTER COLUMN organization_id SET NOT NULL;

-- STEP 6: Create additional multi-tenant tables
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  country_id uuid,
  currency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('head_office', 'project')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  role text CHECK (role IN ('super_admin','org_admin','user')) NOT NULL DEFAULT 'user',
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  target_organization_id uuid REFERENCES organizations(id),
  target_role text NOT NULL,
  impersonation_start timestamptz NOT NULL,
  impersonation_end timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- STEP 7: Create default company and org unit for GWAZU
INSERT INTO companies (id, organization_id, name, currency) 
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'GWAZU Limited', 'UGX')
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_units (id, company_id, name, kind) 
VALUES 
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Head Office', 'head_office'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Project Alpha', 'project')
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Create super admin user profile (if user exists)
DO $$
DECLARE
  super_admin_user_id uuid;
BEGIN
  -- Get the first super admin user (assuming Kevin is already created)
  SELECT id INTO super_admin_user_id FROM auth.users WHERE email = 'nalungukevin@gmail.com' LIMIT 1;
  
  -- Create super admin profile if user exists
  IF super_admin_user_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, organization_id, role, first_name, last_name) VALUES
      (super_admin_user_id, '00000000-0000-0000-0000-000000000001', 'super_admin', 'Nalungu', 'Kevin')
    ON CONFLICT (id) DO UPDATE SET
      organization_id = '00000000-0000-0000-0000-000000000001',
      role = 'super_admin',
      first_name = 'Nalungu',
      last_name = 'Kevin';
  END IF;
END $$;

-- STEP 9: Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create basic RLS policies
-- Organizations: Super admin can see all, others see only their own
CREATE POLICY "org_select_same_org_or_super_admin" ON organizations FOR SELECT TO authenticated USING (
  (auth.jwt()->>'role') = 'super_admin' OR id = (auth.jwt()->>'organization_id')::uuid
);

CREATE POLICY "org_mutate_super_admin_only" ON organizations FOR ALL TO authenticated USING (
  (auth.jwt()->>'role') = 'super_admin'
) WITH CHECK (
  (auth.jwt()->>'role') = 'super_admin'
);

-- User profiles: Users can see their own, super admin can see all
CREATE POLICY "user_profiles_select_own_or_super_admin" ON user_profiles FOR SELECT TO authenticated USING (
  (auth.jwt()->>'role') = 'super_admin' OR id = auth.uid()
);

CREATE POLICY "user_profiles_mutate_own_or_super_admin" ON user_profiles FOR ALL TO authenticated USING (
  (auth.jwt()->>'role') = 'super_admin' OR id = auth.uid()
) WITH CHECK (
  (auth.jwt()->>'role') = 'super_admin' OR id = auth.uid()
);

-- Activity logs: Super admin can see all, others see only their org's logs
CREATE POLICY "activity_logs_select_same_org_or_super_admin" ON activity_logs FOR SELECT TO authenticated USING (
  (auth.jwt()->>'role') = 'super_admin' OR organization_id = (auth.jwt()->>'organization_id')::uuid
);

CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Impersonation logs: Only super admin can see
CREATE POLICY "impersonation_logs_select_super_admin_only" ON impersonation_logs FOR SELECT TO authenticated USING (
  (auth.jwt()->>'role') = 'super_admin'
);

CREATE POLICY "impersonation_logs_insert_super_admin_only" ON impersonation_logs FOR INSERT TO authenticated WITH CHECK (
  (auth.jwt()->>'role') = 'super_admin'
);

-- STEP 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);
CREATE INDEX IF NOT EXISTS idx_companies_org_id ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_units_company_id ON org_units(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_super_admin_id ON impersonation_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_target_org_id ON impersonation_logs(target_organization_id);

-- STEP 12: Add organization_id indexes to existing tables
CREATE INDEX IF NOT EXISTS idx_pay_groups_org_id ON pay_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_runs_org_id ON pay_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_items_org_id ON pay_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_org_id ON expatriate_pay_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_org_id ON expatriate_pay_run_items(organization_id);

-- STEP 13: Verify deployment
SELECT 'Multi-tenant system deployed successfully!' as status;
SELECT COUNT(*) as organizations_count FROM organizations;
SELECT COUNT(*) as companies_count FROM companies;
SELECT COUNT(*) as org_units_count FROM org_units;

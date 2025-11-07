-- ==========================================================
-- 🔧 ADD ORGANIZATION COLUMNS TO EXISTING TABLES
-- ==========================================================
-- Author: Nalungu Kevin Colin
-- Purpose: Add organization_id columns to existing tables before multi-tenant schema
-- ==========================================================

-- First, create the organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add organization_id to existing pay_groups table
ALTER TABLE pay_groups 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to existing employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to existing pay_runs table
ALTER TABLE pay_runs 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to existing pay_items table
ALTER TABLE pay_items 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to existing expatriate_pay_groups table
ALTER TABLE expatriate_pay_groups 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to existing expatriate_pay_run_items table
ALTER TABLE expatriate_pay_run_items 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Create a default organization for existing data
INSERT INTO organizations (id, name, description, active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'GWAZU', 'Default organization for existing data', true)
ON CONFLICT (id) DO NOTHING;

-- Update existing tables to reference the default organization
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

-- Add foreign key constraints
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

-- Make organization_id NOT NULL after setting defaults
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

-- ==========================================================
-- 🔧 ADD ORGANIZATION COLUMNS TO EXISTING TABLES
-- ==========================================================
-- Author: Nalungu Kevin Colin
-- Purpose: Add organization_id columns to existing tables before multi-tenant schema
-- ==========================================================

-- Add organization_id to existing pay_groups table
ALTER TABLE pay_groups 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to existing employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to existing pay_runs table
ALTER TABLE pay_runs 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to existing pay_items table
ALTER TABLE pay_items 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to existing expatriate_pay_groups table
ALTER TABLE expatriate_pay_groups 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to existing expatriate_pay_run_items table
ALTER TABLE expatriate_pay_run_items 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Update existing records to have a default organization (GWAZU)
-- First, ensure GWAZU organization exists
INSERT INTO organizations (id, name, description, active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'GWAZU', 'Default organization for existing data', true)
ON CONFLICT (id) DO NOTHING;

-- Update existing tables to reference GWAZU organization
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

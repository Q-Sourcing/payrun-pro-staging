-- Repair Pay Group Master Synchronization (Version 2.1)
-- This migration backfills all missing pay groups from various source tables into pay_group_master
-- with correct organization_id, category, and employee_type mapping.

-- 0. Ensure organization_id exists on pay_group_master
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pay_group_master' AND column_name='organization_id') THEN
    ALTER TABLE public.pay_group_master ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1. Backfill from regular pay_groups (Projects Regular, Projects Daily/Monthly)
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  pay_type,
  organization_id
)
SELECT
  'regular' as type,
  'pay_groups' as source_table,
  id as source_id,
  null as code,
  name,
  country,
  'UGX' as currency,
  true as active,
  category,
  employee_type,
  pay_frequency,
  pay_type,
  organization_id
FROM public.pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  employee_type = EXCLUDED.employee_type,
  pay_frequency = EXCLUDED.pay_frequency,
  pay_type = EXCLUDED.pay_type,
  organization_id = EXCLUDED.organization_id;

-- 2. Backfill from expatriate_pay_groups
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  organization_id
)
SELECT
  'expatriate' as type,
  'expatriate_pay_groups' as source_table,
  id as source_id,
  paygroup_id as code,
  name,
  country,
  currency,
  true as active,
  'head_office' as category,
  'expatriate' as employee_type,
  organization_id
FROM public.expatriate_pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  currency = EXCLUDED.currency,
  organization_id = EXCLUDED.organization_id;

-- 3. Backfill from head_office_pay_groups_regular (The missing Raj Group)
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  organization_id
)
SELECT
  'regular' as type,
  'head_office_pay_groups_regular' as source_table,
  id as source_id,
  'HO-REG-' || substring(id::text from 1 for 4) as code,
  name,
  'UG' as country,
  'UGX' as currency,
  (status = 'active') as active,
  'head_office' as category,
  'regular' as employee_type,
  pay_frequency,
  organization_id
FROM public.head_office_pay_groups_regular
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  pay_frequency = EXCLUDED.pay_frequency,
  organization_id = EXCLUDED.organization_id;

-- 4. Backfill from head_office_pay_groups_interns
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  organization_id
)
SELECT
  'intern' as type,
  'head_office_pay_groups_interns' as source_table,
  id as source_id,
  'HO-INT-' || substring(id::text from 1 for 4) as code,
  name,
  'UG' as country,
  'UGX' as currency,
  (status = 'active') as active,
  'head_office' as category,
  'interns' as employee_type,
  pay_frequency,
  organization_id
FROM public.head_office_pay_groups_interns
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  pay_frequency = EXCLUDED.pay_frequency,
  organization_id = EXCLUDED.organization_id;

-- 5. Backfill from head_office_pay_groups_expatriates
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  organization_id
)
SELECT
  'expatriate' as type,
  'head_office_pay_groups_expatriates' as source_table,
  id as source_id,
  'HO-EXP-' || substring(id::text from 1 for 4) as code,
  name,
  'UG' as country,
  'USD' as currency,
  (status = 'active') as active,
  'head_office' as category,
  'expatriate' as employee_type,
  pay_frequency,
  organization_id
FROM public.head_office_pay_groups_expatriates
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  pay_frequency = EXCLUDED.pay_frequency,
  organization_id = EXCLUDED.organization_id;

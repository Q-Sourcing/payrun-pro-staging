-- Repair pay_group_master: backfill all missing pay groups
-- This ensures that all existing REGULAR and EXPATRIATE groups are unified in the master index

BEGIN;

-- 1. Backfill from public.pay_groups (Regular/Piece Rate)
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
  pay_type
)
SELECT
  'regular'::text as type,
  'pay_groups'::text as source_table,
  id as source_id,
  NULL as code,
  name,
  country,
  'UGX' as currency,
  true as active,
  category,
  employee_type,
  pay_frequency,
  pay_type
FROM public.pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  category = EXCLUDED.category,
  employee_type = EXCLUDED.employee_type,
  pay_frequency = EXCLUDED.pay_frequency,
  pay_type = EXCLUDED.pay_type;

-- 2. Backfill from public.expatriate_pay_groups
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
  pay_frequency
)
SELECT
  'expatriate'::text as type,
  'expatriate_pay_groups'::text as source_table,
  id as source_id,
  paygroup_id as code,
  name,
  country,
  currency,
  true as active,
  COALESCE(
    CASE 
      WHEN name ILIKE '%head office%' OR name ILIKE '%head%' THEN 'head_office'
      WHEN name ILIKE '%project%' THEN 'projects'
    END,
    'head_office'
  ) as category,
  'expatriate' as employee_type,
  NULL as pay_frequency
FROM public.expatriate_pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  category = EXCLUDED.category,
  employee_type = EXCLUDED.employee_type,
  code = EXCLUDED.code;

COMMIT;

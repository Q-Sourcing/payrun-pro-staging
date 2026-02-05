-- Standardize employee types: migrate 'local' to 'regular'
-- This ensures that legacy pay groups are visible in the new Creation UI which filters for 'regular'

BEGIN;

-- 1. Update main pay_groups table
UPDATE public.pay_groups 
SET employee_type = 'regular' 
WHERE employee_type = 'local';

-- 2. Update pay_group_master (the unified view/table used for lookup)
UPDATE public.pay_group_master 
SET employee_type = 'regular' 
WHERE employee_type = 'local';

-- 3. Update employees table for consistency
UPDATE public.employees 
SET employee_type = 'regular' 
WHERE employee_type = 'local';

COMMIT;

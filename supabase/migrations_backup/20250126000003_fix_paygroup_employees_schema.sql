-- Fix paygroup_employees table schema to use pay_group_master_id

-- 1. Add the correct column if missing
ALTER TABLE public.paygroup_employees
  ADD COLUMN IF NOT EXISTS pay_group_master_id uuid
  REFERENCES public.pay_group_master(id)
  ON DELETE CASCADE;

-- 2. Migrate old references if the table used to link to pay_groups
UPDATE public.paygroup_employees pe
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pe.pay_group_id = pgm.source_id
  AND pe.pay_group_master_id IS NULL;

-- 3. Drop the obsolete columns if they exist with wrong naming
ALTER TABLE public.paygroup_employees
  DROP COLUMN IF EXISTS paygroup_id;

-- 4. Keep pay_group_id for now but make it nullable for backward compatibility
ALTER TABLE public.paygroup_employees
  ALTER COLUMN pay_group_id DROP NOT NULL;

-- 5. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_pay_group_master_id ON public.paygroup_employees(pay_group_master_id);

-- 6. Create a legacy view for backward compatibility
CREATE OR REPLACE VIEW public.paygroup_employees_legacy AS
SELECT
  pe.id,
  pe.employee_id,
  pe.active,
  pe.assigned_at,
  pe.removed_at,
  pe.assigned_by,
  pe.notes,
  pe.pay_group_master_id AS paygroup_id, -- alias for legacy code
  pe.pay_group_master_id,
  pe.pay_group_id
FROM public.paygroup_employees pe;

-- Add per-employee prefix override to influence employee_number generation
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS number_prefix_override text;

COMMENT ON COLUMN public.employees.number_prefix_override IS 'Optional override prefix for employee_number (e.g., QSS-HO or QSS-PR)';


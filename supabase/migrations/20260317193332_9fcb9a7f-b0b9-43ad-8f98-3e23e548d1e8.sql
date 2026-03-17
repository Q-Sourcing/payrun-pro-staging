ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS probation_start_date DATE;
COMMENT ON COLUMN public.employees.probation_start_date IS 'Start date of the probation period';
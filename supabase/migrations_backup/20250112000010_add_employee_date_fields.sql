-- Add date_joined field to employees table
-- This tracks when the employee joined the organization (separate from created_at which tracks when record was added)

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_joined DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.date_joined IS 'Date when employee joined the organization (separate from created_at which is when record was added)';

-- Add index for querying by join date
CREATE INDEX IF NOT EXISTS idx_employees_date_joined ON public.employees(date_joined);


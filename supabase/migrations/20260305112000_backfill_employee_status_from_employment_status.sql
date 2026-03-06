-- Backfill employees.status to align with employment_status values.
-- Mapping:
--   Active, Probation, Notice Period -> active
--   Terminated, Resigned, Deceased   -> inactive

BEGIN;

UPDATE public.employees
SET status = CASE
  WHEN employment_status IN ('Terminated', 'Resigned', 'Deceased') THEN 'inactive'
  WHEN employment_status IN ('Active', 'Probation', 'Notice Period') THEN 'active'
  ELSE COALESCE(status, 'active')
END
WHERE
  employment_status IS NOT NULL
  OR status IS NULL;

COMMIT;

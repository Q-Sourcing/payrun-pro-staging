
-- Add new fields to timesheet_entries for time tracking and signatures
ALTER TABLE public.timesheet_entries
  ADD COLUMN IF NOT EXISTS time_in TEXT,
  ADD COLUMN IF NOT EXISTS time_out TEXT,
  ADD COLUMN IF NOT EXISTS employee_sign TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_comments TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_sign TEXT;

COMMENT ON COLUMN public.timesheet_entries.time_in IS 'Time employee started work (HH:MM 24h format)';
COMMENT ON COLUMN public.timesheet_entries.time_out IS 'Time employee finished work (HH:MM 24h format)';
COMMENT ON COLUMN public.timesheet_entries.employee_sign IS 'Employee acknowledgment/signature text or initials';
COMMENT ON COLUMN public.timesheet_entries.supervisor_comments IS 'Supervisor review comments added during approval';
COMMENT ON COLUMN public.timesheet_entries.supervisor_sign IS 'Supervisor and HR sign-off confirmation during approval';

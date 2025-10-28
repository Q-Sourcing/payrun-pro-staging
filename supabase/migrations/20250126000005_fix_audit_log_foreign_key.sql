-- Fix foreign key constraint to allow pay run deletion with CASCADE DELETE

-- 1. Drop the existing foreign key constraint
ALTER TABLE public.pay_calculation_audit_log
  DROP CONSTRAINT IF EXISTS pay_calculation_audit_log_pay_run_id_fkey;

-- 2. Add the foreign key constraint with CASCADE DELETE
ALTER TABLE public.pay_calculation_audit_log
  ADD CONSTRAINT pay_calculation_audit_log_pay_run_id_fkey
  FOREIGN KEY (pay_run_id)
  REFERENCES public.pay_runs(id)
  ON DELETE CASCADE;

-- 3. Also fix any other potential foreign key constraints that might prevent deletion
-- Check if there are other tables referencing pay_runs
ALTER TABLE public.expatriate_pay_run_items
  DROP CONSTRAINT IF EXISTS expatriate_pay_run_items_pay_run_id_fkey;

ALTER TABLE public.expatriate_pay_run_items
  ADD CONSTRAINT expatriate_pay_run_items_pay_run_id_fkey
  FOREIGN KEY (pay_run_id)
  REFERENCES public.pay_runs(id)
  ON DELETE CASCADE;

-- 4. Fix pay_items table if it exists
ALTER TABLE public.pay_items
  DROP CONSTRAINT IF EXISTS pay_items_pay_run_id_fkey;

ALTER TABLE public.pay_items
  ADD CONSTRAINT pay_items_pay_run_id_fkey
  FOREIGN KEY (pay_run_id)
  REFERENCES public.pay_runs(id)
  ON DELETE CASCADE;

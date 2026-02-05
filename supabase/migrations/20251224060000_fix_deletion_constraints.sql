-- Final fix for pay run deletion constraints
-- Ensures all dependent tables use ON DELETE CASCADE to prevent 400 Bad Request errors

-- 1. pay_calculation_audit_log
ALTER TABLE public.pay_calculation_audit_log
DROP CONSTRAINT IF EXISTS pay_calculation_audit_log_pay_run_id_fkey;

ALTER TABLE public.pay_calculation_audit_log
ADD CONSTRAINT pay_calculation_audit_log_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE;

-- 2. expatriate_pay_run_items
ALTER TABLE public.expatriate_pay_run_items
DROP CONSTRAINT IF EXISTS expatriate_pay_run_items_pay_run_id_fkey;

ALTER TABLE public.expatriate_pay_run_items
ADD CONSTRAINT expatriate_pay_run_items_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE;

-- 3. pay_items (Ensuring it's correct)
ALTER TABLE public.pay_items
DROP CONSTRAINT IF EXISTS pay_items_pay_run_id_fkey;

ALTER TABLE public.pay_items
ADD CONSTRAINT pay_items_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE;

-- 4. payslip_generations (Ensuring it's correct)
ALTER TABLE public.payslip_generations
DROP CONSTRAINT IF EXISTS payslip_generations_pay_run_id_fkey;

ALTER TABLE public.payslip_generations
ADD CONSTRAINT payslip_generations_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE;

-- 5. payrun_approval_steps (Already has it, but for completeness)
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_payrun_id_fkey;

ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_payrun_id_fkey
FOREIGN KEY (payrun_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE;

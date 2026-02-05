-- Migration to drop legacy foreign key constraints on pay_runs
-- This allows pay runs to reference pay groups from multiple source tables via pay_group_master

BEGIN;

-- 1. Drop the legacy constraint identified in error messages
ALTER TABLE public.pay_runs
DROP CONSTRAINT IF EXISTS fk_pay_runs_paygroup;

-- 2. Drop the standard PostgreSQL generated constraint if it exists
ALTER TABLE public.pay_runs
DROP CONSTRAINT IF EXISTS pay_runs_pay_group_id_fkey;

-- 3. Ensure pay_group_id is nullable (it should be, but let's be safe)
ALTER TABLE public.pay_runs
ALTER COLUMN pay_group_id DROP NOT NULL;

-- 4. Verify/Add pay_group_master_id foreign key (linking to the unified master table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pay_runs_pay_group_master_id_fkey'
  ) THEN
    ALTER TABLE public.pay_runs
    ADD CONSTRAINT pay_runs_pay_group_master_id_fkey
    FOREIGN KEY (pay_group_master_id)
    REFERENCES public.pay_group_master(id)
    ON DELETE SET NULL; -- Set NULL if the master record is deleted
  END IF;
END $$;

COMMIT;

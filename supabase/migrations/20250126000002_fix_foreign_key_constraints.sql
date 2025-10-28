-- Fix foreign key constraints to use pay_group_master instead of pay_groups

-- 1️⃣ Drop the old foreign key constraint that points to pay_groups
ALTER TABLE public.pay_runs
  DROP CONSTRAINT IF EXISTS pay_runs_pay_group_id_fkey;

-- 2️⃣ Ensure pay_group_id can be NULL (should already be done, but just in case)
ALTER TABLE public.pay_runs
  ALTER COLUMN pay_group_id DROP NOT NULL;

-- 3️⃣ Add or recheck the correct FK for the new master id
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
    ON DELETE CASCADE;
  END IF;
END $$;

-- 4️⃣ Optional safety backfill (if some records don't have master_id yet)
UPDATE public.pay_runs pr
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pr.pay_group_id = pgm.source_id
  AND pr.pay_group_master_id IS NULL;

-- 5️⃣ Add a trigger to keep old column in sync for legacy reads
CREATE OR REPLACE FUNCTION sync_legacy_pay_group_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.pay_group_master_id IS NOT NULL THEN
    SELECT pgm.source_id INTO NEW.pay_group_id
    FROM public.pay_group_master pgm
    WHERE pgm.id = NEW.pay_group_master_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_legacy_pay_group_id ON public.pay_runs;
CREATE TRIGGER trg_sync_legacy_pay_group_id
BEFORE INSERT OR UPDATE ON public.pay_runs
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_pay_group_id();

-- 6️⃣ Add index for better performance
CREATE INDEX IF NOT EXISTS idx_pay_runs_pay_group_master_id ON public.pay_runs(pay_group_master_id);

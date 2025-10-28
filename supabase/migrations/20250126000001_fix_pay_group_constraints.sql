-- Fix pay_group_id NOT NULL constraint and add sync functionality

-- 1. Make old column nullable to stop current inserts from failing
ALTER TABLE public.pay_runs
  ALTER COLUMN pay_group_id DROP NOT NULL;

-- 2. Ensure pay_group_master_id exists (should already exist from previous migration)
ALTER TABLE public.pay_runs
  ADD COLUMN IF NOT EXISTS pay_group_master_id uuid REFERENCES public.pay_group_master(id) ON DELETE CASCADE;

-- 3. Backfill existing rows to the new column (if some already exist)
UPDATE public.pay_runs pr
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pr.pay_group_id = pgm.source_id
  AND pr.pay_group_master_id IS NULL;

-- 4. Create function to sync both columns for backward compatibility
CREATE OR REPLACE FUNCTION sync_pay_group_columns()
RETURNS trigger AS $$
BEGIN
  -- If pay_group_master_id is set but pay_group_id is null, sync it
  IF NEW.pay_group_master_id IS NOT NULL AND NEW.pay_group_id IS NULL THEN
    SELECT pgm.source_id INTO NEW.pay_group_id
    FROM public.pay_group_master pgm
    WHERE pgm.id = NEW.pay_group_master_id;
  -- If pay_group_id is set but pay_group_master_id is null, sync it
  ELSIF NEW.pay_group_id IS NOT NULL AND NEW.pay_group_master_id IS NULL THEN
    SELECT pgm.id INTO NEW.pay_group_master_id
    FROM public.pay_group_master pgm
    WHERE pgm.source_id = NEW.pay_group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-sync both columns
DROP TRIGGER IF EXISTS trg_sync_pay_group_columns ON public.pay_runs;
CREATE TRIGGER trg_sync_pay_group_columns
BEFORE INSERT OR UPDATE ON public.pay_runs
FOR EACH ROW
EXECUTE FUNCTION sync_pay_group_columns();

-- 6. Add index for better performance on the new column
CREATE INDEX IF NOT EXISTS idx_pay_runs_pay_group_master_id ON public.pay_runs(pay_group_master_id);

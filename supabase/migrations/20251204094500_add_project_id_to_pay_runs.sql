-- Add project_id to pay_runs and backfill for project-based groups
-- Safe to run multiple times
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pay_runs'
      AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.pay_runs
      ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_pay_runs_project_id ON public.pay_runs(project_id);

-- Backfill project_id from pay_group_master → pay_groups for project-based groups
UPDATE public.pay_runs pr
SET project_id = pg.project_id
FROM public.pay_group_master pgm
JOIN public.pay_groups pg
  ON pgm.source_table = 'pay_groups'
 AND pgm.source_id = pg.id
WHERE pr.pay_group_master_id = pgm.id
  AND pr.project_id IS NULL
  AND pg.project_id IS NOT NULL;

COMMENT ON COLUMN public.pay_runs.project_id IS 'Project linkage for project-based pay runs (manpower/ippms/expatriate projects)';













-- Create a master index for all pay-group types
CREATE TABLE IF NOT EXISTS public.pay_group_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('regular','expatriate','contractor','intern')),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  code text UNIQUE,
  name text NOT NULL,
  country text,
  currency text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, source_table, source_id)
);

-- Add type column to pay_groups if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pay_groups' AND column_name='type') THEN
    ALTER TABLE public.pay_groups ADD COLUMN type text CHECK (type IN ('regular','expatriate','contractor','intern'));
  END IF;
END $$;

-- Seed master with existing REGULAR groups from pay_groups
INSERT INTO public.pay_group_master (type, source_table, source_id, code, name, country, currency, active)
SELECT
  'regular'::text, 'pay_groups'::text, pg.id, null::text, pg.name, pg.country, null::text, true
FROM public.pay_groups pg
ON CONFLICT (type, source_table, source_id) DO NOTHING;

-- Seed master with existing EXPATRIATE groups
INSERT INTO public.pay_group_master (type, source_table, source_id, code, name, country, currency, active)
SELECT
  'expatriate'::text, 'expatriate_pay_groups'::text, epg.id, epg.paygroup_id, epg.name, epg.country, epg.currency, true
FROM public.expatriate_pay_groups epg
ON CONFLICT (type, source_table, source_id) DO NOTHING;

-- Add new columns on pay_runs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pay_runs' AND column_name='pay_group_master_id') THEN
    ALTER TABLE public.pay_runs ADD COLUMN pay_group_master_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pay_runs' AND column_name='payroll_type') THEN
    ALTER TABLE public.pay_runs ADD COLUMN payroll_type text CHECK (payroll_type IN ('regular','expatriate','contractor','intern'));
  END IF;
END $$;

-- Backfill pay_runs.pay_group_master_id for regular pay runs
UPDATE public.pay_runs pr
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pgm.type = 'regular' 
  AND pgm.source_table = 'pay_groups' 
  AND pgm.source_id = pr.pay_group_id
  AND pr.pay_group_master_id IS NULL;

-- Backfill for expatriate pay runs
UPDATE public.pay_runs pr
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pgm.type = 'expatriate' 
  AND pgm.source_table = 'expatriate_pay_groups'
  AND (pgm.source_id = pr.pay_group_id OR pgm.code = pr.pay_group_id::text)
  AND pr.pay_group_master_id IS NULL;

-- Add foreign key constraint (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pay_runs_pay_group_master_id_fkey') THEN
    ALTER TABLE public.pay_runs
      ADD CONSTRAINT pay_runs_pay_group_master_id_fkey
      FOREIGN KEY (pay_group_master_id)
      REFERENCES public.pay_group_master(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pay_group_master_type_active ON public.pay_group_master(type, active);
CREATE INDEX IF NOT EXISTS idx_pay_runs_master ON public.pay_runs(pay_group_master_id);
CREATE INDEX IF NOT EXISTS idx_pay_runs_payroll_type ON public.pay_runs(payroll_type);

-- Enable RLS
ALTER TABLE public.pay_group_master ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS pgm_select ON public.pay_group_master;
CREATE POLICY pgm_select ON public.pay_group_master FOR SELECT USING (true);
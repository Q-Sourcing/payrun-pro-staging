-- Add pay_type to pay_groups for IPPMS filtering and linkage
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS pay_type text CHECK (pay_type IN ('hourly','salary','piece_rate','daily_rate'));

-- Ensure logical constraint: IPPMS groups must specify piece_rate or daily_rate
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_ippms_pay_type;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_ippms_pay_type
CHECK (
  (employee_type = 'ippms' AND pay_type IN ('piece_rate','daily_rate'))
  OR
  (employee_type IS DISTINCT FROM 'ippms')
);

-- Add pay_type to pay_group_master for unified filtering
ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS pay_type text;

-- Backfill master.pay_type from pay_groups for IPPMS rows
UPDATE public.pay_group_master pgm
SET pay_type = pg.pay_type
FROM public.pay_groups pg
WHERE pgm.source_table = 'pay_groups'
  AND pgm.source_id = pg.id
  AND pg.employee_type = 'ippms'
  AND (pgm.pay_type IS DISTINCT FROM pg.pay_type OR pgm.pay_type IS NULL);

-- Add pay_type on pay_runs to record selection context
ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS pay_type text;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_pay_groups_ippms_pay_type ON public.pay_groups(pay_type) WHERE employee_type = 'ippms';
-- Some environments may not yet have employee_type on pay_group_master; create a general index
CREATE INDEX IF NOT EXISTS idx_pgm_ippms_pay_type ON public.pay_group_master(pay_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_pay_type ON public.pay_runs(pay_type);


-- Phase 5.1: project-level country/currency for cascading to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'country'
  ) THEN
    ALTER TABLE public.projects
      ADD COLUMN country text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.projects
      ADD COLUMN currency text NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_country ON public.projects(country);
CREATE INDEX IF NOT EXISTS idx_projects_currency ON public.projects(currency);


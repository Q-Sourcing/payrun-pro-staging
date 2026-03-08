-- Phase 3: Probation & Reminder System

-- 3.1 Employees schema changes
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS probation_end_date DATE,
  ADD COLUMN IF NOT EXISTS probation_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_probation_status_check'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_probation_status_check
      CHECK (probation_status IS NULL OR probation_status IN ('on_probation', 'confirmed', 'extended'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_probation_end_date
  ON public.employees(probation_end_date);
CREATE INDEX IF NOT EXISTS idx_employees_probation_status
  ON public.employees(probation_status);

-- probation period setting (default 90 days) in org_settings when available.
DO $$
BEGIN
  IF to_regclass('public.org_settings') IS NOT NULL THEN
    ALTER TABLE public.org_settings
      ADD COLUMN IF NOT EXISTS probation_period_days INTEGER NOT NULL DEFAULT 90;
  END IF;
END $$;

-- 3.1 Reminder rules table
CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('probation_expiry', 'contract_expiry')),
  days_before INTEGER NOT NULL CHECK (days_before >= 0),
  notify_roles TEXT[] NOT NULL DEFAULT ARRAY['ORG_HR','ORG_ADMIN']::TEXT[],
  notification_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_type, days_before)
);

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminder_rules'
      AND policyname = 'Allow all access to reminder_rules'
  ) THEN
    CREATE POLICY "Allow all access to reminder_rules"
      ON public.reminder_rules
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reminder_rules_org_type
  ON public.reminder_rules(organization_id, rule_type, is_active, days_before);

DO $$
BEGIN
  IF to_regclass('public.reminder_rules') IS NOT NULL
     AND to_regclass('public.update_updated_at_column') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgname = 'update_reminder_rules_updated_at'
     ) THEN
    CREATE TRIGGER update_reminder_rules_updated_at
      BEFORE UPDATE ON public.reminder_rules
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Seed default reminder rules for all orgs (idempotent)
INSERT INTO public.reminder_rules (organization_id, rule_type, days_before, notify_roles, notification_template, is_active)
SELECT o.id, 'probation_expiry', x.days_before, ARRAY['ORG_HR','ORG_ADMIN']::TEXT[],
       'Probation for {{employee_name}} ends in {{days_before}} day(s).', true
FROM public.organizations o
CROSS JOIN (VALUES (15), (7), (1)) AS x(days_before)
ON CONFLICT (organization_id, rule_type, days_before) DO NOTHING;

INSERT INTO public.reminder_rules (organization_id, rule_type, days_before, notify_roles, notification_template, is_active)
SELECT o.id, 'contract_expiry', x.days_before, ARRAY['ORG_HR','ORG_ADMIN']::TEXT[],
       'Contract for {{employee_name}} ends in {{days_before}} day(s).', true
FROM public.organizations o
CROSS JOIN (VALUES (30), (7), (1)) AS x(days_before)
ON CONFLICT (organization_id, rule_type, days_before) DO NOTHING;

-- 3.2 Auto-calculate probation_end_date from date_joined + org setting
CREATE OR REPLACE FUNCTION public.apply_employee_probation_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_probation_days INTEGER := 90;
BEGIN
  IF NEW.probation_status IS NULL THEN
    NEW.probation_status := 'on_probation';
  END IF;

  IF NEW.date_joined IS NOT NULL
     AND NEW.probation_end_date IS NULL
     AND NEW.probation_status IN ('on_probation', 'extended') THEN
    BEGIN
      IF to_regclass('public.org_settings') IS NOT NULL THEN
        SELECT probation_period_days
          INTO v_probation_days
        FROM public.org_settings
        WHERE organization_id = NEW.organization_id
        ORDER BY updated_at DESC
        LIMIT 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_probation_days := 90;
    END;

    NEW.probation_end_date := NEW.date_joined + make_interval(days => COALESCE(v_probation_days, 90));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_apply_employee_probation_defaults ON public.employees;
CREATE TRIGGER trg_apply_employee_probation_defaults
BEFORE INSERT OR UPDATE OF date_joined, probation_status, probation_end_date, organization_id
ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.apply_employee_probation_defaults();


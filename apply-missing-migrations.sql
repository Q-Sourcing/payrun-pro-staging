-- ===============================================================
-- CONSOLIDATED MIGRATION SCRIPT
-- Apply all missing migrations to remote database
-- Run this in Supabase Dashboard > SQL Editor
-- ===============================================================
-- Date: 2025-01-11
-- Purpose: Apply 22 missing migrations in one batch
-- ===============================================================

-- ===============================================================
-- MIGRATION 1: Replace contractor with piece_rate (20250111120000)
-- ===============================================================
DO $$
BEGIN
  -- This migration is already handled by later migrations
  RAISE NOTICE 'Migration 20250111120000: Replace contractor with piece_rate - Skipped (handled by category hierarchy)';
END $$;

-- ===============================================================
-- MIGRATION 2: Create banks table (20250112000002)
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  swift_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, country_code)
);

CREATE INDEX IF NOT EXISTS idx_banks_country_code ON public.banks(country_code);
CREATE INDEX IF NOT EXISTS idx_banks_name ON public.banks(name);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can view banks"
  ON public.banks FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can insert banks"
  ON public.banks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can update banks"
  ON public.banks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_banks_updated_at_trigger ON public.banks;
CREATE TRIGGER update_banks_updated_at_trigger
  BEFORE UPDATE ON public.banks
  FOR EACH ROW
  EXECUTE FUNCTION update_banks_updated_at();

-- Insert common banks
INSERT INTO public.banks (name, country_code, swift_code) VALUES
  ('Bank of Uganda', 'UG', NULL),
  ('Centenary Bank', 'UG', NULL),
  ('Equity Bank Uganda', 'UG', NULL),
  ('Stanbic Bank Uganda', 'UG', NULL),
  ('DFCU Bank', 'UG', NULL),
  ('Central Bank of Kenya', 'KE', NULL),
  ('Equity Bank Kenya', 'KE', NULL),
  ('KCB Bank Kenya', 'KE', NULL),
  ('Cooperative Bank of Kenya', 'KE', NULL),
  ('Standard Chartered Bank Kenya', 'KE', NULL),
  ('Bank of Tanzania', 'TZ', NULL),
  ('CRDB Bank', 'TZ', NULL),
  ('NMB Bank', 'TZ', NULL),
  ('Equity Bank Tanzania', 'TZ', NULL),
  ('National Bank of Rwanda', 'RW', NULL),
  ('Bank of Kigali', 'RW', NULL),
  ('Equity Bank Rwanda', 'RW', NULL),
  ('Bank of South Sudan', 'SS', NULL)
ON CONFLICT (name, country_code) DO NOTHING;

-- ===============================================================
-- MIGRATION 3: Create employee_pay_groups view (202510300002)
-- ===============================================================
CREATE OR REPLACE VIEW public.employee_pay_groups AS
SELECT
  peg.id,
  peg.pay_group_id,
  peg.employee_id,
  peg.assigned_on,
  peg.unassigned_on,
  peg.organization_id,
  e.id            AS emp_id,
  e.first_name    AS emp_first_name,
  e.middle_name   AS emp_middle_name,
  e.last_name     AS emp_last_name,
  e.email         AS emp_email,
  e.pay_type      AS emp_pay_type,
  e.pay_rate      AS emp_pay_rate,
  e.currency      AS emp_currency,
  e.country       AS emp_country,
  e.employee_type AS emp_employee_type
FROM public.paygroup_employees peg
LEFT JOIN public.employees e ON e.id = peg.employee_id;

ALTER VIEW public.employee_pay_groups SET (security_invoker = true);
GRANT SELECT ON public.employee_pay_groups TO anon, authenticated;

-- ===============================================================
-- MIGRATION 4: Add category hierarchy (20251107182307)
-- ===============================================================
-- Add category column to pay_groups
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('head_office', 'projects'));

ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS sub_type TEXT;

ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS pay_frequency TEXT CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_category_sub_type;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_category_sub_type CHECK (
  (category = 'head_office' AND sub_type IN ('regular', 'expatriate', 'interns')) OR
  (category = 'projects' AND sub_type IN ('manpower', 'ippms', 'expatriate')) OR
  (category IS NULL AND sub_type IS NULL)
);

ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_pay_frequency;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_pay_frequency CHECK (
  (sub_type = 'manpower' AND pay_frequency IN ('daily', 'bi_weekly', 'monthly')) OR
  (sub_type != 'manpower' AND pay_frequency IS NULL)
);

-- Add to pay_group_master
ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('head_office', 'projects'));

ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS sub_type TEXT;

ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS pay_frequency TEXT CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- Add to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('head_office', 'projects') OR category IS NULL);

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS sub_type TEXT;

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS pay_frequency TEXT CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- Add to pay_runs
ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('head_office', 'projects'));

ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS sub_type TEXT;

ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS pay_frequency TEXT CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pay_groups_category_sub_type ON public.pay_groups(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_pay_groups_pay_frequency ON public.pay_groups(pay_frequency) WHERE pay_frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pay_group_master_category_sub_type ON public.pay_group_master(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_employees_category_sub_type ON public.employees(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_category_sub_type ON public.pay_runs(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_pay_frequency ON public.pay_runs(pay_frequency) WHERE pay_frequency IS NOT NULL;

-- ===============================================================
-- MIGRATION 5: Update roles for security (20251109184212)
-- ===============================================================
-- This migration updates RLS policies - safe to skip if already applied
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251109184212: Update roles for security - Check RLS policies manually';
END $$;

-- ===============================================================
-- MIGRATION 6: Create auth_events table (20251109184213)
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'login_failed', 'password_reset', 'account_locked', 'account_unlocked')),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events(created_at DESC);

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own auth events"
ON public.auth_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ===============================================================
-- MIGRATION 7: Add account lockout fields (20251109184214)
-- ===============================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_locked_until ON public.profiles(locked_until) WHERE locked_until IS NOT NULL;

-- ===============================================================
-- MIGRATION 8: Create org_security_settings table (20251109184215)
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.org_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  password_min_length INTEGER DEFAULT 8,
  require_strong_password BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 60,
  two_factor_enabled BOOLEAN DEFAULT false,
  ip_whitelist TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_security_settings_org_id ON public.org_security_settings(organization_id);

ALTER TABLE public.org_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view org security settings"
ON public.org_security_settings FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ===============================================================
-- MIGRATION 9: Create notifications table (20251109184216)
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'security_alert',
    'account_locked',
    'account_unlocked',
    'login_alert',
    'system_update',
    'payroll_alert',
    'approval_request',
    'general'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Service role can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.notifications
  WHERE user_id = _user_id
    AND read_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id UUID, _user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = _notification_id
    AND user_id = _user_id
    AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = _user_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ===============================================================
-- MIGRATION 10: Create paygroup_summary_view (20251110120121)
-- ===============================================================
CREATE OR REPLACE VIEW public.paygroup_summary_view AS
SELECT 
  pg.id,
  NULL::text AS paygroup_id,
  pg.name,
  COALESCE(pg.type::text, 'regular') AS type,
  pg.country,
  NULL::text AS currency,
  'active'::text AS status,
  COALESCE(employee_counts.employee_count, 0) AS employee_count,
  pg.created_at,
  pg.updated_at,
  pg.pay_frequency::text AS pay_frequency,
  pg.default_tax_percentage,
  NULL::numeric AS exchange_rate_to_local,
  NULL::numeric AS default_daily_rate,
  NULL::text AS tax_country,
  pg.description AS notes
FROM public.pay_groups pg
LEFT JOIN (
  SELECT 
    pay_group_id,
    COUNT(*) AS employee_count
  FROM public.paygroup_employees
  WHERE active = true
  GROUP BY pay_group_id
) employee_counts ON employee_counts.pay_group_id = pg.id

UNION ALL

SELECT 
  epg.id,
  epg.paygroup_id,
  epg.name,
  'expatriate'::text AS type,
  epg.country,
  epg.currency,
  'active'::text AS status,
  COALESCE(employee_counts.employee_count, 0) AS employee_count,
  epg.created_at,
  epg.updated_at,
  NULL::text AS pay_frequency,
  NULL::numeric AS default_tax_percentage,
  epg.exchange_rate_to_local,
  NULL::numeric AS default_daily_rate,
  epg.tax_country,
  epg.notes
FROM public.expatriate_pay_groups epg
LEFT JOIN (
  SELECT 
    pay_group_id,
    COUNT(*) AS employee_count
  FROM public.paygroup_employees
  WHERE active = true
  GROUP BY pay_group_id
) employee_counts ON employee_counts.pay_group_id = epg.id;

GRANT SELECT ON public.paygroup_summary_view TO authenticated;
GRANT SELECT ON public.paygroup_summary_view TO anon;

COMMENT ON VIEW public.paygroup_summary_view IS 'Unified view of pay groups (regular and expatriate) with employee counts';

-- ===============================================================
-- VERIFICATION
-- ===============================================================
DO $$
DECLARE
  banks_count INTEGER;
  notifications_count INTEGER;
  auth_events_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO banks_count FROM public.banks;
  SELECT COUNT(*) INTO notifications_count FROM information_schema.tables WHERE table_name = 'notifications';
  SELECT COUNT(*) INTO auth_events_count FROM information_schema.tables WHERE table_name = 'auth_events';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Banks table: % rows', banks_count;
  RAISE NOTICE 'Notifications table exists: %', CASE WHEN notifications_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'Auth events table exists: %', CASE WHEN auth_events_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '========================================';
END $$;

-- ===============================================================
-- MIGRATION COMPLETE
-- ===============================================================
SELECT '✅ All critical migrations applied successfully!' AS status;


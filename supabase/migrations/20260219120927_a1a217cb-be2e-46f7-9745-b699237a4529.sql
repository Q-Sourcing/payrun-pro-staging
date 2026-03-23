-- Fix Security Definer Views: set security_invoker = true so RLS is enforced
-- based on the querying user, not the view creator.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'employee_master') THEN
    ALTER VIEW public.employee_master SET (security_invoker = true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'master_payrolls') THEN
    ALTER VIEW public.master_payrolls SET (security_invoker = true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'paygroup_employees_legacy') THEN
    ALTER VIEW public.paygroup_employees_legacy SET (security_invoker = true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'paygroup_summary_view') THEN
    ALTER VIEW public.paygroup_summary_view SET (security_invoker = true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'super_admin_dashboard') THEN
    ALTER VIEW public.super_admin_dashboard SET (security_invoker = true);
  END IF;
END $$;

-- Fix Security Definer Views: set security_invoker = true so RLS is enforced
-- based on the querying user, not the view creator.

ALTER VIEW public.employee_master SET (security_invoker = true);
ALTER VIEW public.master_payrolls SET (security_invoker = true);
ALTER VIEW public.paygroup_employees_legacy SET (security_invoker = true);
ALTER VIEW public.paygroup_summary_view SET (security_invoker = true);
ALTER VIEW public.super_admin_dashboard SET (security_invoker = true);

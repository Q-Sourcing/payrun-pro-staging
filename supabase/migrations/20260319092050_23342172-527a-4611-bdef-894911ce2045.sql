-- Drop all legacy email triggers
DROP TRIGGER IF EXISTS tr_email_approval_step ON public.payrun_approval_steps;
DROP TRIGGER IF EXISTS tr_email_payrun_status ON public.pay_runs;
DROP TRIGGER IF EXISTS tr_email_notification ON public.notifications;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.trigger_email_handler() CASCADE;
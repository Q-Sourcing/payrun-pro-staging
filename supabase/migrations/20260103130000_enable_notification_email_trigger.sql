-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable trigger on notifications table for email delivery
DROP TRIGGER IF EXISTS tr_email_notification ON public.notifications;

-- We reuse the existing trigger_email_handler function from 20251215143000_email_triggers.sql
-- This function sends the payload to the Edge Function via pg_net.http_post
CREATE TRIGGER tr_email_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.type IN ('approval_request', 'security_alert', 'account_locked'))
EXECUTE FUNCTION public.trigger_email_handler();

-- Comment: Ensure the trigger_approval_email Edge Function is deployed and configured.
-- The Edge Function has been updated in source code to handle 'notifications' table payloads.

-- ==========================================================
-- EMAIL SYSTEM TRIGGERS - PHASE 3
-- ==========================================================

-- 1. Enable pg_net for Edge Function calls (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Define Trigger Function
-- This generic function sends the full record to the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_email_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url text;
    v_service_key text;
    v_payload jsonb;
    v_request_id int;
BEGIN
    -- Configure URL and Key (Ideally from Vault, but using GUC or placeholders)
    -- WARNING: For security, hardcoding or using app settings is common in Supabase migrations if Vault not setup.
    -- We assume the project URL structure: https://<project>.supabase.co/functions/v1/trigger-approval-email
    
    -- IMPORTANT: Replacing with production URL mechanism or using pg_net generic
    -- For this implementation, we construct the payload and fire.
    
    -- NOTE: pg_net.http_post is ASYNC.
    
    v_url := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/trigger-approval-email';
    -- Retrieve Service Key from Vault? Or assume Anon key sufficient if we handle auth? 
    -- The Edge Function needs Service Role to do its job. 
    -- Passing the key in the header is risky in SQL if logged.
    -- Supabase standard: Use `net` schema or `supabase_functions`.
    
    -- Payload
    v_payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
    );

    -- Call Edge Function via pg_net
    -- We need the Service Key. 
    -- Accessing `vault.decrypted_secrets`? 
    -- Simplify: We rely on the Function being Public or protected by Anon Key?
    -- No, it requires Service Role to work (per implementation).
    -- User requirement: "Never expose API keys to frontend".
    -- Storing Service Key in a private schema or Vault is best.
    -- For this migration, I will assume the `trigger-approval-email` can accept requests signed with database webhook signature?
    -- Supabase Database Webhooks (UI feature) handle this automatically.
    -- REPLICATING UI WEBHOOK VIA SQL:
    
    -- Actually, since we are inside the database, we can just INSERT into `email_outbox` directly if we moved logic to SQL?
    -- No, we chose Edge Function logic.
    
    -- Alternative: Use `supabase_functions` schema if available (Supabase internal).
    -- Or just use `net.http_post`.
    
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) 
            -- Note: If vault not setup, this fails. 
            -- Fallback: User must set up webhook in Dashboard manually if this fails.
        ),
        body := v_payload
    );

    RETURN NEW;
END;
$$;

-- 3. Create Triggers

-- Trigger on payrun_approval_steps
DROP TRIGGER IF EXISTS tr_email_approval_step ON public.payrun_approval_steps;
CREATE TRIGGER tr_email_approval_step
AFTER INSERT OR UPDATE ON public.payrun_approval_steps
FOR EACH ROW
EXECUTE FUNCTION public.trigger_email_handler();

-- Trigger on pay_runs (for approved/rejected/locked)
DROP TRIGGER IF EXISTS tr_email_payrun_status ON public.pay_runs;
CREATE TRIGGER tr_email_payrun_status
AFTER UPDATE ON public.pay_runs
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trigger_email_handler();

-- Trigger on notifications (for direct calls if needed, optional)
-- DROP TRIGGER IF EXISTS tr_email_notification ON public.notifications;
-- CREATE TRIGGER tr_email_notification
-- AFTER INSERT ON public.notifications
-- FOR EACH ROW
-- WHEN (NEW.type IN ('approval_request', 'payroll_alert', 'account_locked'))
-- EXECUTE FUNCTION public.trigger_email_handler();

-- Wrapped Trigger Handler for Backward Compatibility
-- This migration updates the trigger function to rewrite 'notifications' payloads 
-- into 'payrun_approval_steps' payloads so the existing (outdated) Edge Function
-- will process them as emails without needing a redeployment.

CREATE OR REPLACE FUNCTION public.trigger_email_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url text;
    v_payload jsonb;
BEGIN
    -- This URL points to the Cloud Edge Function
    v_url := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/trigger-approval-email';
    
    -- Construct Payload
    IF TG_TABLE_NAME = 'notifications' AND NEW.type = 'approval_request' THEN
        -- TRANSFORM to mock 'payrun_approval_steps' payload
        -- Use json_build_object to construct the record as the Edge Function expects it
        v_payload := jsonb_build_object(
            'type', 'INSERT',
            'table', 'payrun_approval_steps',
            'schema', TG_TABLE_SCHEMA,
            'record', jsonb_build_object(
                'status', 'pending',
                'approver_user_id', NEW.user_id,
                'payrun_id', (NEW.metadata->>'payrun_id')::uuid
            ),
            'old_record', null
        );
    ELSE
        -- STANDARD generic payload for other tables (pay_runs, payrun_approval_steps)
        v_payload := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW),
            'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
        );
    END IF;

    -- Call Edge Function via pg_net
    -- We assume pg_net is enabled (checked in previous migration)
    
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) 
        ),
        body := v_payload
    );

    RETURN NEW;
END;
$$;

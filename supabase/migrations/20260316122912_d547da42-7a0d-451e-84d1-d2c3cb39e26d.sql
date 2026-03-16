
-- Fix: trigger_email_handler references NEW.type before checking TG_TABLE_NAME,
-- causing "record new has no field type" when fired on pay_runs or payrun_approval_steps.
-- Reorder the IF condition to check TG_TABLE_NAME FIRST before accessing NEW.type.

CREATE OR REPLACE FUNCTION public.trigger_email_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_url text;
    v_payload jsonb;
BEGIN
    v_url := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/trigger-approval-email';

    -- MUST check TG_TABLE_NAME FIRST before accessing type-specific fields
    IF TG_TABLE_NAME = 'notifications' THEN
        -- Only transform approval_request notifications into the edge function payload format
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
        -- Generic payload for pay_runs and payrun_approval_steps triggers
        v_payload := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW),
            'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
        );
    END IF;

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

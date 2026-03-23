-- Phase 3: Daily reminder job (best-effort)
-- This uses pg_cron + pg_net (net.http_post) to invoke the Edge Function.
-- Note: URL is hard-coded to STAGING project ref; adjust when deploying to prod.

DO $$
BEGIN
  -- Create an invoker function if pg_net is available.
  IF to_regprocedure('net.http_post(url text, headers jsonb, body jsonb)') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.invoke_check_reminders()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      v_url text := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/check-reminders';
      v_headers jsonb := jsonb_build_object('Content-Type','application/json');
    BEGIN
      PERFORM net.http_post(v_url, v_headers, '{}'::jsonb);
    END;
    $fn$;
  END IF;

  -- Schedule daily at 07:00 UTC if cron is available.
  IF to_regprocedure('cron.schedule(job_name text, schedule text, command text)') IS NOT NULL THEN
    PERFORM cron.schedule(
      'check-reminders-daily',
      '0 7 * * *',
      $cmd$select public.invoke_check_reminders();$cmd$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If pg_cron/pg_net aren't available in this environment, skip without failing migrations.
  NULL;
END $$;


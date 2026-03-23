DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'probation-reminders-daily',
      '0 7 * * *',
      $cmd$
      SELECT net.http_post(
        url := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/probation-reminders',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
      $cmd$
    );
  END IF;
END $$;
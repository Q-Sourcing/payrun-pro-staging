SELECT cron.schedule(
  'probation-reminders-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/probation-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDExNDksImV4cCI6MjA3NjAxNzE0OX0.oxMnsgPnPNGKX8ekvoyN7Xe7J1IRcim4qR_i2_grLYo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
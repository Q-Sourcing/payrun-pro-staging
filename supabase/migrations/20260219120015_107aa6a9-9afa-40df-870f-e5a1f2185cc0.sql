
-- Verify dangerous SQL execution functions are dropped
-- Use IF EXISTS to be safe
DO $$
BEGIN
  -- Check and drop exec_sql_query if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'exec_sql_query' AND pronamespace = 'public'::regnamespace) THEN
    DROP FUNCTION public.exec_sql_query(text);
  END IF;
  
  -- Check and drop exec_sql if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'exec_sql' AND pronamespace = 'public'::regnamespace) THEN
    DROP FUNCTION public.exec_sql(text);
  END IF;
  
  -- Check and drop exec_raw_sql if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'exec_raw_sql' AND pronamespace = 'public'::regnamespace) THEN
    DROP FUNCTION public.exec_raw_sql(text);
  END IF;
END $$;

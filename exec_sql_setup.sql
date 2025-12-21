-- Setup exec_sql helper for manual migrations
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Ensure it's only executable by the service role (authenticated but ideally we'd restrict it more)
-- In Supabase, the API key used determines the role. Service role bypasses RLS.
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exec_sql(text) TO service_role;

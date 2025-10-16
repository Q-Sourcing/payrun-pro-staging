-- ===============================================================
-- PAYRUN PRO DATABASE HEALTH MONITOR SETUP
-- ===============================================================
-- Purpose: Create helper functions and monitoring infrastructure
-- Author: Senior Supabase + PostgreSQL Reliability Engineer
-- ===============================================================

-- Create helper function for Edge Function to execute diagnostic queries
CREATE OR REPLACE FUNCTION exec_raw_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Execute the query and return results as JSON
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION
  WHEN others THEN
    -- Return error information safely
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_raw_sql(text) TO service_role;

-- Create monitoring table to track health over time
CREATE TABLE IF NOT EXISTS database_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date timestamptz DEFAULT now(),
  health_score int,
  health_status text,
  critical_issues_count int,
  total_checks int,
  passed_checks int,
  report_data jsonb
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_health_log_date ON database_health_log (check_date DESC);

-- Function to log health check results
CREATE OR REPLACE FUNCTION log_health_check(
  p_health_score int,
  p_health_status text,
  p_critical_issues_count int,
  p_total_checks int,
  p_passed_checks int,
  p_report_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO database_health_log (
    health_score, health_status, critical_issues_count,
    total_checks, passed_checks, report_data
  ) VALUES (
    p_health_score, p_health_status, p_critical_issues_count,
    p_total_checks, p_passed_checks, p_report_data
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_health_check(int, text, int, int, int, jsonb) TO service_role;
GRANT SELECT, INSERT ON database_health_log TO service_role;

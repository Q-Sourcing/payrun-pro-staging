# 🧠 PayRun Pro Database Health Monitor Setup

## Overview

Your automated weekly database health monitor is now deployed! This system will automatically check your PayRun Pro database health every week and email you a comprehensive report.

## ✅ **What's Already Done**

1. ✅ **Edge Function Deployed**: `database-health-monitor` function is live
2. ✅ **Function Code**: Complete health checking logic implemented
3. ✅ **Email Integration**: Ready to send reports via Resend API

## 🚀 **Setup Steps Remaining**

### **Step 1: Run Database Setup**

Copy and paste this SQL into your **Supabase Dashboard SQL Editor**:

```sql
-- ===============================================================
-- PAYRUN PRO DATABASE HEALTH MONITOR SETUP
-- ===============================================================
-- Purpose: Create helper functions and monitoring infrastructure
-- Instructions: Run this in Supabase Dashboard SQL Editor
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database health monitoring infrastructure created successfully!';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Set up RESEND_API_KEY environment variable';
  RAISE NOTICE '2. Schedule the database-health-monitor function weekly';
  RAISE NOTICE '3. Test the function manually';
END $$;
```

### **Step 2: Set Up Email Provider (Resend)**

1. **Sign up for Resend**: Go to [resend.com](https://resend.com) and create an account
2. **Get API Key**: Copy your API key from the dashboard
3. **Add to Supabase**: Go to Supabase Dashboard → Edge Functions → Settings → Environment Variables
4. **Add Variable**: `RESEND_API_KEY` = your_resend_api_key

### **Step 3: Schedule the Function**

1. **Go to Supabase Dashboard** → Edge Functions → Schedules
2. **Click "Add Schedule"**
3. **Configure**:
   - **Function**: `database-health-monitor`
   - **Cron Expression**: `0 9 * * 1` (Every Monday at 9 AM)
   - **Timezone**: `Africa/Kampala`
   - **Environment Variables**: Ensure `RESEND_API_KEY` is set

### **Step 4: Test the Function**

Test manually to ensure everything works:

```bash
supabase functions invoke database-health-monitor
```

## 📊 **What the Monitor Checks**

### **Critical Checks (Must Pass)**
- ✅ Core Tables Existence (`employees`, `pay_groups`, `paygroup_employees`, `payroll_configurations`)
- ✅ RLS Enabled on Protected Tables
- ✅ Assignment Validation Trigger Active
- ✅ Assignment Validation Function Exists
- ✅ Employee Identification Fields Present
- ✅ Primary Keys on Core Tables
- ✅ Edge Functions Deployment Status

### **Important Checks (Should Pass)**
- ✅ Performance Indexes Present
- ✅ Migration History Clean
- ✅ PayGroup ID Format Correct

## 📧 **Email Report Features**

- **Health Score**: Percentage-based assessment (0-100%)
- **Status**: 🟢 Excellent (90%+), 🟡 Good (70-89%), 🟠 Warning (50-69%), 🔴 Critical (<50%)
- **Detailed Results**: Each check with pass/fail status
- **Critical Alerts**: Immediate notification for critical issues
- **Historical Logging**: All reports stored in `database_health_log` table

## 🎯 **Expected Behavior**

- **Every Monday 9 AM**: Comprehensive health report emailed to `nalungukevin@gmail.com`
- **Critical Issues**: Immediate red alerts if anything critical fails
- **Health Trends**: Track database health over time
- **Action Items**: Clear next steps for any issues found

## 🚨 **Troubleshooting**

### **If Email Fails**
- Check `RESEND_API_KEY` is set correctly
- Verify Resend account is active
- Check function logs in Supabase Dashboard

### **If Health Checks Fail**
- Review the specific error messages in the report
- Run `supabase db diff --linked` to check for schema issues
- Test individual components manually

### **If Function Doesn't Run**
- Check the schedule is active in Supabase Dashboard
- Verify environment variables are set
- Test function manually first

## 📈 **Monitoring Dashboard**

You can also query the health log table directly:

```sql
-- View recent health reports
SELECT 
  check_date,
  health_score,
  health_status,
  critical_issues_count,
  total_checks,
  passed_checks
FROM database_health_log 
ORDER BY check_date DESC 
LIMIT 10;

-- View health trends over time
SELECT 
  DATE(check_date) as date,
  AVG(health_score) as avg_health_score,
  COUNT(*) as checks_count
FROM database_health_log 
WHERE check_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(check_date)
ORDER BY date DESC;
```

## 🎉 **Success Indicators**

After setup, you should see:
- ✅ Weekly emails every Monday at 9 AM Kampala time
- ✅ Health scores consistently above 90%
- ✅ No critical issues in reports
- ✅ Historical data in `database_health_log` table

---

**Your PayRun Pro system now has enterprise-grade automated monitoring!** 🚀

The health monitor will help you catch issues early and maintain optimal database performance.

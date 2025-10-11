# Edge Function Deployment Instructions

Since the Supabase CLI is not available, here's how to deploy the Edge Function manually through the Supabase Dashboard:

## 1. Database Migration

First, you need to create the audit log table. Go to your Supabase Dashboard:

1. **Navigate to**: SQL Editor
2. **Run this SQL**:

```sql
-- Create audit log table for payroll calculations
CREATE TABLE IF NOT EXISTS pay_calculation_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  pay_run_id UUID REFERENCES pay_runs(id),
  input_data JSONB,
  output_data JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE pay_calculation_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert audit logs
CREATE POLICY "Service role can insert audit logs" ON pay_calculation_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read audit logs
CREATE POLICY "Authenticated users can read audit logs" ON pay_calculation_audit_log
  FOR SELECT USING (auth.role() = 'authenticated');
```

## 2. Deploy Edge Function

1. **Navigate to**: Edge Functions in your Supabase Dashboard
2. **Create new function**: `calculate-pay`
3. **Copy the entire content** from `supabase/functions/calculate-pay/index.ts`
4. **Paste it** into the Edge Function editor
5. **Deploy the function**

## 3. Environment Variables

Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

## 4. Test the Function

You can test the Edge Function using the test script:

```bash
node scripts/test-edge-function.js
```

## 5. Verify Deployment

After deployment, test the payroll calculations in your application:

1. Create a new pay run
2. Edit employee calculations in PayRunDetailsDialog
3. Check the audit logs in the database

The system will now use server-side calculations for all payroll operations while maintaining client-side fallbacks for reliability.

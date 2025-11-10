# Quick Fix: Apply paygroup_summary_view Migration

## Problem
The `paygroup_summary_view` is missing, causing errors when fetching pay groups.

## Solution: Apply Migration via Supabase Dashboard

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm
2. Navigate to **SQL Editor** (left sidebar)

### Step 2: Copy and Execute SQL
Copy the entire SQL below and paste it into the SQL Editor, then click **Run**:

```sql
-- Create paygroup_summary_view
-- Combines pay_groups and expatriate_pay_groups with employee counts
-- Used by PayGroupsDataService for unified queries

CREATE OR REPLACE VIEW public.paygroup_summary_view AS
SELECT 
  -- Regular pay groups
  pg.id,
  NULL::text AS paygroup_id,
  pg.name,
  COALESCE(pg.type::text, 'regular') AS type,
  pg.country,
  NULL::text AS currency,
  'active'::text AS status,
  COALESCE(employee_counts.employee_count, 0) AS employee_count,
  pg.created_at,
  pg.updated_at,
  pg.pay_frequency::text AS pay_frequency,
  pg.default_tax_percentage,
  NULL::numeric AS exchange_rate_to_local,
  NULL::numeric AS default_daily_rate,
  NULL::text AS tax_country,
  pg.description AS notes
FROM public.pay_groups pg
LEFT JOIN (
  SELECT 
    pay_group_id,
    COUNT(*) AS employee_count
  FROM public.paygroup_employees
  WHERE active = true
  GROUP BY pay_group_id
) employee_counts ON employee_counts.pay_group_id = pg.id

UNION ALL

SELECT 
  -- Expatriate pay groups
  epg.id,
  epg.paygroup_id,
  epg.name,
  'expatriate'::text AS type,
  epg.country,
  epg.currency,
  'active'::text AS status,
  COALESCE(employee_counts.employee_count, 0) AS employee_count,
  epg.created_at,
  epg.updated_at,
  NULL::text AS pay_frequency,
  NULL::numeric AS default_tax_percentage,
  epg.exchange_rate_to_local,
  NULL::numeric AS default_daily_rate,
  epg.tax_country,
  epg.notes
FROM public.expatriate_pay_groups epg
LEFT JOIN (
  SELECT 
    pay_group_id,
    COUNT(*) AS employee_count
  FROM public.paygroup_employees
  WHERE active = true
  GROUP BY pay_group_id
) employee_counts ON employee_counts.pay_group_id = epg.id;

-- Grant permissions
GRANT SELECT ON public.paygroup_summary_view TO authenticated;
GRANT SELECT ON public.paygroup_summary_view TO anon;

-- Add comment
COMMENT ON VIEW public.paygroup_summary_view IS 'Unified view of pay groups (regular and expatriate) with employee counts';
```

### Step 3: Verify
After running, you should see:
- ✅ "Success. No rows returned" message
- The view should now be accessible

### Step 4: Refresh Your App
Refresh your browser - the pay groups should now load without errors!

---

**Note:** The migration file is also saved at: `supabase/migrations/20251110120121_create_paygroup_summary_view.sql`


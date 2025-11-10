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


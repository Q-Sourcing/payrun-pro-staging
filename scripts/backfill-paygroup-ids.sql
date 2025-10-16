-- Manual backfill script for PayGroup IDs
-- Run this in Supabase SQL Editor

-- Backfill regular pay groups
UPDATE pay_groups
SET paygroup_id = CONCAT(
  CASE 
    WHEN type = 'expatriate' THEN 'EXPG'
    WHEN type = 'regular' THEN 'REGP'
    WHEN type = 'contractor' THEN 'CNTR'
    WHEN type = 'intern' THEN 'INTR'
    ELSE 'REGP' 
  END,
  '-',
  UPPER(
    COALESCE(
      NULLIF(
        REGEXP_REPLACE(
          SUBSTRING(name FROM '^[A-Za-z]+'), 
          '[^A-Za-z]', 
          '', 
          'g'
        ), 
        ''
      ), 
      'XX'
    )
  ),
  '-',
  TO_CHAR(COALESCE(created_at, NOW()), 'YYYYMMDDHH24MI')
)
WHERE paygroup_id IS NULL OR paygroup_id NOT LIKE '%-%-%';

-- Backfill expatriate pay groups
UPDATE expatriate_pay_groups
SET paygroup_id = CONCAT(
  'EXPG-',
  UPPER(
    COALESCE(
      NULLIF(
        REGEXP_REPLACE(
          SUBSTRING(name FROM '^[A-Za-z]+'), 
          '[^A-Za-z]', 
          '', 
          'g'
        ), 
        ''
      ), 
      'XX'
    )
  ),
  '-',
  TO_CHAR(COALESCE(created_at, NOW()), 'YYYYMMDDHH24MI')
)
WHERE paygroup_id IS NULL OR paygroup_id NOT LIKE '%-%-%';

-- Show results
SELECT 'Regular Pay Groups' as table_name, paygroup_id, name FROM pay_groups 
WHERE paygroup_id IS NOT NULL
UNION ALL
SELECT 'Expatriate Pay Groups' as table_name, paygroup_id, name FROM expatriate_pay_groups 
WHERE paygroup_id IS NOT NULL
ORDER BY table_name, paygroup_id;

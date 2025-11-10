#!/usr/bin/env node

/**
 * Apply paygroup_summary_view migration directly to Supabase
 * This script executes the SQL migration via Supabase REST API
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const SQL = `
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
`;

async function executeSQL() {
  try {
    console.log('🚀 Applying paygroup_summary_view migration...');
    console.log('📡 Connecting to:', SUPABASE_URL);

    // Use Supabase REST API to execute SQL via rpc or direct SQL execution
    // Note: Supabase doesn't have a direct SQL execution endpoint via REST API
    // We need to use the PostgREST API or psql
    
    // Alternative: Use fetch to call Supabase Management API if available
    // Or use psql via child_process
    
    console.log('\n⚠️  Supabase REST API does not support direct SQL execution.');
    console.log('📋 Please apply this migration using one of these methods:\n');
    
    console.log('Method 1: Supabase Dashboard (Recommended)');
    console.log('   1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the SQL from: supabase/migrations/20251110120121_create_paygroup_summary_view.sql');
    console.log('   4. Click "Run"\n');
    
    console.log('Method 2: Using psql (if you have direct database access)');
    console.log('   psql "postgresql://postgres:[PASSWORD]@db.sbphmrjoappwlervnbtm.supabase.co:5432/postgres" \\');
    console.log('     -f supabase/migrations/20251110120121_create_paygroup_summary_view.sql\n');
    
    console.log('📄 SQL to execute:');
    console.log('─'.repeat(60));
    console.log(SQL);
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();


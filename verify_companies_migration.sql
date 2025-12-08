-- Verification Script: Check Companies and Company Units Setup
-- Run this in Supabase Dashboard SQL Editor to verify migrations were successful

-- 1. Check if companies table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
    THEN '✅ Companies table exists'
    ELSE '❌ Companies table does NOT exist'
  END as companies_table_status;

-- 2. Check if company_units table exists (renamed from org_units)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_units')
    THEN '✅ Company units table exists'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_units')
    THEN '⚠️ Org units table still exists (migration not run)'
    ELSE '❌ Company units table does NOT exist'
  END as company_units_table_status;

-- 3. Check if GWAZU company exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.companies WHERE name = 'GWAZU')
    THEN '✅ GWAZU company exists'
    ELSE '❌ GWAZU company does NOT exist'
  END as gwazu_company_status;

-- 4. List all companies
SELECT 
  id,
  name,
  organization_id,
  country_id,
  currency,
  created_at
FROM public.companies
ORDER BY created_at DESC;

-- 5. Check if company units exist for GWAZU
SELECT 
  cu.id,
  cu.name,
  cu.kind,
  cu.company_id,
  c.name as company_name
FROM public.company_units cu
JOIN public.companies c ON c.id = cu.company_id
WHERE c.name = 'GWAZU'
ORDER BY cu.name;

-- 6. Check RLS status on companies table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'companies';

-- 7. List RLS policies on companies table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'companies';

-- 8. Check RLS status on company_units table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'company_units';

-- 9. List RLS policies on company_units table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'company_units';

-- 10. Check if employees table has company_unit_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'employees'
  AND column_name IN ('company_unit_id', 'org_unit_id', 'company_id')
ORDER BY column_name;

-- 11. Count employees assigned to company units
SELECT 
  COUNT(*) as total_employees,
  COUNT(company_id) as employees_with_company,
  COUNT(company_unit_id) as employees_with_company_unit
FROM public.employees;


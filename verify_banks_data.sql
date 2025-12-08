-- Verification Script: Check Banks Table and Uganda Banks Data
-- Run this in Supabase Dashboard SQL Editor to verify banks setup

-- 1. Check if banks table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'banks')
    THEN '✅ Banks table exists'
    ELSE '❌ Banks table does NOT exist'
  END as banks_table_status;

-- 2. Check total number of banks
SELECT 
  COUNT(*) as total_banks,
  COUNT(DISTINCT country_code) as countries_with_banks
FROM public.banks;

-- 3. Check banks for Uganda specifically
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.banks WHERE country_code = 'UG')
    THEN '✅ Uganda banks exist'
    ELSE '❌ No banks found for Uganda (country_code = ''UG'')'
  END as uganda_banks_status;

-- 4. List all Uganda banks
SELECT 
  id,
  name,
  country_code,
  swift_code,
  created_at
FROM public.banks
WHERE country_code = 'UG'
ORDER BY name;

-- 5. Check RLS policies on banks table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'banks';

-- 6. Check if RLS is enabled
SELECT 
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'banks' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ RLS is enabled on banks table'
    ELSE '❌ RLS is NOT enabled on banks table'
  END as rls_status;

-- 7. Test query that the application uses
SELECT 
  id,
  name,
  country_code,
  swift_code
FROM public.banks
WHERE country_code = 'UG'
ORDER BY name;

-- 8. Check all country codes in banks table
SELECT 
  country_code,
  COUNT(*) as bank_count,
  STRING_AGG(name, ', ' ORDER BY name) as bank_names
FROM public.banks
GROUP BY country_code
ORDER BY country_code;


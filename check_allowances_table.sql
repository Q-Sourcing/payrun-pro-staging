-- Verify the allowances table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'expatriate_pay_run_item_allowances'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'expatriate_pay_run_item_allowances';

-- Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'expatriate_pay_run_item_allowances';

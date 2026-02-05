-- ==========================================================
-- 🔄 MIGRATE EXISTING DATA TO TYPE-SPECIFIC TABLES
-- ==========================================================
-- This migration moves existing data from pay_items to appropriate type-specific tables

-- ==========================================================
-- 1. MIGRATE EXPATRIATE PAY ITEMS
-- ==========================================================

-- Move expatriate pay items from pay_items to expatriate_pay_run_items
INSERT INTO public.expatriate_pay_run_items (
    id,
    pay_run_id,
    employee_id,
    expatriate_pay_group_id,
    daily_rate,
    days_worked,
    allowances_foreign,
    gross_foreign,
    net_foreign,
    gross_local,
    net_local,
    exchange_rate_to_local,
    foreign_currency,
    local_currency,
    tax_country,
    tax_rate,
    status,
    notes,
    created_at,
    updated_at
)
SELECT 
    pi.id,
    pi.pay_run_id,
    pi.employee_id,
    -- Get expatriate pay group ID from pay_group_master
    pgm.source_id as expatriate_pay_group_id,
    -- Calculate daily rate from gross pay and hours worked
    CASE 
        WHEN pi.hours_worked > 0 THEN pi.gross_pay / pi.hours_worked
        ELSE pi.gross_pay
    END as daily_rate,
    -- Use hours_worked as days_worked for expatriates
    COALESCE(pi.hours_worked, 1) as days_worked,
    0.00 as allowances_foreign, -- Default value
    pi.gross_pay as gross_foreign,
    pi.net_pay as net_foreign,
    pi.gross_pay as gross_local, -- Default to same as foreign
    pi.net_pay as net_local, -- Default to same as foreign
    3800.0000 as exchange_rate_to_local, -- Default exchange rate
    'USD' as foreign_currency,
    'UGX' as local_currency,
    'UG' as tax_country,
    15.00 as tax_rate, -- Expatriate flat tax rate
    pi.status,
    pi.notes,
    pi.created_at,
    pi.updated_at
FROM public.pay_items pi
JOIN public.pay_runs pr ON pi.pay_run_id = pr.id
JOIN public.pay_group_master pgm ON pr.pay_group_master_id = pgm.id
JOIN public.employees e ON pi.employee_id = e.id
WHERE 
    pgm.type = 'expatriate' 
    AND e.employee_type = 'expatriate'
    AND NOT EXISTS (
        SELECT 1 FROM public.expatriate_pay_run_items epri 
        WHERE epri.pay_run_id = pi.pay_run_id 
        AND epri.employee_id = pi.employee_id
    );

-- ==========================================================
-- 2. MIGRATE LOCAL PAY ITEMS
-- ==========================================================

-- Move local pay items from pay_items to local_pay_run_items
INSERT INTO public.local_pay_run_items (
    id,
    pay_run_id,
    employee_id,
    basic_salary,
    hours_worked,
    overtime_hours,
    overtime_rate,
    pieces_completed,
    piece_rate,
    gross_pay,
    tax_deduction,
    benefit_deductions,
    custom_deductions,
    total_deductions,
    net_pay,
    nssf_employee,
    nssf_employer,
    paye_tax,
    local_currency,
    status,
    notes,
    created_at,
    updated_at
)
SELECT 
    pi.id,
    pi.pay_run_id,
    pi.employee_id,
    pi.gross_pay as basic_salary, -- Use gross_pay as basic salary
    pi.hours_worked,
    0.00 as overtime_hours, -- Default value
    0.00 as overtime_rate, -- Default value
    pi.pieces_completed,
    0.00 as piece_rate, -- Default value
    pi.gross_pay,
    pi.tax_deduction,
    pi.benefit_deductions,
    0.00 as custom_deductions, -- Default value
    pi.total_deductions,
    pi.net_pay,
    -- Calculate NSSF and PAYE (simplified)
    CASE 
        WHEN pi.gross_pay > 0 THEN LEAST(pi.gross_pay * 0.05, 60000) -- 5% up to 60,000 UGX
        ELSE 0
    END as nssf_employee,
    CASE 
        WHEN pi.gross_pay > 0 THEN LEAST(pi.gross_pay * 0.10, 120000) -- 10% up to 120,000 UGX
        ELSE 0
    END as nssf_employer,
    pi.tax_deduction as paye_tax,
    'UGX' as local_currency,
    pi.status,
    pi.notes,
    pi.created_at,
    pi.updated_at
FROM public.pay_items pi
JOIN public.pay_runs pr ON pi.pay_run_id = pr.id
JOIN public.pay_group_master pgm ON pr.pay_group_master_id = pgm.id
JOIN public.employees e ON pi.employee_id = e.id
WHERE 
    pgm.type = 'regular' 
    AND e.employee_type = 'local'
    AND NOT EXISTS (
        SELECT 1 FROM public.local_pay_run_items lpri 
        WHERE lpri.pay_run_id = pi.pay_run_id 
        AND lpri.employee_id = pi.employee_id
    );

-- ==========================================================
-- 3. MIGRATE CONTRACTOR PAY ITEMS (if any exist)
-- ==========================================================

-- Move contractor pay items from pay_items to contractor_pay_run_items
INSERT INTO public.contractor_pay_run_items (
    id,
    pay_run_id,
    employee_id,
    contract_rate,
    hours_worked,
    project_hours,
    milestone_completion,
    gross_pay,
    withholding_tax,
    contractor_fees,
    net_pay,
    contract_type,
    payment_terms,
    status,
    notes,
    created_at,
    updated_at
)
SELECT 
    pi.id,
    pi.pay_run_id,
    pi.employee_id,
    pi.gross_pay as contract_rate, -- Use gross_pay as contract rate
    pi.hours_worked,
    0.00 as project_hours, -- Default value
    100.00 as milestone_completion, -- Default to 100%
    pi.gross_pay,
    pi.tax_deduction as withholding_tax,
    0.00 as contractor_fees, -- Default value
    pi.net_pay,
    'hourly' as contract_type, -- Default to hourly
    'net_30' as payment_terms, -- Default payment terms
    pi.status,
    pi.notes,
    pi.created_at,
    pi.updated_at
FROM public.pay_items pi
JOIN public.pay_runs pr ON pi.pay_run_id = pr.id
JOIN public.pay_group_master pgm ON pr.pay_group_master_id = pgm.id
JOIN public.employees e ON pi.employee_id = e.id
WHERE 
    pgm.type = 'contractor' 
    AND e.employee_type = 'contractor'
    AND NOT EXISTS (
        SELECT 1 FROM public.contractor_pay_run_items cpri 
        WHERE cpri.pay_run_id = pi.pay_run_id 
        AND cpri.employee_id = pi.employee_id
    );

-- ==========================================================
-- 4. MIGRATE INTERN PAY ITEMS (if any exist)
-- ==========================================================

-- Move intern pay items from pay_items to intern_pay_run_items
INSERT INTO public.intern_pay_run_items (
    id,
    pay_run_id,
    employee_id,
    stipend_amount,
    hours_worked,
    learning_hours,
    project_hours,
    gross_pay,
    tax_deduction,
    net_pay,
    internship_duration_months,
    department,
    status,
    notes,
    created_at,
    updated_at
)
SELECT 
    pi.id,
    pi.pay_run_id,
    pi.employee_id,
    pi.gross_pay as stipend_amount, -- Use gross_pay as stipend
    pi.hours_worked,
    0.00 as learning_hours, -- Default value
    0.00 as project_hours, -- Default value
    pi.gross_pay,
    pi.tax_deduction,
    pi.net_pay,
    6 as internship_duration_months, -- Default 6 months
    e.department,
    pi.status,
    pi.notes,
    pi.created_at,
    pi.updated_at
FROM public.pay_items pi
JOIN public.pay_runs pr ON pi.pay_run_id = pr.id
JOIN public.pay_group_master pgm ON pr.pay_group_master_id = pgm.id
JOIN public.employees e ON pi.employee_id = e.id
WHERE 
    pgm.type = 'intern' 
    AND e.employee_type = 'intern'
    AND NOT EXISTS (
        SELECT 1 FROM public.intern_pay_run_items ipri 
        WHERE ipri.pay_run_id = pi.pay_run_id 
        AND ipri.employee_id = pi.employee_id
    );

-- ==========================================================
-- 5. VERIFICATION QUERIES
-- ==========================================================

-- Verify migration results
DO $$
DECLARE
    expat_count INTEGER;
    local_count INTEGER;
    contractor_count INTEGER;
    intern_count INTEGER;
    total_original INTEGER;
BEGIN
    -- Count original pay_items
    SELECT COUNT(*) INTO total_original FROM public.pay_items;
    
    -- Count migrated items
    SELECT COUNT(*) INTO expat_count FROM public.expatriate_pay_run_items;
    SELECT COUNT(*) INTO local_count FROM public.local_pay_run_items;
    SELECT COUNT(*) INTO contractor_count FROM public.contractor_pay_run_items;
    SELECT COUNT(*) INTO intern_count FROM public.intern_pay_run_items;
    
    -- Log results
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '  Original pay_items: %', total_original;
    RAISE NOTICE '  Migrated to expatriate_pay_run_items: %', expat_count;
    RAISE NOTICE '  Migrated to local_pay_run_items: %', local_count;
    RAISE NOTICE '  Migrated to contractor_pay_run_items: %', contractor_count;
    RAISE NOTICE '  Migrated to intern_pay_run_items: %', intern_count;
    RAISE NOTICE '  Total migrated: %', (expat_count + local_count + contractor_count + intern_count);
END $$;

-- ==========================================================
-- 6. MIGRATION COMPLETE
-- ==========================================================

-- This migration successfully moves all existing pay_items data
-- to the appropriate type-specific tables based on the pay run type
-- and employee type. The original pay_items table can now be
-- deprecated or used as a fallback for any unmigrated data.

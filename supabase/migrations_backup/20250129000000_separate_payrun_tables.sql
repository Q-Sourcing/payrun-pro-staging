-- ==========================================================
-- 🏗️ SEPARATE PAY RUN TABLES FOR SCALABILITY
-- ==========================================================
-- This migration creates separate tables for each pay run type
-- for better performance, maintainability, and scalability

-- ==========================================================
-- 1. LOCAL PAY RUN ITEMS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.local_pay_run_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_id UUID NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Local payroll specific fields
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    hours_worked DECIMAL(8,2),
    overtime_hours DECIMAL(8,2) DEFAULT 0.00,
    overtime_rate DECIMAL(10,2) DEFAULT 0.00,
    pieces_completed INTEGER,
    piece_rate DECIMAL(10,2) DEFAULT 0.00,
    
    -- Calculations
    gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    benefit_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    custom_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Local specific
    nssf_employee DECIMAL(12,2) DEFAULT 0.00,
    nssf_employer DECIMAL(12,2) DEFAULT 0.00,
    paye_tax DECIMAL(12,2) DEFAULT 0.00,
    local_currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
    
    -- Metadata
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(pay_run_id, employee_id)
);

-- ==========================================================
-- 2. ENHANCE EXISTING EXPATRIATE PAY RUN ITEMS TABLE
-- ==========================================================

-- Add missing columns to existing expatriate_pay_run_items table
DO $$
BEGIN
    -- Add housing_allowance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'housing_allowance') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN housing_allowance DECIMAL(12,2) DEFAULT 0.00;
    END IF;
    
    -- Add transport_allowance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'transport_allowance') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN transport_allowance DECIMAL(12,2) DEFAULT 0.00;
    END IF;
    
    -- Add medical_allowance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'medical_allowance') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN medical_allowance DECIMAL(12,2) DEFAULT 0.00;
    END IF;
    
    -- Add education_allowance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'education_allowance') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN education_allowance DECIMAL(12,2) DEFAULT 0.00;
    END IF;
    
    -- Add gross_foreign column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'gross_foreign') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN gross_foreign DECIMAL(12,2) NOT NULL DEFAULT 0.00;
    END IF;
    
    -- Add foreign_currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'foreign_currency') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN foreign_currency VARCHAR(3) NOT NULL DEFAULT 'USD';
    END IF;
    
    -- Add local_currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'local_currency') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN local_currency VARCHAR(3) NOT NULL DEFAULT 'UGX';
    END IF;
    
    -- Add tax_rate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'tax_rate') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 15.00;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'status') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'notes') THEN
        ALTER TABLE public.expatriate_pay_run_items ADD COLUMN notes TEXT;
    END IF;
    
    -- Rename exchange_rate_to_local to exchange_rate if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'exchange_rate_to_local') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expatriate_pay_run_items' AND column_name = 'exchange_rate') THEN
            ALTER TABLE public.expatriate_pay_run_items RENAME COLUMN exchange_rate_to_local TO exchange_rate;
        END IF;
    END IF;
END $$;

-- ==========================================================
-- 3. CONTRACTOR PAY RUN ITEMS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.contractor_pay_run_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_id UUID NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Contractor specific fields
    contract_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    hours_worked DECIMAL(8,2),
    project_hours DECIMAL(8,2) DEFAULT 0.00,
    milestone_completion DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    
    -- Calculations
    gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    withholding_tax DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    contractor_fees DECIMAL(12,2) DEFAULT 0.00,
    net_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Contractor specific
    contract_type VARCHAR(50) DEFAULT 'hourly', -- hourly, fixed, milestone
    project_id UUID,
    invoice_number VARCHAR(100),
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    
    -- Metadata
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(pay_run_id, employee_id)
);

-- ==========================================================
-- 4. INTERN PAY RUN ITEMS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.intern_pay_run_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_id UUID NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Intern specific fields
    stipend_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    hours_worked DECIMAL(8,2),
    learning_hours DECIMAL(8,2) DEFAULT 0.00,
    project_hours DECIMAL(8,2) DEFAULT 0.00,
    
    -- Calculations
    gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Intern specific
    internship_duration_months INTEGER,
    mentor_id UUID REFERENCES public.employees(id),
    department VARCHAR(100),
    learning_objectives TEXT[],
    
    -- Metadata
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(pay_run_id, employee_id)
);

-- ==========================================================
-- 5. INDEXES FOR PERFORMANCE
-- ==========================================================

-- Local pay run items indexes
CREATE INDEX IF NOT EXISTS idx_local_pay_run_items_pay_run_id ON public.local_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_local_pay_run_items_employee_id ON public.local_pay_run_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_local_pay_run_items_status ON public.local_pay_run_items(status);

-- Expatriate pay run items indexes
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_pay_run_id ON public.expatriate_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_employee_id ON public.expatriate_pay_run_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_pay_group_id ON public.expatriate_pay_run_items(expatriate_pay_group_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_status ON public.expatriate_pay_run_items(status);

-- Contractor pay run items indexes
CREATE INDEX IF NOT EXISTS idx_contractor_pay_run_items_pay_run_id ON public.contractor_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_contractor_pay_run_items_employee_id ON public.contractor_pay_run_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_contractor_pay_run_items_project_id ON public.contractor_pay_run_items(project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_pay_run_items_status ON public.contractor_pay_run_items(status);

-- Intern pay run items indexes
CREATE INDEX IF NOT EXISTS idx_intern_pay_run_items_pay_run_id ON public.intern_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_intern_pay_run_items_employee_id ON public.intern_pay_run_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_intern_pay_run_items_mentor_id ON public.intern_pay_run_items(mentor_id);
CREATE INDEX IF NOT EXISTS idx_intern_pay_run_items_status ON public.intern_pay_run_items(status);

-- ==========================================================
-- 6. ROW LEVEL SECURITY
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE public.local_pay_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expatriate_pay_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_pay_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_pay_run_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for local_pay_run_items
CREATE POLICY "Enable read access for authenticated users" ON public.local_pay_run_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.local_pay_run_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.local_pay_run_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.local_pay_run_items
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for expatriate_pay_run_items (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expatriate_pay_run_items' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.expatriate_pay_run_items
            FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expatriate_pay_run_items' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.expatriate_pay_run_items
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expatriate_pay_run_items' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.expatriate_pay_run_items
            FOR UPDATE TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expatriate_pay_run_items' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.expatriate_pay_run_items
            FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- RLS Policies for contractor_pay_run_items
CREATE POLICY "Enable read access for authenticated users" ON public.contractor_pay_run_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.contractor_pay_run_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.contractor_pay_run_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.contractor_pay_run_items
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for intern_pay_run_items
CREATE POLICY "Enable read access for authenticated users" ON public.intern_pay_run_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.intern_pay_run_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.intern_pay_run_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.intern_pay_run_items
    FOR DELETE TO authenticated USING (true);

-- ==========================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ==========================================================

COMMENT ON TABLE public.local_pay_run_items IS 'Pay run items for local employees with standard payroll calculations';
COMMENT ON TABLE public.expatriate_pay_run_items IS 'Pay run items for expatriate employees with dual currency support';
COMMENT ON TABLE public.contractor_pay_run_items IS 'Pay run items for contractors with project-based billing';
COMMENT ON TABLE public.intern_pay_run_items IS 'Pay run items for interns with stipend and learning tracking';

-- ==========================================================
-- 8. MIGRATION COMPLETE
-- ==========================================================

-- This migration creates a scalable architecture where each pay run type
-- has its own dedicated table with type-specific fields and calculations.
-- This allows for:
-- 1. Better performance (smaller, focused tables)
-- 2. Easier maintenance (type-specific logic)
-- 3. Better scalability (independent scaling)
-- 4. Type safety (specific field validation)
-- 5. Easier reporting (type-specific queries)

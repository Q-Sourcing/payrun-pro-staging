-- Create enum types for better data integrity
CREATE TYPE public.pay_type AS ENUM ('hourly', 'salary', 'piece_rate');
CREATE TYPE public.pay_frequency AS ENUM ('weekly', 'bi_weekly', 'monthly', 'custom');
CREATE TYPE public.pay_run_status AS ENUM ('draft', 'pending_approval', 'approved', 'processed');
CREATE TYPE public.benefit_type AS ENUM ('health_insurance', 'retirement', 'dental', 'vision', 'other');

-- Create benefits table
CREATE TABLE public.benefits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    cost_type TEXT CHECK (cost_type IN ('fixed', 'percentage')) NOT NULL DEFAULT 'fixed',
    benefit_type benefit_type NOT NULL DEFAULT 'other',
    applicable_countries TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pay groups table
CREATE TABLE public.pay_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    pay_frequency pay_frequency NOT NULL DEFAULT 'monthly',
    default_tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    pay_type pay_type NOT NULL DEFAULT 'hourly',
    pay_rate DECIMAL(10,2) NOT NULL,
    country TEXT NOT NULL,
    pay_group_id UUID REFERENCES public.pay_groups(id),
    status TEXT CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pay runs table
CREATE TABLE public.pay_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_group_id UUID NOT NULL REFERENCES public.pay_groups(id),
    status pay_run_status NOT NULL DEFAULT 'draft',
    total_gross_pay DECIMAL(12,2) DEFAULT 0.00,
    total_deductions DECIMAL(12,2) DEFAULT 0.00,
    total_net_pay DECIMAL(12,2) DEFAULT 0.00,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pay items table (individual employee payments in a pay run)
CREATE TABLE public.pay_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_id UUID NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    hours_worked DECIMAL(8,2),
    pieces_completed INTEGER,
    gross_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_deduction DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    benefit_deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(pay_run_id, employee_id)
);

-- Enable Row Level Security
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all benefits" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can view all benefits" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can view all benefits" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can view all benefits" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can view all benefits" ON public.benefits; CREATE POLICY "Authenticated users can view all benefits" ON public.benefits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage benefits" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can manage benefits" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can manage benefits" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can manage benefits" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can manage benefits" ON public.benefits; CREATE POLICY "Authenticated users can manage benefits" ON public.benefits FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all pay groups" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can view all pay groups" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can view all pay groups" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can view all pay groups" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can view all pay groups" ON public.pay_groups; CREATE POLICY "Authenticated users can view all pay groups" ON public.pay_groups FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage pay groups" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can manage pay groups" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can manage pay groups" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can manage pay groups" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can manage pay groups" ON public.pay_groups; CREATE POLICY "Authenticated users can manage pay groups" ON public.pay_groups FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.employees; CREATE POLICY "Authenticated users can view all employees" ON public.employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees; CREATE POLICY "Authenticated users can manage employees" ON public.employees FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all pay runs" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can view all pay runs" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can view all pay runs" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can view all pay runs" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can view all pay runs" ON public.pay_runs; CREATE POLICY "Authenticated users can view all pay runs" ON public.pay_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage pay runs" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can manage pay runs" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can manage pay runs" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can manage pay runs" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can manage pay runs" ON public.pay_runs; CREATE POLICY "Authenticated users can manage pay runs" ON public.pay_runs FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all pay items" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can view all pay items" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can view all pay items" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can view all pay items" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can view all pay items" ON public.pay_items; CREATE POLICY "Authenticated users can view all pay items" ON public.pay_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage pay items" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Authenticated users can manage pay items" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Authenticated users can manage pay items" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Authenticated users can manage pay items" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Authenticated users can manage pay items" ON public.pay_items; CREATE POLICY "Authenticated users can manage pay items" ON public.pay_items FOR ALL TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON public.benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_groups_updated_at BEFORE UPDATE ON public.pay_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_runs_updated_at BEFORE UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_items_updated_at BEFORE UPDATE ON public.pay_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
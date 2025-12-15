-- ==========================================================
-- EMAIL SYSTEM SCHEMA - PHASE 2: BLOCK EDITOR & PLACEHOLDERS
-- ==========================================================

-- 1. Create Placeholder Registry
CREATE TABLE IF NOT EXISTS public.email_placeholders (
    key text PRIMARY KEY,
    label text NOT NULL,
    description text,
    example_value text,
    category text NOT NULL CHECK (category IN ('organization', 'employee', 'payroll', 'approval', 'system')),
    is_locked boolean NOT NULL DEFAULT true, -- If true, only Platform Admin can modify
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_placeholders ENABLE ROW LEVEL SECURITY;

-- Policies for Placeholders
-- Everyone (Authenticated) can read placeholders to use them in the editor
CREATE POLICY "Everyone can read placeholders" ON public.email_placeholders FOR SELECT TO authenticated USING (true);

-- Only Platform Admins can manage locked placeholders
CREATE POLICY "Platform Admins manage all placeholders" 
ON public.email_placeholders FOR ALL 
USING (public.is_platform_admin());

-- 2. Update Email Templates to support JSON Design
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS design jsonb,
ADD COLUMN IF NOT EXISTS version int DEFAULT 1;

-- 3. Seed Standard Placeholders
INSERT INTO public.email_placeholders (key, label, description, example_value, category, is_locked) VALUES
-- Organization
('organization_name', 'Organization Name', 'The name of your organization', 'Acme Corp', 'organization', true),
('company_name', 'Company Name', 'The specific company entity', 'Acme Uganda Ltd', 'organization', true),

-- Employee
('employee_name', 'Employee Name', 'Full name of the employee', 'John Doe', 'employee', true),
('employee_first_name', 'First Name', 'First name of the employee', 'John', 'employee', true),

-- Payroll
('payrun_period', 'Payrun Period', 'The period of the payrun', 'March 2025', 'payroll', true),
('net_amount', 'Net Amount', 'The net pay amount', 'UGX 1,500,000', 'payroll', true),
('gross_amount', 'Gross Amount', 'The gross pay amount', 'UGX 2,000,000', 'payroll', true),
('payslip_url', 'Payslip Link', 'Link to download the payslip', 'https://...', 'payroll', true),

-- Approval
('approver_name', 'Approver Name', 'Name of the person approving', 'Jane Manager', 'approval', true),
('action_url', 'Action Link', 'Primary Call-to-Action URL', 'https://...', 'approval', true),
('rejection_reason', 'Rejection Reason', 'Reason provided for rejection', 'Incorrect hours', 'approval', true)

ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

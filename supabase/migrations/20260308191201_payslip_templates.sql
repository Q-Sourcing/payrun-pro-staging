-- Create payslip templates table
CREATE TABLE public.payslip_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payslip generations log table (foreign keys will be added later)
CREATE TABLE public.payslip_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.payslip_templates(id) ON DELETE CASCADE,
    pay_run_id UUID, -- Will add foreign key constraint later when pay_runs table exists
    employee_id UUID, -- Will add foreign key constraint later when employees table exists
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    export_format TEXT NOT NULL DEFAULT 'pdf',
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.payslip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payslip_templates
CREATE POLICY "Users can view their own payslip templates" 
ON public.payslip_templates FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payslip templates" 
ON public.payslip_templates FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payslip templates" 
ON public.payslip_templates FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payslip templates" 
ON public.payslip_templates FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create RLS policies for payslip_generations
CREATE POLICY "Users can view payslip generations for their templates" 
ON public.payslip_generations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.payslip_templates 
        WHERE id = template_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert payslip generations" 
ON public.payslip_generations FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_payslip_templates_user_id ON public.payslip_templates(user_id);
CREATE INDEX idx_payslip_templates_is_default ON public.payslip_templates(user_id, is_default);
CREATE INDEX idx_payslip_generations_template_id ON public.payslip_generations(template_id);
CREATE INDEX idx_payslip_generations_pay_run_id ON public.payslip_generations(pay_run_id);
CREATE INDEX idx_payslip_generations_employee_id ON public.payslip_generations(employee_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payslip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_payslip_templates_updated_at
    BEFORE UPDATE ON public.payslip_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_payslip_templates_updated_at();

-- Insert default templates for all users
INSERT INTO public.payslip_templates (name, description, config, user_id, is_default)
SELECT 
    'Professional Corporate',
    'Clean, professional design with company branding',
    '{
        "layout": {
            "header": {
                "showLogo": true,
                "showCompanyInfo": true,
                "alignment": "center"
            },
            "sections": {
                "employeeInfo": true,
                "payPeriod": true,
                "earnings": true,
                "deductions": true,
                "contributions": true,
                "totals": true,
                "leave": false
            },
            "order": ["employeeInfo", "payPeriod", "earnings", "deductions", "contributions", "totals"]
        },
        "styling": {
            "primaryColor": "#0e7288",
            "secondaryColor": "#f6ba15",
            "backgroundColor": "#ffffff",
            "textColor": "#0f172a",
            "accentColor": "#10b981",
            "borderColor": "#e2e8f0",
            "fontFamily": "Inter, sans-serif",
            "headingSize": "1.75rem",
            "bodySize": "0.875rem",
            "smallSize": "0.75rem",
            "fontWeight": {
                "normal": "400",
                "medium": "500",
                "bold": "600"
            }
        },
        "branding": {
            "showCompanyLogo": true,
            "showWatermark": false,
            "watermarkText": "",
            "confidentialityFooter": true
        }
    }'::jsonb,
    u.id,
    true
FROM auth.users u
WHERE u.id IS NOT NULL;

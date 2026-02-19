
-- Phase 1.1: Add new columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS responsible_manager_id UUID,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS contract_value NUMERIC;

-- Phase 1.2: Create project onboarding steps table
CREATE TABLE IF NOT EXISTS public.project_onboarding_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_project_onboarding_steps_project_id ON public.project_onboarding_steps(project_id);

-- RLS for onboarding steps
ALTER TABLE public.project_onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to project_onboarding_steps"
ON public.project_onboarding_steps
USING (true)
WITH CHECK (true);

-- Trigger to auto-create onboarding steps when a project is created
CREATE OR REPLACE FUNCTION public.create_project_onboarding_steps()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.project_onboarding_steps (project_id, step_key, completed, completed_at)
    VALUES
        (NEW.id, 'basic_info', true, now()),
        (NEW.id, 'manager_assigned', NEW.responsible_manager_id IS NOT NULL, CASE WHEN NEW.responsible_manager_id IS NOT NULL THEN now() ELSE NULL END),
        (NEW.id, 'pay_types_configured', (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)), CASE WHEN (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)) THEN now() ELSE NULL END),
        (NEW.id, 'employees_assigned', false, NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_create_project_onboarding_steps
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.create_project_onboarding_steps();

-- Trigger to auto-update onboarding steps when project is updated
CREATE OR REPLACE FUNCTION public.update_project_onboarding_steps()
RETURNS TRIGGER AS $$
BEGIN
    -- Update manager_assigned step
    IF NEW.responsible_manager_id IS DISTINCT FROM OLD.responsible_manager_id THEN
        UPDATE public.project_onboarding_steps
        SET completed = (NEW.responsible_manager_id IS NOT NULL),
            completed_at = CASE WHEN NEW.responsible_manager_id IS NOT NULL THEN now() ELSE NULL END,
            updated_at = now()
        WHERE project_id = NEW.id AND step_key = 'manager_assigned';
    END IF;

    -- Update pay_types_configured step
    IF (NEW.project_type IS DISTINCT FROM OLD.project_type)
       OR (NEW.supports_all_pay_types IS DISTINCT FROM OLD.supports_all_pay_types)
       OR (NEW.allowed_pay_types IS DISTINCT FROM OLD.allowed_pay_types) THEN
        UPDATE public.project_onboarding_steps
        SET completed = (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)),
            completed_at = CASE WHEN (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)) THEN now() ELSE NULL END,
            updated_at = now()
        WHERE project_id = NEW.id AND step_key = 'pay_types_configured';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_project_onboarding_steps
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_project_onboarding_steps();

-- Updated_at trigger for onboarding steps
CREATE TRIGGER update_project_onboarding_steps_updated_at
    BEFORE UPDATE ON public.project_onboarding_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- Create designations lookup table
CREATE TABLE IF NOT EXISTS public.designations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- Add designation_id to employees (keep text designation for backward compat)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES public.designations(id);

-- RLS
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designations readable by org members"
ON public.designations FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());

CREATE POLICY "Designations managed by admins"
ON public.designations FOR ALL TO authenticated
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

-- Updated_at trigger
CREATE TRIGGER set_designations_updated_at
    BEFORE UPDATE ON public.designations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

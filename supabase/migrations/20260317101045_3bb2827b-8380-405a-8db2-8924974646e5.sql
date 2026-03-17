
-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations in their org" ON public.locations
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Users can insert locations in their org" ON public.locations
    FOR INSERT TO authenticated
    WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "Users can update locations in their org" ON public.locations
    FOR UPDATE TO authenticated
    USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Users can delete locations in their org" ON public.locations
    FOR DELETE TO authenticated
    USING (public.user_belongs_to_org(organization_id));

CREATE TRIGGER set_locations_updated_at BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- Create org-level departments table
CREATE TABLE IF NOT EXISTS public.org_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES public.org_departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

ALTER TABLE public.org_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view departments in their org" ON public.org_departments
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Users can insert departments in their org" ON public.org_departments
    FOR INSERT TO authenticated
    WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "Users can update departments in their org" ON public.org_departments
    FOR UPDATE TO authenticated
    USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Users can delete departments in their org" ON public.org_departments
    FOR DELETE TO authenticated
    USING (public.user_belongs_to_org(organization_id));

CREATE TRIGGER set_org_departments_updated_at BEFORE UPDATE ON public.org_departments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- Per-project attendance policy
-- Controls whether self check-in, manager check-in, or GPS is required for each project

CREATE TABLE IF NOT EXISTS public.project_attendance_policy (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id              uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  attendance_required     boolean NOT NULL DEFAULT true,
  allow_self_checkin      boolean NOT NULL DEFAULT true,
  require_manager_checkin boolean NOT NULL DEFAULT false,
  require_geolocation     boolean NOT NULL DEFAULT false,
  primary_geofence_id     uuid REFERENCES public.geofences(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS project_attendance_policy_project_id_idx
  ON public.project_attendance_policy(project_id);

ALTER TABLE public.project_attendance_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pap_all" ON public.project_attendance_policy
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE TRIGGER update_pap_updated_at
  BEFORE UPDATE ON public.project_attendance_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

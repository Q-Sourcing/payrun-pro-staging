-- Project ↔ Geofence join table
-- Allows each project to have one or more geofences assigned for attendance validation

CREATE TABLE IF NOT EXISTS public.project_geofences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  geofence_id     uuid NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, geofence_id)
);

CREATE INDEX IF NOT EXISTS project_geofences_project_id_idx ON public.project_geofences(project_id);
CREATE INDEX IF NOT EXISTS project_geofences_geofence_id_idx ON public.project_geofences(geofence_id);

ALTER TABLE public.project_geofences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_geofences' AND policyname='pg_select') THEN
    CREATE POLICY "pg_select" ON public.project_geofences
      FOR SELECT USING (
        organization_id IN (
          SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_geofences' AND policyname='pg_insert') THEN
    CREATE POLICY "pg_insert" ON public.project_geofences
      FOR INSERT WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_geofences' AND policyname='pg_delete') THEN
    CREATE POLICY "pg_delete" ON public.project_geofences
      FOR DELETE USING (
        organization_id IN (
          SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

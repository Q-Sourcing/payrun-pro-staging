-- QR codes for project site check-in
-- Each code is tied to a project + optional geofence. Employees scan to check in at /attend?token=<uuid>

CREATE TABLE IF NOT EXISTS public.attendance_qr_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  geofence_id     uuid REFERENCES public.geofences(id),
  token           uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  label           text,
  is_active       boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_qr_codes_token_idx ON public.attendance_qr_codes(token);
CREATE INDEX IF NOT EXISTS attendance_qr_codes_project_id_idx ON public.attendance_qr_codes(project_id);

ALTER TABLE public.attendance_qr_codes ENABLE ROW LEVEL SECURITY;

-- Org members can manage their org's QR codes
CREATE POLICY "qr_org_all" ON public.attendance_qr_codes
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

-- Any authenticated user can resolve an active token (for /attend page)
CREATE POLICY "qr_token_resolve" ON public.attendance_qr_codes
  FOR SELECT
  USING (is_active = true);

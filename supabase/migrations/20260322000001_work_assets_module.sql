-- ============================================================
-- Work Tools / Asset Management Module
-- ============================================================

-- ── Asset Types ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NULL org_id = platform-wide default (available to all orgs)
  name       text NOT NULL,
  icon_key   text,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed platform-wide default asset types
INSERT INTO public.asset_types (name, icon_key, sort_order) VALUES
  ('Laptop',           'laptop',       1),
  ('Email Address',    'mail',         2),
  ('Sitting Location', 'map-pin',      3),
  ('Mobile Phone',     'smartphone',   4),
  ('Access Card',      'credit-card',  5),
  ('Vehicle',          'car',          6),
  ('Other',            'package',      99)
ON CONFLICT DO NOTHING;

ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_types_select" ON public.asset_types
  FOR SELECT TO authenticated
  USING (
    org_id IS NULL OR
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "asset_types_insert" ON public.asset_types
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "asset_types_update" ON public.asset_types
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );


-- ── Work Assets ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_assets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_number     text NOT NULL,
  name             text NOT NULL,
  asset_type_id    uuid REFERENCES public.asset_types(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','damaged','lost','decommissioned')),
  useful_life_years integer,
  purchase_price   numeric(15,2),
  purchase_date    date,
  serial_number    text,
  notes            text,
  assigned_to      uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_at      timestamptz,
  is_deleted       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_assets_number_org_idx ON public.work_assets(org_id, asset_number);
CREATE INDEX IF NOT EXISTS work_assets_org_id_idx       ON public.work_assets(org_id);
CREATE INDEX IF NOT EXISTS work_assets_assigned_to_idx  ON public.work_assets(assigned_to);
CREATE INDEX IF NOT EXISTS work_assets_status_idx       ON public.work_assets(status);
CREATE INDEX IF NOT EXISTS work_assets_type_idx         ON public.work_assets(asset_type_id);

ALTER TABLE public.work_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_assets_select" ON public.work_assets
  FOR SELECT TO authenticated
  USING (
    is_deleted = false AND
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "work_assets_insert" ON public.work_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "work_assets_update" ON public.work_assets
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "work_assets_delete" ON public.work_assets
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE TRIGGER update_work_assets_updated_at
  BEFORE UPDATE ON public.work_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ── Asset Assignments (full history) ─────────────────────
CREATE TABLE IF NOT EXISTS public.asset_assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id         uuid NOT NULL REFERENCES public.work_assets(id) ON DELETE CASCADE,
  employee_id      uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_by      uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_at      timestamptz NOT NULL DEFAULT now(),
  returned_at      timestamptz,
  return_condition text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_assignments_asset_id_idx    ON public.asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS asset_assignments_employee_id_idx ON public.asset_assignments(employee_id);
CREATE INDEX IF NOT EXISTS asset_assignments_org_id_idx      ON public.asset_assignments(org_id);

ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_assignments_select" ON public.asset_assignments
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "asset_assignments_insert" ON public.asset_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "asset_assignments_update" ON public.asset_assignments
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );


-- ── Asset Activity Logs (immutable) ──────────────────────
CREATE TABLE IF NOT EXISTS public.asset_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id    uuid NOT NULL REFERENCES public.work_assets(id) ON DELETE CASCADE,
  logged_by   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  event_type  text NOT NULL
    CHECK (event_type IN ('note','damage','repair','reassignment','status_change','decommission','created')),
  description text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_logs_asset_id_idx    ON public.asset_logs(asset_id);
CREATE INDEX IF NOT EXISTS asset_logs_org_id_idx      ON public.asset_logs(org_id);
CREATE INDEX IF NOT EXISTS asset_logs_created_at_idx  ON public.asset_logs(created_at DESC);

ALTER TABLE public.asset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_logs_select" ON public.asset_logs
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "asset_logs_insert" ON public.asset_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Logs are immutable — no UPDATE or DELETE policies


-- ── Auto-increment asset number per org ──────────────────
CREATE OR REPLACE FUNCTION public.generate_asset_number(p_org_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(asset_number FROM 'AST-(\d+)') AS integer)
  ), 0) + 1
  INTO v_next
  FROM public.work_assets
  WHERE org_id = p_org_id;

  RETURN 'AST-' || LPAD(v_next::text, 4, '0');
END;
$$;


-- ── Atomic reassign_asset RPC ─────────────────────────────
CREATE OR REPLACE FUNCTION public.reassign_asset(
  p_asset_id        uuid,
  p_new_employee_id uuid,
  p_org_id          uuid,
  p_return_condition text DEFAULT NULL,
  p_notes           text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_employee_id uuid;
BEGIN
  -- Get current assignee
  SELECT assigned_to INTO v_old_employee_id
  FROM public.work_assets
  WHERE id = p_asset_id AND org_id = p_org_id;

  -- Close the current open assignment record
  UPDATE public.asset_assignments
  SET returned_at = now(),
      return_condition = p_return_condition
  WHERE asset_id = p_asset_id
    AND returned_at IS NULL;

  -- Update the asset's current assignment
  UPDATE public.work_assets
  SET assigned_to = p_new_employee_id,
      assigned_at = now(),
      updated_at  = now()
  WHERE id = p_asset_id AND org_id = p_org_id;

  -- Create new assignment record
  INSERT INTO public.asset_assignments (org_id, asset_id, employee_id, notes)
  VALUES (p_org_id, p_asset_id, p_new_employee_id, p_notes);

  -- Log the reassignment event
  INSERT INTO public.asset_logs (org_id, asset_id, event_type, description, metadata)
  VALUES (
    p_org_id,
    p_asset_id,
    'reassignment',
    'Asset reassigned',
    jsonb_build_object(
      'old_employee_id', v_old_employee_id,
      'new_employee_id', p_new_employee_id
    )
  );
END;
$$;


-- ── RBAC permission keys for assets ──────────────────────
INSERT INTO public.rbac_permissions (key, category, description) VALUES
  ('assets.view',            'assets', 'View work assets list and details'),
  ('assets.create',          'assets', 'Create new work assets'),
  ('assets.edit',            'assets', 'Edit assets, assign and reassign'),
  ('assets.delete',          'assets', 'Delete / decommission assets'),
  ('assets.view_financials', 'assets', 'View purchase price and financial details of assets')
ON CONFLICT (key) DO NOTHING;

-- Phase 1 hardening: ensure onboarding steps stay in sync with employee assignments

-- Add a FK for responsible_manager_id where possible.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_responsible_manager_id_fkey'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_responsible_manager_id_fkey
      FOREIGN KEY (responsible_manager_id)
      REFERENCES public.user_profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_responsible_manager_id
  ON public.projects(responsible_manager_id);

-- Keep the employees_assigned onboarding step accurate.
CREATE OR REPLACE FUNCTION public.refresh_project_employees_onboarding_step(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_has_employees BOOLEAN;
BEGIN
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.project_id = p_project_id
  ) INTO v_has_employees;

  UPDATE public.project_onboarding_steps
  SET completed = v_has_employees,
      completed_at = CASE WHEN v_has_employees THEN COALESCE(completed_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE project_id = p_project_id
    AND step_key = 'employees_assigned';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_project_onboarding_from_employees()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_project_employees_onboarding_step(NEW.project_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_project_employees_onboarding_step(OLD.project_id);
    RETURN OLD;
  ELSE
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      PERFORM public.refresh_project_employees_onboarding_step(OLD.project_id);
      PERFORM public.refresh_project_employees_onboarding_step(NEW.project_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_project_onboarding_from_employees ON public.employees;
CREATE TRIGGER trg_sync_project_onboarding_from_employees
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_onboarding_from_employees();

-- Backfill current onboarding status for existing projects.
WITH project_counts AS (
  SELECT p.id AS project_id,
         EXISTS (
           SELECT 1 FROM public.employees e WHERE e.project_id = p.id
         ) AS has_employees
  FROM public.projects p
)
UPDATE public.project_onboarding_steps pos
SET completed = pc.has_employees,
    completed_at = CASE WHEN pc.has_employees THEN COALESCE(pos.completed_at, now()) ELSE NULL END,
    updated_at = now()
FROM project_counts pc
WHERE pos.project_id = pc.project_id
  AND pos.step_key = 'employees_assigned';

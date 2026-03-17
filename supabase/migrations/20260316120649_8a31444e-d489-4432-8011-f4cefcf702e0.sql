
-- Phase 1: Add return_payrun_to_draft RPC
CREATE OR REPLACE FUNCTION public.return_payrun_to_draft(payrun_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pay_runs WHERE id = payrun_id_input) THEN
    RAISE EXCEPTION 'Payrun not found';
  END IF;

  DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;

  UPDATE public.pay_runs
  SET
    approval_status = 'draft',
    status = 'draft',
    approval_current_level = NULL,
    approval_submitted_at = NULL,
    approval_submitted_by = NULL,
    approval_last_action_at = NULL,
    approved_at = NULL,
    approved_by = NULL
  WHERE id = payrun_id_input;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Phase 3: Create reminder_rules table (if not exists)
CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('probation_expiry', 'contract_expiry', 'approval_reminder')),
  days_before int,
  days_after int,
  is_active boolean DEFAULT true,
  notify_roles text[],
  notification_template text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_org_type ON public.reminder_rules(organization_id, rule_type);

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins manage reminder rules" ON public.reminder_rules;
CREATE POLICY "Org admins manage reminder rules"
ON public.reminder_rules FOR ALL
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_rules_unique_approval
  ON public.reminder_rules(organization_id, rule_type, days_after)
  WHERE rule_type = 'approval_reminder' AND days_after IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_rules_unique_probation
  ON public.reminder_rules(organization_id, rule_type, days_before)
  WHERE rule_type = 'probation_expiry' AND days_before IS NOT NULL;

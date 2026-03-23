
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

-- Phase 3: Extend reminder_rules table with approval_reminder support
ALTER TABLE public.reminder_rules ADD COLUMN IF NOT EXISTS days_after int;
ALTER TABLE public.reminder_rules ALTER COLUMN days_before DROP NOT NULL;

-- Drop old rule_type check and add expanded one
ALTER TABLE public.reminder_rules DROP CONSTRAINT IF EXISTS reminder_rules_rule_type_check;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reminder_rules_rule_type_check_v2'
  ) THEN
    ALTER TABLE public.reminder_rules
      ADD CONSTRAINT reminder_rules_rule_type_check_v2
      CHECK (rule_type IN ('probation_expiry', 'contract_expiry', 'approval_reminder'));
  END IF;
END $$;

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

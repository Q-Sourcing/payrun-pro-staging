-- Migration: Harden OBAC Multi-Tenancy
-- Phase 3: Lifecycle & Functional Security

-- 1. Payroll Lifecycle Protection
-- This trigger ensures that approved/paid pay runs cannot be modified or deleted.
-- It also enforces that only authorized roles can approve payroll.
CREATE OR REPLACE FUNCTION public.enforce_pay_run_security()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent Deletion of protected states
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status IN ('approved', 'paid', 'completed') AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Cannot delete a payroll that has been approved or paid';
    END IF;
    RETURN OLD;
  END IF;

  -- 2. Enforce Approval Authority (Status Change to Approved)
  IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
    -- Check for explicit permission
    IF NOT public.has_permission('payroll.approve', 'ORGANIZATION', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient authority to approve payroll. Role ORG_FINANCE_CONTROLLER or equivalent required.';
    END IF;
    
    -- Record approval event
    INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description)
    VALUES (auth.uid(), NEW.organization_id, 'PAYROLL_APPROVED', 'PAY_RUN', NEW.id::text, 'Payroll approved and locked.');
  END IF;

  -- 3. Lock Data in Approved/Paid States
  -- If the status is already approved/paid, only allow status updates (no data changes)
  IF (OLD.status IN ('approved', 'paid', 'completed')) THEN
    -- Allow transition from approved to paid
    IF (OLD.status = 'approved' AND NEW.status = 'paid') THEN
        -- OK
    ELSIF OLD.status = NEW.status THEN
        -- No data changes allowed once locked
        IF ROW(NEW.total_gross_pay, NEW.total_deductions, NEW.total_net_pay, NEW.pay_period_start, NEW.pay_period_end) 
           IS DISTINCT FROM 
           ROW(OLD.total_gross_pay, OLD.total_deductions, OLD.total_net_pay, OLD.pay_period_start, OLD.pay_period_end) 
        THEN
            RAISE EXCEPTION 'Cannot modify financial data for an approved/paid payroll. Rollback approval first if permitted.';
        END IF;
    ELSE
        -- Prevent other status regressions unless platform admin
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION 'Cannot revert status of approved/paid payroll.';
        END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_pay_run_security ON public.pay_runs;
CREATE TRIGGER trg_enforce_pay_run_security
BEFORE UPDATE OR DELETE ON public.pay_runs
FOR EACH ROW EXECUTE FUNCTION public.enforce_pay_run_security();

-- 2. Automated Security Audit Triggers
-- Logs all changes to critical RBAC tables.
CREATE OR REPLACE FUNCTION public.audit_rbac_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_org_id := OLD.org_id;
    v_details := 'Removed: ' || row_to_json(OLD)::text;
  ELSE
    v_org_id := NEW.org_id;
    v_details := CASE WHEN TG_OP = 'INSERT' THEN 'Added: ' ELSE 'Modified: ' END || row_to_json(NEW)::text;
  END IF;

  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    v_org_id, 
    'RBAC_' || TG_OP || '_' || TG_TABLE_NAME, 
    TG_TABLE_NAME, 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.code ELSE NEW.code END, -- For rbac_roles
    'RBAC change detected in ' || TG_TABLE_NAME,
    jsonb_build_object('details', v_details)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Roles
DROP TRIGGER IF EXISTS trg_audit_rbac_roles ON public.rbac_roles;
CREATE TRIGGER trg_audit_rbac_roles
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_changes();

-- Assignments (needs different id handling)
CREATE OR REPLACE FUNCTION public.audit_rbac_assignments()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.org_id ELSE NEW.org_id END, 
    'ASSIGNMENT_' || TG_OP, 
    'rbac_assignments', 
    (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)::text,
    'Role assignment changed for user',
    jsonb_build_object('role', CASE WHEN TG_OP = 'DELETE' THEN OLD.role_code ELSE NEW.role_code END)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_rbac_assignments ON public.rbac_assignments;
CREATE TRIGGER trg_audit_rbac_assignments
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_assignments();

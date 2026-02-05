-- Add missing status values to pay_run_status enum
-- This prevents crashes in security triggers that reference these values

-- Use DO block to safely add enum values (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'pay_run_status' AND e.enumlabel = 'paid') THEN
        ALTER TYPE public.pay_run_status ADD VALUE 'paid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'pay_run_status' AND e.enumlabel = 'completed') THEN
        ALTER TYPE public.pay_run_status ADD VALUE 'completed';
    END IF;
END $$;

-- Update the security trigger to be more robust and include 'processed'
CREATE OR REPLACE FUNCTION public.enforce_pay_run_security()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent Deletion of protected states
  -- We include 'processed' here because processed payrolls should be archived/locked, not deleted.
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status IN ('approved', 'processed', 'paid', 'completed') AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Cannot delete a payroll that has been approved, processed, or paid. Status: %', OLD.status;
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

  -- 3. Lock Data in Approved/Processed/Paid States
  -- If the status is already approved/processed/paid, only allow status updates (no data changes)
  IF (OLD.status IN ('approved', 'processed', 'paid', 'completed')) THEN
    -- Allow transition from approved to processed/paid
    IF (OLD.status = 'approved' AND NEW.status IN ('processed', 'paid')) THEN
        -- OK
    ELSIF OLD.status = NEW.status THEN
        -- No data changes allowed once locked
        IF ROW(NEW.total_gross_pay, NEW.total_deductions, NEW.total_net_pay, NEW.pay_period_start, NEW.pay_period_end) 
           IS DISTINCT FROM 
           ROW(OLD.total_gross_pay, OLD.total_deductions, OLD.total_net_pay, OLD.pay_period_start, OLD.pay_period_end) 
        THEN
            RAISE EXCEPTION 'Cannot modify financial data for a locked payroll. Status: %', OLD.status;
        END IF;
    ELSE
        -- Prevent other status regressions unless platform admin
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION 'Cannot revert status of a locked payroll. Status: % -> %', OLD.status, NEW.status;
        END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

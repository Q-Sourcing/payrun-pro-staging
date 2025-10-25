-- ==========================================================
-- 🔧 Automatic PayGroup Employee Sync System
-- ==========================================================
-- This migration creates automatic syncing between employees.pay_group_id
-- and paygroup_employees table with realtime updates

-- 1. Create function to sync paygroup_employees when employee is inserted/updated
CREATE OR REPLACE FUNCTION sync_paygroup_employees()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If employee has a pay_group_id, ensure it exists in paygroup_employees
    IF NEW.pay_group_id IS NOT NULL THEN
      INSERT INTO paygroup_employees (
        employee_id,
        pay_group_id,
        active,
        assigned_at,
        notes
      )
      VALUES (
        NEW.id,
        NEW.pay_group_id,
        true,
        NOW(),
        CASE 
          WHEN TG_OP = 'INSERT' THEN 'Auto-synced from employee creation'
          ELSE 'Auto-synced from employee update'
        END
      )
      ON CONFLICT (employee_id, pay_group_id) 
      DO UPDATE SET
        active = true,
        removed_at = NULL,
        notes = CASE 
          WHEN TG_OP = 'INSERT' THEN 'Auto-synced from employee creation'
          ELSE 'Auto-synced from employee update'
        END;
    END IF;

    -- If employee's pay_group_id changed from non-null to null, mark as removed
    IF OLD.pay_group_id IS NOT NULL AND NEW.pay_group_id IS NULL THEN
      UPDATE paygroup_employees 
      SET 
        active = false,
        removed_at = NOW(),
        notes = 'Auto-removed: employee pay_group_id set to NULL'
      WHERE employee_id = NEW.id 
        AND pay_group_id = OLD.pay_group_id
        AND active = true;
    END IF;

    -- If employee's pay_group_id changed from one group to another
    IF OLD.pay_group_id IS NOT NULL 
       AND NEW.pay_group_id IS NOT NULL 
       AND OLD.pay_group_id != NEW.pay_group_id THEN
      
      -- Mark old assignment as removed
      UPDATE paygroup_employees 
      SET 
        active = false,
        removed_at = NOW(),
        notes = 'Auto-removed: employee moved to different pay group'
      WHERE employee_id = NEW.id 
        AND pay_group_id = OLD.pay_group_id
        AND active = true;

      -- Create new assignment
      INSERT INTO paygroup_employees (
        employee_id,
        pay_group_id,
        active,
        assigned_at,
        notes
      )
      VALUES (
        NEW.id,
        NEW.pay_group_id,
        true,
        NOW(),
        'Auto-synced: employee moved from different pay group'
      )
      ON CONFLICT (employee_id, pay_group_id) 
      DO UPDATE SET
        active = true,
        removed_at = NULL,
        notes = 'Auto-synced: employee moved from different pay group';
    END IF;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Mark all assignments as removed when employee is deleted
    UPDATE paygroup_employees 
    SET 
      active = false,
      removed_at = NOW(),
      notes = 'Auto-removed: employee deleted'
    WHERE employee_id = OLD.id 
      AND active = true;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger for automatic syncing
DROP TRIGGER IF EXISTS trigger_sync_paygroup_employees ON employees;
CREATE TRIGGER trigger_sync_paygroup_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_paygroup_employees();

-- 3. Create function to handle paygroup_employees changes for realtime
CREATE OR REPLACE FUNCTION notify_paygroup_employees_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify about the change for realtime updates
  PERFORM pg_notify(
    'paygroup_employees_changed',
    json_build_object(
      'operation', TG_OP,
      'employee_id', COALESCE(NEW.employee_id, OLD.employee_id),
      'pay_group_id', COALESCE(NEW.pay_group_id, OLD.pay_group_id),
      'active', COALESCE(NEW.active, OLD.active),
      'timestamp', NOW()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for realtime notifications
DROP TRIGGER IF EXISTS trigger_notify_paygroup_employees ON paygroup_employees;
CREATE TRIGGER trigger_notify_paygroup_employees
  AFTER INSERT OR UPDATE OR DELETE ON paygroup_employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_paygroup_employees_change();

-- 5. Create function to backfill existing employees
CREATE OR REPLACE FUNCTION backfill_paygroup_employees()
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Insert missing paygroup_employees records for existing employees
  INSERT INTO paygroup_employees (
    employee_id,
    pay_group_id,
    active,
    assigned_at,
    notes
  )
  SELECT 
    e.id,
    e.pay_group_id,
    true,
    NOW(),
    'Backfilled from existing employee data'
  FROM employees e
  WHERE e.pay_group_id IS NOT NULL
    AND e.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM paygroup_employees pe 
      WHERE pe.employee_id = e.id 
        AND pe.pay_group_id = e.pay_group_id
        AND pe.active = true
    );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Run the backfill function
SELECT backfill_paygroup_employees() as backfilled_records;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_employee_id ON paygroup_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_pay_group_id ON paygroup_employees(pay_group_id);
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_active ON paygroup_employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_pay_group_id ON employees(pay_group_id);

-- 8. Add comments for documentation
COMMENT ON FUNCTION sync_paygroup_employees() IS 'Automatically syncs paygroup_employees when employees table changes';
COMMENT ON FUNCTION notify_paygroup_employees_change() IS 'Sends realtime notifications when paygroup_employees changes';
COMMENT ON FUNCTION backfill_paygroup_employees() IS 'Backfills missing paygroup_employees records from existing employee data';
COMMENT ON TRIGGER trigger_sync_paygroup_employees ON employees IS 'Triggers automatic sync of paygroup_employees when employee data changes';
COMMENT ON TRIGGER trigger_notify_paygroup_employees ON paygroup_employees IS 'Triggers realtime notifications when paygroup_employees changes';

-- Fix the paygroup_employees validation trigger to work with pay_group_master_id
-- This allows the trigger to skip validation when pay_group_master_id is set

CREATE OR REPLACE FUNCTION validate_paygroup_employees_pay_group_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation if pay_group_master_id is set (new schema)
  -- In the new schema, pay_group_master_id is the source of truth
  IF NEW.pay_group_master_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip validation if pay_group_id is null
  IF NEW.pay_group_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only validate pay_group_id if pay_group_master_id is NOT set (legacy records)
  -- Check if the ID exists in pay_groups table
  IF EXISTS (SELECT 1 FROM pay_groups WHERE id = NEW.pay_group_id) THEN
    RETURN NEW;
  END IF;
  
  -- Check if the ID exists in expatriate_pay_groups table
  IF EXISTS (SELECT 1 FROM expatriate_pay_groups WHERE id = NEW.pay_group_id) THEN
    RETURN NEW;
  END IF;
  
  -- If not found in either table, raise exception
  RAISE EXCEPTION 'Pay group ID % does not exist in pay_groups or expatriate_pay_groups table', NEW.pay_group_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

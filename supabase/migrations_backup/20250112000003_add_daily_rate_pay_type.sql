-- Ensure daily_rate is in pay_type enum
-- Check if daily_rate already exists, if not add it

DO $$ 
BEGIN
  -- Check if daily_rate exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'daily_rate' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_type')
  ) THEN
    -- Add daily_rate to the enum
    ALTER TYPE public.pay_type ADD VALUE 'daily_rate';
  END IF;
END $$;

COMMENT ON TYPE public.pay_type IS 'Employee pay type: hourly, salary, piece_rate, daily_rate';


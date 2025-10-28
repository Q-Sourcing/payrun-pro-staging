-- Add days_worked and exchange_rate to expatriate_pay_run_items for per-employee calculations

-- 1. Add the fields to expatriate_pay_run_items (they should already exist from previous migration)
-- This is just to ensure they exist and are properly configured
ALTER TABLE public.expatriate_pay_run_items
  ADD COLUMN IF NOT EXISTS days_worked numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 0;

-- 2. Remove the global fields from pay_runs for expatriate payrolls
-- We'll keep them for backward compatibility but they won't be used for expatriate payrolls
-- ALTER TABLE public.pay_runs DROP COLUMN IF EXISTS days_worked;
-- ALTER TABLE public.pay_runs DROP COLUMN IF EXISTS exchange_rate;

-- 3. Add indexes for better performance on the new fields
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_days_worked ON public.expatriate_pay_run_items(days_worked);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_exchange_rate ON public.expatriate_pay_run_items(exchange_rate);

-- 4. Update the expatriate_pay_run_items table to ensure proper data types
ALTER TABLE public.expatriate_pay_run_items
  ALTER COLUMN days_worked SET DEFAULT 0,
  ALTER COLUMN exchange_rate SET DEFAULT 0;

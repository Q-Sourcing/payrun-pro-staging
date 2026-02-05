-- Add days_worked and exchange_rate fields to pay_runs for expatriate payroll
ALTER TABLE public.pay_runs
  ADD COLUMN IF NOT EXISTS days_worked numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 0;

-- Add equivalent fields to expatriate_pay_run_items for reference
ALTER TABLE public.expatriate_pay_run_items
  ADD COLUMN IF NOT EXISTS days_worked numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS local_gross_pay numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS local_net_pay numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'UGX';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pay_runs_days_worked ON public.pay_runs(days_worked);
CREATE INDEX IF NOT EXISTS idx_pay_runs_exchange_rate ON public.pay_runs(exchange_rate);

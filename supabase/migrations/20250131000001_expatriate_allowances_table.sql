-- Create expatriate_pay_run_item_allowances table
-- This table stores multiple named allowances per expatriate pay run item
-- Similar to pay_item_custom_deductions for monthly payroll

CREATE TABLE IF NOT EXISTS public.expatriate_pay_run_item_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expatriate_pay_run_item_id uuid NOT NULL REFERENCES public.expatriate_pay_run_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign key constraint
ALTER TABLE public.expatriate_pay_run_item_allowances
  ADD CONSTRAINT expatriate_pay_run_item_allowances_item_id_fkey
  FOREIGN KEY (expatriate_pay_run_item_id) 
  REFERENCES public.expatriate_pay_run_items(id) 
  ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.expatriate_pay_run_item_allowances ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive, consistent with existing tables)
CREATE POLICY "Allow all access to expatriate_pay_run_item_allowances"
  ON public.expatriate_pay_run_item_allowances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for faster lookups by pay run item
CREATE INDEX IF NOT EXISTS idx_expatriate_allowances_item_id
  ON public.expatriate_pay_run_item_allowances(expatriate_pay_run_item_id);

-- Index for faster lookups by name (for column generation)
CREATE INDEX IF NOT EXISTS idx_expatriate_allowances_name
  ON public.expatriate_pay_run_item_allowances(name);

-- Add comment for documentation
COMMENT ON TABLE public.expatriate_pay_run_item_allowances IS 'Stores multiple named allowances per expatriate pay run item (e.g., Housing, Transport, Medical)';


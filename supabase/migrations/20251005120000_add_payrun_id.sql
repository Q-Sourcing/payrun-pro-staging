-- Add pay_run_id column to pay_runs table
ALTER TABLE public.pay_runs 
ADD COLUMN pay_run_id VARCHAR(50) UNIQUE;

-- Create index for better performance
CREATE INDEX idx_pay_runs_pay_run_id ON public.pay_runs(pay_run_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.pay_runs.pay_run_id IS 'Unique identifier for pay run in format [Prefix]-[YYYYMMDD]-[HHMMSS]';

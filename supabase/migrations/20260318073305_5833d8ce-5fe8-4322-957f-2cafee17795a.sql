-- Add missing columns to head_office_pay_groups_interns
ALTER TABLE public.head_office_pay_groups_interns
  ADD COLUMN IF NOT EXISTS default_tax_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_country TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate_to_local NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to head_office_pay_groups_expatriates
ALTER TABLE public.head_office_pay_groups_expatriates
  ADD COLUMN IF NOT EXISTS default_tax_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to head_office_pay_groups_regular
ALTER TABLE public.head_office_pay_groups_regular
  ADD COLUMN IF NOT EXISTS exchange_rate_to_local NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT;
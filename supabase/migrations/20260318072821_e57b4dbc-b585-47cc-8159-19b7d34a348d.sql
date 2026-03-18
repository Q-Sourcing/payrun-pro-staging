ALTER TABLE public.head_office_pay_groups_regular
  ADD COLUMN IF NOT EXISTS default_tax_percentage NUMERIC DEFAULT 0;

ALTER TABLE public.head_office_pay_groups_regular
  ADD COLUMN IF NOT EXISTS tax_country TEXT;
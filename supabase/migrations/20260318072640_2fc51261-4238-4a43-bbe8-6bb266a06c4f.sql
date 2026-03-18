ALTER TABLE public.head_office_pay_groups_regular
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'UGX';

ALTER TABLE public.head_office_pay_groups_interns
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'UGX';

ALTER TABLE public.head_office_pay_groups_expatriates
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

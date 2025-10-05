-- LST payment plans and assignments

CREATE TABLE IF NOT EXISTS public.lst_payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'Uganda',
  method text NOT NULL DEFAULT 'official_brackets', -- official_brackets | fixed | custom_per_employee
  annual_amount numeric NOT NULL DEFAULT 0, -- used for fixed/custom
  months integer NOT NULL DEFAULT 3 CHECK (months >= 1 AND months <= 24),
  distribution text NOT NULL DEFAULT 'equal', -- equal | custom_amounts | percentages
  custom_amounts jsonb, -- [{month:"2025-10-01", amount: 33333}, ...]
  percentages jsonb, -- [50,30,20]
  start_month date NOT NULL, -- first month applied
  apply_future boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lst_employee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.lst_payment_plans(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  annual_amount numeric NOT NULL, -- resolved annual LST for this employee
  months integer NOT NULL,
  start_month date NOT NULL,
  distribution text NOT NULL,
  custom_amounts jsonb,
  percentages jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, employee_id)
);

-- Helper function: compute LST annual amount by official brackets (Uganda)
CREATE OR REPLACE FUNCTION public.ug_lst_annual_amount(gross_pay numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  IF gross_pay < 100000 THEN RETURN 0; END IF;
  IF gross_pay < 200000 THEN RETURN 5000; END IF;
  IF gross_pay < 300000 THEN RETURN 10000; END IF;
  IF gross_pay < 400000 THEN RETURN 20000; END IF;
  IF gross_pay < 500000 THEN RETURN 30000; END IF;
  IF gross_pay < 600000 THEN RETURN 40000; END IF;
  IF gross_pay < 700000 THEN RETURN 60000; END IF;
  IF gross_pay < 800000 THEN RETURN 70000; END IF;
  IF gross_pay < 900000 THEN RETURN 80000; END IF;
  IF gross_pay < 1000000 THEN RETURN 90000; END IF;
  RETURN 100000;
END;
$$;

COMMENT ON TABLE public.lst_payment_plans IS 'LST payment plan templates for batches';
COMMENT ON TABLE public.lst_employee_assignments IS 'LST plan assignments per employee';


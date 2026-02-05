-- Create banks table for managing bank information per country
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  swift_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, country_code) -- Bank name should be unique per country
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_banks_country_code ON public.banks(country_code);
CREATE INDEX IF NOT EXISTS idx_banks_name ON public.banks(name);

-- Enable RLS
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view banks"
  ON public.banks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert banks"
  ON public.banks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update banks"
  ON public.banks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banks_updated_at_trigger
  BEFORE UPDATE ON public.banks
  FOR EACH ROW
  EXECUTE FUNCTION update_banks_updated_at();

-- Add comments
COMMENT ON TABLE public.banks IS 'Bank information organized by country';
COMMENT ON COLUMN public.banks.name IS 'Bank name';
COMMENT ON COLUMN public.banks.country_code IS 'ISO country code (e.g., UG, KE, TZ)';
COMMENT ON COLUMN public.banks.swift_code IS 'SWIFT/BIC code (optional)';

-- Insert some common banks for East African countries
INSERT INTO public.banks (name, country_code, swift_code) VALUES
  -- Uganda
  ('Bank of Uganda', 'UG', NULL),
  ('Centenary Bank', 'UG', NULL),
  ('Equity Bank Uganda', 'UG', NULL),
  ('Stanbic Bank Uganda', 'UG', NULL),
  ('DFCU Bank', 'UG', NULL),
  -- Kenya
  ('Central Bank of Kenya', 'KE', NULL),
  ('Equity Bank Kenya', 'KE', NULL),
  ('KCB Bank Kenya', 'KE', NULL),
  ('Cooperative Bank of Kenya', 'KE', NULL),
  ('Standard Chartered Bank Kenya', 'KE', NULL),
  -- Tanzania
  ('Bank of Tanzania', 'TZ', NULL),
  ('CRDB Bank', 'TZ', NULL),
  ('NMB Bank', 'TZ', NULL),
  ('Equity Bank Tanzania', 'TZ', NULL),
  -- Rwanda
  ('National Bank of Rwanda', 'RW', NULL),
  ('Bank of Kigali', 'RW', NULL),
  ('Equity Bank Rwanda', 'RW', NULL),
  -- South Sudan
  ('Bank of South Sudan', 'SS', NULL)
ON CONFLICT (name, country_code) DO NOTHING;


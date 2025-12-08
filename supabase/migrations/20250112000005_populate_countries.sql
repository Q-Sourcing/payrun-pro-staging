-- Populate countries table from ALL_COUNTRIES constant
-- This migration ensures all countries are available in the database

-- First, ensure the countries table exists with proper structure
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries(name);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Create policy for countries (read-only for all authenticated users)
CREATE POLICY "Allow all authenticated users to read countries"
ON public.countries
FOR SELECT
TO authenticated
USING (true);

-- Populate countries from ALL_COUNTRIES constant
-- East African countries (priority display)
INSERT INTO public.countries (name, code) VALUES
  ('Uganda', 'UG'),
  ('Kenya', 'KE'),
  ('Tanzania', 'TZ'),
  ('Rwanda', 'RW'),
  ('South Sudan', 'SS'),
-- Other common countries
  ('United States', 'US'),
  ('United Kingdom', 'GB'),
  ('Canada', 'CA'),
  ('Australia', 'AU'),
  ('Germany', 'DE'),
  ('France', 'FR'),
  ('Netherlands', 'NL'),
  ('Sweden', 'SE')
ON CONFLICT (code) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.countries IS 'Global list of countries available in the system';
COMMENT ON COLUMN public.countries.code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN public.countries.name IS 'Full country name';







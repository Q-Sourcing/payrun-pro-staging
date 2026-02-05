-- Seed Uganda Banks
-- This migration ensures Uganda banks exist in the database
-- Uses ON CONFLICT DO NOTHING to avoid duplicates if banks already exist

-- Insert common Uganda banks
INSERT INTO public.banks (name, country_code, swift_code) VALUES
  -- Uganda Banks
  ('Bank of Uganda', 'UG', NULL),
  ('Centenary Bank', 'UG', NULL),
  ('Equity Bank Uganda', 'UG', NULL),
  ('Stanbic Bank Uganda', 'UG', NULL),
  ('DFCU Bank', 'UG', NULL),
  ('Bank of Africa Uganda', 'UG', NULL),
  ('Citibank Uganda', 'UG', NULL),
  ('Cairo Bank Uganda', 'UG', NULL),
  ('Ecobank Uganda', 'UG', NULL),
  ('Housing Finance Bank', 'UG', NULL),
  ('KCB Bank Uganda', 'UG', NULL),
  ('NC Bank Uganda', 'UG', NULL),
  ('PostBank Uganda', 'UG', NULL),
  ('Tropical Bank', 'UG', NULL),
  ('United Bank for Africa (UBA)', 'UG', NULL)
ON CONFLICT (name, country_code) DO NOTHING;

-- Verify insertion
DO $$
DECLARE
  bank_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bank_count
  FROM public.banks
  WHERE country_code = 'UG';
  
  RAISE NOTICE 'Uganda banks in database: %', bank_count;
END $$;


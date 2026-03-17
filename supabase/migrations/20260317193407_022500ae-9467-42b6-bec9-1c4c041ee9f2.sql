INSERT INTO public.banks (name, country_code, swift_code) VALUES
  ('Absa Bank Uganda', 'UG', NULL),
  ('Bank of Baroda Uganda', 'UG', NULL),
  ('Diamond Trust Bank Uganda', 'UG', NULL),
  ('Finance Trust Bank', 'UG', NULL),
  ('GT Bank Uganda', 'UG', NULL),
  ('Orient Bank Uganda', 'UG', NULL),
  ('Pride Microfinance', 'UG', NULL),
  ('Standard Chartered Bank Uganda', 'UG', NULL),
  ('Top Finance Bank', 'UG', NULL),
  ('Opportunity Bank Uganda', 'UG', NULL),
  ('Bank of India Uganda', 'UG', NULL),
  ('Exim Bank Uganda', 'UG', NULL),
  ('ABC Capital Bank', 'UG', NULL)
ON CONFLICT (name, country_code) DO NOTHING;
-- Add short_code to companies for employee number prefixing
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS short_code text;

COMMENT ON COLUMN public.companies.short_code IS 'Short code used for ID/prefix generation e.g., QSS';

-- Optional index if we search by short_code
CREATE INDEX IF NOT EXISTS idx_companies_short_code ON public.companies((lower(short_code)));


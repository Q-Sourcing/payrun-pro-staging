-- Update employees table structure
-- Add new name columns
ALTER TABLE public.employees 
ADD COLUMN first_name TEXT,
ADD COLUMN middle_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN currency TEXT;

-- Migrate existing name data to first_name
UPDATE public.employees 
SET first_name = name 
WHERE name IS NOT NULL;

-- Make first_name not null after migration
ALTER TABLE public.employees 
ALTER COLUMN first_name SET NOT NULL;

-- Drop the old name column
ALTER TABLE public.employees 
DROP COLUMN name;

-- Add default currency based on country (optional, can be updated later)
UPDATE public.employees 
SET currency = CASE 
  WHEN country = 'Uganda' THEN 'UGX'
  WHEN country = 'Kenya' THEN 'KES'
  WHEN country = 'Tanzania' THEN 'TZS'
  WHEN country = 'Rwanda' THEN 'RWF'
  WHEN country = 'Burundi' THEN 'BIF'
  WHEN country = 'United States' THEN 'USD'
  WHEN country = 'United Kingdom' THEN 'GBP'
  WHEN country = 'South Africa' THEN 'ZAR'
  WHEN country = 'Nigeria' THEN 'NGN'
  ELSE 'USD'
END
WHERE currency IS NULL;
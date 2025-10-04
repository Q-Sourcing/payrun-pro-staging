-- Add project field to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS project TEXT;
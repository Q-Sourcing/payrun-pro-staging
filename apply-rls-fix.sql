-- Quick fix script to apply RLS policies to pay_group_master
-- Run this with: npx supabase db execute --file apply-rls-fix.sql

-- Drop existing policies if they exist
DROP POLICY IF EXISTS pgm_insert ON public.pay_group_master;
DROP POLICY IF EXISTS pgm_update ON public.pay_group_master;

-- Create INSERT policy - allow authenticated users to insert
CREATE POLICY pgm_insert ON public.pay_group_master 
  FOR INSERT 
  WITH CHECK (true);

-- Create UPDATE policy - allow authenticated users to update
CREATE POLICY pgm_update ON public.pay_group_master 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Fix RLS policies for pay_group_master table
-- The table currently only has SELECT policy, but needs INSERT and UPDATE policies
-- for when creating IPPMS pay groups

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

-- Note: The SELECT policy already exists and allows all reads


-- Add updated_by to approval_workflows
ALTER TABLE public.approval_workflows 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

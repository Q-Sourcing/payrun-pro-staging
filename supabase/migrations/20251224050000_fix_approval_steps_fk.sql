-- Fix missing relationship for payrun_approval_steps
-- This allows PostgREST to resolve the relationship between approval steps and user profiles

-- 1. Add foreign key from payrun_approval_steps.approver_user_id to user_profiles
-- We use user_profiles instead of auth.users because the frontend usually joins with full_name/avatar
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_approver_user_id_fkey;

ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_approver_user_id_fkey
FOREIGN KEY (approver_user_id)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL;

-- 2. Add foreign key for actioned_by
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_actioned_by_fkey;

ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_actioned_by_fkey
FOREIGN KEY (actioned_by)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL;

-- 3. Add foreign key for original_approver_id
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_original_approver_id_fkey;

ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_original_approver_id_fkey
FOREIGN KEY (original_approver_id)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL;

-- 4. Add foreign key for delegated_by
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_delegated_by_fkey;

ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_delegated_by_fkey
FOREIGN KEY (delegated_by)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL;

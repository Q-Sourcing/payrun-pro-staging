-- Add missing columns to user_management_profiles
ALTER TABLE public.user_management_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT;

-- Fix stuck invitation for already-confirmed user (tadong was confirmed but accept never ran)
UPDATE public.user_management_invitations
SET status = 'accepted', accepted_at = now()
WHERE email = 'tadong@flipafrica.app' AND status = 'pending';
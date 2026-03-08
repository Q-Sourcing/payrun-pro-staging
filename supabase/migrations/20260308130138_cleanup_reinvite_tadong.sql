-- Step 1: Delete all invitation records for tadong@flipafrica.app so a fresh invite can be sent
DELETE FROM public.user_management_invitations WHERE email = 'tadong@flipafrica.app';

-- Step 2: Clean up any profile records linked to the old auth user ID
DELETE FROM public.user_management_profiles WHERE id = 'cb0bcbd1-b41b-41c2-a769-ffea7415b19e';
DELETE FROM public.user_profiles WHERE id = 'cb0bcbd1-b41b-41c2-a769-ffea7415b19e';

-- Log the cleanup
INSERT INTO public.cleanup_logs (action, auth_user_id, email, reason, details)
VALUES (
  'pre_reinvite_cleanup',
  'cb0bcbd1-b41b-41c2-a769-ffea7415b19e',
  'tadong@flipafrica.app',
  'User was auto-confirmed before intentional acceptance. Clearing for fresh reinvite.',
  '{"note": "Auth user still exists in auth.users - must be deleted via Supabase dashboard or admin API"}'
);

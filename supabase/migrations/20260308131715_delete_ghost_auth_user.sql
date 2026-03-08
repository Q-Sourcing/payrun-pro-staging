-- Delete the ghost/conflicting auth user for tadong@flipafrica.app
DELETE FROM auth.users WHERE id = 'cb0bcbd1-b41b-41c2-a769-ffea7415b19e';

-- Clean up any leftover public table records
DELETE FROM public.user_management_invitations WHERE email = 'tadong@flipafrica.app';
DELETE FROM public.user_management_profiles WHERE email = 'tadong@flipafrica.app';
DELETE FROM public.user_profiles WHERE id = 'cb0bcbd1-b41b-41c2-a769-ffea7415b19e';

-- Log the cleanup
INSERT INTO public.cleanup_logs (action, auth_user_id, email, reason, details)
VALUES (
  'hard_delete_ghost_auth_user',
  'cb0bcbd1-b41b-41c2-a769-ffea7415b19e',
  'tadong@flipafrica.app',
  'Deleted to allow fresh Supabase-native invitation email.',
  '{"note": "Deleted via migration. Fresh invite will use Supabase inviteUserByEmail which sends email natively."}'
);

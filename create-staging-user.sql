-- Create user in staging database
-- This script will add your user account to the staging Supabase database

-- First, let's check if the user already exists
SELECT id, email FROM auth.users WHERE email = 'nalungukevin@gmail.com';

-- If the user doesn't exist, we need to create them
-- Note: This requires admin access to the Supabase dashboard

-- Option 1: Create user via Supabase Dashboard
-- 1. Go to https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" 
-- 4. Enter email: nalungukevin@gmail.com
-- 5. Set a password
-- 6. Confirm email (check the box)

-- Option 2: Create user via SQL (if you have admin access)
-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   confirmation_token,
--   email_change,
--   email_change_token_new,
--   recovery_token
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'nalungukevin@gmail.com',
--   crypt('your_password_here', gen_salt('bf')),
--   now(),
--   now(),
--   now(),
--   '',
--   '',
--   '',
--   ''
-- );

-- Option 3: Use Supabase CLI to create user
-- supabase auth users create nalungukevin@gmail.com --password your_password_here

-- Create Super Admin User
-- Run this in your Supabase Dashboard > SQL Editor

-- First, create the user (this will send a confirmation email)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'nalungukevin@gmail.com',
  crypt('gWaZusuper1!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Nalungu", "last_name": "Kevin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Get the user ID that was just created
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = 'nalungukevin@gmail.com';
    
    -- Insert into users table with super_admin role
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'nalungukevin@gmail.com',
        'Nalungu',
        'Kevin',
        'super_admin',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Super admin user created with ID: %', user_id;
END $$;

-- Verify the user was created
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active
FROM public.users u
WHERE u.email = 'nalungukevin@gmail.com';

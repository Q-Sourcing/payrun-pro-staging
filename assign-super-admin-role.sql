-- Assign Super Admin Role to the Created User
-- Run this in your Supabase Dashboard > SQL Editor

-- Insert the user into the user_roles table with super_admin role
INSERT INTO public.user_roles (
    user_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    'c235ab8b-ad54-4d99-b3c0-9499292dd23d',
    'nalungukevin@gmail.com',
    'Nalungu',
    'Kevin',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = NOW();

-- Verify the super admin user was created
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM public.user_roles 
WHERE user_id = 'c235ab8b-ad54-4d99-b3c0-9499292dd23d';

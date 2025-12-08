-- Check user in public.users table
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
FROM public.users
WHERE email = 'nalungukevin@gmail.com';

-- Check user in auth.users table (if accessible)
SELECT 
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    created_at
FROM auth.users
WHERE email = 'nalungukevin@gmail.com';


-- Assign Platform Super Admin Role
-- Run this in Supabase SQL Editor to give yourself full access

-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'nalungukevin@gmail.com'; -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Get the user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found with email: %', v_email;
    RETURN;
  END IF;

  -- Assign PLATFORM_SUPER_ADMIN role with GLOBAL scope
  INSERT INTO public.rbac_assignments (user_id, role_code, scope_type, scope_id)
  VALUES (v_user_id, 'PLATFORM_SUPER_ADMIN', 'GLOBAL', NULL)
  ON CONFLICT (user_id, role_code, scope_type, scope_id) DO NOTHING;

  RAISE NOTICE 'Successfully assigned PLATFORM_SUPER_ADMIN to user: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Trigger JWT sync by updating the assignment
  UPDATE public.rbac_assignments
  SET created_at = now()
  WHERE user_id = v_user_id
    AND role_code = 'PLATFORM_SUPER_ADMIN';
    
  RAISE NOTICE 'JWT metadata should be updated. User may need to log out and log back in.';
END $$;

-- Verify the assignment
SELECT 
  u.email,
  ra.role_code,
  ra.scope_type,
  ra.scope_id,
  ra.created_at
FROM public.rbac_assignments ra
JOIN auth.users u ON ra.user_id = u.id
WHERE u.email = 'nalungukevin@gmail.com'; -- CHANGE THIS TO YOUR EMAIL

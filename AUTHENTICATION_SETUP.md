# Authentication Setup Guide

## Overview
A modern authentication system has been implemented using Supabase with user roles and profiles.

## Database Structure

### Tables Created:
1. **profiles** - Stores user profile information
2. **user_roles** - Manages user role assignments
3. **Enum: app_role** - Defines available roles: super_admin, admin, manager, employee

## Setting Up the Super Admin Account

### Step 1: Sign Up
1. Navigate to `/login` in your application
2. Click "Contact your administrator" (we'll add a signup later if needed)
3. OR use Supabase Dashboard to create the user manually

### Step 2: Manual Super Admin Setup (via Supabase SQL Editor)

After the user is created, run this SQL in Supabase SQL Editor:

```sql
-- First, find the user ID for nalungukevin@gmail.com
SELECT id, email FROM auth.users WHERE email = 'nalungukevin@gmail.com';

-- Then insert the super_admin role (replace YOUR_USER_ID with the actual ID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'super_admin');

-- Update the profile with the correct name
UPDATE public.profiles
SET 
  first_name = 'Nalungu',
  last_name = 'Kevin'
WHERE id = 'YOUR_USER_ID';
```

### Step 3: Enable Email/Password Authentication in Supabase

1. Go to: https://supabase.com/dashboard/project/kctwfgbjmhnfqtxhagib/auth/providers
2. Ensure "Email" provider is enabled
3. Configure email templates if needed
4. For development, you may want to disable "Confirm email" under:
   - Authentication > Settings > Email Auth
   - Set "Enable email confirmations" to OFF (for testing only)

## Features Implemented

✅ Secure login with Supabase authentication
✅ User profiles with first name, last name, email
✅ Role-based access control (super_admin, admin, manager, employee)
✅ Automatic profile creation on signup
✅ Protected routes - unauthenticated users redirect to login
✅ Logout functionality with button in header
✅ Modern, responsive login UI with brand colors
✅ Proper token management and session handling
✅ Comprehensive error handling and logging

## User Roles

- **super_admin**: Full system access, can manage all users and roles
- **admin**: Can manage payroll and employees
- **manager**: Can view and process payroll for their team
- **employee**: Can view their own pay information (future feature)

## Login Flow

1. User enters email and password
2. Supabase authenticates credentials
3. Session is created and stored securely
4. User profile and roles are fetched
5. User is redirected to dashboard (/)
6. Protected routes check authentication status

## Security Features

- Row Level Security (RLS) enabled on all tables
- Security definer function for role checks
- Session-based authentication
- Automatic token refresh
- Secure password handling
- Protected routes with redirect
- No client-side role manipulation

## Next Steps

1. Create the super admin user via Supabase Dashboard or direct signup
2. Assign super_admin role using SQL (see Step 2 above)
3. Login with super admin credentials
4. The system is ready to use!

## Troubleshooting

### "Invalid login credentials"
- Ensure the user exists in Supabase Auth
- Check if email confirmation is required
- Verify password is correct

### "No roles found"
- Run the SQL to insert super_admin role
- Check user_roles table for the user_id

### Can't access dashboard after login
- Check browser console for errors
- Verify protected routes are working
- Ensure session is being created

## Additional Notes

- All authentication logs are visible in browser console (prefixed with emoji for easy identification)
- Session tokens are automatically refreshed
- Logout clears all session data
- Profile information is displayed in the header

---

For production deployment:
1. Enable email confirmation
2. Set up password reset flow
3. Configure proper email templates
4. Add 2FA for super admin accounts
5. Regular security audits

# Fix Login 401 Error

## Problem
The login is failing with a 401 error even though:
- ✅ User exists: `nalungukevin@gmail.com`
- ✅ Password is correct: `gWaZusuper1!`
- ✅ Direct Supabase authentication works

## Root Cause
The `secure-login` Edge Function is deployed but missing the `SUPABASE_SERVICE_ROLE_KEY` environment variable.

## Solution

### Option 1: Configure Edge Function Environment Variables (Recommended)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm
   - Go to **Edge Functions** → **secure-login** → **Settings**

2. **Add Environment Variables**:
   - Click **Add Secret** or **Environment Variables**
   - Add these variables:
     ```
     SUPABASE_URL=https://sbphmrjoappwlervnbtm.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
     ```
   
3. **Get Service Role Key**:
   - Go to **Settings** → **API** → **Service Role Key** (keep this secret!)
   - Copy the key and paste it into the Edge Function environment variables

4. **Redeploy the Function** (if needed):
   ```bash
   supabase functions deploy secure-login
   ```

### Option 2: Use Direct Supabase Auth (Temporary Workaround)

If you need immediate access, you can temporarily modify the login to use direct Supabase auth instead of the Edge Function.

**Note**: This bypasses security features like login attempt tracking and account locking.

### Option 3: Deploy/Update Edge Function via CLI

```bash
# Make sure you're logged in
supabase login

# Link to staging project
supabase link --project-ref sbphmrjoappwlervnbtm

# Set environment variables
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Deploy the function
supabase functions deploy secure-login
```

## Verification

After fixing, test the login:
1. Try logging in with:
   - Email: `nalungukevin@gmail.com`
   - Password: `gWaZusuper1!`

2. Check browser console - should see successful login

3. Verify Edge Function logs:
   - Go to Supabase Dashboard → Edge Functions → secure-login → Logs
   - Should see successful login events

## User Confirmation

✅ **User confirmed to exist**:
- Email: `nalungukevin@gmail.com`
- Name: Nalungu Kevin
- Role: `super_admin`
- Status: Active
- Password: `gWaZusuper1!`

The user is properly configured in the database. The issue is purely with the Edge Function configuration.


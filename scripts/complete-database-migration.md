# 🗄️ Complete Database Migration Guide

## 🎯 Problem
The production database is empty and missing base tables, causing migration failures. We need to copy ALL data from staging to production, including:
- All tables and schema
- All data (employees, users, paygroups, etc.)
- Your superadmin user
- All relationships and constraints

## 🚀 Solution: Manual Migration via Supabase Dashboard

Since direct database connections are timing out, we'll use the Supabase Dashboard method:

### Step 1: Export from Staging Database

1. **Go to Staging Dashboard:**
   - URL: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm
   - Login to your Supabase account

2. **Navigate to Database Settings:**
   - Go to **Settings** → **Database**
   - Scroll down to **Database Backups** section

3. **Create Full Backup:**
   - Click **"Create backup"** or **"Download backup"**
   - Choose **"Full backup"** (includes schema + data)
   - Save the file as `staging_full_backup.sql`

### Step 2: Import to Production Database

1. **Go to Production Dashboard:**
   - URL: https://supabase.com/dashboard/project/ftiqmqrjzebibcixpnll
   - This is your target database

2. **Open SQL Editor:**
   - Go to **SQL Editor** in the left sidebar
   - Click **"New query"**

3. **Import the Backup:**
   - Copy the entire contents of `staging_full_backup.sql`
   - Paste into the SQL Editor
   - Click **"Run"** to execute the migration

### Step 3: Verify Migration

1. **Check Tables:**
   - Go to **Table Editor** in production
   - Verify all tables from staging are present:
     - `employees`
     - `pay_groups`
     - `pay_runs`
     - `auth.users`
     - All other tables

2. **Check Data:**
   - Verify row counts match staging
   - Check that your superadmin user exists
   - Test login functionality

3. **Test Application:**
   - Visit http://localhost:8081 (production app)
   - Try logging in with your superadmin credentials
   - Verify all features work

## 🔧 Alternative: Reset and Rebuild Production

If the manual migration doesn't work, we can reset the production database:

### Option A: Reset Production Database

1. **Go to Production Dashboard:**
   - https://supabase.com/dashboard/project/ftiqmqrjzebibcixpnll

2. **Reset Database:**
   - Go to **Settings** → **Database**
   - Click **"Reset database"** (⚠️ This will delete all data)
   - Confirm the reset

3. **Run Migrations:**
   ```bash
   supabase link --project-ref ftiqmqrjzebibcixpnll
   supabase db push --linked
   ```

4. **Import Data:**
   - Use the staging backup method above

### Option B: Use Existing Production Dump

If you have a working production dump:

1. **Link to Production:**
   ```bash
   supabase link --project-ref ftiqmqrjzebibcixpnll
   ```

2. **Restore from Dump:**
   ```bash
   psql "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres" -f supabase/production_dump_20251015_074535.sql
   ```

## 🎯 Expected Results

After successful migration:

✅ **Production Database Contains:**
- All tables from staging
- All data (employees, users, paygroups, etc.)
- Your superadmin user with correct credentials
- All relationships and constraints

✅ **Production App Works:**
- Login with superadmin credentials
- All payroll features functional
- No "Connected to LOCAL Database" message
- Shows "🟢 PRODUCTION" banner

## 🆘 Troubleshooting

### If Migration Fails:
1. **Check SQL Syntax:** Ensure backup file is valid SQL
2. **Verify Permissions:** Check database user permissions
3. **Schema Conflicts:** Look for existing objects that might conflict
4. **Data Type Issues:** Verify column types match

### If Login Still Fails:
1. **Check User Table:** Verify superadmin user exists in `auth.users`
2. **Check Credentials:** Ensure email/password are correct
3. **Check Roles:** Verify user has correct role assignments

## 📞 Next Steps

1. **Complete the manual migration** using the Supabase Dashboard method
2. **Test the production app** at http://localhost:8081
3. **Verify login works** with your superadmin credentials
4. **Confirm all data is present** in the production database

---

**🎯 Goal:** Get your production database to be an exact copy of your staging database with all data, tables, and users intact.

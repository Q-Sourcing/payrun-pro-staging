# 🗄️ Database Migration Instructions

## 🎯 Migration Goal
Copy all data and schema from **Payroll-Staging** to **Payroll-Production**

## 📋 Project Details
- **Source (Staging)**: `sbphmrjoappwlervnbtm` - Password: `vXPamfyygrwnJwoy`
- **Target (Production)**: `ftiqmqrjzebibcixpnll` - Password: `gWaZuprod1!`

## 🚀 Recommended Method: Supabase Dashboard

Since CLI and direct connections are having network issues, use the Supabase Dashboard method:

### Step 1: Export from Staging Database

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Login to your account

2. **Select Payroll-Staging Project**
   - Project ID: `sbphmrjoappwlervnbtm`
   - This is your source database

3. **Navigate to Database Settings**
   - Go to **Settings** → **Database**
   - Scroll down to find **Database Backups** section

4. **Create Backup**
   - Click **"Create backup"** or **"Download backup"**
   - Choose **"Full backup"** (includes schema + data)
   - Save the file as `payroll_staging_backup.sql`

### Step 2: Import to Production Database

1. **Switch to Payroll-Production Project**
   - Project ID: `ftiqmqrjzebibcixpnll`
   - This is your target database

2. **Open SQL Editor**
   - Go to **SQL Editor** in the left sidebar
   - Click **"New query"**

3. **Import the Backup**
   - Copy the entire contents of `payroll_staging_backup.sql`
   - Paste into the SQL Editor
   - Click **"Run"** to execute the migration

### Step 3: Verify Migration

1. **Check Tables**
   - Go to **Table Editor**
   - Verify all tables from staging are present
   - Check that data looks correct

2. **Test Key Functions**
   - Verify authentication works
   - Test core payroll features
   - Check API endpoints

## 🔧 Environment Configuration Status

✅ **Environment configuration is now correct:**

- **Staging Branch** → `sbphmrjoappwlervnbtm` (Staging Database)
- **Main Branch** → `ftiqmqrjzebibcixpnll` (Production Database)

### Environment Files Updated:
- ✅ `.env.local` - Staging configuration
- ✅ `.env.production` - Production configuration  
- ✅ `supabase/config.production.toml` - Updated project ID

## 🧪 Testing the Environment System

After migration, test the environment automation:

```bash
# Test staging environment
npm run env:staging
npm run dev

# Test production environment  
npm run env:production
npm run dev
```

You should see in the browser console:
- **Staging**: `🌿 Environment: staging` + staging Supabase URL
- **Production**: `🌿 Environment: production` + production Supabase URL

## 📋 Migration Checklist

- [ ] **Backup Production**: Create backup of current production database
- [ ] **Export Staging**: Download backup from Payroll-Staging project
- [ ] **Import to Production**: Execute backup in Payroll-Production project
- [ ] **Verify Schema**: Check all tables and relationships exist
- [ ] **Verify Data**: Confirm data integrity and row counts
- [ ] **Test Application**: Verify all features work correctly
- [ ] **Update Team**: Notify team of migration completion

## ⚠️ Important Notes

1. **Backup First**: Always backup production before migration
2. **Test Environment**: Consider testing in a development environment first
3. **Downtime**: Plan for brief downtime during migration
4. **Rollback Plan**: Have a rollback strategy ready
5. **Team Communication**: Inform team members of the migration

## 🆘 Troubleshooting

### If Migration Fails:
1. **Check SQL Syntax**: Ensure backup file is valid SQL
2. **Verify Permissions**: Check database user permissions
3. **Schema Conflicts**: Look for existing objects that might conflict
4. **Data Type Issues**: Verify column types match

### If Environment Issues:
1. **Check Environment Files**: Verify `.env.local` and `.env.production` exist
2. **Test Environment Switching**: Run `npm run env:staging` and `npm run env:production`
3. **Check Browser Console**: Look for environment verification logs

## 🎉 Post-Migration Steps

1. **Update Documentation**: Update any hardcoded database references
2. **Team Notification**: Inform team members of completion
3. **Monitoring**: Monitor application performance
4. **Backup Strategy**: Implement regular production backups

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the `DATABASE_MIGRATION_GUIDE.md` for detailed instructions
3. Use the migration helper script: `node scripts/migrate-database.js`

---

**🎯 Ready to migrate!** Follow the Supabase Dashboard method above for the most reliable migration process.

# Database Migration Guide: Staging → Production

## 🎯 Migration Overview

**Goal:** Copy all data and schema from `Payroll-Staging` to `Payroll-Production`

### Project Details
- **Source (Staging)**: `sbphmrjoappwlervnbtm` - Password: `vXPamfyygrwnJwoy`
- **Target (Production)**: `ftiqmqrjzebibcixpnll` - Password: `gWaZuprod1!`

## 🚀 Migration Methods

### Method 1: Using Supabase Dashboard (Recommended)

Since the CLI requires Docker, the most reliable method is using the Supabase Dashboard:

#### Step 1: Export from Staging
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select **Payroll-Staging** project (`sbphmrjoappwlervnbtm`)
3. Go to **Settings** → **Database**
4. Scroll down to **Database Backups**
5. Click **Download backup** or **Create backup**
6. Save the backup file as `payroll_staging_backup.sql`

#### Step 2: Import to Production
1. Go to **Payroll-Production** project (`ftiqmqrjzebibcixpnll`)
2. Go to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `payroll_staging_backup.sql`
5. Click **Run** to execute the migration

### Method 2: Using pgAdmin or Database Client

#### Step 1: Connect to Staging Database
```
Host: db.sbphmrjoappwlervnbtm.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: vXPamfyygrwnJwoy
```

#### Step 2: Export Database
1. Right-click on the database
2. Select **Backup**
3. Choose **Plain** format
4. Include **Data** and **Schema**
5. Save as `payroll_staging_dump.sql`

#### Step 3: Connect to Production Database
```
Host: db.ftiqmqrjzebibcixpnll.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: gWaZuprod1!
```

#### Step 4: Import Database
1. Right-click on the database
2. Select **Restore**
3. Choose the `payroll_staging_dump.sql` file
4. Execute the restore

### Method 3: Using psql Command Line (Alternative)

If you have access to a system with PostgreSQL tools:

```bash
# Export from staging
pg_dump "postgresql://postgres:vXPamfyygrwnJwoy@db.sbphmrjoappwlervnbtm.supabase.co:5432/postgres" -f payroll_staging_dump.sql

# Import to production
psql "postgresql://postgres:gWaZuprod1!@db.ftiqmqrjzebibcixpnll.supabase.co:5432/postgres" -f payroll_staging_dump.sql
```

## 🔧 Environment Configuration Update

After successful migration, update the environment configuration:

### Current Configuration (Incorrect)
- **Staging Branch** → `sbphmrjoappwlervnbtm` (Staging DB)
- **Main Branch** → `ftiqmqrjzebibcixpnll` (Production DB)

### Target Configuration (Correct)
- **Staging Branch** → `sbphmrjoappwlervnbtm` (Staging DB) ✅
- **Main Branch** → `ftiqmqrjzebibcixpnll` (Production DB) ✅

The environment configuration is already correct! No changes needed.

## ✅ Verification Steps

After migration, verify the following:

1. **Schema Verification**
   - All tables exist in production
   - All relationships are intact
   - All functions and triggers are present

2. **Data Verification**
   - Row counts match between staging and production
   - Sample data looks correct
   - No data corruption

3. **Application Testing**
   - Test login functionality
   - Test core payroll features
   - Verify all API endpoints work

## 🚨 Important Notes

- **Backup First**: Always backup production before migration
- **Test Environment**: Test the migration in a development environment first
- **Downtime**: Plan for brief downtime during migration
- **Rollback Plan**: Have a rollback strategy ready

## 📋 Migration Checklist

- [ ] Backup current production database
- [ ] Export staging database
- [ ] Import to production database
- [ ] Verify schema integrity
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Update any hardcoded references
- [ ] Notify team of completion

## 🔄 Post-Migration Steps

1. **Update Documentation**: Update any documentation with new database references
2. **Team Notification**: Inform team members of the migration completion
3. **Monitoring**: Monitor application performance after migration
4. **Backup Strategy**: Implement regular backup strategy for production

## 🆘 Troubleshooting

### Common Issues
- **Connection Timeouts**: Check network connectivity and firewall settings
- **Permission Errors**: Verify database user permissions
- **Schema Conflicts**: Check for existing objects that might conflict
- **Data Type Mismatches**: Verify column types match between environments

### Support Resources
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://supabase.com/docs/guides/database/migrations)

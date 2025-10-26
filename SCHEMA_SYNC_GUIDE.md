# 🔄 Schema Sync Guide: Staging → Production

This guide explains how to safely synchronize your database schema from staging to production.

## 🎯 What This Does

- ✅ Copies **schema only** (tables, functions, triggers, constraints)
- ❌ Does **NOT** copy data (your production data is safe)
- 🔒 Includes safety checks and confirmations
- 📊 Shows schema statistics before applying

---

## 📋 Prerequisites

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

Or the script will auto-install it for you.

### 2. Set Environment Variables

Create or update your `.env` file:

```bash
# Staging Database
STAGING_SUPABASE_REF=sbphmrjoappwlervnbtm
STAGING_DB_PASSWORD=your-staging-password

# Production Database  
PRODUCTION_SUPABASE_REF=kctwfgbjmhnfqtxhagib
PRODUCTION_DB_PASSWORD=your-production-password
```

**🔐 Getting Database Passwords:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Find **Database Password** (you set this when creating the project)

---

## 🚀 Usage

### Step 1: Test in Staging

Make sure your staging environment is fully tested and stable:

```bash
# Run your tests
npm test

# Verify staging works correctly
npm run start:staging
```

### Step 2: Backup Production (Recommended)

Always backup before making schema changes:

```bash
# Manual backup via Supabase Dashboard:
# Project Settings → Database → Create Backup
```

### Step 3: Run Schema Sync

```bash
# Dry run (review schema without applying)
npm run sync:schema

# This will:
# 1. Export schema from staging
# 2. Show schema statistics
# 3. Save schema file for review
# 4. Wait for your confirmation
```

### Step 4: Apply to Production

After reviewing the schema file, run with confirmation:

```bash
# Apply schema to production
npm run sync:schema -- --confirm
```

---

## 📊 What You'll See

```
╔══════════════════════════════════════════════════════════╗
║  🔄 Schema Sync: Staging → Production                    ║
╚══════════════════════════════════════════════════════════╝

✅ Supabase CLI is installed
✅ All environment variables present

📤 Exporting schema from staging...
✅ Schema exported successfully (45.23 KB)

📋 Schema Review
────────────────────────────────────────────────────────────
📊 Schema Statistics:
   • Tables: 42
   • Functions: 18
   • Triggers: 5
   • Indexes: 23
────────────────────────────────────────────────────────────

⚠️  WARNING: This will modify the PRODUCTION database schema!
   Data will NOT be affected, but schema changes are irreversible.

❌ Automated safety check: Add --confirm flag to proceed
   Usage: npm run sync:schema -- --confirm
```

---

## 🛡️ Safety Features

### 1. Schema-Only Export
- Only table structures, functions, triggers, and constraints
- **No user data** is copied

### 2. Review Before Apply
- Shows statistics of what will change
- Warns about DROP statements
- Saves schema file for manual review

### 3. Explicit Confirmation Required
- Must use `--confirm` flag to apply
- Prevents accidental production changes

### 4. Audit Trail
- Schema file saved as `staging_schema.sql`
- Keep for documentation and rollback reference

---

## ⚠️ Important Considerations

### Schema Changes That Affect Data

Some schema changes can affect existing data:

| Change Type | Risk Level | Notes |
|-------------|-----------|-------|
| Add column (nullable) | ✅ Safe | Existing rows get NULL |
| Add column (NOT NULL with default) | ✅ Safe | Default value applied |
| Add column (NOT NULL, no default) | ❌ **FAILS** | Existing rows can't satisfy constraint |
| Drop column | ⚠️ Medium | Data in that column is deleted |
| Rename column | ⚠️ Medium | App code must be updated first |
| Change column type | ⚠️ Medium | May fail if data incompatible |
| Add constraint | ⚠️ Medium | Fails if existing data violates |

### Best Practices

1. **Test in Staging First**
   - Always verify schema changes work in staging
   - Test with realistic data volumes

2. **Update Application Code First**
   - If renaming/removing columns, deploy app code changes first
   - Use feature flags for gradual rollout

3. **Backup Before Changes**
   - Create production backup
   - Test restore procedure

4. **Off-Peak Hours**
   - Run during maintenance window
   - Minimize user impact

5. **Monitor After Changes**
   - Watch error logs
   - Test critical features
   - Be ready to rollback if needed

---

## 🔄 Rollback Strategy

If something goes wrong:

### Option 1: Restore from Backup
```bash
# Via Supabase Dashboard:
# Project Settings → Database → Restore Backup
```

### Option 2: Manual Rollback
```bash
# Review the saved schema file
cat staging_schema.sql

# Manually write rollback SQL if needed
# Apply via Supabase Dashboard SQL Editor
```

---

## 📝 Workflow Integration

### Local Development Workflow

```bash
# 1. Make schema changes in staging
npm run db:migrate:staging

# 2. Test thoroughly
npm run test

# 3. Sync to production when ready
npm run sync:schema -- --confirm
```

### CI/CD Integration

Add to your GitHub Actions or deployment pipeline:

```yaml
- name: Sync Database Schema
  run: |
    npm run sync:schema -- --confirm
  env:
    STAGING_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
    PRODUCTION_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
```

---

## 🆘 Troubleshooting

### Error: "Supabase CLI not found"
```bash
# Install manually
npm install -g supabase

# Or let the script auto-install
npm run sync:schema
```

### Error: "Missing environment variables"
```bash
# Set in .env file or export
export STAGING_DB_PASSWORD="your-password"
export PRODUCTION_DB_PASSWORD="your-password"
```

### Error: "Connection refused"
```bash
# Check your database passwords
# Verify Supabase project refs are correct
# Ensure network access (no firewall blocking)
```

### Error: Schema apply failed
```bash
# Review staging_schema.sql for issues
# Check production logs in Supabase Dashboard
# Manually fix via SQL Editor if needed
```

---

## 📚 Related Commands

```bash
# View staging schema
npm run db:pull:staging

# View production schema  
npm run db:pull:prod

# Create new migration in staging
npm run db:migrate:new

# Apply migrations to staging
npm run db:push:staging

# Apply migrations to production
npm run db:push:prod
```

---

## ✅ Success Checklist

After running schema sync:

- [ ] Production schema matches staging
- [ ] Application functions correctly
- [ ] No errors in production logs
- [ ] Critical features tested
- [ ] Team notified of changes
- [ ] Schema file archived for documentation

---

## 🔗 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Database Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [Lovable Supabase Integration](https://docs.lovable.dev/features/cloud)

---

**Questions?** Check the [Troubleshooting](#-troubleshooting) section or review the script source code in `scripts/sync-schema-staging-to-prod.cjs`.

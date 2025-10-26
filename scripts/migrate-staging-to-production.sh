#!/bin/bash

echo "🗄️  Migrating Staging Database to Production"
echo "============================================="

# Database connection details
STAGING_URL="postgresql://postgres:vXPamfyygrwnJwoy@sbphmrjoappwlervnbtm.supabase.co:5432/postgres"
PRODUCTION_URL="postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres"

# Set PostgreSQL path
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"

echo "📋 Migration Details:"
echo "   Source (Staging): sbphmrjoappwlervnbtm.supabase.co"
echo "   Target (Production): ftiqmqrjzebibcixpnll.supabase.co"
echo ""

# Step 1: Create a fresh dump from staging
echo "1️⃣ Creating fresh dump from staging database..."
DUMP_FILE="staging_to_production_$(date +%Y%m%d_%H%M%S).sql"

if pg_dump "$STAGING_URL" -f "$DUMP_FILE" --verbose; then
    echo "✅ Staging dump created: $DUMP_FILE"
    echo "   File size: $(ls -lh "$DUMP_FILE" | awk '{print $5}')"
else
    echo "❌ Failed to create staging dump"
    exit 1
fi

echo ""

# Step 2: Check what's in the dump
echo "2️⃣ Checking dump contents..."
echo "   Tables found:"
grep -c "CREATE TABLE" "$DUMP_FILE" || echo "   No tables found"
echo "   Data inserts:"
grep -c "INSERT INTO" "$DUMP_FILE" || echo "   No data found"
echo "   Users found:"
grep -c "INSERT INTO.*auth.users" "$DUMP_FILE" || echo "   No users found"

echo ""

# Step 3: Test production connection
echo "3️⃣ Testing production database connection..."
if psql "$PRODUCTION_URL" -c "SELECT version();" --no-password > /dev/null 2>&1; then
    echo "✅ Production database connection successful"
else
    echo "❌ Failed to connect to production database"
    exit 1
fi

echo ""

# Step 4: Backup current production (if any data exists)
echo "4️⃣ Creating backup of current production database..."
BACKUP_FILE="production_backup_$(date +%Y%m%d_%H%M%S).sql"

if pg_dump "$PRODUCTION_URL" -f "$BACKUP_FILE" --verbose; then
    echo "✅ Production backup created: $BACKUP_FILE"
    echo "   File size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
else
    echo "⚠️  Production backup failed (may be empty database)"
fi

echo ""

# Step 5: Restore staging data to production
echo "5️⃣ Restoring staging data to production database..."
echo "   This will overwrite all existing data in production!"

read -p "   Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

if psql "$PRODUCTION_URL" -f "$DUMP_FILE" --no-password; then
    echo "✅ Data restored to production database successfully"
else
    echo "❌ Failed to restore data to production"
    echo "   Restoring backup..."
    if [ -f "$BACKUP_FILE" ]; then
        psql "$PRODUCTION_URL" -f "$BACKUP_FILE" --no-password
        echo "   Backup restored"
    fi
    exit 1
fi

echo ""

# Step 6: Verify migration
echo "6️⃣ Verifying migration..."
echo "   Checking tables in production:"
psql "$PRODUCTION_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" --no-password

echo ""
echo "   Checking users in production:"
psql "$PRODUCTION_URL" -c "SELECT email, role FROM auth.users LIMIT 5;" --no-password

echo ""

# Step 7: Cleanup
echo "7️⃣ Migration completed successfully!"
echo ""
echo "📁 Files created:"
echo "   Staging dump: $DUMP_FILE"
if [ -f "$BACKUP_FILE" ]; then
    echo "   Production backup: $BACKUP_FILE"
fi
echo ""
echo "🎯 Next steps:"
echo "   1. Test production app: http://localhost:8081"
echo "   2. Try logging in with your superadmin credentials"
echo "   3. Verify all data is present"
echo ""
echo "✅ Migration complete! Your production database now has all staging data."

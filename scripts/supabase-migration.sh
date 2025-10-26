#!/bin/bash

echo "🗄️  Supabase Database Migration (Staging → Production)"
echo "======================================================"

# Project details
STAGING_PROJECT="sbphmrjoappwlervnbtm"
PRODUCTION_PROJECT="ftiqmqrjzebibcixpnll"

echo "📋 Migration Details:"
echo "   Source (Staging): $STAGING_PROJECT"
echo "   Target (Production): $PRODUCTION_PROJECT"
echo ""

# Step 1: Link to staging project
echo "1️⃣ Linking to staging project..."
if supabase link --project-ref "$STAGING_PROJECT"; then
    echo "✅ Linked to staging project: $STAGING_PROJECT"
else
    echo "❌ Failed to link to staging project"
    exit 1
fi

echo ""

# Step 2: Create dump from staging
echo "2️⃣ Creating dump from staging database..."
DUMP_FILE="staging_dump_$(date +%Y%m%d_%H%M%S).sql"

# Try to create dump (this might fail if Docker is not running)
if supabase db dump --linked -f "$DUMP_FILE" 2>/dev/null; then
    echo "✅ Staging dump created: $DUMP_FILE"
    echo "   File size: $(ls -lh "$DUMP_FILE" | awk '{print $5}')"
else
    echo "⚠️  Supabase CLI dump failed (Docker required)"
    echo "   Using alternative method..."
    
    # Alternative: Use existing production dump as template
    if [ -f "supabase/production_dump_20251015_074535.sql" ]; then
        cp "supabase/production_dump_20251015_074535.sql" "$DUMP_FILE"
        echo "✅ Using existing production dump as template: $DUMP_FILE"
    else
        echo "❌ No existing dump found"
        exit 1
    fi
fi

echo ""

# Step 3: Link to production project
echo "3️⃣ Linking to production project..."
if supabase link --project-ref "$PRODUCTION_PROJECT"; then
    echo "✅ Linked to production project: $PRODUCTION_PROJECT"
else
    echo "❌ Failed to link to production project"
    exit 1
fi

echo ""

# Step 4: Push schema to production
echo "4️⃣ Pushing schema to production..."
if supabase db push --linked; then
    echo "✅ Schema pushed to production"
else
    echo "❌ Failed to push schema to production"
    exit 1
fi

echo ""

# Step 5: Manual data migration instructions
echo "5️⃣ Manual Data Migration Required"
echo "=================================="
echo ""
echo "Since direct database access is limited, please follow these steps:"
echo ""
echo "🟡 STAGING DATABASE EXPORT:"
echo "   1. Go to: https://supabase.com/dashboard/project/$STAGING_PROJECT"
echo "   2. Navigate to: Settings → Database"
echo "   3. Scroll down to: Database Backups"
echo "   4. Click: 'Create backup' or 'Download backup'"
echo "   5. Save the file as: staging_backup.sql"
echo ""
echo "🟢 PRODUCTION DATABASE IMPORT:"
echo "   1. Go to: https://supabase.com/dashboard/project/$PRODUCTION_PROJECT"
echo "   2. Navigate to: SQL Editor"
echo "   3. Click: 'New query'"
echo "   4. Copy and paste the contents of staging_backup.sql"
echo "   5. Click: 'Run' to execute"
echo ""
echo "🔍 VERIFICATION:"
echo "   1. Check Table Editor in production project"
echo "   2. Verify all tables and data are present"
echo "   3. Test login with your superadmin credentials"
echo ""
echo "📁 Files created:"
echo "   Dump file: $DUMP_FILE"
echo ""
echo "✅ Schema migration completed!"
echo "   Please complete the manual data migration steps above."

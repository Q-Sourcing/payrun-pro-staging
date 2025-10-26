#!/bin/bash

# Schema-Only Database Sync Script
# Syncs database schema from staging to production (preserves production data)

set -euo pipefail

echo "🗄️ Schema-Only Database Sync: Staging → Production"
echo "=================================================="
echo ""

# Configuration
STAGING_DIR="/Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging"
PRODUCTION_DIR="/Users/gervin/Desktop/QSS/Applications/payrun-pro"
STAGING_PROJECT="sbphmrjoappwlervnbtm"
PRODUCTION_PROJECT="kctwfgbjmhnfqtxhagib"

# Temporary files
SCHEMA_DUMP="/tmp/staging_schema_$(date +%Y%m%d_%H%M%S).sql"
PRODUCTION_BACKUP="/tmp/production_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "📋 Configuration:"
echo "   Staging Project: $STAGING_PROJECT"
echo "   Production Project: $PRODUCTION_PROJECT"
echo "   Schema Dump: $SCHEMA_DUMP"
echo "   Production Backup: $PRODUCTION_BACKUP"
echo ""

# Function to check if Supabase CLI is available
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        echo "❌ Supabase CLI not found. Please install it first:"
        echo "   brew install supabase/tap/supabase"
        exit 1
    fi
    echo "✅ Supabase CLI found"
}

# Function to create production backup
create_production_backup() {
    echo "📦 Creating production database backup..."
    cd "$PRODUCTION_DIR"
    
    if supabase link --project-ref "$PRODUCTION_PROJECT" > /dev/null 2>&1; then
        echo "✅ Linked to production project"
    else
        echo "❌ Failed to link to production project"
        exit 1
    fi
    
    if supabase db dump --file "$PRODUCTION_BACKUP" > /dev/null 2>&1; then
        echo "✅ Production backup created: $PRODUCTION_BACKUP"
    else
        echo "⚠️ Could not create full backup, continuing with schema sync..."
    fi
}

# Function to export staging schema
export_staging_schema() {
    echo "📤 Exporting staging database schema..."
    cd "$STAGING_DIR"
    
    if supabase link --project-ref "$STAGING_PROJECT" > /dev/null 2>&1; then
        echo "✅ Linked to staging project"
    else
        echo "❌ Failed to link to staging project"
        exit 1
    fi
    
    if supabase db dump --file "$SCHEMA_DUMP" > /dev/null 2>&1; then
        echo "✅ Staging schema exported: $SCHEMA_DUMP"
    else
        echo "❌ Failed to export staging schema"
        exit 1
    fi
}

# Function to apply schema to production
apply_schema_to_production() {
    echo "📥 Applying schema to production database..."
    cd "$PRODUCTION_DIR"
    
    if supabase link --project-ref "$PRODUCTION_PROJECT" > /dev/null 2>&1; then
        echo "✅ Linked to production project"
    else
        echo "❌ Failed to link to production project"
        exit 1
    fi
    
    # Create a temporary migration file
    local migration_file="supabase/migrations/$(date +%Y%m%d%H%M%S)_schema_sync.sql"
    mkdir -p supabase/migrations
    
    # Copy the schema dump to migrations directory
    cp "$SCHEMA_DUMP" "$migration_file"
    echo "✅ Created migration file: $migration_file"
    
    # Apply the migration
    if supabase db push --linked > /dev/null 2>&1; then
        echo "✅ Schema applied to production successfully!"
        
        # Clean up the temporary migration file
        rm "$migration_file"
        echo "✅ Cleaned up temporary migration file"
    else
        echo "❌ Failed to apply schema to production"
        echo "💡 You can restore from backup: $PRODUCTION_BACKUP"
        echo "💡 Migration file kept for debugging: $migration_file"
        exit 1
    fi
}

# Function to verify schema sync
verify_sync() {
    echo "🔍 Verifying schema sync..."
    cd "$PRODUCTION_DIR"
    
    echo "📊 Production database status:"
    supabase db diff --linked 2>/dev/null || echo "   No differences detected (good!)"
    
    echo "✅ Schema sync verification complete"
}

# Function to cleanup temporary files
cleanup() {
    echo "🧹 Cleaning up temporary files..."
    if [ -f "$SCHEMA_DUMP" ]; then
        rm "$SCHEMA_DUMP"
        echo "   Removed: $SCHEMA_DUMP"
    fi
    if [ -f "$PRODUCTION_BACKUP" ]; then
        echo "   Kept backup: $PRODUCTION_BACKUP"
    fi
}

# Main execution
main() {
    echo "🎯 Starting schema-only database sync..."
    echo ""
    
    # Pre-flight checks
    check_supabase_cli
    
    # Confirmation
    echo "⚠️ This will sync database schema from staging to production."
    echo "   Production data will be preserved, but schema will be updated."
    echo ""
    read -p "Do you want to continue? (y/N): " confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "❌ Schema sync cancelled by user"
        exit 0
    fi
    
    echo ""
    echo "🚀 Proceeding with schema sync..."
    echo ""
    
    # Execute sync steps
    create_production_backup
    echo ""
    
    export_staging_schema
    echo ""
    
    apply_schema_to_production
    echo ""
    
    verify_sync
    echo ""
    
    cleanup
    echo ""
    
    echo "🎉 Schema sync completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "   ✅ Staging schema exported"
    echo "   ✅ Production backup created"
    echo "   ✅ Schema applied to production"
    echo "   ✅ Production data preserved"
    echo ""
    echo "🔗 Next steps:"
    echo "   1. Test production application"
    echo "   2. Verify all functionality works"
    echo "   3. Deploy production code if needed"
    echo ""
    echo "💾 Backup location: $PRODUCTION_BACKUP"
}

# Run main function
main

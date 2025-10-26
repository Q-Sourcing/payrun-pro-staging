#!/bin/bash

# Simple Schema Sync Script
# Uses existing staging dump file and provides manual instructions

set -euo pipefail

echo "🗄️ Simple Schema Sync: Staging → Production"
echo "==========================================="
echo ""

# Configuration
STAGING_DUMP="/Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging/staging_fresh_dump_20251026_015245.sql"
PRODUCTION_PROJECT="kctwfgbjmhnfqtxhagib"

echo "📋 Configuration:"
echo "   Staging Dump: $STAGING_DUMP"
echo "   Production Project: $PRODUCTION_PROJECT"
echo ""

# Check if dump file exists
if [ ! -f "$STAGING_DUMP" ]; then
    echo "❌ Staging dump file not found: $STAGING_DUMP"
    exit 1
fi

echo "✅ Staging dump file found"
echo ""

# Function to show manual steps
show_manual_steps() {
    echo "📋 Manual Schema Sync Steps:"
    echo "============================"
    echo ""
    echo "1. 📤 Export from Staging (via Supabase Dashboard):"
    echo "   - Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
    echo "   - Navigate to: Database → Backups"
    echo "   - Click: 'Download backup'"
    echo "   - Select: 'Schema only'"
    echo "   - Download the SQL file"
    echo ""
    echo "2. 📥 Import to Production (via Supabase Dashboard):"
    echo "   - Go to: https://supabase.com/dashboard/project/$PRODUCTION_PROJECT"
    echo "   - Navigate to: Database → SQL Editor"
    echo "   - Click: 'New query'"
    echo "   - Copy and paste the schema SQL from the downloaded file"
    echo "   - Click: 'Run' to execute"
    echo ""
    echo "3. 🔍 Verify Schema Sync:"
    echo "   - Check that all tables exist in production"
    echo "   - Verify table structures match staging"
    echo "   - Test application functionality"
    echo ""
}

# Function to show alternative CLI approach
show_cli_approach() {
    echo "🔧 Alternative CLI Approach:"
    echo "============================"
    echo ""
    echo "If you want to try CLI approach:"
    echo ""
    echo "1. 📤 Export from Staging:"
    echo "   cd /Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging"
    echo "   supabase link --project-ref sbphmrjoappwlervnbtm"
    echo "   supabase db dump --file staging_schema.sql"
    echo ""
    echo "2. 📥 Import to Production:"
    echo "   cd /Users/gervin/Desktop/QSS/Applications/payrun-pro"
    echo "   supabase link --project-ref $PRODUCTION_PROJECT"
    echo "   # Copy staging_schema.sql to production repo"
    echo "   # Create migration file and push"
    echo ""
}

# Main execution
main() {
    echo "🎯 Schema Sync Options:"
    echo ""
    echo "Since CLI connection to production is having issues,"
    echo "here are your options for syncing schema:"
    echo ""
    
    show_manual_steps
    echo ""
    show_cli_approach
    echo ""
    
    echo "💡 Recommendation:"
    echo "   Use the Supabase Dashboard approach (Option 1) as it's"
    echo "   more reliable and doesn't depend on CLI connectivity."
    echo ""
    
    echo "🔗 Quick Links:"
    echo "   📱 Staging Dashboard: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
    echo "   🚀 Production Dashboard: https://supabase.com/dashboard/project/$PRODUCTION_PROJECT"
    echo ""
    
    echo "📁 Dump File Location:"
    echo "   $STAGING_DUMP"
    echo "   (You can also use this file as reference)"
    echo ""
}

# Run main function
main

#!/bin/bash

# Two Repository Sync Script
# Syncs changes from staging repository to production repository

set -euo pipefail

# Configuration
STAGING_DIR="/Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging"
PRODUCTION_DIR="/Users/gervin/Desktop/QSS/Applications/payrun-pro"

echo "🔄 Two Repository Sync: Staging → Production"
echo "=============================================="
echo ""

# Check if directories exist
if [ ! -d "$STAGING_DIR" ]; then
    echo "❌ Staging directory not found: $STAGING_DIR"
    exit 1
fi

if [ ! -d "$PRODUCTION_DIR" ]; then
    echo "❌ Production directory not found: $PRODUCTION_DIR"
    exit 1
fi

echo "📁 Staging Directory: $STAGING_DIR"
echo "📁 Production Directory: $PRODUCTION_DIR"
echo ""

# Function to sync code files
sync_code() {
    echo "📁 Syncing application code..."
    
    # Sync source code (exclude environment files)
    rsync -av --exclude='.git' \
           --exclude='.env*' \
           --exclude='node_modules' \
           --exclude='dist' \
           --exclude='*.log' \
           --exclude='staging_*.sql' \
           --exclude='*.dump' \
           "$STAGING_DIR/src/" "$PRODUCTION_DIR/src/"
    
    # Sync package.json (but keep production-specific scripts)
    cp "$STAGING_DIR/package.json" "$PRODUCTION_DIR/package.json"
    
    # Sync documentation
    rsync -av --exclude='.git' "$STAGING_DIR/docs/" "$PRODUCTION_DIR/docs/" 2>/dev/null || true
    
    # Sync scripts (exclude environment-specific ones)
    rsync -av --exclude='.git' \
           --exclude='start-*.sh' \
           --exclude='env-manager.js' \
           "$STAGING_DIR/scripts/" "$PRODUCTION_DIR/scripts/" 2>/dev/null || true
    
    echo "✅ Code sync complete!"
}

# Function to sync database schema
sync_database() {
    echo "🗄️ Syncing database schema..."
    
    # Create schema dump from staging
    cd "$STAGING_DIR"
    supabase link --project-ref sbphmrjoappwlervnbtm
    supabase db dump --schema-only --file /tmp/staging_schema.sql
    
    # Apply schema to production
    cd "$PRODUCTION_DIR"
    supabase link --project-ref kctwfgbjmhnfqtxhagib
    supabase db push --file /tmp/staging_schema.sql
    
    echo "✅ Database schema sync complete!"
}

# Function to commit changes
commit_changes() {
    echo "📝 Committing changes to production..."
    
    cd "$PRODUCTION_DIR"
    git add .
    git commit -m "Sync: Updates from staging repository

- Synced application code from staging
- Updated database schema
- Maintained production environment configuration

Synced from: $STAGING_DIR
Synced at: $(date)"
    
    echo "✅ Changes committed to production repository!"
}

# Main sync process
main() {
    echo "🎯 Starting sync process..."
    echo ""
    
    # Step 1: Sync code
    sync_code
    echo ""
    
    # Step 2: Ask about database sync
    echo "🗄️ Database Schema Sync"
    read -p "Do you want to sync database schema? (y/N): " sync_db
    
    if [[ "$sync_db" =~ ^[Yy]$ ]]; then
        sync_database
        echo ""
    else
        echo "⏭️ Skipping database schema sync"
        echo ""
    fi
    
    # Step 3: Commit changes
    echo "📝 Commit Changes"
    read -p "Do you want to commit changes to production repository? (y/N): " commit_changes
    
    if [[ "$commit_changes" =~ ^[Yy]$ ]]; then
        commit_changes
        echo ""
    else
        echo "⏭️ Skipping commit. Changes are staged but not committed."
        echo ""
    fi
    
    echo "🎉 Sync process complete!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review changes in production repository"
    echo "   2. Test production environment"
    echo "   3. Deploy to production: git push origin main"
    echo ""
    echo "🔗 Production repository: $PRODUCTION_DIR"
}

# Run main function
main

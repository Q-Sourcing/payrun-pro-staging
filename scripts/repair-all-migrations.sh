#!/bin/bash

# ===============================================================
# PAYRUN PRO MIGRATION REPAIR SCRIPT
# ===============================================================
# Purpose: Repair all missing migrations in one go
# Author: Senior Supabase + PostgreSQL Reliability Engineer
# ===============================================================

echo "🔧 Starting PayRun Pro Migration Repair..."
echo "=========================================="

# Array of all missing migration IDs
MISSING_MIGRATIONS=(
    "20251005130000"
    "20251005134256"
    "20251005134921"
    "20251005135013"
    "20251005135104"
    "20251005140000"
    "20251005150000"
    "20251005160000"
    "20251011084337"
    "20251014154911"
    "20251014_backfill_paygroup_ids"
    "20251014_configurable_unique_paygroup_assignment"
    "20251014_simplified_paygroup_assignment"
)

echo "📋 Found ${#MISSING_MIGRATIONS[@]} migrations to repair..."

# Repair each migration
for migration in "${MISSING_MIGRATIONS[@]}"; do
    echo "🔧 Repairing migration: $migration"
    if supabase migration repair --status applied "$migration"; then
        echo "✅ Successfully repaired: $migration"
    else
        echo "❌ Failed to repair: $migration"
        echo "⚠️ Continuing with next migration..."
    fi
    echo ""
done

echo "🎯 Migration repair complete!"
echo "📊 Checking final migration status..."

# Show final migration list
supabase migration list

echo ""
echo "✅ All done! Your migration history should now be synchronized."
echo "🚀 You can now run 'supabase db push' to apply any remaining changes."

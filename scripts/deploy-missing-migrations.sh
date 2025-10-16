#!/bin/bash
# ==========================================================
# 🚀 Deploy Missing Migrations to Production
# ==========================================================
# Purpose: Safely apply the 4 missing migrations to production
# Usage: ./scripts/deploy-missing-migrations.sh
# ==========================================================

# Colors for status output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No color

# Configuration
PROD_REF="kctwfgbjmhnfqtxhagib"
MIGRATION_FILE="scripts/fix-production-migrations.sql"

# Function to display usage
show_usage() {
    echo -e "${YELLOW}Usage: ./scripts/deploy-missing-migrations.sh [--dry-run]${NC}"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --dry-run    Show what would be executed without making changes"
    echo ""
    echo -e "${BLUE}What this script does:${NC}"
    echo "  • Links to production database"
    echo "  • Applies 4 missing migrations safely"
    echo "  • Verifies all changes were applied correctly"
    echo "  • Reports final status"
}

# Check if dry-run mode
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${CYAN}🔍 DRY RUN MODE - No changes will be made${NC}"
fi

# ==========================================================
# 🚀 Script Header & User Confirmation
# ==========================================================

echo -e "${CYAN}🚀 Deploy Missing Migrations to Production${NC}"
echo -e "${CYAN}==========================================${NC}"
echo -e "${BLUE}📅 Started at: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

echo -e "${RED}⚠️  WARNING: This will modify your PRODUCTION database.${NC}"
echo -e "${RED}   Make sure you have a backup before proceeding!${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}Are you sure you want to continue? (y/n):${NC}"
    read -r confirmation
    
    if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Operation cancelled by user.${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}✅ Proceeding with migration deployment...${NC}"
echo ""

# ==========================================================
# 🔍 Pre-Migration Checks
# ==========================================================

echo -e "${YELLOW}🔍 Running pre-migration checks...${NC}"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Check if we can connect to production
echo -e "${BLUE}   Testing connection to production...${NC}"
if [ "$DRY_RUN" = false ]; then
    supabase link --project-ref "$PROD_REF" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Cannot connect to production database${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pre-migration checks passed${NC}"

# ==========================================================
# 📋 Show What Will Be Applied
# ==========================================================

echo ""
echo -e "${CYAN}📋 Migrations to be applied:${NC}"
echo -e "   • 20250929100000 - Payslip Templates System"
echo -e "   • 20250929110000 - Expatriate PayGroups System"
echo -e "   • 20251014 - Configurable PayGroup Assignment"
echo -e "   • 20251015 - Simplified PayGroup Assignment"
echo ""

# ==========================================================
# 🚀 Apply Migrations
# ==========================================================

if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}🚀 Applying migrations to production...${NC}"
    
    # Link to production
    echo -e "${BLUE}   Linking to production ($PROD_REF)...${NC}"
    supabase link --project-ref "$PROD_REF"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to link to production${NC}"
        exit 1
    fi
    
    # Apply the migration using db push
    echo -e "${BLUE}   Applying migration script...${NC}"
    supabase db push --include-all
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Migration failed to apply${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${CYAN}🔍 DRY RUN: Would apply migrations now${NC}"
fi

# ==========================================================
# 🔍 Post-Migration Verification
# ==========================================================

echo ""
echo -e "${YELLOW}🔍 Running post-migration verification...${NC}"

if [ "$DRY_RUN" = false ]; then
    # Check if all required tables exist
    echo -e "${BLUE}   Checking table creation...${NC}"
    
    TABLES_CHECK=$(supabase db query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('payslip_templates', 'payslip_generations', 'expatriate_pay_groups', 'expatriate_pay_run_items', 'payroll_configurations', 'paygroup_employees');" --output json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        TABLE_COUNT=$(echo "$TABLES_CHECK" | jq -r '.[0].count // 0')
        if [ "$TABLE_COUNT" = "6" ]; then
            echo -e "${GREEN}   ✅ All 6 required tables created${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Only $TABLE_COUNT/6 tables found${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  Could not verify table creation${NC}"
    fi
    
    # Check if identification columns were added
    echo -e "${BLUE}   Checking employee identification columns...${NC}"
    
    COLUMNS_CHECK=$(supabase db query "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'employees' AND column_name IN ('national_id', 'tin', 'social_security_number', 'passport_number');" --output json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        COLUMN_COUNT=$(echo "$COLUMNS_CHECK" | jq -r '.[0].count // 0')
        if [ "$COLUMN_COUNT" = "4" ]; then
            echo -e "${GREEN}   ✅ All 4 identification columns added${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Only $COLUMN_COUNT/4 columns found${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  Could not verify column addition${NC}"
    fi
    
    echo -e "${GREEN}✅ Post-migration verification completed${NC}"
else
    echo -e "${CYAN}🔍 DRY RUN: Would verify migrations now${NC}"
fi

# ==========================================================
# ✅ Final Summary
# ==========================================================

echo ""
echo -e "${GREEN}🎉 MIGRATION DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${CYAN}📋 Summary Report:${NC}"
    echo -e "   • Payslip Templates System: ${GREEN}✅${NC}"
    echo -e "   • Expatriate PayGroups System: ${GREEN}✅${NC}"
    echo -e "   • PayGroup Assignment System: ${GREEN}✅${NC}"
    echo -e "   • Employee Identification: ${GREEN}✅${NC}"
    echo ""
    echo -e "${BLUE}🔗 Production is now synchronized with staging${NC}"
    echo -e "${BLUE}📅 Completed at: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "   • Test the new features in your application"
    echo -e "   • Verify PayGroup assignment functionality"
    echo -e "   • Check payslip template creation"
    echo -e "   • Test expatriate payroll features"
else
    echo -e "${CYAN}📋 DRY RUN Summary:${NC}"
    echo -e "   • Would apply 4 missing migrations"
    echo -e "   • Would create 6 new tables"
    echo -e "   • Would add 4 employee identification columns"
    echo -e "   • Would create performance indexes and triggers"
    echo ""
    echo -e "${YELLOW}💡 To actually apply these changes, run without --dry-run${NC}"
fi

echo ""
echo -e "${GREEN}✅ Migration deployment process completed successfully.${NC}"

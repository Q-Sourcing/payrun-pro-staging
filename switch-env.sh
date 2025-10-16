#!/bin/bash

# Q-Payroll Environment Switcher
# This script allows you to easily switch between staging and production Supabase environments
# Usage: ./switch-env.sh [staging|prod]

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
show_usage() {
    echo -e "${YELLOW}Usage: ./switch-env.sh [staging|prod]${NC}"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./switch-env.sh staging  # Switch to staging environment"
    echo "  ./switch-env.sh prod     # Switch to production environment"
    echo ""
    echo -e "${BLUE}Current environment files:${NC}"
    if [ -f "supabase/config.staging.toml" ]; then
        echo -e "  ✅ supabase/config.staging.toml (sbphmrjoappwlervnbtm)"
    else
        echo -e "  ❌ supabase/config.staging.toml (missing)"
    fi
    
    if [ -f "supabase/config.production.toml" ]; then
        echo -e "  ✅ supabase/config.production.toml (kctwfgbjmhnfqtxhagib)"
    else
        echo -e "  ❌ supabase/config.production.toml (missing)"
    fi
}

# Check if argument is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No environment specified${NC}"
    show_usage
    exit 1
fi

# Switch to staging environment
if [ "$1" = "staging" ]; then
    if [ ! -f "supabase/config.staging.toml" ]; then
        echo -e "${RED}❌ Error: supabase/config.staging.toml not found${NC}"
        exit 1
    fi
    
    cp supabase/config.staging.toml supabase/config.toml
    echo -e "${GREEN}✅ Switched to STAGING environment${NC}"
    echo -e "${BLUE}📋 Project ID: sbphmrjoappwlervnbtm${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "  npm run link:staging    # Link to staging project"
    echo "  npm run push:staging    # Push migrations to staging"
    echo "  npm run diff:staging    # Check schema differences"

# Switch to production environment
elif [ "$1" = "prod" ]; then
    if [ ! -f "supabase/config.production.toml" ]; then
        echo -e "${RED}❌ Error: supabase/config.production.toml not found${NC}"
        exit 1
    fi
    
    cp supabase/config.production.toml supabase/config.toml
    echo -e "${GREEN}🚀 Switched to PRODUCTION environment${NC}"
    echo -e "${RED}⚠️  WARNING: This is your LIVE payroll system!${NC}"
    echo -e "${BLUE}📋 Project ID: kctwfgbjmhnfqtxhagib${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "  npm run link:prod       # Link to production project"
    echo "  npm run push:prod       # Push migrations to production"
    echo "  npm run diff:prod       # Check schema differences"

# Invalid argument
else
    echo -e "${RED}❌ Error: Invalid environment '$1'${NC}"
    show_usage
    exit 1
fi

# Verify the switch was successful
echo ""
echo -e "${BLUE}🔍 Verifying environment switch...${NC}"
if [ -f "supabase/config.toml" ]; then
    CURRENT_PROJECT=$(grep "project_id" supabase/config.toml | cut -d'"' -f2)
    if [ "$CURRENT_PROJECT" = "sbphmrjoappwlervnbtm" ]; then
        echo -e "${GREEN}✅ Active environment: STAGING${NC}"
    elif [ "$CURRENT_PROJECT" = "kctwfgbjmhnfqtxhagib" ]; then
        echo -e "${GREEN}✅ Active environment: PRODUCTION${NC}"
    else
        echo -e "${YELLOW}⚠️  Unknown project ID: $CURRENT_PROJECT${NC}"
    fi
else
    echo -e "${RED}❌ Error: supabase/config.toml not found${NC}"
fi

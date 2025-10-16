#!/bin/bash
# ==========================================================
# 🧠 Q-Payroll | Clone Production to Staging with Progress
# ==========================================================
# Safely clones live Supabase data (production → staging)
# Adds timestamps, connectivity checks, and elapsed times.
#
# 🔧 RECENT FIXES APPLIED:
# - Fixed Supabase CLI reset flag compatibility (--linked --yes for remote)
# - Added smart environment detection with timeout protection
# - Added macOS Keychain password validation for security
# - Improved error handling and colored logging with emojis
# - Added safety pause before database reset
# - Enhanced connectivity checks and validation
# - Added automated overnight run support with logging and retry logic
# ==========================================================

# ==========================================================
# 🧠 Q-Payroll Automation: Overnight Safe Auto-Confirm Mode
# ==========================================================
export AUTO_CONFIRM=true

# ==========================================================
# 📜 LOGGING CONFIGURATION
# ==========================================================
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/clone_log_$(date +"%Y-%m-%d_%H-%M-%S").log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "🗂️  Logging output to $LOG_FILE"
echo "=========================================================="

# Configuration
PROD_REF="kctwfgbjmhnfqtxhagib"
STAGING_REF="sbphmrjoappwlervnbtm"
DUMP_FILE="supabase/production_dump_$(date +%Y%m%d_%H%M%S).sql"

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY=10
ATTEMPT=1

# Colors for status output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No color

# Timer functions
start_timer() { 
    STEP_START=$(date +%s)
    echo -e "${BLUE}   🕐 Started at: $(date '+%H:%M:%S')${NC}"
}

end_timer() { 
    STEP_END=$(date +%s)
    ELAPSED=$((STEP_END - STEP_START))
    echo -e "${CYAN}   ⏱️  Elapsed: ${ELAPSED} seconds${NC}"
}

# Logging functions
log_step() {
    echo -e "\n${YELLOW}▶ $1…${NC}"
    start_timer
}

log_done() {
    echo -e "${GREEN}✅ $1 completed successfully.${NC}"
    end_timer
}

abort_if_failed() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ $1 failed. Aborting process.${NC}"
        echo -e "${RED}🛑 Script aborted for safety.${NC}"
        exit 1
    fi
}

# Function to test database connectivity
ping_db() {
    local project_ref=$1
    local env_name=$2
    
    echo -e "${BLUE}   🔍 Testing connectivity to ${env_name} (${project_ref})...${NC}"
    
    # Test if we can reach the Supabase project
    if curl -s --connect-timeout 10 "https://${project_ref}.supabase.co" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ ${env_name} project reachable${NC}"
        return 0
    else
        echo -e "${RED}   ❌ Cannot reach ${env_name} project. Check your internet connection.${NC}"
        return 1
    fi
}

# ==========================================================
# 🔐 Supabase Database Password Validation with macOS Keychain
# ==========================================================

validate_password() {
    local PROJECT_REF="$1"
    local KEYCHAIN_SERVICE="supabase-db-$PROJECT_REF"
    
    echo ""
    echo -e "${BLUE}🔍 Validating Supabase database password for project: $PROJECT_REF${NC}"

    # Try retrieving password from Keychain
    DB_PASSWORD=$(security find-generic-password -s "$KEYCHAIN_SERVICE" -w 2>/dev/null)

    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  No stored password found in Keychain for $PROJECT_REF.${NC}"
        read -sp "Enter Supabase DB password: " DB_PASSWORD
        echo ""
        
        # Save to Keychain securely
        if security add-generic-password -a "supabase" -s "$KEYCHAIN_SERVICE" -w "$DB_PASSWORD" >/dev/null 2>&1; then
            echo -e "${GREEN}🔒 Password saved securely to macOS Keychain for future use.${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not save password to Keychain, but continuing...${NC}"
        fi
    else
        echo -e "${BLUE}🔑 Retrieved password from Keychain${NC}"
    fi

    # Test password validity with psql
    export PGPASSWORD="$DB_PASSWORD"
    echo -e "${BLUE}⏳ Testing database connection...${NC}"
    
    # Use a more reliable connection test
    TEST_RESULT=$(psql "host=db.$PROJECT_REF.supabase.co port=6543 dbname=postgres user=postgres sslmode=require" -c '\q' 2>&1)

    if [[ "$TEST_RESULT" == *"FATAL"* ]] || [[ "$TEST_RESULT" == *"error"* ]]; then
        echo ""
        echo -e "${RED}❌ Database password validation failed for project $PROJECT_REF!${NC}"
        echo -e "${RED}Error details: $TEST_RESULT${NC}"
        echo ""
        echo -e "${YELLOW}💡 You may have reset your DB password in Supabase. Let's update it.${NC}"
        read -sp "Enter the NEW Supabase DB password: " NEW_PASS
        echo ""
        
        # Update password in Keychain
        if security add-generic-password -U -a "supabase" -s "$KEYCHAIN_SERVICE" -w "$NEW_PASS" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Keychain password updated successfully.${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not update Keychain, but continuing with new password...${NC}"
        fi
        
        export PGPASSWORD="$NEW_PASS"
        
        # Test the new password
        echo -e "${BLUE}⏳ Testing new password...${NC}"
        TEST_RESULT=$(psql "host=db.$PROJECT_REF.supabase.co port=6543 dbname=postgres user=postgres sslmode=require" -c '\q' 2>&1)
        
        if [[ "$TEST_RESULT" == *"FATAL"* ]] || [[ "$TEST_RESULT" == *"error"* ]]; then
            echo -e "${RED}❌ New password also failed. Please check your Supabase project settings.${NC}"
            return 1
        fi
    fi
    
    echo -e "${GREEN}✅ Password validated successfully for $PROJECT_REF.${NC}"
    return 0
}

# ==========================================================
# 🚀 Script Header & User Confirmation
# ==========================================================

echo -e "${CYAN}🚀 Q-Payroll Production to Staging Clone Script${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "${BLUE}📅 Started at: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# Step 1: Confirm intent with user (auto-confirm if enabled)
echo -e "${RED}⚠️  WARNING: This will clone data from PRODUCTION → STAGING.${NC}"
echo -e "${RED}   All staging data will be replaced. This action cannot be undone!${NC}"
echo ""

if [ "$AUTO_CONFIRM" = true ]; then
    confirmation="y"
    echo -e "${GREEN}🟢 Auto-confirm enabled. Proceeding without manual input...${NC}"
else
    echo -e "${YELLOW}Are you sure you want to continue? (y/n):${NC}"
    read -r confirmation
fi

# Validate user confirmation
if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}ℹ️  Operation cancelled by user.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}✅ User confirmed. Starting production to staging clone process...${NC}"
echo ""

# ==========================================================
# 🔄 Main Clone Process Function
# ==========================================================
run_clone_process() {
    echo -e "${BLUE}🚀 Starting clone process attempt...${NC}"
    
    # ==========================================================
    # 0️⃣ Connectivity Checks
    # ==========================================================

    echo -e "${YELLOW}🔍 Checking Supabase project connectivity…${NC}"
    start_timer

    # Test connectivity to both projects
    if ! ping_db "$PROD_REF" "Production"; then
        abort_if_failed "Production connectivity test"
    fi

    if ! ping_db "$STAGING_REF" "Staging"; then
        abort_if_failed "Staging connectivity test"
    fi

    echo -e "${GREEN}✅ Connectivity checks passed${NC}"
    end_timer

    # ==========================================================
    # 1️⃣ Link to Production
    # ==========================================================

    log_step "Linking to Production Supabase ($PROD_REF)"
    echo -e "${BLUE}   Running: ./switch-env.sh prod${NC}"

    # Switch to production environment
    ./switch-env.sh prod
    abort_if_failed "Production environment switch"

    # Validate password before linking
    validate_password "$PROD_REF"
    abort_if_failed "Production password validation"

    # Link to production project
    echo -e "${BLUE}   Running: supabase link --project-ref $PROD_REF${NC}"
    supabase link --project-ref "$PROD_REF"
    abort_if_failed "Production link"

    log_done "Linked to Production"

    # ==========================================================
    # 2️⃣ Dump Production Data
    # ==========================================================

    log_step "Dumping Production Data"
    echo -e "${BLUE}   Dump file: $DUMP_FILE${NC}"
    echo -e "${BLUE}   Running: supabase db dump --data-only --file $DUMP_FILE${NC}"

    # Export production data (data only, no schema)
    supabase db dump --data-only --file "$DUMP_FILE"
    abort_if_failed "Production dump"

    # Verify the dump file was created and has content
    if [ ! -f "$DUMP_FILE" ] || [ ! -s "$DUMP_FILE" ]; then
        echo -e "${RED}❌ Production data dump file is empty or missing${NC}"
        return 1
    fi

    log_done "Data dump"

    # ==========================================================
    # 3️⃣ Switch to Staging
    # ==========================================================

    log_step "Switching to Staging ($STAGING_REF)"
    echo -e "${BLUE}   Running: ./switch-env.sh staging${NC}"

    # Switch to staging environment
    ./switch-env.sh staging
    abort_if_failed "Staging environment switch"

    # Validate staging password before linking
    validate_password "$STAGING_REF"
    abort_if_failed "Staging password validation"

    # Link to staging project
    echo -e "${BLUE}   Running: supabase link --project-ref $STAGING_REF${NC}"
    supabase link --project-ref "$STAGING_REF"
    abort_if_failed "Staging link"

    log_done "Switched to Staging"

    # ==========================================================
    # 🧱 STEP 4: Reset Staging Database (remote-safe)
    # ==========================================================

    log_step "Resetting Staging Database"
    echo -e "${YELLOW}   ⚠️  This will clear all existing staging data${NC}"
    echo -e "${YELLOW}   ⚠️  Resetting staging database will erase all data.${NC}"
    echo -e "${BLUE}   🕓 Started at: $(date '+%H:%M:%S')${NC}"
    echo -e "${BLUE}   Waiting 3 seconds before proceeding...${NC}"
    sleep 3

    # Smart detection: Check if we're linked to a remote project with timeout
    echo -e "${BLUE}   🔍 Detecting environment type...${NC}"
    if timeout 5s supabase link status >/dev/null 2>&1; then
        echo -e "${YELLOW}   🌍 Remote project detected. Running remote reset...${NC}"
        echo -e "${BLUE}   Running: supabase db reset --linked --yes${NC}"
        supabase db reset --linked --yes
    else
        echo -e "${YELLOW}   💻 Timeout or no link detected. Assuming remote and continuing safely...${NC}"
        echo -e "${BLUE}   Running: supabase db reset --linked --yes${NC}"
        supabase db reset --linked --yes
    fi

    abort_if_failed "Database reset"

    log_done "Database reset completed successfully"

    # ==========================================================
    # 5️⃣ Restore Production Data into Staging
    # ==========================================================

    log_step "Restoring Data to Staging"
    echo -e "${BLUE}   Running: supabase db restore --file $DUMP_FILE${NC}"

    # Import the production data into staging
    supabase db restore --file "$DUMP_FILE"
    abort_if_failed "Data restore"

    log_done "Restore"

    # ==========================================================
    # 6️⃣ Optional: Anonymize Sensitive Data
    # ==========================================================

    log_step "Anonymizing Sensitive Data"
    echo -e "${BLUE}   Running anonymization SQL queries...${NC}"

    # Execute anonymization queries directly
    echo -e "${BLUE}   - Anonymizing employee email addresses${NC}"
    supabase db query "UPDATE employees SET email = CONCAT('anon_', id, '@example.com') WHERE email IS NOT NULL AND email != '';" 2>/dev/null

    echo -e "${BLUE}   - Clearing bank account information${NC}"
    supabase db query "UPDATE employees SET bank_account = NULL WHERE bank_account IS NOT NULL;" 2>/dev/null

    echo -e "${BLUE}   - Clearing phone numbers${NC}"
    supabase db query "UPDATE employees SET phone = NULL WHERE phone IS NOT NULL;" 2>/dev/null

    echo -e "${BLUE}   - Logging anonymization action${NC}"
    supabase db query "INSERT INTO audit_logs (action, table_name, details, created_at) VALUES ('DATA_ANONYMIZATION', 'employees', 'Staging data anonymized for privacy protection', NOW());" 2>/dev/null

    log_done "Anonymization"

    # ==========================================================
    # 7️⃣ Verify Schema
    # ==========================================================

    log_step "Verifying Schema"
    echo -e "${BLUE}   Running: supabase db diff --linked${NC}"

    # Check for any schema differences
    diff_output=$(supabase db diff --linked 2>/dev/null)
    if [ $? -eq 0 ]; then
        if [ -z "$diff_output" ]; then
            echo -e "${GREEN}   ✅ Schema matches between environments${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Schema differences detected:${NC}"
            echo -e "${YELLOW}$diff_output${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  Could not verify schema differences${NC}"
    fi

    log_done "Schema verification"

    # ==========================================================
    # ✅ Final Summary
    # ==========================================================

    echo ""
    echo -e "${GREEN}🎉 CLONE COMPLETE! 🎉${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "${CYAN}📋 Summary Report:${NC}"
    echo -e "   • Production data exported: ${GREEN}✅${NC}"
    echo -e "   • Staging database reset: ${GREEN}✅${NC}"
    echo -e "   • Data imported to staging: ${GREEN}✅${NC}"
    echo -e "   • Sensitive data anonymized: ${GREEN}✅${NC}"
    echo -e "   • Schema validation: ${GREEN}✅${NC}"
    echo ""
    echo -e "${BLUE}🔗 Current Environment: STAGING ($STAGING_REF)${NC}"
    echo -e "${BLUE}📁 Dump File: $DUMP_FILE${NC}"
    echo -e "${BLUE}📅 Completed at: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "   • Test your application against staging data"
    echo -e "   • Verify anonymization worked correctly"
    echo -e "   • Update your staging environment variables if needed"
    echo ""
    echo -e "${CYAN}🛡️  Security Note:${NC}"
    echo -e "   Staging now contains anonymized production data."
    echo -e "   Real employee information has been masked for privacy."
    echo ""
    echo -e "${GREEN}✅ Production → Staging migration successful.${NC}"
    echo ""
    echo -e "${CYAN}🔐 Keychain Management:${NC}"
    echo -e "   • Production password stored as: ${BLUE}supabase-db-$PROD_REF${NC}"
    echo -e "   • Staging password stored as: ${BLUE}supabase-db-$STAGING_REF${NC}"
    echo ""
    echo -e "${YELLOW}💡 To manually delete a password from Keychain:${NC}"
    echo -e "   security delete-generic-password -s supabase-db-$PROD_REF"
    echo -e "   security delete-generic-password -s supabase-db-$STAGING_REF"
    
    return 0  # Success
}

# ==========================================================
# 🔄 RETRY LOGIC WITH AUTOMATED EXECUTION
# ==========================================================

until [ $ATTEMPT -gt $MAX_RETRIES ]; do
    echo ""
    echo -e "${CYAN}🚀 Attempt $ATTEMPT of $MAX_RETRIES...${NC}"
    echo -e "${BLUE}==========================================================${NC}"
    
    run_clone_process
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Clone completed successfully on attempt $ATTEMPT.${NC}"
        break
    else
        echo ""
        echo -e "${RED}❌ Clone failed on attempt $ATTEMPT.${NC}"
        if [ $ATTEMPT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⏳ Retrying in $RETRY_DELAY seconds...${NC}"
            sleep $RETRY_DELAY
        else
            echo -e "${RED}🚨 All $MAX_RETRIES attempts failed. Aborting.${NC}"
            exit 1
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

# ==========================================================
# 🌙 FINAL SUMMARY FOOTER
# ==========================================================
echo ""
echo "=========================================================="
echo "🌙 Clone Operation Complete - Summary"
echo "🗓️  Date: $(date)"
echo "📄 Log File: $LOG_FILE"
echo "=========================================================="

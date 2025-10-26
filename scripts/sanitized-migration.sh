#!/usr/bin/env bash
set -euo pipefail

# ------------- CONFIG -------------
# Replace these connection strings with your staging and production ones.
# Use the format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
STAGING_CONN="postgresql://postgres:vXPamfyygrwnJwoy@sbphmrjoappwlervnbtm.supabase.co:5432/postgres?sslmode=require"
PROD_CONN="postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres?sslmode=require"

# Absolute directory where export files will be placed
OUTDIR="$(pwd)/staging_export_$(date +%Y%m%d%H%M%S)"
mkdir -p "$OUTDIR"

# Superadmin identifier (UUID). Replace with the single superadmin id from staging.
# We'll need to find this first
SUPERADMIN_ID="REPLACE_WITH_SUPERADMIN_UUID"

# Files
SCHEMA_SQL="$OUTDIR/staging_schema.sql"
PROD_BACKUP="$OUTDIR/prod_before_restore.dump"

echo "OUTDIR = $OUTDIR"

# ------------- END CONFIG -------------

echo "0) First, let's find the superadmin UUID from staging..."
echo "Finding superadmin user in staging database..."
psql "$STAGING_CONN" -c "SELECT id, email, role, is_active, created_at FROM auth.users WHERE email LIKE '%admin%' OR role = 'superadmin' LIMIT 5;"

echo ""
echo "Please check the output above and update SUPERADMIN_ID in this script with the correct UUID."
echo "Then re-run this script."
echo ""
echo "If you see the superadmin user above, copy the UUID and update the script."
echo "If no superadmin is found, we'll need to check the users table structure."

# Exit here to allow user to update the SUPERADMIN_ID
exit 0

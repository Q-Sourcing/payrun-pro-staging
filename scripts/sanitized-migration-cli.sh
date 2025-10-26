#!/usr/bin/env bash
set -euo pipefail

# ------------- CONFIG -------------
# Using Supabase CLI approach since direct connections are timing out
STAGING_PROJECT="sbphmrjoappwlervnbtm"
PROD_PROJECT="ftiqmqrjzebibcixpnll"

# Absolute directory where export files will be placed
OUTDIR="$(pwd)/staging_export_$(date +%Y%m%d%H%M%S)"
mkdir -p "$OUTDIR"

# Superadmin identifier (UUID). We'll find this from the staging dump
SUPERADMIN_ID="REPLACE_WITH_SUPERADMIN_UUID"

# Files
SCHEMA_SQL="$OUTDIR/staging_schema.sql"
DATA_SQL="$OUTDIR/staging_data.sql"
PROD_BACKUP="$OUTDIR/prod_before_restore.dump"

echo "OUTDIR = $OUTDIR"

# ------------- END CONFIG -------------

echo "=== SANITIZED MIGRATION USING SUPABASE CLI ==="
echo ""

echo "1) Creating fresh staging dump using Supabase CLI..."
supabase link --project-ref "$STAGING_PROJECT"
supabase db dump --file "$OUTDIR/staging_full_dump.sql"

echo "2) Extracting superadmin UUID from staging dump..."
# Look for superadmin user in the dump file
if grep -q "INSERT INTO auth.users" "$OUTDIR/staging_full_dump.sql"; then
    echo "Found auth.users data in dump. Extracting superadmin..."
    # Extract the first user (likely superadmin) from the dump
    SUPERADMIN_ID=$(grep "INSERT INTO auth.users" "$OUTDIR/staging_full_dump.sql" | head -1 | sed -n "s/.*('\([^']*\)'.*/\1/p")
    echo "Found superadmin UUID: $SUPERADMIN_ID"
else
    echo "No auth.users data found in dump. You'll need to find the superadmin UUID manually."
    echo "Check the Supabase Dashboard: https://supabase.com/dashboard/project/$STAGING_PROJECT"
    echo "Go to Authentication > Users to find the superadmin UUID."
    exit 1
fi

echo "3) Creating schema-only dump..."
supabase db dump --file "$SCHEMA_SQL" --schema-only

echo "4) Creating data-only dump..."
supabase db dump --file "$DATA_SQL" --data-only

echo "5) Creating sanitized data export..."
# Create a sanitized version that only includes superadmin and essential data
cat > "$OUTDIR/sanitized_data.sql" << EOF
-- Sanitized data export for production
-- Only includes superadmin user and essential configuration data

-- Extract only superadmin user from auth.users
$(grep "INSERT INTO auth.users" "$DATA_SQL" | grep "$SUPERADMIN_ID" || echo "-- No superadmin user found")

-- Extract company settings if they exist
$(grep "INSERT INTO public.company_settings" "$DATA_SQL" || echo "-- No company settings found")

-- Extract expatriate policies if they exist
$(grep "INSERT INTO public.expatriate_policies" "$DATA_SQL" || echo "-- No expatriate policies found")

-- Extract profiles for superadmin if they exist
$(grep "INSERT INTO public.profiles" "$DATA_SQL" | grep "$SUPERADMIN_ID" || echo "-- No superadmin profile found")

-- Extract role assignments for superadmin if they exist
$(grep "INSERT INTO public.role_assignments" "$DATA_SQL" | grep "$SUPERADMIN_ID" || echo "-- No superadmin role assignments found")

-- Extract user preferences for superadmin if they exist
$(grep "INSERT INTO public.user_preferences" "$DATA_SQL" | grep "$SUPERADMIN_ID" || echo "-- No superadmin preferences found")
EOF

echo "6) Files created:"
echo "   - Schema: $SCHEMA_SQL"
echo "   - Full data: $DATA_SQL"
echo "   - Sanitized data: $OUTDIR/sanitized_data.sql"
echo "   - Full dump: $OUTDIR/staging_full_dump.sql"

echo ""
echo "7) Next steps:"
echo "   a) Review the sanitized_data.sql file"
echo "   b) Link to production: supabase link --project-ref $PROD_PROJECT"
echo "   c) Apply schema: supabase db push --file $SCHEMA_SQL"
echo "   d) Apply sanitized data: supabase db push --file $OUTDIR/sanitized_data.sql"
echo ""
echo "   Or use the manual dashboard method:"
echo "   - Export from: https://supabase.com/dashboard/project/$STAGING_PROJECT"
echo "   - Import to: https://supabase.com/dashboard/project/$PROD_PROJECT"

echo ""
echo "Superadmin UUID found: $SUPERADMIN_ID"
echo "Migration files ready in: $OUTDIR"

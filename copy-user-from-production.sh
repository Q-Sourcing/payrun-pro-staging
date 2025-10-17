#!/bin/bash

echo "🔄 Copying user from production to staging database..."
echo "=================================================="
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Step 1: Link to production database
echo "🔗 Step 1: Linking to production database..."
supabase link --project-ref kctwfgbjmhnfqtxhagib

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to production database"
    exit 1
fi

echo "✅ Linked to production database"
echo ""

# Step 2: Export user data from production
echo "📤 Step 2: Exporting user data from production..."
echo "This will export the user data to a SQL file..."

# Create SQL to export user data
cat > export-user.sql << 'EOF'
-- Export user data from production
SELECT 
    'INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES (' ||
    quote_literal(instance_id) || ', ' ||
    quote_literal(id) || ', ' ||
    quote_literal(aud) || ', ' ||
    quote_literal(role) || ', ' ||
    quote_literal(email) || ', ' ||
    quote_literal(encrypted_password) || ', ' ||
    quote_literal(email_confirmed_at) || ', ' ||
    quote_literal(created_at) || ', ' ||
    quote_literal(updated_at) || ', ' ||
    quote_literal(confirmation_token) || ', ' ||
    quote_literal(email_change) || ', ' ||
    quote_literal(email_change_token_new) || ', ' ||
    quote_literal(recovery_token) || ');' as insert_statement
FROM auth.users 
WHERE email = 'nalungukevin@gmail.com';
EOF

# Execute the export
supabase db query --file export-user.sql > user-export.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to export user data from production"
    exit 1
fi

echo "✅ User data exported to user-export.sql"
echo ""

# Step 3: Link to staging database
echo "🔗 Step 3: Linking to staging database..."
supabase link --project-ref sbphmrjoappwlervnbtm

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to staging database"
    exit 1
fi

echo "✅ Linked to staging database"
echo ""

# Step 4: Import user data to staging
echo "📥 Step 4: Importing user data to staging..."
echo "This will create the user in the staging database..."

# Check if user already exists in staging
echo "Checking if user already exists in staging..."
supabase db query --query "SELECT email FROM auth.users WHERE email = 'nalungukevin@gmail.com';" > staging-user-check.txt

if grep -q "nalungukevin@gmail.com" staging-user-check.txt; then
    echo "⚠️  User already exists in staging database"
    echo "Do you want to continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Operation cancelled"
        exit 1
    fi
fi

# Import the user data
if [ -f user-export.sql ]; then
    supabase db query --file user-export.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ User successfully copied to staging database!"
        echo ""
        echo "🎉 You can now log in to the staging environment with:"
        echo "   Email: nalungukevin@gmail.com"
        echo "   Password: [your production password]"
        echo ""
    else
        echo "❌ Failed to import user data to staging"
        echo ""
        echo "📋 Manual Steps:"
        echo "1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
        echo "2. Navigate to: Authentication > Users"
        echo "3. Click: 'Add user'"
        echo "4. Enter email: nalungukevin@gmail.com"
        echo "5. Set a password"
        echo "6. Check 'Confirm email'"
        echo "7. Click 'Create user'"
        echo ""
    fi
else
    echo "❌ User export file not found"
    echo ""
    echo "📋 Manual Steps:"
    echo "1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
    echo "2. Navigate to: Authentication > Users"
    echo "3. Click: 'Add user'"
    echo "4. Enter email: nalungukevin@gmail.com"
    echo "5. Set a password"
    echo "6. Check 'Confirm email'"
    echo "7. Click 'Create user'"
    echo ""
fi

# Cleanup
rm -f export-user.sql user-export.sql staging-user-check.txt

echo "🧹 Cleanup completed"
echo ""
echo "✨ Process completed!"

#!/bin/bash

echo "🔄 Simple User Copy: Production → Staging"
echo "========================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    echo ""
    echo "📋 Manual Steps (Recommended):"
    echo "1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
    echo "2. Navigate to: Authentication > Users"
    echo "3. Click: 'Add user'"
    echo "4. Enter email: nalungukevin@gmail.com"
    echo "5. Set a password (use the same as production)"
    echo "6. Check 'Confirm email'"
    echo "7. Click 'Create user'"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Method 1: Try to create user directly in staging
echo "🔧 Method 1: Creating user directly in staging..."
echo ""

# Link to staging
echo "🔗 Linking to staging database..."
supabase link --project-ref sbphmrjoappwlervnbtm

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to staging database"
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
    exit 1
fi

echo "✅ Linked to staging database"
echo ""

# Create user in staging
echo "👤 Creating user in staging database..."
echo "Please enter the password for nalungukevin@gmail.com:"
read -s password

supabase auth users create nalungukevin@gmail.com --password "$password"

if [ $? -eq 0 ]; then
    echo "✅ User created successfully in staging!"
    echo ""
    echo "🎉 You can now log in to the staging environment with:"
    echo "   Email: nalungukevin@gmail.com"
    echo "   Password: [the password you just set]"
    echo ""
    echo "🌐 Staging URL: http://localhost:5174/login"
    echo ""
else
    echo "❌ Failed to create user via CLI"
    echo ""
    echo "📋 Manual Steps (Please do this):"
    echo "1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
    echo "2. Navigate to: Authentication > Users"
    echo "3. Click: 'Add user'"
    echo "4. Enter email: nalungukevin@gmail.com"
    echo "5. Set a password (use the same as production for consistency)"
    echo "6. Check 'Confirm email'"
    echo "7. Click 'Create user'"
    echo ""
    echo "After creating the user, you can log in to:"
    echo "🌐 Staging URL: http://localhost:5174/login"
    echo ""
fi

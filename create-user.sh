#!/bin/bash

echo "🔧 Creating user in staging database..."
echo "================================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
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

echo "✅ Supabase CLI found"
echo ""

# Link to staging project
echo "🔗 Linking to staging project..."
supabase link --project-ref sbphmrjoappwlervnbtm

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to staging project"
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

echo "✅ Linked to staging project"
echo ""

# Create user
echo "👤 Creating user: nalungukevin@gmail.com"
echo "Please enter a password for the user:"
read -s password

supabase auth users create nalungukevin@gmail.com --password "$password"

if [ $? -eq 0 ]; then
    echo "✅ User created successfully!"
    echo ""
    echo "🎉 You can now log in to the staging environment with:"
    echo "   Email: nalungukevin@gmail.com"
    echo "   Password: [the password you just set]"
    echo ""
else
    echo "❌ Failed to create user via CLI"
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

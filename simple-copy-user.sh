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
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to: Authentication > Users"
    echo "3. Click: 'Add user'"
    echo "4. Enter the email address"
    echo "5. Set a password"
    echo "6. Check 'Confirm email'"
    echo "7. Click 'Create user'"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

echo "🔧 Creating user in staging..."
echo ""

echo "Please enter the email for the user:"
read email

echo "Please enter the password:"
read -s password

supabase auth users create "$email" --password "$password"

if [ $? -eq 0 ]; then
    echo "✅ User created successfully!"
else
    echo "❌ Failed to create user via CLI"
    echo ""
    echo "📋 Use the Supabase Dashboard to create the user manually."
fi

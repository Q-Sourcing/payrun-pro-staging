#!/bin/bash

# Deploy the create-user Edge Function to Supabase
# This script deploys the Edge Function that handles user creation with super_admin authentication

echo "🚀 Deploying create-user Edge Function to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this script from the project root."
    exit 1
fi

# Check if the create-user function exists
if [ ! -d "supabase/functions/create-user" ]; then
    echo "❌ create-user function not found. Please ensure the function exists at supabase/functions/create-user/"
    exit 1
fi

# Deploy the function
echo "📦 Deploying create-user function..."
supabase functions deploy create-user

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed create-user function!"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Make sure SUPABASE_SERVICE_ROLE_KEY is set in your Supabase project environment variables"
    echo "   2. Test the function using the test script: npm run test:create-user"
    echo "   3. The function will be available at: https://your-project.supabase.co/functions/v1/create-user"
else
    echo "❌ Failed to deploy create-user function. Please check the error messages above."
    exit 1
fi

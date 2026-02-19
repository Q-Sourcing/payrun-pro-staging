#!/bin/bash

# Setup secure-login Edge Function Environment Variables
# This script helps configure the secure-login Edge Function

echo "🔧 Setting up secure-login Edge Function Environment Variables..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo ""
echo "📋 To set environment variables for secure-login Edge Function:"
echo ""
echo "Option 1: Via Supabase Dashboard (Recommended)"
echo "   1. Go to your project's Edge Functions settings"
echo "   2. Click 'Settings' tab"
echo "   3. Add these secrets:"
echo "      - SUPABASE_URL=<your-project-url>"
echo "      - SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo ""
echo "   To get your service role key:"
echo "   - Go to your project Settings → API"
echo "   - Copy the 'service_role' key (keep it secret!)"
echo ""

echo "Option 2: Via Supabase CLI"
echo "   Run these commands:"
echo "   supabase secrets set SUPABASE_URL=<your-project-url>"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo ""

echo "After setting environment variables, redeploy the function:"
echo "   supabase functions deploy secure-login"
echo ""

echo "✅ Setup instructions complete!"

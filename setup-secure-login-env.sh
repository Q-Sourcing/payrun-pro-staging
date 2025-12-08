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

# Check if linked to project
PROJECT_REF="sbphmrjoappwlervnbtm"
echo "🔗 Checking project link..."
if ! supabase status &> /dev/null; then
    echo "📌 Linking to staging project..."
    supabase link --project-ref $PROJECT_REF
fi

echo ""
echo "📋 To set environment variables for secure-login Edge Function:"
echo ""
echo "Option 1: Via Supabase Dashboard (Recommended)"
echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/functions/secure-login"
echo "   2. Click 'Settings' tab"
echo "   3. Add these secrets:"
echo "      - SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "      - SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo ""
echo "   To get your service role key:"
echo "   - Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo "   - Copy the 'service_role' key (keep it secret!)"
echo ""

echo "Option 2: Via Supabase CLI"
echo "   Run these commands:"
echo "   supabase secrets set SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo ""

echo "After setting environment variables, redeploy the function:"
echo "   supabase functions deploy secure-login"
echo ""

echo "✅ Setup instructions complete!"


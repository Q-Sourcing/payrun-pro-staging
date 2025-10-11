#!/bin/bash

# Deploy Supabase Edge Functions and Database Migrations
# Run this script locally after setting up your Supabase CLI

echo "🚀 Deploying Q-Payroll Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Login to Supabase (interactive)
echo "🔐 Please login to Supabase..."
supabase login

# Link to your project
echo "🔗 Linking to project..."
supabase link --project-ref kctwfgbjmhnfqtxhagib

# Deploy database migrations
echo "📊 Deploying database migrations..."
supabase db push

# Deploy Edge Functions
echo "⚡ Deploying Edge Functions..."
supabase functions deploy calculate-pay

# Test the deployment
echo "🧪 Testing Edge Function..."
node scripts/test-edge-function.js

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test creating a new pay run"
echo "2. Test editing calculations in PayRunDetailsDialog"
echo "3. Check audit logs in your Supabase dashboard"
echo ""
echo "🔍 To verify deployment:"
echo "- Go to your Supabase Dashboard > Edge Functions"
echo "- Check that 'calculate-pay' function is deployed"
echo "- Go to Database > Tables and verify 'pay_calculation_audit_log' exists"

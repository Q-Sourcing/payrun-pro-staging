#!/bin/bash

# Deploy Supabase Edge Functions for Q-Payroll

set -e

echo "🚀 Deploying Q-Payroll Edge Functions..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

# Deploy the calculate-pay function
echo "📦 Deploying calculate-pay function..."
supabase functions deploy calculate-pay

# Verify deployment
echo "✅ Deployment completed successfully!"

echo ""
echo "🔧 Next steps:"
echo "1. Run database migrations: supabase db push"
echo "2. Test the function with: supabase functions serve calculate-pay"
echo "3. Update your client-side code to use the new Edge Function"
echo ""
echo "📚 Documentation: supabase/functions/calculate-pay/README.md"

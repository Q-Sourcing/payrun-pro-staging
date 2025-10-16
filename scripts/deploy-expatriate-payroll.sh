#!/bin/bash

# Deploy Expatriate Payroll Edge Functions
# This script deploys the calculate-expatriate-pay Edge Function to Supabase

set -e

echo "🚀 Deploying Expatriate Payroll Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from the project root."
    exit 1
fi

echo "📦 Deploying calculate-expatriate-pay Edge Function..."

# Deploy the calculate-expatriate-pay function
supabase functions deploy calculate-expatriate-pay

if [ $? -eq 0 ]; then
    echo "✅ calculate-expatriate-pay function deployed successfully!"
else
    echo "❌ Failed to deploy calculate-expatriate-pay function"
    exit 1
fi

echo "🗄️ Running database migrations..."

# Run database migrations
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully!"
else
    echo "❌ Failed to run database migrations"
    exit 1
fi

echo "🧪 Testing Edge Function..."

# Test the Edge Function
echo "Testing calculate-expatriate-pay function with sample data..."

# Get the project URL and anon key
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
    echo "⚠️  Could not get project URL or anon key. Skipping test."
    echo "   You can test manually using the Supabase Dashboard"
else
    # Test the function
    curl -X POST "${PROJECT_URL}/functions/v1/calculate-expatriate-pay" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "employee_id": "test-employee-id",
            "daily_rate": 150,
            "days_worked": 22,
            "allowances": 300,
            "currency": "USD",
            "exchange_rate_to_local": 3800,
            "tax_country": "UG"
        }' \
        --silent --show-error --fail

    if [ $? -eq 0 ]; then
        echo "✅ Edge Function test passed!"
    else
        echo "❌ Edge Function test failed"
        echo "   Check the function logs in the Supabase Dashboard"
    fi
fi

echo ""
echo "🎉 Expatriate Payroll deployment completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Create an Expatriate PayGroup in the PayGroups section"
echo "   2. Add employees to the expatriate pay group"
echo "   3. Create a pay run for the expatriate pay group"
echo "   4. Test the payroll calculations and payslip generation"
echo ""
echo "🔗 Useful links:"
echo "   - Supabase Dashboard: https://supabase.com/dashboard"
echo "   - Function Logs: https://supabase.com/dashboard/project/[PROJECT_ID]/functions"
echo ""

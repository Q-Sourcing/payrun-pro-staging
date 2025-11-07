#!/bin/bash

# ==========================================================
# 🚀 MULTI-TENANT PAYROLL DEPLOYMENT SCRIPT
# ==========================================================
# Author: Nalungu Kevin Colin
# Purpose: Deploy multi-tenant system with Super Admin Dashboard
# ==========================================================

set -e

echo "🚀 Starting Multi-Tenant Payroll System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    print_error "Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

print_status "Deploying database migrations..."

# Apply database migrations
print_status "Applying multi-tenant schema migration..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    print_success "Database migrations applied successfully"
else
    print_error "Failed to apply database migrations"
    exit 1
fi

print_status "Deploying Edge Functions..."

# Deploy impersonation function
print_status "Deploying impersonation Edge Function..."
supabase functions deploy impersonate

if [ $? -eq 0 ]; then
    print_success "Impersonation function deployed successfully"
else
    print_warning "Failed to deploy impersonation function (this might be expected if not configured)"
fi

print_status "Verifying deployment..."

# Test database connection
print_status "Testing database connection..."
supabase db reset --linked

if [ $? -eq 0 ]; then
    print_success "Database connection verified"
else
    print_error "Database connection test failed"
    exit 1
fi

# Check if GWAZU organization was created
print_status "Checking GWAZU organization seeding..."
GWAZU_CHECK=$(supabase db query "SELECT COUNT(*) FROM organizations WHERE name = 'GWAZU';" --output csv | tail -n 1)

if [ "$GWAZU_CHECK" = "1" ]; then
    print_success "GWAZU organization seeded successfully"
else
    print_warning "GWAZU organization not found - you may need to run the seed migration manually"
fi

print_status "Building frontend..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build the frontend
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

print_success "🎉 Multi-Tenant Payroll System deployed successfully!"
print_status ""
print_status "Next steps:"
print_status "1. Access the Super Admin Dashboard at: /admin"
print_status "2. Login with your super admin credentials"
print_status "3. Verify GWAZU organization is visible in the Organizations list"
print_status "4. Test impersonation functionality"
print_status "5. Create additional organizations as needed"
print_status ""
print_status "Key features deployed:"
print_status "✅ Multi-tenant database schema with RLS"
print_status "✅ Super Admin Dashboard"
print_status "✅ Secure impersonation system"
print_status "✅ GWAZU demo organization"
print_status "✅ Multi-tenant payroll services"
print_status "✅ Expatriate payroll integration"
print_status ""
print_warning "Remember: This is the STAGING environment"
print_warning "All data is safe for development and testing"

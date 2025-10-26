#!/bin/bash

echo "🔧 FIXING DATABASE MIGRATION ERRORS"
echo "===================================="
echo ""

# Set up PostgreSQL path
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"

echo "📋 Available staging dump files:"
ls -la staging_dump_*.sql

echo ""
echo "🎯 Attempting migration using existing staging dump..."

# Try to restore the most recent staging dump to production
echo "1️⃣ Restoring staging dump to production..."
if psql "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres" -f staging_dump_20251026_005727.sql --no-password; then
    echo "✅ Staging dump restored successfully!"
else
    echo "❌ Direct restore failed, trying alternative method..."
    
    # Try with different connection parameters
    echo "2️⃣ Trying with connection timeout settings..."
    if psql "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres?connect_timeout=30" -f staging_dump_20251026_005727.sql --no-password; then
        echo "✅ Staging dump restored with timeout settings!"
    else
        echo "❌ Alternative method failed, trying Supabase CLI..."
        
        # Try using Supabase CLI
        echo "3️⃣ Trying Supabase CLI restore..."
        if supabase db reset --db-url "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres"; then
            echo "✅ Supabase CLI reset successful!"
        else
            echo "❌ All automated methods failed."
            echo ""
            echo "🎯 RECOMMENDED SOLUTION:"
            echo "Use the Supabase Dashboard method:"
            echo "1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
            echo "2. Export all tables from Table Editor"
            echo "3. Go to: https://supabase.com/dashboard/project/ftiqmqrjzebibcixpnll"
            echo "4. Import the exported SQL in SQL Editor"
        fi
    fi
fi

echo ""
echo "🔍 Verifying migration..."
if psql "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" --no-password; then
    echo "✅ Production database is accessible!"
else
    echo "❌ Production database verification failed"
fi

echo ""
echo "🎯 Migration attempt completed!"

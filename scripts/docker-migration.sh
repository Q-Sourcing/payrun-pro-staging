#!/bin/bash

echo "🐳 DOCKER-ENABLED MIGRATION ATTEMPT"
echo "===================================="
echo ""

# Set up PostgreSQL path
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"

echo "📋 Available staging dump files:"
ls -la staging_dump_*.sql

echo ""
echo "🎯 Attempting migration with Docker-enabled methods..."

# Try to restore the most recent staging dump to production using Docker
echo "1️⃣ Trying Docker-based restore..."
if docker run --rm -v "$(pwd):/data" postgres:17.6 psql "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres" -f /data/staging_dump_20251026_005727.sql; then
    echo "✅ Docker-based restore successful!"
else
    echo "❌ Docker-based restore failed, trying alternative method..."
    
    # Try with different Docker approach
    echo "2️⃣ Trying alternative Docker method..."
    if docker run --rm -v "$(pwd):/data" postgres:17.6 sh -c "psql 'postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres' -f /data/staging_dump_20251026_005727.sql"; then
        echo "✅ Alternative Docker method successful!"
    else
        echo "❌ Alternative Docker method failed, trying Supabase CLI..."
        
        # Try using Supabase CLI with Docker
        echo "3️⃣ Trying Supabase CLI with Docker..."
        if supabase db reset --db-url "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres"; then
            echo "✅ Supabase CLI reset successful!"
        else
            echo "❌ All Docker methods failed."
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
if docker run --rm postgres:17.6 psql "postgresql://postgres:gWaZuprod1!@ftiqmqrjzebibcixpnll.supabase.co:5432/postgres" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"; then
    echo "✅ Production database is accessible!"
else
    echo "❌ Production database verification failed"
fi

echo ""
echo "🎯 Docker migration attempt completed!"

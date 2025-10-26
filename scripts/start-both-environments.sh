#!/bin/bash

echo "🚀 Starting Both Environment Servers"
echo "=================================="

# Stop any existing processes
echo "🛑 Stopping existing servers..."
pkill -f "vite" 2>/dev/null || true
sleep 2

# Create separate environment files for each server
echo "📋 Creating environment files..."

# Staging environment file
cp .env.local .env.staging
echo "✅ Created .env.staging"

# Production environment file  
cp .env.production .env.production-server
echo "✅ Created .env.production-server"

echo ""
echo "🟡 Starting Staging Server (Port 8080)..."
echo "   Environment: staging"
echo "   Database: sbphmrjoappwlervnbtm.supabase.co"
echo "   URL: http://localhost:8080"
echo "   Banner: 🧪 STAGING"

# Start staging server in background
cp .env.staging .env.next
PORT=8080 npm run dev:staging > logs/staging.log 2>&1 &
STAGING_PID=$!
echo "   PID: $STAGING_PID"

sleep 3

echo ""
echo "🟢 Starting Production Server (Port 8081)..."
echo "   Environment: production"  
echo "   Database: ftiqmqrjzebibcixpnll.supabase.co"
echo "   URL: http://localhost:8081"
echo "   Banner: 🟢 PRODUCTION"

# Start production server in background
cp .env.production-server .env.next
PORT=8081 npm run dev:production > logs/production.log 2>&1 &
PRODUCTION_PID=$!
echo "   PID: $PRODUCTION_PID"

sleep 3

echo ""
echo "✅ Both servers started successfully!"
echo ""
echo "🔗 Access URLs:"
echo "   🟡 Staging:    http://localhost:8080 (🧪 STAGING banner)"
echo "   🟢 Production: http://localhost:8081 (🟢 PRODUCTION banner)"
echo ""
echo "📋 Server Status:"
lsof -i :8080 -i :8081 | grep LISTEN || echo "   Servers starting up..."
echo ""
echo "🛑 To stop servers:"
echo "   pkill -f 'vite'"
echo "   or"
echo "   kill $STAGING_PID $PRODUCTION_PID"
echo ""
echo "📝 Logs:"
echo "   Staging:    tail -f logs/staging.log"
echo "   Production: tail -f logs/production.log"

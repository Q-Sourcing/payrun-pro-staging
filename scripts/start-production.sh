#!/bin/bash

echo "🟢 Starting Production Server (Port 8081)"
echo "========================================"

# Set production environment
export VITE_ENVIRONMENT=production
export VITE_SUPABASE_URL=https://ftiqmqrjzebibcixpnll.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0aXFtcXJqemViaWJjaXhwbmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTUxNTgsImV4cCI6MjA3Njk5MTE1OH0.q_k4a-YUjqEWUT9lDlEKLUPfUYcpQtjU57Vlndzw7Ks

echo "Environment: production"
echo "Database: ftiqmqrjzebibcixpnll.supabase.co"
echo "Port: 8081"
echo "Banner: 🟢 PRODUCTION"
echo ""

# Start production server
PORT=8081 npm run dev

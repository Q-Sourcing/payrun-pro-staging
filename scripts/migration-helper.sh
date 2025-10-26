#!/bin/bash

echo "🗄️  Database Migration Helper"
echo "============================="

echo "📋 Current Status:"
echo "   Staging DB: sbphmrjoappwlervnbtm.supabase.co ✅ (has data)"
echo "   Production DB: ftiqmqrjzebibcixpnll.supabase.co ❌ (empty)"
echo ""

echo "🎯 Goal: Copy ALL data from staging to production"
echo "   Including: tables, data, users, superadmin, everything"
echo ""

echo "🚀 Manual Migration Steps:"
echo ""
echo "1️⃣ EXPORT FROM STAGING:"
echo "   • Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
echo "   • Settings → Database → Database Backups"
echo "   • Click 'Create backup' or 'Download backup'"
echo "   • Save as: staging_full_backup.sql"
echo ""

echo "2️⃣ IMPORT TO PRODUCTION:"
echo "   • Go to: https://supabase.com/dashboard/project/ftiqmqrjzebibcixpnll"
echo "   • SQL Editor → New query"
echo "   • Copy/paste staging_full_backup.sql contents"
echo "   • Click 'Run'"
echo ""

echo "3️⃣ VERIFY MIGRATION:"
echo "   • Check Table Editor in production"
echo "   • Verify all tables and data are present"
echo "   • Test login with superadmin credentials"
echo ""

echo "🔗 Quick Links:"
echo "   🟡 Staging Dashboard: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm"
echo "   🟢 Production Dashboard: https://supabase.com/dashboard/project/ftiqmqrjzebibcixpnll"
echo "   🟡 Staging App: http://localhost:8080"
echo "   🟢 Production App: http://localhost:8081"
echo ""

echo "🧪 Test Commands:"
echo "   # Test staging app"
echo "   open http://localhost:8080"
echo ""
echo "   # Test production app (after migration)"
echo "   open http://localhost:8081"
echo ""

echo "✅ After migration, your production app should:"
echo "   • Show '🟢 PRODUCTION' banner"
echo "   • Allow login with superadmin credentials"
echo "   • Display all your data (employees, paygroups, etc.)"
echo "   • Not show 'Connected to LOCAL Database'"
echo ""

echo "🎉 Ready to migrate! Follow the manual steps above."

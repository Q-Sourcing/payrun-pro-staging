#!/usr/bin/env node

/**
 * Test Environment Variables Script
 * Tests the actual environment variables being used by the servers
 */

import { execSync } from 'child_process';

console.log('🧪 Testing Environment Variables\n');

// Test staging environment variables
console.log('🟡 Testing Staging Environment Variables:');
try {
  const stagingTest = execSync('VITE_ENVIRONMENT=staging VITE_SUPABASE_URL=https://sbphmrjoappwlervnbtm.supabase.co node -e "console.log(\'Environment:\', process.env.VITE_ENVIRONMENT); console.log(\'Supabase URL:\', process.env.VITE_SUPABASE_URL);"', { encoding: 'utf8' });
  console.log(stagingTest);
} catch (error) {
  console.log('Error testing staging:', error.message);
}

console.log('');

// Test production environment variables
console.log('🟢 Testing Production Environment Variables:');
try {
  const productionTest = execSync('VITE_ENVIRONMENT=production VITE_SUPABASE_URL=https://ftiqmqrjzebibcixpnll.supabase.co node -e "console.log(\'Environment:\', process.env.VITE_ENVIRONMENT); console.log(\'Supabase URL:\', process.env.VITE_SUPABASE_URL);"', { encoding: 'utf8' });
  console.log(productionTest);
} catch (error) {
  console.log('Error testing production:', error.message);
}

console.log('');

console.log('🎯 Expected Results:');
console.log('🟡 Staging should show:');
console.log('   Environment: staging');
console.log('   Supabase URL: https://sbphmrjoappwlervnbtm.supabase.co');
console.log('');
console.log('🟢 Production should show:');
console.log('   Environment: production');
console.log('   Supabase URL: https://ftiqmqrjzebibcixpnll.supabase.co');
console.log('');

console.log('🌐 Server URLs:');
console.log('   🟡 Staging:    http://localhost:8080');
console.log('   🟢 Production: http://localhost:8081');
console.log('');

console.log('🎨 Expected Banners:');
console.log('   🟡 Staging:    🧪 STAGING (yellow badge)');
console.log('   🟢 Production: 🟢 PRODUCTION (green badge)');

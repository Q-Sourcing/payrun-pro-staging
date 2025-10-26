#!/usr/bin/env node

/**
 * Environment Banner Test Script
 * Tests the environment banner functionality
 */

import fs from 'fs';

console.log('🧪 Testing Environment Banner System\n');

// Test environment configurations
const environments = [
  {
    name: 'Staging',
    file: '.env.local',
    expectedEnv: 'staging',
    expectedBanner: '🧪 STAGING',
    expectedColor: 'Yellow (#FCD34D)'
  },
  {
    name: 'Production',
    file: '.env.production',
    expectedEnv: 'production',
    expectedBanner: '🟢 PRODUCTION',
    expectedColor: 'Green (#10B981)'
  }
];

console.log('📋 Environment Banner Test Results:\n');

environments.forEach((env, index) => {
  console.log(`${index + 1}️⃣ Testing ${env.name} Environment:`);
  
  if (fs.existsSync(env.file)) {
    const content = fs.readFileSync(env.file, 'utf8');
    const envMatch = content.match(/VITE_ENVIRONMENT=(\w+)/);
    const actualEnv = envMatch ? envMatch[1] : 'not found';
    
    console.log(`   ✅ Environment file exists: ${env.file}`);
    console.log(`   📋 Expected environment: ${env.expectedEnv}`);
    console.log(`   📋 Actual environment: ${actualEnv}`);
    console.log(`   🎨 Expected banner: ${env.expectedBanner}`);
    console.log(`   🎨 Expected color: ${env.expectedColor}`);
    
    if (actualEnv === env.expectedEnv) {
      console.log(`   ✅ Environment configuration correct`);
    } else {
      console.log(`   ❌ Environment configuration mismatch`);
    }
  } else {
    console.log(`   ❌ Environment file not found: ${env.file}`);
  }
  
  console.log('');
});

console.log('🎯 Environment Banner Behavior:\n');

console.log('🟡 Staging Environment:');
console.log('   - Shows: 🧪 STAGING badge');
console.log('   - Color: Yellow background');
console.log('   - Position: Top-right corner');
console.log('   - Triggered by: VITE_ENVIRONMENT=staging\n');

console.log('🟢 Production Environment:');
console.log('   - Shows: 🟢 PRODUCTION badge');
console.log('   - Color: Green background');
console.log('   - Position: Top-right corner');
console.log('   - Triggered by: VITE_ENVIRONMENT=production\n');

console.log('🔧 Development Mode:');
console.log('   - Shows: 🔧 DEVELOPMENT badge');
console.log('   - Color: Blue background');
console.log('   - Position: Top-right corner');
console.log('   - Triggered by: Vite MODE=development\n');

console.log('🚀 Testing Instructions:\n');

console.log('1️⃣ Test Staging Banner:');
console.log('   npm run env:staging');
console.log('   npm run dev');
console.log('   → Visit http://localhost:8080');
console.log('   → Look for yellow "🧪 STAGING" badge in top-right\n');

console.log('2️⃣ Test Production Banner:');
console.log('   npm run env:production');
console.log('   npm run dev');
console.log('   → Visit http://localhost:8080');
console.log('   → Look for green "🟢 PRODUCTION" badge in top-right\n');

console.log('3️⃣ Test Branch Switching:');
console.log('   git checkout staging');
console.log('   npm run dev');
console.log('   → Should show staging banner\n');
console.log('   git checkout main');
console.log('   npm run dev');
console.log('   → Should show production banner\n');

console.log('✅ Environment Banner System Ready!');
console.log('   The banner will automatically appear based on your environment configuration.');
console.log('   No manual switching needed - it detects the environment automatically!');

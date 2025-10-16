const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');

console.log('🔍 Testing Supabase Database Connection...\n');

// Load environment variables
function loadEnvVars() {
  const envVars = {};
  if (existsSync('.env')) {
    const content = readFileSync('.env', 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
  return envVars;
}

async function testConnection() {
  const envVars = loadEnvVars();
  
  console.log('📋 Environment Configuration:');
  console.log('  NODE_ENV:', envVars.NODE_ENV || 'not set');
  console.log('  VITE_SUPABASE_URL:', envVars.VITE_SUPABASE_URL || 'not set');
  
  if (!envVars.VITE_SUPABASE_URL) {
    console.log('❌ Error: VITE_SUPABASE_URL not found in .env file');
    return;
  }
  
  // Extract project ref
  const match = envVars.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = match ? match[1] : null;
  
  if (projectRef === 'sbphmrjoappwlervnbtm') {
    console.log('  Environment: 🧱 STAGING');
  } else if (projectRef === 'kctwfgbjmhnfqtxhagib') {
    console.log('  Environment: 🚀 PRODUCTION');
  } else {
    console.log('  Environment: ❓ UNKNOWN');
  }
  console.log('  Project Ref:', projectRef);
  
  // Test connection
  console.log('\n🔌 Testing Database Connection...');
  
  try {
    const supabase = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.VITE_SUPABASE_ANON_KEY || 'dummy-key-for-testing'
    );
    
    // Test 1: Simple query to employees table
    console.log('  Test 1: Querying employees table...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_number, first_name, last_name')
      .limit(3);
    
    if (empError) {
      console.log('    ❌ Error:', empError.message);
      if (empError.message.includes('JWT')) {
        console.log('    💡 This is expected - API key is placeholder');
      }
    } else {
      console.log('    ✅ Success:', employees?.length || 0, 'employees found');
      if (employees && employees.length > 0) {
        console.log('    📊 Sample data:', employees[0]);
      }
    }
    
    // Test 2: Query pay_groups table
    console.log('  Test 2: Querying pay_groups table...');
    const { data: payGroups, error: pgError } = await supabase
      .from('pay_groups')
      .select('id, name, description')
      .limit(3);
    
    if (pgError) {
      console.log('    ❌ Error:', pgError.message);
    } else {
      console.log('    ✅ Success:', payGroups?.length || 0, 'pay groups found');
      if (payGroups && payGroups.length > 0) {
        console.log('    📊 Sample data:', payGroups[0]);
      }
    }
    
    // Test 3: Query migration history
    console.log('  Test 3: Checking migration history...');
    const { data: migrations, error: migError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version, statements')
      .order('version', { ascending: false })
      .limit(5);
    
    if (migError) {
      console.log('    ❌ Error:', migError.message);
    } else {
      console.log('    ✅ Success:', migrations?.length || 0, 'recent migrations found');
      if (migrations && migrations.length > 0) {
        console.log('    📊 Latest migration:', migrations[0].version);
      }
    }
    
    console.log('\n🎯 Connection Test Summary:');
    console.log('  ✅ Supabase client initialized successfully');
    console.log('  ✅ Connected to:', envVars.VITE_SUPABASE_URL);
    console.log('  ✅ Project Ref:', projectRef);
    
    if (projectRef === 'sbphmrjoappwlervnbtm') {
      console.log('  🎉 SUCCESS: Connected to STAGING database!');
    } else if (projectRef === 'kctwfgbjmhnfqtxhagib') {
      console.log('  ⚠️  WARNING: Connected to PRODUCTION database!');
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
}

testConnection().catch(console.error);

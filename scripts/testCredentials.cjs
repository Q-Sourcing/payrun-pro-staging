#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return envVars;
}

async function testCredentials() {
  log('\n🔑 CREDENTIAL TESTING STARTING...', colors.bold + colors.blue);
  
  // Load environment variables
  const envVars = loadEnvFile('.env');
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
  
  log(`\n📋 Current Configuration:`, colors.bold);
  log(`  • Supabase URL: ${supabaseUrl}`);
  log(`  • Anon Key: ${supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING'}`);
  log(`  • Service Key: ${serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING'}`);
  
  // Check for placeholder values
  const hasPlaceholders = supabaseKey?.includes('YOUR_') || serviceKey?.includes('YOUR_');
  
  if (hasPlaceholders) {
    log(`\n⚠️ PLACEHOLDER CREDENTIALS DETECTED`, colors.yellow + colors.bold);
    log(`Please update your .env file with real Supabase credentials.`, colors.yellow);
    log(`See docs/SUPABASE_CREDENTIALS_GUIDE.md for instructions.`, colors.cyan);
    return false;
  }
  
  if (!supabaseUrl || !supabaseKey) {
    log(`\n❌ MISSING CREDENTIALS`, colors.red + colors.bold);
    log(`Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.`, colors.red);
    return false;
  }
  
  try {
    // Dynamic import for ES modules
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    log(`\n🧪 Testing Supabase connection...`, colors.yellow);
    
    // Test with a simple query
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .limit(3);
    
    if (error) {
      log(`❌ Connection failed: ${error.message}`, colors.red);
      
      if (error.message.includes('Invalid API key')) {
        log(`💡 Check your VITE_SUPABASE_ANON_KEY in .env file`, colors.yellow);
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        log(`💡 The 'employees' table might not exist. This is normal for new projects.`, colors.yellow);
        log(`✅ Connection successful - API key is valid!`, colors.green);
        return true;
      }
      
      return false;
    }
    
    log(`✅ Connection successful!`, colors.green);
    log(`  • Query returned: ${data ? data.length : 0} records`);
    
    if (data && data.length > 0) {
      log(`  • Sample data:`, colors.cyan);
      data.forEach((record, index) => {
        log(`    ${index + 1}. ${record.first_name} ${record.last_name} (ID: ${record.id})`, colors.cyan);
      });
    }
    
    // Test environment detection
    log(`\n🏷️ Environment Detection Test:`, colors.bold);
    let envLabel = 'UNKNOWN';
    if (supabaseUrl.includes('kctwfgbjmhnfqtxhagib')) {
      envLabel = 'PRODUCTION';
    } else if (supabaseUrl.includes('sbphmrjoappwlervnbtm')) {
      envLabel = 'STAGING';
    }
    log(`  • Detected Environment: ${envLabel}`, colors.blue);
    
    return true;
    
  } catch (error) {
    log(`❌ Connection test failed: ${error.message}`, colors.red);
    return false;
  }
}

// Run the test
testCredentials()
  .then(success => {
    if (success) {
      log(`\n🎉 CREDENTIAL TEST COMPLETED SUCCESSFULLY!`, colors.green + colors.bold);
      log(`Your Supabase connection is working correctly.`, colors.green);
    } else {
      log(`\n💥 CREDENTIAL TEST FAILED!`, colors.red + colors.bold);
      log(`Please check your credentials and try again.`, colors.red);
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, colors.red + colors.bold);
    process.exit(1);
  });

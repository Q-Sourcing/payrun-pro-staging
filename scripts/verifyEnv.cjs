#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getGitInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return { remoteUrl, branch };
  } catch (error) {
    return { remoteUrl: 'unknown', branch: 'unknown' };
  }
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

function validateEnvironment() {
  log('\n🔍 ENVIRONMENT VALIDATION STARTING...', colors.bold + colors.blue);
  
  const { remoteUrl, branch } = getGitInfo();
  const timestamp = new Date().toISOString();
  
  // Determine environment
  let environment = 'UNKNOWN';
  let expectedRepo = '';
  
  if (remoteUrl.includes('payrun-pro') && !remoteUrl.includes('staging')) {
    environment = 'PRODUCTION';
    expectedRepo = 'Q-Sourcing/payrun-pro';
  } else if (remoteUrl.includes('payrun-pro-staging') || branch === 'staging') {
    environment = 'STAGING';
    expectedRepo = 'Q-Sourcing/payrunpro-staging';
  }
  
  log(`\n📋 Environment Detection:`, colors.bold);
  log(`  • Current Branch: ${branch}`);
  log(`  • Remote URL: ${remoteUrl}`);
  log(`  • Detected Environment: ${environment}`);
  
  // Load environment variables
  const envFiles = ['.env', '.env.local', '.env.production', '.env.staging'];
  let envVars = {};
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      envVars = { ...envVars, ...loadEnvFile(file) };
    }
  }
  
  // Required environment variables
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NODE_ENV'
  ];
  
  const validationResults = {};
  
  log(`\n🔑 Environment Variables Validation:`, colors.bold);
  
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    const hasValue = value && value !== 'YOUR_STAGING_ANON_KEY_HERE' && value !== 'YOUR_PRODUCTION_ANON_KEY_HERE';
    
    validationResults[varName] = {
      present: !!value,
      hasRealValue: hasValue,
      value: hasValue ? `${value.substring(0, 20)}...` : value
    };
    
    const status = hasValue ? '✅' : '❌';
    const color = hasValue ? colors.green : colors.red;
    log(`  ${status} ${varName}: ${color}${hasValue ? 'SET' : 'MISSING/PLACEHOLDER'}${colors.reset}`);
  });
  
  // Supabase project detection
  const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
  let supabaseProject = 'UNKNOWN';
  
  if (supabaseUrl.includes('kctwfgbjmhnfqtxhagib')) {
    supabaseProject = 'PRODUCTION (kctwfgbjmhnfqtxhagib)';
  } else if (supabaseUrl.includes('sbphmrjoappwlervnbtm')) {
    supabaseProject = 'STAGING (sbphmrjoappwlervnbtm)';
  }
  
  log(`\n🗄️ Supabase Project: ${colors.blue}${supabaseProject}${colors.reset}`);
  
  // Create validation log
  const validationLog = {
    timestamp,
    environment,
    branch,
    remoteUrl,
    supabaseProject,
    validationResults,
    allValid: Object.values(validationResults).every(v => v.hasRealValue)
  };
  
  fs.writeFileSync('.env.validation.log', JSON.stringify(validationLog, null, 2));
  log(`\n📄 Validation log saved to: .env.validation.log`);
  
  return validationLog;
}

// Run validation
const result = validateEnvironment();

if (result.allValid) {
  log(`\n✅ Environment validation completed successfully!`, colors.green + colors.bold);
} else {
  log(`\n⚠️ Environment validation completed with issues. Check .env.validation.log for details.`, colors.yellow + colors.bold);
}

process.exit(result.allValid ? 0 : 1);

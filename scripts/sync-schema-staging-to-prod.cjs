#!/usr/bin/env node

/**
 * 🔄 Schema Sync: Staging → Production
 * 
 * Safely synchronizes database schema from staging to production
 * WITHOUT copying any user data.
 * 
 * Usage: npm run sync:schema
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Environment configurations
const STAGING = {
  ref: process.env.STAGING_SUPABASE_REF || 'sbphmrjoappwlervnbtm',
  password: process.env.STAGING_DB_PASSWORD,
  name: '🧪 Staging'
};

const PRODUCTION = {
  ref: process.env.PRODUCTION_SUPABASE_REF || 'kctwfgbjmhnfqtxhagib',
  password: process.env.PRODUCTION_DB_PASSWORD,
  name: '🚀 Production'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function installSupabaseCLI() {
  log('\n📦 Installing Supabase CLI...', colors.yellow);
  try {
    execSync('npm install -g supabase', { stdio: 'inherit' });
    log('✅ Supabase CLI installed successfully', colors.green);
    return true;
  } catch (error) {
    log('❌ Failed to install Supabase CLI', colors.red);
    log('Please install manually: npm install -g supabase', colors.yellow);
    return false;
  }
}

function validateEnvironment() {
  log('\n🔍 Validating environment...', colors.cyan);
  
  const missing = [];
  
  if (!STAGING.password) {
    missing.push('STAGING_DB_PASSWORD');
  }
  
  if (!PRODUCTION.password) {
    missing.push('PRODUCTION_DB_PASSWORD');
  }
  
  if (missing.length > 0) {
    log('\n❌ Missing required environment variables:', colors.red);
    missing.forEach(v => log(`   - ${v}`, colors.yellow));
    log('\n💡 Set them in your .env file or export them:', colors.cyan);
    log('   export STAGING_DB_PASSWORD="your-staging-password"', colors.reset);
    log('   export PRODUCTION_DB_PASSWORD="your-production-password"', colors.reset);
    return false;
  }
  
  log('✅ All environment variables present', colors.green);
  return true;
}

function exportStagingSchema() {
  log('\n📤 Exporting schema from staging...', colors.cyan);
  
  const dbUrl = `postgresql://postgres:${STAGING.password}@db.${STAGING.ref}.supabase.co:5432/postgres`;
  const outputFile = path.join(__dirname, '..', 'staging_schema.sql');
  
  try {
    // Export schema only (no data)
    execSync(
      `supabase db dump --db-url "${dbUrl}" --schema public --schema-only -f "${outputFile}"`,
      { stdio: 'inherit' }
    );
    
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      log(`✅ Schema exported successfully (${(stats.size / 1024).toFixed(2)} KB)`, colors.green);
      return outputFile;
    } else {
      log('❌ Schema file was not created', colors.red);
      return null;
    }
  } catch (error) {
    log('❌ Failed to export schema from staging', colors.red);
    log(error.message, colors.red);
    return null;
  }
}

function reviewSchema(schemaFile) {
  log('\n📋 Schema Review', colors.cyan);
  log('─'.repeat(60), colors.cyan);
  
  try {
    const content = fs.readFileSync(schemaFile, 'utf8');
    const lines = content.split('\n');
    
    // Count important schema elements
    const tables = (content.match(/CREATE TABLE/gi) || []).length;
    const functions = (content.match(/CREATE (OR REPLACE )?FUNCTION/gi) || []).length;
    const triggers = (content.match(/CREATE TRIGGER/gi) || []).length;
    const indexes = (content.match(/CREATE( UNIQUE)? INDEX/gi) || []).length;
    const drops = (content.match(/DROP (TABLE|FUNCTION|TRIGGER|INDEX)/gi) || []).length;
    
    log(`📊 Schema Statistics:`, colors.bright);
    log(`   • Tables: ${tables}`, colors.reset);
    log(`   • Functions: ${functions}`, colors.reset);
    log(`   • Triggers: ${triggers}`, colors.reset);
    log(`   • Indexes: ${indexes}`, colors.reset);
    
    if (drops > 0) {
      log(`   ⚠️  DROP statements: ${drops}`, colors.yellow);
      log('      Review carefully - these will remove objects in production!', colors.yellow);
    }
    
    log('─'.repeat(60), colors.cyan);
    
    return true;
  } catch (error) {
    log('⚠️  Could not read schema file for review', colors.yellow);
    return true; // Continue anyway
  }
}

function confirmProceed() {
  log('\n⚠️  WARNING: This will modify the PRODUCTION database schema!', colors.yellow);
  log('   Data will NOT be affected, but schema changes are irreversible.', colors.yellow);
  log('\n🔐 Safety Checklist:', colors.cyan);
  log('   ✓ Staging has been tested and verified', colors.reset);
  log('   ✓ You have a recent production backup', colors.reset);
  log('   ✓ You understand the schema changes', colors.reset);
  log('   ✓ Off-peak hours or maintenance window', colors.reset);
  
  // In automated environments, require explicit confirmation flag
  if (process.argv.includes('--confirm')) {
    return true;
  }
  
  log('\n❌ Automated safety check: Add --confirm flag to proceed', colors.red);
  log('   Usage: npm run sync:schema -- --confirm', colors.yellow);
  return false;
}

function applyToProduction(schemaFile) {
  log('\n📥 Applying schema to production...', colors.cyan);
  
  const dbUrl = `postgresql://postgres:${PRODUCTION.password}@db.${PRODUCTION.ref}.supabase.co:5432/postgres`;
  
  try {
    // Apply schema to production
    execSync(
      `psql "${dbUrl}" -f "${schemaFile}"`,
      { stdio: 'inherit' }
    );
    
    log('✅ Schema applied to production successfully', colors.green);
    return true;
  } catch (error) {
    log('❌ Failed to apply schema to production', colors.red);
    log('⚠️  Production database may be in an inconsistent state!', colors.yellow);
    log('   Review the error above and fix manually if needed.', colors.yellow);
    return false;
  }
}

function cleanup(schemaFile) {
  log('\n🧹 Cleaning up...', colors.cyan);
  
  try {
    if (fs.existsSync(schemaFile)) {
      // Keep the schema file for review
      log(`📄 Schema file saved: ${schemaFile}`, colors.reset);
      log('   Review it or delete it manually when no longer needed', colors.reset);
    }
  } catch (error) {
    // Non-critical error
    log('⚠️  Could not clean up temporary files', colors.yellow);
  }
}

async function main() {
  log(`${colors.bright}${colors.magenta}\n╔══════════════════════════════════════════════════════════╗\n║  🔄 Schema Sync: Staging → Production                    ║\n║                                                          ║\n║  Safely synchronizes database schema without data       ║\n╚══════════════════════════════════════════════════════════╝\n${colors.reset}`);

  // Step 1: Check/Install Supabase CLI
  if (!checkSupabaseCLI()) {
    log('\n⚠️  Supabase CLI not found', colors.yellow);
    if (!installSupabaseCLI()) {
      process.exit(1);
    }
  } else {
    log('\n✅ Supabase CLI is installed', colors.green);
  }

  // Step 2: Validate environment
  if (!validateEnvironment()) {
    process.exit(1);
  }

  // Step 3: Export staging schema
  const schemaFile = exportStagingSchema();
  if (!schemaFile) {
    process.exit(1);
  }

  // Step 4: Review schema
  reviewSchema(schemaFile);

  // Step 5: Confirm proceed
  if (!confirmProceed()) {
    log('\n🛑 Schema sync cancelled', colors.yellow);
    log('   Schema file saved for your review', colors.reset);
    process.exit(0);
  }

  // Step 6: Apply to production
  const success = applyToProduction(schemaFile);

  // Step 7: Cleanup
  cleanup(schemaFile);

  // Final status
  if (success) {
    log(`\n${colors.green}${colors.bright}\n╔══════════════════════════════════════════════════════════╗\n║  ✅ Schema Sync Complete!                                ║\n║                                                          ║\n║  Production schema is now synchronized with staging     ║\n╚══════════════════════════════════════════════════════════╝\n${colors.reset}`);
    
    log('\n📋 Next Steps:', colors.cyan);
    log('   1. Test critical functions in production', colors.reset);
    log('   2. Monitor error logs for schema-related issues', colors.reset);
    log('   3. Verify application functionality', colors.reset);
    
    process.exit(0);
  } else {
    log('\n❌ Schema sync failed', colors.red);
    log('   Review errors above and fix manually', colors.yellow);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log('\n💥 Unexpected error:', colors.red);
  log(error.message, colors.red);
  process.exit(1);
});

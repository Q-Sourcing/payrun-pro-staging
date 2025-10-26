#!/usr/bin/env node

/**
 * Database Migration Helper Script
 * Provides guidance and commands for migrating from staging to production
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🗄️  Database Migration Helper\n');

// Database connection details
const stagingConfig = {
  projectId: 'sbphmrjoappwlervnbtm',
  password: 'vXPamfyygrwnJwoy',
  host: 'db.sbphmrjoappwlervnbtm.supabase.co',
  port: 5432,
  database: 'postgres',
  username: 'postgres'
};

const productionConfig = {
  projectId: 'ftiqmqrjzebibcixpnll',
  password: 'gWaZuprod1!',
  host: 'db.ftiqmqrjzebibcixpnll.supabase.co',
  port: 5432,
  database: 'postgres',
  username: 'postgres'
};

console.log('📋 Migration Configuration:');
console.log(`   Source (Staging): ${stagingConfig.projectId}`);
console.log(`   Target (Production): ${productionConfig.projectId}\n`);

// Check if PostgreSQL tools are available
function checkPostgreSQLTools() {
  try {
    const pgDumpVersion = execSync('pg_dump --version', { encoding: 'utf8' });
    const psqlVersion = execSync('psql --version', { encoding: 'utf8' });
    console.log('✅ PostgreSQL tools available:');
    console.log(`   ${pgDumpVersion.trim()}`);
    console.log(`   ${psqlVersion.trim()}\n`);
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL tools not found');
    console.log('   Install with: brew install postgresql\n');
    return false;
  }
}

// Generate migration commands
function generateMigrationCommands() {
  console.log('🚀 Migration Commands:\n');
  
  console.log('1️⃣ Export from Staging:');
  console.log(`   pg_dump "postgresql://${stagingConfig.username}:${stagingConfig.password}@${stagingConfig.host}:${stagingConfig.port}/${stagingConfig.database}" -f payroll_staging_dump.sql\n`);
  
  console.log('2️⃣ Import to Production:');
  console.log(`   psql "postgresql://${productionConfig.username}:${productionConfig.password}@${productionConfig.host}:${productionConfig.port}/${productionConfig.database}" -f payroll_staging_dump.sql\n`);
  
  console.log('3️⃣ Alternative - Schema Only:');
  console.log(`   pg_dump --schema-only "postgresql://${stagingConfig.username}:${stagingConfig.password}@${stagingConfig.host}:${stagingConfig.port}/${stagingConfig.database}" -f schema_only.sql\n`);
}

// Check environment configuration
function checkEnvironmentConfig() {
  console.log('🔧 Environment Configuration Check:\n');
  
  const envFiles = ['.env.local', '.env.production'];
  let configCorrect = true;
  
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (file === '.env.local' && content.includes('sbphmrjoappwlervnbtm')) {
        console.log(`✅ ${file}: Correctly configured for staging`);
      } else if (file === '.env.production' && content.includes('ftiqmqrjzebibcixpnll')) {
        console.log(`✅ ${file}: Correctly configured for production`);
      } else {
        console.log(`❌ ${file}: Configuration needs update`);
        configCorrect = false;
      }
    } else {
      console.log(`❌ ${file}: File not found`);
      configCorrect = false;
    }
  });
  
  if (configCorrect) {
    console.log('\n✅ Environment configuration is correct!');
    console.log('   Staging branch → Staging database');
    console.log('   Main branch → Production database');
  } else {
    console.log('\n❌ Environment configuration needs updates');
  }
  
  return configCorrect;
}

// Main execution
function main() {
  const hasPostgreSQL = checkPostgreSQLTools();
  
  if (hasPostgreSQL) {
    generateMigrationCommands();
  } else {
    console.log('📖 Alternative Migration Methods:');
    console.log('   1. Use Supabase Dashboard (Recommended)');
    console.log('   2. Use pgAdmin or similar database client');
    console.log('   3. Install PostgreSQL tools: brew install postgresql\n');
  }
  
  checkEnvironmentConfig();
  
  console.log('\n📚 For detailed instructions, see: DATABASE_MIGRATION_GUIDE.md');
  console.log('\n⚠️  Important:');
  console.log('   - Always backup production before migration');
  console.log('   - Test migration in development environment first');
  console.log('   - Plan for brief downtime during migration');
  console.log('   - Have a rollback strategy ready\n');
  
  console.log('🎯 Next Steps:');
  console.log('   1. Choose migration method (Dashboard recommended)');
  console.log('   2. Execute migration');
  console.log('   3. Verify data integrity');
  console.log('   4. Test application functionality');
  console.log('   5. Update team on completion\n');
}

// Run the migration helper
main();

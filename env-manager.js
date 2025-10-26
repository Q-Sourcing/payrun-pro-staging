import fs from 'fs';
import { execSync } from 'child_process';

/**
 * Environment Manager for Payroll Project
 * Automatically switches environment based on current Git branch
 * 
 * Branch Mapping:
 * - staging branch → .env.local (staging environment)
 * - main branch → .env.production (production environment)
 */

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️  Could not determine Git branch, defaulting to staging');
    return 'staging';
  }
}

function copyEnvironmentFile(sourceFile, targetFile) {
  try {
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Environment file not found: ${sourceFile}`);
      console.log('💡 Please create the environment files:');
      console.log('   - .env.local (for staging)');
      console.log('   - .env.production (for production)');
      process.exit(1);
    }

    fs.copyFileSync(sourceFile, targetFile);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy environment file: ${error.message}`);
    return false;
  }
}

function main() {
  const branch = getCurrentBranch();
  const targetEnv = branch === 'staging' ? '.env.local' : '.env.production';
  const activeEnv = '.env.next';
  
  console.log(`🔁 Environment Manager - Branch: ${branch}`);
  
  if (copyEnvironmentFile(targetEnv, activeEnv)) {
    console.log(`✅ Environment set for branch: ${branch}`);
    console.log(`🔗 Using configuration from ${targetEnv}`);
    
    // Display environment info
    try {
      const envContent = fs.readFileSync(activeEnv, 'utf8');
      const envLines = envContent.split('\n').filter(line => 
        line.includes('VITE_ENVIRONMENT') || 
        line.includes('VITE_SUPABASE_URL') ||
        line.includes('NEXT_PUBLIC_ENVIRONMENT')
      );
      
      if (envLines.length > 0) {
        console.log('📋 Environment Configuration:');
        envLines.forEach(line => {
          if (line.trim() && !line.startsWith('#')) {
            console.log(`   ${line}`);
          }
        });
      }
    } catch (error) {
      // Ignore errors reading env file for display
    }
  } else {
    process.exit(1);
  }
}

// Run the environment manager
main();

import fs from 'fs';

/**
 * Environment Manager for Production Repository
 * Always uses production environment configuration
 * 
 * This repository is dedicated to production environment only
 */

function copyEnvironmentFile(sourceFile, targetFile) {
  try {
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Environment file not found: ${sourceFile}`);
      console.log('💡 Please create the production environment file:');
      console.log('   - .env.production (for production environment)');
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
  const sourceEnv = '.env.production';
  const activeEnv = '.env.next';
  
  console.log(`🔁 Production Environment Manager`);
  
  if (copyEnvironmentFile(sourceEnv, activeEnv)) {
    console.log(`✅ Environment set for production`);
    console.log(`🔗 Using configuration from ${sourceEnv}`);
    
    // Display environment info
    try {
      const envContent = fs.readFileSync(activeEnv, 'utf8');
      const envLines = envContent.split('\n').filter(line => 
        line.includes('VITE_ENVIRONMENT') || 
        line.includes('VITE_SUPABASE_URL') ||
        line.includes('NEXT_PUBLIC_ENVIRONMENT')
      );
      
      if (envLines.length > 0) {
        console.log('📋 Production Environment Configuration:');
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
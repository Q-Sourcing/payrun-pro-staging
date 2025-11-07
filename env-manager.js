import fs from 'fs';

/**
 * Environment Manager
 * Prefer environment-specific files in development; keep production on .env.production
 */

function copyEnvironmentFile(sourceFile, targetFile) {
  try {
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Environment file not found: ${sourceFile}`);
      console.log('💡 Create one of: .env.staging, .env.development, or .env.production');
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
  const isDev = process.env.NODE_ENV !== 'production';

  // Resolve source env file: prefer staging in dev, then development, fallback to production
  let sourceEnv = '.env.production';
  if (isDev) {
    if (fs.existsSync('.env.staging')) {
      sourceEnv = '.env.staging';
    } else if (fs.existsSync('.env.development')) {
      sourceEnv = '.env.development';
    }
  }

  const activeEnv = '.env.next';
  
  console.log(`🔁 Environment Manager (${isDev ? 'dev' : 'prod'})`);
  console.log(`🔗 Using configuration from ${sourceEnv}`);
  
  if (copyEnvironmentFile(sourceEnv, activeEnv)) {
    console.log(`✅ Environment set from ${sourceEnv}`);
    // Display key env lines
    try {
      const envContent = fs.readFileSync(activeEnv, 'utf8');
      const envLines = envContent.split('\n').filter(line => 
        line.includes('VITE_ENVIRONMENT') || 
        line.includes('VITE_SUPABASE_URL') ||
        line.includes('NEXT_PUBLIC_ENVIRONMENT')
      );
      if (envLines.length > 0) {
        console.log('📋 Active Environment Configuration:');
        envLines.forEach(line => {
          if (line.trim() && !line.startsWith('#')) {
            console.log(`   ${line}`);
          }
        });
      }
    } catch {}
  } else {
    process.exit(1);
  }
}

// Run the environment manager
main();
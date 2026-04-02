import fs from 'fs';
import { execSync } from 'child_process';

/**
 * Environment Manager
 * Prefer environment-specific files in development; keep production on .env.production
 */

function escapeEnvValue(value) {
  // Keep .env syntax safe for quoted values.
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\n');
}

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

function applyEnvOverrides(targetFile, overrides) {
  const entries = Object.entries(overrides)
    .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0);

  if (entries.length === 0) return;

  // Appending overrides ensures they take precedence over earlier values.
  const lines = entries.map(([key, value]) => `${key}="${escapeEnvValue(value)}"`).join('\n');
  fs.appendFileSync(targetFile, `\n${lines}\n`);
}

function main() {
  const isDev = process.env.NODE_ENV !== 'production';
  let currentBranch = '';

  try {
    currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    // Keep fallback behavior when git context is unavailable.
  }

  // Resolve source env file:
  // - production runtime => .env.production
  // - develop branch in dev => .env.develop when present
  // - fallback in dev => staging, then development
  let sourceEnv = '.env.production';
  if (isDev) {
    if ((currentBranch === 'develop' || currentBranch === 'development') && fs.existsSync('.env.develop')) {
      sourceEnv = '.env.develop';
    } else if (fs.existsSync('.env.staging')) {
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

    // Allow CI/CD to inject sensitive values at runtime without committing them
    // into `.env.staging` / `.env.production`.
    applyEnvOverrides(activeEnv, {
      // Vite / client-side env
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID,
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,

      // Common app env keys
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
      VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT,
      NODE_ENV: process.env.NODE_ENV,

      // Non-Vite server-side validation keys (not exposed by Vite).
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

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
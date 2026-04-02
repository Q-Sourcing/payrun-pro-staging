#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

function log(msg) {
  console.log(msg);
}

function getCurrentBranch() {
  return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
}

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (!key || valueParts.length === 0) return;
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  });

  return env;
}

function projectRefFromUrl(url) {
  if (!url) return '';
  const match = String(url).match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : '';
}

function resolveEnvFile(branch) {
  if (branch === 'main' || branch === 'master' || branch === 'production') return '.env.production';
  if (branch === 'staging') return '.env.staging';
  if (branch === 'develop' || branch === 'development') {
    if (fs.existsSync('.env.develop')) return '.env.develop';
    if (fs.existsSync('.env.development')) return '.env.development';
    return '.env.staging';
  }
  return '.env.staging';
}

function main() {
  try {
    const branch = getCurrentBranch();
    const sourceEnv = resolveEnvFile(branch);

    if (!fs.existsSync(sourceEnv)) {
      console.error(`Missing env file: ${sourceEnv}`);
      process.exit(1);
    }

    const targets = ['.env.next', '.env'];
    targets.forEach((target) => fs.copyFileSync(sourceEnv, target));
    log(`Synced env for branch "${branch}" using ${sourceEnv} -> ${targets.join(', ')}`);

    const envVars = parseEnvFile(sourceEnv);
    const projectRef =
      envVars.VITE_SUPABASE_PROJECT_ID || projectRefFromUrl(envVars.VITE_SUPABASE_URL);

    if (!projectRef) {
      log('No Supabase project ref found in env file; skipped supabase link.');
      process.exit(0);
    }

    log(`Linking Supabase project: ${projectRef}`);
    execSync(`supabase link --project-ref ${projectRef}`, { stdio: 'inherit' });
    log('Supabase link complete.');
  } catch (error) {
    console.error(`Branch sync failed: ${error.message}`);
    process.exit(1);
  }
}

main();

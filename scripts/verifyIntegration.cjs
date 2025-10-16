#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

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

function getGitInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return { remoteUrl, branch, commit };
  } catch (error) {
    return { remoteUrl: 'unknown', branch: 'unknown', commit: 'unknown' };
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

async function verifyIntegration() {
  log('\n🔧 INTEGRATION VERIFICATION STARTING...', colors.bold + colors.blue);
  
  const { remoteUrl, branch, commit } = getGitInfo();
  const envVars = loadEnvFile('.env');
  
  log(`\n📋 Current Environment:`, colors.bold);
  log(`  • Repository: ${remoteUrl}`);
  log(`  • Branch: ${branch}`);
  log(`  • Commit: ${commit}`);
  log(`  • Supabase URL: ${envVars.VITE_SUPABASE_URL || 'Not set'}`);
  
  // Determine expected environment
  let expectedEnv = 'UNKNOWN';
  let expectedLovableProject = '';
  let expectedSupabaseProject = '';
  
  if (branch === 'main') {
    expectedEnv = 'PRODUCTION';
    expectedLovableProject = 'payrun-pro';
    expectedSupabaseProject = 'kctwfgbjmhnfqtxhagib';
  } else if (branch === 'staging') {
    expectedEnv = 'STAGING';
    expectedLovableProject = 'payrun-pro-staging';
    expectedSupabaseProject = 'sbphmrjoappwlervnbtm';
  }
  
  log(`\n🎯 Expected Configuration:`, colors.bold);
  log(`  • Environment: ${expectedEnv}`);
  log(`  • Lovable Project: ${expectedLovableProject}`);
  log(`  • Supabase Project: ${expectedSupabaseProject}`);
  
  // Check Supabase URL matches expected
  const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
  const supabaseMatches = supabaseUrl.includes(expectedSupabaseProject);
  
  log(`\n✅ Integration Checks:`, colors.bold);
  
  // Check 1: Repository
  const repoMatches = remoteUrl.includes('Q-Sourcing/payrun-pro');
  log(`  ${repoMatches ? '✅' : '❌'} Repository: ${repoMatches ? 'Correct' : 'Incorrect'}`);
  
  // Check 2: Branch
  const branchMatches = (branch === 'main' || branch === 'staging');
  log(`  ${branchMatches ? '✅' : '❌'} Branch: ${branchMatches ? 'Correct' : 'Incorrect'}`);
  
  // Check 3: Supabase URL
  log(`  ${supabaseMatches ? '✅' : '❌'} Supabase URL: ${supabaseMatches ? 'Correct' : 'Incorrect'}`);
  
  // Check 4: Environment variables
  const hasEnvVars = envVars.VITE_SUPABASE_URL && envVars.VITE_SUPABASE_ANON_KEY;
  log(`  ${hasEnvVars ? '✅' : '❌'} Environment Variables: ${hasEnvVars ? 'Present' : 'Missing'}`);
  
  // Check 5: GitHub Actions workflows
  const hasWorkflows = fs.existsSync('.github/workflows/deploy-staging.yml') && 
                      fs.existsSync('.github/workflows/deploy-production.yml') &&
                      fs.existsSync('.github/workflows/environment-health.yml');
  log(`  ${hasWorkflows ? '✅' : '❌'} GitHub Actions: ${hasWorkflows ? 'Configured' : 'Missing'}`);
  
  // Check 6: Environment detection script
  const hasEnvScript = fs.existsSync('src/lib/getEnvironmentLabel.ts');
  log(`  ${hasEnvScript ? '✅' : '❌'} Environment Detection: ${hasEnvScript ? 'Available' : 'Missing'}`);
  
  // Check 7: Health monitoring
  const hasHealthScript = fs.existsSync('scripts/sendHealthReport.cjs');
  log(`  ${hasHealthScript ? '✅' : '❌'} Health Monitoring: ${hasHealthScript ? 'Configured' : 'Missing'}`);
  
  // Overall status
  const allChecks = repoMatches && branchMatches && supabaseMatches && hasEnvVars && hasWorkflows && hasEnvScript && hasHealthScript;
  
  log(`\n📊 Integration Status:`, colors.bold);
  if (allChecks) {
    log(`  ✅ ALL SYSTEMS OPERATIONAL`, colors.green + colors.bold);
    log(`  🚀 Ready for Lovable auto-deployment`, colors.green);
  } else {
    log(`  ⚠️ ISSUES DETECTED`, colors.yellow + colors.bold);
    log(`  🔧 Please review the checks above`, colors.yellow);
  }
  
  // Generate integration report
  const report = {
    timestamp: new Date().toISOString(),
    environment: expectedEnv,
    repository: remoteUrl,
    branch,
    commit,
    expectedLovableProject,
    expectedSupabaseProject,
    supabaseUrl,
    checks: {
      repository: repoMatches,
      branch: branchMatches,
      supabase: supabaseMatches,
      envVars: hasEnvVars,
      workflows: hasWorkflows,
      envDetection: hasEnvScript,
      healthMonitoring: hasHealthScript
    },
    overallStatus: allChecks ? 'OPERATIONAL' : 'ISSUES_DETECTED'
  };
  
  fs.writeFileSync('INTEGRATION_STATUS.json', JSON.stringify(report, null, 2));
  log(`\n📄 Integration report saved: INTEGRATION_STATUS.json`);
  
  return allChecks;
}

// Run verification
verifyIntegration()
  .then(success => {
    if (success) {
      log(`\n🎉 INTEGRATION VERIFICATION COMPLETED SUCCESSFULLY!`, colors.green + colors.bold);
      log(`Your Q-Payroll system is ready for production and staging deployments.`, colors.green);
    } else {
      log(`\n⚠️ INTEGRATION VERIFICATION COMPLETED WITH ISSUES!`, colors.yellow + colors.bold);
      log(`Please review the issues above and fix them before deployment.`, colors.yellow);
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n💥 VERIFICATION FAILED: ${error.message}`, colors.red + colors.bold);
    process.exit(1);
  });

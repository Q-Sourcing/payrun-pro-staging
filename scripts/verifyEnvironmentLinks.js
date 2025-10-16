#!/usr/bin/env node

/**
 * 🧠 Q-Payroll Environment Verification Script (Simplified)
 * 
 * This script validates that all environments are correctly connected across
 * Supabase projects, GitHub repositories, and Lovable AI apps.
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Expected configuration map
const environments = {
  production: {
    branch: "main",
    repo: "Q-Sourcing/payrun-pro",
    supabaseRef: "kctwfgbjmhnfqtxhagib",
    lovableApp: "Payroll"
  },
  staging: {
    branch: "staging", 
    repo: "Q-Sourcing/payrunpro-staging",
    supabaseRef: "sbphmrjoappwlervnbtm",
    lovableApp: "Payroll-Staging"
  }
};

class EnvironmentVerifier {
  constructor() {
    this.checks = [];
    this.isGitHubAction = this.detectGitHubAction();
    this.currentBranch = '';
    this.remoteUrl = '';
    this.currentEnv = '';
    
    this.detectGitInfo();
    this.determineEnvironment();
  }

  detectGitHubAction() {
    return !!(
      process.env.GITHUB_REPOSITORY || 
      process.env.GITHUB_REF_NAME ||
      process.env.GITHUB_ACTIONS
    );
  }

  detectGitInfo() {
    try {
      this.currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      this.remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      // Convert SSH URL to HTTPS format for comparison
      if (this.remoteUrl.startsWith('git@github.com:')) {
        this.remoteUrl = this.remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
      }
    } catch (error) {
      console.error(`${colors.red}❌ Failed to detect Git information:${colors.reset}`, error.message);
      this.currentBranch = 'unknown';
      this.remoteUrl = 'unknown';
    }
  }

  determineEnvironment() {
    if (this.currentBranch === 'main') {
      this.currentEnv = 'production';
    } else if (this.currentBranch === 'staging') {
      this.currentEnv = 'staging';
    } else {
      this.currentEnv = 'unknown';
    }
  }

  loadEnvironmentVariables() {
    const envFiles = ['.env', '.env.staging', '.env.production'];
    const envVars = {};

    for (const envFile of envFiles) {
      if (existsSync(envFile)) {
        try {
          const content = readFileSync(envFile, 'utf8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              const [key, ...valueParts] = trimmedLine.split('=');
              if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
              }
            }
          }
        } catch (error) {
          console.warn(`${colors.yellow}⚠️ Warning: Could not read ${envFile}${colors.reset}`);
        }
      }
    }

    return envVars;
  }

  extractSupabaseProjectRef(url) {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  }

  checkGitHubRepository() {
    const expected = environments[this.currentEnv]?.repo || 'unknown';
    const actual = this.remoteUrl || 'unknown';
    
    return {
      name: 'GitHub Repository',
      expected,
      actual,
      status: expected === actual ? 'match' : 'mismatch'
    };
  }

  checkSupabaseProject() {
    const envVars = this.loadEnvironmentVariables();
    const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    const projectRef = this.extractSupabaseProjectRef(supabaseUrl || '');
    
    const expected = environments[this.currentEnv]?.supabaseRef || 'unknown';
    const actual = projectRef || 'not found';
    
    return {
      name: 'Supabase Project',
      expected,
      actual,
      status: expected === actual ? 'match' : 'mismatch'
    };
  }

  checkLovableApp() {
    const lovableAppName = process.env.LOVABLE_APP_NAME || 
                          (this.currentBranch === 'main' ? 'Payroll' : 
                           this.currentBranch === 'staging' ? 'Payroll-Staging' : 'unknown');
    
    const expected = environments[this.currentEnv]?.lovableApp || 'unknown';
    const actual = lovableAppName;
    
    return {
      name: 'Lovable App',
      expected,
      actual,
      status: expected === actual ? 'match' : 'mismatch'
    };
  }

  checkEnvironmentVariables() {
    const envVars = this.loadEnvironmentVariables();
    const hasSupabaseUrl = !!(envVars.VITE_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL);
    const hasSupabaseKey = !!(envVars.VITE_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const status = hasSupabaseUrl && hasSupabaseKey ? 'match' : 'mismatch';
    
    return {
      name: 'Environment Variables',
      expected: 'Present',
      actual: hasSupabaseUrl && hasSupabaseKey ? 'Present' : 'Missing',
      status
    };
  }

  printHeader() {
    console.log(`${colors.cyan}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
    console.log(`${colors.cyan}┃   ${colors.bright}${colors.white}Q-PAYROLL ENVIRONMENT VERIFICATION${colors.reset}${colors.cyan}  ┃${colors.reset}`);
    console.log(`${colors.cyan}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}\n`);
  }

  printCheck(check) {
    const statusIcon = check.status === 'match' ? 
      `${colors.green}✅` : 
      check.status === 'mismatch' ? 
      `${colors.red}❌` : 
      `${colors.yellow}⚠️`;
    
    console.log(`${check.name}: ${check.actual} ${statusIcon}${colors.reset}`);
  }

  printSummary() {
    const allMatch = this.checks.every(check => check.status === 'match');
    const hasMismatch = this.checks.some(check => check.status === 'mismatch');
    
    console.log(`\n${colors.cyan}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
    console.log(`${colors.cyan}┃              ${colors.bright}SUMMARY${colors.reset}${colors.cyan}                ┃${colors.reset}`);
    console.log(`${colors.cyan}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}\n`);
    
    if (allMatch) {
      console.log(`${colors.green}🔒 Environment: ${this.currentEnv.toUpperCase()}${colors.reset}`);
      console.log(`${colors.green}✅ All environment links verified successfully.${colors.reset}\n`);
    } else if (hasMismatch) {
      console.log(`${colors.red}⚠️ ENVIRONMENT MISMATCH DETECTED${colors.reset}`);
      console.log(`Branch: ${this.currentBranch}`);
      
      for (const check of this.checks) {
        if (check.status === 'mismatch') {
          console.log(`${check.name}: ${check.actual} ${colors.red}❌ (Expected: ${check.expected})${colors.reset}`);
        }
      }
      
      this.printActionRequired();
    }
    
    if (this.isGitHubAction) {
      this.printGitHubActionInfo();
    }
    
    console.log(`\n${colors.dim}───────────────${colors.reset}`);
    console.log(`${colors.bright}Q-PAYROLL ENVIRONMENT AUDIT COMPLETE${colors.reset}`);
    console.log(`Safe: ${allMatch ? `${colors.green}TRUE${colors.reset}` : `${colors.red}FALSE${colors.reset}`}`);
    
    return allMatch;
  }

  printActionRequired() {
    console.log(`\n${colors.yellow}💡 Action Required:${colors.reset}`);
    
    if (this.currentEnv === 'staging') {
      console.log(`• Switch to staging Supabase in Lovable → Integrations → Supabase`);
      console.log(`• Ensure you're connected to project: ${environments.staging.supabaseRef}`);
      console.log(`• Verify GitHub remote points to: ${environments.staging.repo}`);
    } else if (this.currentEnv === 'production') {
      console.log(`• Verify you're connected to production Supabase: ${environments.production.supabaseRef}`);
      console.log(`• Ensure GitHub remote points to: ${environments.production.repo}`);
      console.log(`• Confirm Lovable app is set to: ${environments.production.lovableApp}`);
    } else {
      console.log(`• You're on branch "${this.currentBranch}" which is not recognized`);
      console.log(`• Switch to "main" for production or "staging" for staging environment`);
    }
  }

  printGitHubActionInfo() {
    console.log(`\n${colors.blue}📋 GitHub Action Detected:${colors.reset}`);
    console.log(`Repository: ${process.env.GITHUB_REPOSITORY || 'unknown'}`);
    console.log(`Branch: ${process.env.GITHUB_REF_NAME || 'unknown'}`);
    console.log(`Lovable App: ${process.env.LOVABLE_APP_NAME || 'not set'}`);
  }

  verify() {
    this.printHeader();
    
    console.log(`Branch: ${this.currentBranch}`);
    
    // Perform all checks
    this.checks = [
      this.checkGitHubRepository(),
      this.checkSupabaseProject(),
      this.checkLovableApp(),
      this.checkEnvironmentVariables()
    ];
    
    // Print individual check results
    for (const check of this.checks) {
      this.printCheck(check);
    }
    
    // Print summary and return result
    return this.printSummary();
  }
}

// Main execution
function main() {
  try {
    const verifier = new EnvironmentVerifier();
    const isSafe = verifier.verify();
    
    // Exit with appropriate code
    process.exit(isSafe ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ Verification failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { EnvironmentVerifier };

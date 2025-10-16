#!/usr/bin/env npx ts-node

/**
 * 🧠 Q-Payroll Environment Verification Script (With Email Alerts)
 * 
 * Enhanced version with email notifications for environment mismatches
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import nodemailer from 'nodemailer';

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

interface EnvironmentCheck {
  name: string;
  expected: string;
  actual: string;
  status: 'match' | 'mismatch' | 'unknown';
}

class EnvironmentVerifierWithEmail {
  private checks: EnvironmentCheck[] = [];
  private isGitHubAction: boolean = false;
  private currentBranch: string = '';
  private remoteUrl: string = '';
  private currentEnv: string = '';
  private hasMismatch: boolean = false;

  constructor() {
    this.detectGitHubAction();
    this.detectGitInfo();
    this.determineEnvironment();
  }

  private detectGitHubAction(): void {
    this.isGitHubAction = !!(
      process.env.GITHUB_REPOSITORY || 
      process.env.GITHUB_REF_NAME ||
      process.env.GITHUB_ACTIONS
    );
  }

  private detectGitInfo(): void {
    try {
      this.currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      this.remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      // Convert SSH URL to HTTPS format for comparison
      if (this.remoteUrl.startsWith('git@github.com:')) {
        this.remoteUrl = this.remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
      }
    } catch (error) {
      console.error(`${colors.red}❌ Failed to detect Git information:${colors.reset}`, error);
      this.currentBranch = 'unknown';
      this.remoteUrl = 'unknown';
    }
  }

  private determineEnvironment(): void {
    if (this.currentBranch === 'main') {
      this.currentEnv = 'production';
    } else if (this.currentBranch === 'staging') {
      this.currentEnv = 'staging';
    } else {
      this.currentEnv = 'unknown';
    }
  }

  private loadEnvironmentVariables(): { [key: string]: string } {
    const envFiles = ['.env', '.env.staging', '.env.production'];
    const envVars: { [key: string]: string } = {};

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

  private extractSupabaseProjectRef(url: string): string | null {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  }

  private checkGitHubRepository(): EnvironmentCheck {
    const expected = environments[this.currentEnv as keyof typeof environments]?.repo || 'unknown';
    const actual = this.remoteUrl || 'unknown';
    
    return {
      name: 'GitHub Repository',
      expected,
      actual,
      status: expected === actual ? 'match' : 'mismatch'
    };
  }

  private checkSupabaseProject(): EnvironmentCheck {
    const envVars = this.loadEnvironmentVariables();
    const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    const projectRef = this.extractSupabaseProjectRef(supabaseUrl || '');
    
    const expected = environments[this.currentEnv as keyof typeof environments]?.supabaseRef || 'unknown';
    const actual = projectRef || 'not found';
    
    return {
      name: 'Supabase Project',
      expected,
      actual,
      status: expected === actual ? 'match' : 'mismatch'
    };
  }

  private checkLovableApp(): EnvironmentCheck {
    const lovableAppName = process.env.LOVABLE_APP_NAME || 
                          (this.currentBranch === 'main' ? 'Payroll' : 
                           this.currentBranch === 'staging' ? 'Payroll-Staging' : 'unknown');
    
    const expected = environments[this.currentEnv as keyof typeof environments]?.lovableApp || 'unknown';
    const actual = lovableAppName;
    
    return {
      name: 'Lovable App',
      expected,
      actual,
      status: expected === actual ? 'match' : 'mismatch'
    };
  }

  private checkEnvironmentVariables(): EnvironmentCheck {
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

  private async sendEmailAlert(): Promise<void> {
    if (!this.hasMismatch) return;

    const mismatches = this.checks.filter(check => check.status === 'mismatch');
    
    const html = `
      <h2>⚠️ Q-Payroll Environment Mismatch Detected</h2>
      
      <h3>Environment Details:</h3>
      <ul>
        <li><strong>Branch:</strong> ${this.currentBranch}</li>
        <li><strong>Environment:</strong> ${this.currentEnv}</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        <li><strong>GitHub Action:</strong> ${this.isGitHubAction ? 'Yes' : 'No'}</li>
      </ul>
      
      <h3>Detected Mismatches:</h3>
      <ul>
        ${mismatches.map(check => `
          <li>
            <strong>${check.name}:</strong> ${check.actual} 
            <span style="color: red;">❌</span> 
            (Expected: ${check.expected})
          </li>
        `).join('')}
      </ul>
      
      <h3>Action Required:</h3>
      <ul>
        ${this.currentEnv === 'staging' ? `
          <li>Switch to staging Supabase in Lovable → Integrations → Supabase</li>
          <li>Ensure you're connected to project: ${environments.staging.supabaseRef}</li>
          <li>Verify GitHub remote points to: ${environments.staging.repo}</li>
        ` : this.currentEnv === 'production' ? `
          <li>Verify you're connected to production Supabase: ${environments.production.supabaseRef}</li>
          <li>Ensure GitHub remote points to: ${environments.production.repo}</li>
          <li>Confirm Lovable app is set to: ${environments.production.lovableApp}</li>
        ` : `
          <li>You're on branch "${this.currentBranch}" which is not recognized</li>
          <li>Switch to "main" for production or "staging" for staging environment</li>
        `}
      </ul>
      
      <p><em>This alert was generated by the Q-Payroll Environment Verification System.</em></p>
    `;

    try {
      // Create transporter (you'll need to configure this with your email provider)
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: 'nalungukevin@gmail.com',
        subject: '⚠️ Q-Payroll Environment Mismatch Detected',
        html
      });

      console.log(`${colors.green}📧 Email alert sent successfully${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Failed to send email alert:${colors.reset}`, error);
    }
  }

  private printHeader(): void {
    console.log(`${colors.cyan}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
    console.log(`${colors.cyan}┃   ${colors.bright}${colors.white}Q-PAYROLL ENVIRONMENT VERIFICATION${colors.reset}${colors.cyan}  ┃${colors.reset}`);
    console.log(`${colors.cyan}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}\n`);
  }

  private printCheck(check: EnvironmentCheck): void {
    const statusIcon = check.status === 'match' ? 
      `${colors.green}✅` : 
      check.status === 'mismatch' ? 
      `${colors.red}❌` : 
      `${colors.yellow}⚠️`;
    
    console.log(`${check.name}: ${check.actual} ${statusIcon}${colors.reset}`);
  }

  private printSummary(): void {
    const allMatch = this.checks.every(check => check.status === 'match');
    this.hasMismatch = this.checks.some(check => check.status === 'mismatch');
    
    console.log(`\n${colors.cyan}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
    console.log(`${colors.cyan}┃              ${colors.bright}SUMMARY${colors.reset}${colors.cyan}                ┃${colors.reset}`);
    console.log(`${colors.cyan}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}\n`);
    
    if (allMatch) {
      console.log(`${colors.green}🔒 Environment: ${this.currentEnv.toUpperCase()}${colors.reset}`);
      console.log(`${colors.green}✅ All environment links verified successfully.${colors.reset}\n`);
    } else if (this.hasMismatch) {
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
    
    if (this.hasMismatch) {
      console.log(`${colors.yellow}📧 Sending email alert...${colors.reset}`);
    }
  }

  private printActionRequired(): void {
    console.log(`\n${colors.yellow}💡 Action Required:${colors.reset}`);
    
    if (this.currentEnv === 'staging') {
      console.log(`• Switch to staging Supabase in Lovable → Integrations → Supabase`);
      console.log(`• Ensure you're connected to project: ${environments.staging.supabaseRef}`);
      console.log(`• Verify GitHub remote points to: ${environments.staging.repo}`);
    } else if (this.currentEnv === 'production') {
      console.log(`• Verify you're connected to production Supabase: ${environments.production.supabaseRef}`);
      console.log(`• Ensure GitHub remote points to: ${environments.production.repo}`);
      console.log(`• Confirm Lovable app is set to: ${environments.production.lovableApp}`);
    }
  }

  private printGitHubActionInfo(): void {
    console.log(`\n${colors.blue}📋 GitHub Action Detected:${colors.reset}`);
    console.log(`Repository: ${process.env.GITHUB_REPOSITORY || 'unknown'}`);
    console.log(`Branch: ${process.env.GITHUB_REF_NAME || 'unknown'}`);
    console.log(`Lovable App: ${process.env.LOVABLE_APP_NAME || 'not set'}`);
  }

  public async verify(): Promise<boolean> {
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
    
    // Print summary
    this.printSummary();
    
    // Send email alert if there are mismatches
    if (this.hasMismatch) {
      await this.sendEmailAlert();
    }
    
    // Return true if all checks pass
    return this.checks.every(check => check.status === 'match');
  }
}

// Main execution
async function main() {
  try {
    const verifier = new EnvironmentVerifierWithEmail();
    const isSafe = await verifier.verify();
    
    // Exit with appropriate code
    process.exit(isSafe ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ Verification failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { EnvironmentVerifierWithEmail };

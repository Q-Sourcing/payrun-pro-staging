#!/usr/bin/env node

/**
 * ✅ Verify Employee Counts in Pay Runs
 * 
 * Verifies that pay runs now show correct employee counts
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

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

class EmployeeCountVerifier {
  constructor() {
    this.stagingClient = null;
  }

  loadEnvironmentVariables() {
    const envFiles = ['.env.sync', '.env.production', '.env.staging', '.env'];
    
    for (const envFile of envFiles) {
      const envPath = join(process.cwd(), envFile);
      if (existsSync(envPath)) {
        try {
          const content = readFileSync(envPath, 'utf8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              const [key, ...valueParts] = trimmedLine.split('=');
              if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key.trim()] = value;
              }
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }

  async initializeClient() {
    const stagingUrl = process.env.STAGING_SUPABASE_URL;
    const stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    
    this.stagingClient = createClient(stagingUrl, stagingServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async verifyEmployeeCounts() {
    console.log(`${colors.blue}🔍 Verifying employee counts in pay runs...${colors.reset}`);
    
    try {
      // Check if payrun_employees table exists
      const { data: tableCheck, error: tableError } = await this.stagingClient
        .from('payrun_employees')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log(`${colors.red}❌ payrun_employees table doesn't exist yet${colors.reset}`);
        console.log(`${colors.yellow}⚠️ Please run the SQL in your Supabase Dashboard first${colors.reset}`);
        return false;
      }
      
      console.log(`${colors.green}✅ payrun_employees table exists${colors.reset}`);
      
      // Get pay runs with employee counts
      const { data: payRunCounts, error: countsError } = await this.stagingClient
        .from('payrun_employees')
        .select(`
          pay_run_id,
          pay_runs!inner(
            id,
            name,
            pay_period_start,
            pay_period_end,
            gross_pay,
            net_pay,
            status
          )
        `);
      
      if (countsError) {
        console.error(`${colors.red}❌ Error fetching pay run counts: ${countsError.message}${colors.reset}`);
        return false;
      }
      
      // Group by pay run
      const payRunGroups = {};
      for (const item of payRunCounts) {
        const payRun = item.pay_runs;
        if (!payRunGroups[payRun.id]) {
          payRunGroups[payRun.id] = {
            payRun: payRun,
            employeeCount: 0
          };
        }
        payRunGroups[payRun.id].employeeCount++;
      }
      
      console.log(`${colors.green}✅ Found ${Object.keys(payRunGroups).length} pay runs with relationships${colors.reset}`);
      
      // Display results
      console.log(`${colors.cyan}📊 Pay Run Employee Counts:${colors.reset}`);
      for (const [payRunId, data] of Object.entries(payRunGroups)) {
        const { payRun, employeeCount } = data;
        console.log(`${colors.green}  ✅ ${payRun.name}: ${employeeCount} employees${colors.reset}`);
        console.log(`     Period: ${payRun.pay_period_start} - ${payRun.pay_period_end}`);
        console.log(`     Gross: ${payRun.gross_pay}, Net: ${payRun.net_pay}`);
        console.log(`     Status: ${payRun.status}`);
        console.log('');
      }
      
      return true;
      
    } catch (error) {
      console.error(`${colors.red}❌ Verification failed: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async runVerification() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('✅ Employee Count Verification');
      console.log('==============================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClient();

      const success = await this.verifyEmployeeCounts();
      
      if (success) {
        console.log(`${colors.green}${colors.bright}`);
        console.log('🎉 SUCCESS: Employee counts are now working!');
        console.log('==============================================');
        console.log('Your pay runs should now show the correct employee counts.');
        console.log('Refresh your app to see the updated data.');
        console.log(`${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️ Please run the SQL in Supabase Dashboard first${colors.reset}`);
      }

    } catch (error) {
      console.error(`${colors.red}❌ Verification failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const verifier = new EmployeeCountVerifier();
  await verifier.runVerification();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EmployeeCountVerifier };

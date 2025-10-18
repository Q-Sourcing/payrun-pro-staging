#!/usr/bin/env node

/**
 * 🔍 Employee-PayRun Relationship Investigator
 * 
 * Investigates the missing employee-payrun relationships
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

class EmployeePayRunInvestigator {
  constructor() {
    this.prodClient = null;
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

  async initializeClients() {
    const prodUrl = process.env.PROD_SUPABASE_URL;
    const prodServiceKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
    
    this.prodClient = createClient(prodUrl, prodServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const stagingUrl = process.env.STAGING_SUPABASE_URL;
    const stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    
    this.stagingClient = createClient(stagingUrl, stagingServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async investigateProduction() {
    console.log(`${colors.blue}🔍 Investigating Production Database...${colors.reset}`);
    
    try {
      // Check pay_runs in production
      const { data: prodPayRuns, error: prodPayRunsError } = await this.prodClient
        .from('pay_runs')
        .select('*');
      
      if (prodPayRunsError) {
        console.error(`${colors.red}❌ Error fetching production pay_runs: ${prodPayRunsError.message}${colors.reset}`);
        return;
      }
      
      console.log(`${colors.green}✅ Production pay_runs: ${prodPayRuns.length}${colors.reset}`);
      
      // Check employees in production
      const { data: prodEmployees, error: prodEmployeesError } = await this.prodClient
        .from('employees')
        .select('*');
      
      if (prodEmployeesError) {
        console.error(`${colors.red}❌ Error fetching production employees: ${prodEmployeesError.message}${colors.reset}`);
        return;
      }
      
      console.log(`${colors.green}✅ Production employees: ${prodEmployees.length}${colors.reset}`);
      
      // Check if there's a payrun_employees table or similar
      const { data: payrunEmployees, error: payrunEmployeesError } = await this.prodClient
        .from('payrun_employees')
        .select('*');
      
      if (payrunEmployeesError) {
        console.log(`${colors.yellow}⚠️ No payrun_employees table in production${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Production payrun_employees: ${payrunEmployees.length}${colors.reset}`);
      }
      
      // Check employees table for pay_run_id
      if (prodEmployees.length > 0) {
        const sampleEmployee = prodEmployees[0];
        console.log(`${colors.cyan}📋 Sample employee structure:${colors.reset}`);
        console.log(JSON.stringify(sampleEmployee, null, 2));
      }
      
      return { prodPayRuns, prodEmployees, payrunEmployees };
      
    } catch (error) {
      console.error(`${colors.red}❌ Production investigation failed: ${error.message}${colors.reset}`);
    }
  }

  async investigateStaging() {
    console.log(`${colors.blue}🔍 Investigating Staging Database...${colors.reset}`);
    
    try {
      // Check pay_runs in staging
      const { data: stagingPayRuns, error: stagingPayRunsError } = await this.stagingClient
        .from('pay_runs')
        .select('*');
      
      if (stagingPayRunsError) {
        console.error(`${colors.red}❌ Error fetching staging pay_runs: ${stagingPayRunsError.message}${colors.reset}`);
        return;
      }
      
      console.log(`${colors.green}✅ Staging pay_runs: ${stagingPayRuns.length}${colors.reset}`);
      
      // Check employees in staging
      const { data: stagingEmployees, error: stagingEmployeesError } = await this.stagingClient
        .from('employees')
        .select('*');
      
      if (stagingEmployeesError) {
        console.error(`${colors.red}❌ Error fetching staging employees: ${stagingEmployeesError.message}${colors.reset}`);
        return;
      }
      
      console.log(`${colors.green}✅ Staging employees: ${stagingEmployees.length}${colors.reset}`);
      
      // Check if employees have pay_run_id
      const employeesWithPayRun = stagingEmployees.filter(emp => emp.pay_run_id);
      console.log(`${colors.cyan}📋 Employees with pay_run_id: ${employeesWithPayRun.length}${colors.reset}`);
      
      if (employeesWithPayRun.length > 0) {
        console.log(`${colors.cyan}📋 Sample employee with pay_run_id:${colors.reset}`);
        console.log(JSON.stringify(employeesWithPayRun[0], null, 2));
      }
      
      return { stagingPayRuns, stagingEmployees, employeesWithPayRun };
      
    } catch (error) {
      console.error(`${colors.red}❌ Staging investigation failed: ${error.message}${colors.reset}`);
    }
  }

  async runInvestigation() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🔍 Employee-PayRun Relationship Investigation');
      console.log('=============================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      const prodData = await this.investigateProduction();
      const stagingData = await this.investigateStaging();
      
      console.log(`${colors.blue}📊 Investigation Summary:${colors.reset}`);
      console.log(`Production: ${prodData?.prodPayRuns?.length || 0} pay_runs, ${prodData?.prodEmployees?.length || 0} employees`);
      console.log(`Staging: ${stagingData?.stagingPayRuns?.length || 0} pay_runs, ${stagingData?.stagingEmployees?.length || 0} employees`);
      console.log(`Staging employees with pay_run_id: ${stagingData?.employeesWithPayRun?.length || 0}`);

    } catch (error) {
      console.error(`${colors.red}❌ Investigation failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const investigator = new EmployeePayRunInvestigator();
  await investigator.runInvestigation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EmployeePayRunInvestigator };

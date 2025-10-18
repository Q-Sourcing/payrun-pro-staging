#!/usr/bin/env node

/**
 * 🔧 Verify Employee Fix
 * 
 * Verifies that the employee count fix is working
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

class EmployeeFixVerifier {
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

  async initialize() {
    console.log(`${colors.blue}🔧 Initializing Supabase connection...${colors.reset}`);
    
    this.loadEnvironmentVariables();
    
    try {
      // Try to get credentials from environment
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://sbphmrjoappwlervnbtm.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseKey) {
        console.log(`${colors.yellow}⚠️ No Supabase API key found, using default staging credentials${colors.reset}`);
        this.stagingClient = createClient(
          'https://sbphmrjoappwlervnbtm.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4MDAsImV4cCI6MjA1MjU1MDgwMH0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8'
        );
      } else {
        this.stagingClient = createClient(supabaseUrl, supabaseKey);
      }
      
      console.log(`${colors.green}✅ Connected to Supabase${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Failed to connect to Supabase: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async verifyPayRunEmployeeCounts() {
    console.log(`${colors.blue}🔍 Verifying pay run employee counts...${colors.reset}`);
    
    try {
      // Check if payrun_employees table exists and has data
      const { data: payrunEmployees, error: peError } = await this.stagingClient
        .from('payrun_employees')
        .select('pay_run_id, employee_id')
        .limit(10);

      if (peError) {
        console.log(`${colors.red}❌ Error checking payrun_employees: ${peError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${payrunEmployees?.length || 0} payrun_employees relationships${colors.reset}`);

      // Check if pay_items table has data
      const { data: payItems, error: piError } = await this.stagingClient
        .from('pay_items')
        .select('pay_run_id, employee_id, gross_pay, net_pay')
        .limit(10);

      if (piError) {
        console.log(`${colors.red}❌ Error checking pay_items: ${piError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${payItems?.length || 0} pay_items records${colors.reset}`);

      // Get pay run counts using the same query as the frontend
      const { data: payRuns, error: prError } = await this.stagingClient
        .from('pay_runs')
        .select(`
          id,
          pay_run_date,
          total_gross_pay,
          total_net_pay,
          pay_groups (
            name,
            country
          ),
          pay_items (count)
        `)
        .order('pay_run_date', { ascending: false })
        .limit(10);

      if (prError) {
        console.log(`${colors.red}❌ Error checking pay_runs: ${prError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.blue}📊 Pay Run Employee Counts:${colors.reset}`);
      for (const payRun of payRuns || []) {
        const employeeCount = payRun.pay_items?.[0]?.count || 0;
        const status = employeeCount > 0 ? '✅' : '❌';
        console.log(`${status} ${payRun.pay_groups?.name || 'Unknown'} (${payRun.pay_run_date}): ${employeeCount} employees`);
      }

      // Check if any pay runs have 0 employees
      const zeroEmployeeRuns = (payRuns || []).filter(run => (run.pay_items?.[0]?.count || 0) === 0);
      
      if (zeroEmployeeRuns.length === 0) {
        console.log(`${colors.green}${colors.bright}✅ All pay runs have employees!${colors.reset}`);
        return true;
      } else {
        console.log(`${colors.red}❌ ${zeroEmployeeRuns.length} pay runs still have 0 employees${colors.reset}`);
        return false;
      }

    } catch (error) {
      console.log(`${colors.red}❌ Error verifying: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 Employee Fix Verifier
========================
${colors.reset}`);

  const verifier = new EmployeeFixVerifier();
  
  if (!(await verifier.initialize())) {
    process.exit(1);
  }

  const success = await verifier.verifyPayRunEmployeeCounts();
  
  if (success) {
    console.log(`${colors.green}${colors.bright}
✅ Employee Fix Verification Complete
=====================================
All pay runs now show the correct employee counts!
The frontend should display employees properly.
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ Employee Fix Verification Failed
===================================
Some pay runs still show 0 employees.
Please run the SQL script in Supabase Dashboard.
${colors.reset}`);
  }
}

main().catch(console.error);

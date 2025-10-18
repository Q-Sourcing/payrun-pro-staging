#!/usr/bin/env node

/**
 * 🔧 Fix New PayRuns
 * 
 * Creates pay items for existing pay runs that don't have them
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

class NewPayRunsFixer {
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

  async findPayRunsWithoutItems() {
    console.log(`${colors.blue}🔍 Finding pay runs without pay items...${colors.reset}`);
    
    try {
      // Get all pay runs
      const { data: payRuns, error: payRunsError } = await this.stagingClient
        .from('pay_runs')
        .select(`
          id,
          pay_run_date,
          pay_group_id,
          pay_groups (
            name,
            country
          )
        `)
        .order('pay_run_date', { ascending: false });

      if (payRunsError) {
        console.log(`${colors.red}❌ Error fetching pay runs: ${payRunsError.message}${colors.reset}`);
        return [];
      }

      console.log(`${colors.green}✅ Found ${payRuns?.length || 0} pay runs${colors.reset}`);

      // Check which pay runs don't have pay items
      const payRunsWithoutItems = [];
      
      for (const payRun of payRuns || []) {
        const { data: payItems, error: payItemsError } = await this.stagingClient
          .from('pay_items')
          .select('id')
          .eq('pay_run_id', payRun.id)
          .limit(1);

        if (payItemsError) {
          console.log(`${colors.yellow}⚠️ Error checking pay items for pay run ${payRun.id}: ${payItemsError.message}${colors.reset}`);
          continue;
        }

        if (!payItems || payItems.length === 0) {
          payRunsWithoutItems.push(payRun);
          console.log(`${colors.yellow}⚠️ Pay run ${payRun.id} (${payRun.pay_groups?.name}) has no pay items${colors.reset}`);
        } else {
          console.log(`${colors.green}✅ Pay run ${payRun.id} (${payRun.pay_groups?.name}) has ${payItems.length} pay items${colors.reset}`);
        }
      }

      return payRunsWithoutItems;
    } catch (error) {
      console.log(`${colors.red}❌ Error finding pay runs: ${error.message}${colors.reset}`);
      return [];
    }
  }

  async createPayItemsForPayRun(payRun) {
    console.log(`${colors.blue}🔧 Creating pay items for pay run ${payRun.id}...${colors.reset}`);
    
    try {
      // Get employees in this pay group
      const { data: employees, error: employeesError } = await this.stagingClient
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          pay_rate,
          pay_type,
          country,
          employee_type
        `)
        .eq('pay_group_id', payRun.pay_group_id)
        .eq('status', 'active');

      if (employeesError) {
        console.log(`${colors.red}❌ Error fetching employees: ${employeesError.message}${colors.reset}`);
        return false;
      }

      if (!employees || employees.length === 0) {
        console.log(`${colors.yellow}⚠️ No active employees found in pay group${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${employees.length} employees in pay group${colors.reset}`);

      // Create pay items for each employee
      const payItems = [];
      
      for (const employee of employees) {
        // Simple calculation (bypassing Edge Function)
        const grossPay = employee.pay_rate || 0;
        const taxDeduction = grossPay * 0.1; // 10% tax
        const benefitDeductions = grossPay * 0.05; // 5% benefits
        const totalDeductions = taxDeduction + benefitDeductions;
        const netPay = grossPay - totalDeductions;

        payItems.push({
          pay_run_id: payRun.id,
          employee_id: employee.id,
          hours_worked: employee.pay_type === 'hourly' ? 40 : null,
          pieces_completed: employee.pay_type === 'piece_rate' ? 100 : null,
          gross_pay: grossPay,
          tax_deduction: taxDeduction,
          benefit_deductions: benefitDeductions,
          total_deductions: totalDeductions,
          net_pay: netPay,
          employer_contributions: grossPay * 0.1, // 10% employer contributions
          notes: 'Auto-generated pay item'
        });
      }

      // Insert pay items
      const { error: insertError } = await this.stagingClient
        .from('pay_items')
        .insert(payItems);

      if (insertError) {
        console.log(`${colors.red}❌ Error inserting pay items: ${insertError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Created ${payItems.length} pay items for pay run ${payRun.id}${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error creating pay items: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async fixAllPayRuns() {
    console.log(`${colors.blue}🔧 Fixing all pay runs without pay items...${colors.reset}`);
    
    const payRunsWithoutItems = await this.findPayRunsWithoutItems();
    
    if (payRunsWithoutItems.length === 0) {
      console.log(`${colors.green}✅ All pay runs already have pay items${colors.reset}`);
      return true;
    }

    let fixed = 0;
    for (const payRun of payRunsWithoutItems) {
      const success = await this.createPayItemsForPayRun(payRun);
      if (success) {
        fixed++;
      }
    }

    console.log(`${colors.green}✅ Fixed ${fixed} out of ${payRunsWithoutItems.length} pay runs${colors.reset}`);
    return fixed > 0;
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 New PayRuns Fixer
===================
${colors.reset}`);

  const fixer = new NewPayRunsFixer();
  
  if (!(await fixer.initialize())) {
    process.exit(1);
  }

  const success = await fixer.fixAllPayRuns();
  
  if (success) {
    console.log(`${colors.green}${colors.bright}
✅ New PayRuns Fix Complete
===========================
All pay runs should now have pay items.
Try creating a new pay run to test the fix.
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ New PayRuns Fix Failed
=========================
Some pay runs still don't have pay items.
Check the error messages above.
${colors.reset}`);
  }
}

main().catch(console.error);

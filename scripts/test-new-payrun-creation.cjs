#!/usr/bin/env node

/**
 * 🔧 Test New PayRun Creation
 * 
 * Tests creating a new pay run to see if pay items are created
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

class NewPayRunTester {
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

  async testCreatePayRun() {
    console.log(`${colors.blue}🔧 Testing pay run creation...${colors.reset}`);
    
    try {
      // Get a pay group to use
      const { data: payGroups, error: payGroupsError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name')
        .limit(1);

      if (payGroupsError) {
        console.log(`${colors.red}❌ Error fetching pay groups: ${payGroupsError.message}${colors.reset}`);
        return false;
      }

      if (!payGroups || payGroups.length === 0) {
        console.log(`${colors.red}❌ No pay groups found${colors.reset}`);
        return false;
      }

      const payGroup = payGroups[0];
      console.log(`${colors.blue}📋 Using pay group: ${payGroup.name}${colors.reset}`);

      // Create a test pay run
      const testPayRunData = {
        pay_group_id: payGroup.id,
        pay_run_date: new Date().toISOString(),
        pay_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        pay_period_end: new Date().toISOString(),
        status: 'draft'
      };

      const { data: payRunData, error: payRunError } = await this.stagingClient
        .from('pay_runs')
        .insert(testPayRunData)
        .select()
        .single();

      if (payRunError) {
        console.log(`${colors.red}❌ Error creating pay run: ${payRunError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Created test pay run: ${payRunData.id}${colors.reset}`);

      // Get employees in this pay group
      const { data: employees, error: employeesError } = await this.stagingClient
        .from('employees')
        .select('id, first_name, last_name, pay_rate, pay_type')
        .eq('pay_group_id', payGroup.id)
        .eq('status', 'active');

      if (employeesError) {
        console.log(`${colors.red}❌ Error fetching employees: ${employeesError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${employees?.length || 0} employees in pay group${colors.reset}`);

      // Create pay items for each employee
      if (employees && employees.length > 0) {
        const payItems = employees.map(employee => {
          const grossPay = employee.pay_rate || 0;
          const taxDeduction = grossPay * 0.1;
          const benefitDeductions = grossPay * 0.05;
          const totalDeductions = taxDeduction + benefitDeductions;
          const netPay = grossPay - totalDeductions;

          return {
            pay_run_id: payRunData.id,
            employee_id: employee.id,
            hours_worked: employee.pay_type === 'hourly' ? 40 : null,
            pieces_completed: employee.pay_type === 'piece_rate' ? 100 : null,
            gross_pay: grossPay,
            tax_deduction: taxDeduction,
            benefit_deductions: benefitDeductions,
            total_deductions: totalDeductions,
            net_pay: netPay,
            employer_contributions: grossPay * 0.1,
            notes: 'Test pay item'
          };
        });

        const { error: payItemsError } = await this.stagingClient
          .from('pay_items')
          .insert(payItems);

        if (payItemsError) {
          console.log(`${colors.red}❌ Error creating pay items: ${payItemsError.message}${colors.reset}`);
          return false;
        }

        console.log(`${colors.green}✅ Created ${payItems.length} pay items for test pay run${colors.reset}`);
      }

      // Test the query that the frontend uses
      const { data: testPayItems, error: testError } = await this.stagingClient
        .from('pay_items')
        .select(`
          *,
          employees (
            first_name,
            middle_name,
            last_name,
            email,
            pay_type,
            pay_rate,
            country,
            employee_type
          )
        `)
        .eq('pay_run_id', payRunData.id);

      if (testError) {
        console.log(`${colors.red}❌ Error testing pay items query: ${testError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Frontend query returns ${testPayItems?.length || 0} pay items${colors.reset}`);
      
      if (testPayItems && testPayItems.length > 0) {
        console.log(`${colors.blue}📊 Test Pay Items:${colors.reset}`);
        for (const item of testPayItems) {
          const employee = item.employees;
          console.log(`  - ${employee?.first_name || 'N/A'} ${employee?.last_name || 'N/A'}: ${item.gross_pay} -> ${item.net_pay}`);
        }
      }

      // Clean up test pay run
      await this.stagingClient
        .from('pay_runs')
        .delete()
        .eq('id', payRunData.id);

      console.log(`${colors.green}✅ Cleaned up test pay run${colors.reset}`);

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing pay run creation: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 New PayRun Creation Tester
=============================
${colors.reset}`);

  const tester = new NewPayRunTester();
  
  if (!(await tester.initialize())) {
    process.exit(1);
  }

  const success = await tester.testCreatePayRun();
  
  if (success) {
    console.log(`${colors.green}${colors.bright}
✅ New PayRun Creation Test Passed
==================================
Pay run creation and pay items are working correctly.
The issue might be browser caching or frontend code.
Try:
1. Hard refresh browser (Ctrl+Shift+R)
2. Open in incognito mode
3. Check browser console for errors
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ New PayRun Creation Test Failed
==================================
There's an issue with pay run creation or pay items.
Check the error messages above.
${colors.reset}`);
  }
}

main().catch(console.error);

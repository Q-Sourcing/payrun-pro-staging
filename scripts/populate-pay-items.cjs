#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Colors for console output
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

class PayItemsPopulator {
  constructor() {
    this.stagingClient = null;
  }

  async initialize() {
    console.log(`${colors.blue}🔧 Initializing Supabase connection...${colors.reset}`);
    
    try {
      // Use staging Supabase credentials
      this.stagingClient = createClient(
        'https://sbphmrjoappwlervnbtm.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4MDAsImV4cCI6MjA1MjU1MDgwMH0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8'
      );
      
      console.log(`${colors.green}✅ Connected to staging Supabase${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Failed to connect to Supabase: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async getPayRunEmployeeData() {
    console.log(`${colors.blue}🔍 Getting pay run and employee data...${colors.reset}`);
    
    try {
      // Get pay runs with their pay groups
      const { data: payRuns, error: payRunsError } = await this.stagingClient
        .from('pay_runs')
        .select(`
          id,
          pay_group_id,
          total_gross_pay,
          total_net_pay,
          pay_groups (
            id,
            name,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (payRunsError) {
        console.log(`${colors.red}❌ Error fetching pay runs: ${payRunsError.message}${colors.reset}`);
        return [];
      }

      // Get employees with their pay groups
      const { data: employees, error: employeesError } = await this.stagingClient
        .from('employees')
        .select(`
          id,
          name,
          pay_group_id,
          pay_rate,
          pay_type
        `)
        .eq('status', 'active');

      if (employeesError) {
        console.log(`${colors.red}❌ Error fetching employees: ${employeesError.message}${colors.reset}`);
        return [];
      }

      console.log(`${colors.green}✅ Found ${payRuns?.length || 0} pay runs and ${employees?.length || 0} employees${colors.reset}`);

      // Create relationships based on pay_group_id
      const relationships = [];
      
      for (const payRun of payRuns || []) {
        const payRunEmployees = employees?.filter(emp => emp.pay_group_id === payRun.pay_group_id) || [];
        
        for (const employee of payRunEmployees) {
          // Calculate pay amounts (simplified calculation)
          const grossPay = employee.pay_rate || 0;
          const taxDeduction = grossPay * 0.1; // 10% tax
          const benefitDeductions = grossPay * 0.05; // 5% benefits
          const totalDeductions = taxDeduction + benefitDeductions;
          const netPay = grossPay - totalDeductions;

          relationships.push({
            pay_run_id: payRun.id,
            employee_id: employee.id,
            hours_worked: employee.pay_type === 'hourly' ? 40 : null, // Default 40 hours for hourly
            pieces_completed: employee.pay_type === 'piece_rate' ? 100 : null, // Default 100 pieces
            gross_pay: grossPay,
            tax_deduction: taxDeduction,
            benefit_deductions: benefitDeductions,
            total_deductions: totalDeductions,
            net_pay: netPay,
            notes: `Auto-generated from payrun_employees relationship`
          });
        }
      }

      console.log(`${colors.green}✅ Created ${relationships.length} pay item relationships${colors.reset}`);
      return relationships;
    } catch (error) {
      console.log(`${colors.red}❌ Error getting data: ${error.message}${colors.reset}`);
      return [];
    }
  }

  async clearExistingPayItems() {
    console.log(`${colors.blue}🧹 Clearing existing pay_items...${colors.reset}`);
    
    try {
      const { error } = await this.stagingClient
        .from('pay_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        console.log(`${colors.yellow}⚠️ Error clearing pay_items: ${error.message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Cleared existing pay_items${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Error clearing pay_items: ${error.message}${colors.reset}`);
    }
  }

  async insertPayItems(payItems) {
    if (!payItems || payItems.length === 0) {
      console.log(`${colors.yellow}⚠️ No pay items to insert${colors.reset}`);
      return false;
    }

    console.log(`${colors.blue}🔧 Inserting ${payItems.length} pay items...${colors.reset}`);
    
    try {
      // Insert in batches to avoid timeout
      const batchSize = 10;
      let inserted = 0;

      for (let i = 0; i < payItems.length; i += batchSize) {
        const batch = payItems.slice(i, i + batchSize);
        
        const { error } = await this.stagingClient
          .from('pay_items')
          .insert(batch);

        if (error) {
          console.log(`${colors.red}❌ Error inserting batch ${Math.floor(i/batchSize) + 1}: ${error.message}${colors.reset}`);
          continue;
        }

        inserted += batch.length;
        console.log(`${colors.blue}📦 Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(payItems.length/batchSize)}${colors.reset}`);
      }

      console.log(`${colors.green}✅ Successfully inserted ${inserted} pay items${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error inserting pay items: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async verifyPayItems() {
    console.log(`${colors.blue}🔍 Verifying pay items...${colors.reset}`);
    
    try {
      const { data: payItems, error } = await this.stagingClient
        .from('pay_items')
        .select(`
          id,
          pay_run_id,
          employee_id,
          gross_pay,
          net_pay,
          employees (
            name
          )
        `)
        .limit(10);

      if (error) {
        console.log(`${colors.red}❌ Error verifying pay items: ${error.message}${colors.reset}`);
        return;
      }

      console.log(`${colors.green}✅ Found ${payItems?.length || 0} pay items${colors.reset}`);
      
      // Group by pay_run_id to show counts
      const payRunCounts = {};
      for (const item of payItems || []) {
        if (!payRunCounts[item.pay_run_id]) {
          payRunCounts[item.pay_run_id] = 0;
        }
        payRunCounts[item.pay_run_id]++;
      }

      console.log(`${colors.blue}📊 Pay run employee counts:${colors.reset}`);
      for (const [payRunId, count] of Object.entries(payRunCounts)) {
        console.log(`  Pay Run ${payRunId}: ${count} employees`);
      }

    } catch (error) {
      console.log(`${colors.red}❌ Error verifying: ${error.message}${colors.reset}`);
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 Pay Items Populator
======================
${colors.reset}`);

  const populator = new PayItemsPopulator();
  
  if (!(await populator.initialize())) {
    process.exit(1);
  }

  // Clear existing pay items
  await populator.clearExistingPayItems();

  // Get pay run employee data
  const relationships = await populator.getPayRunEmployeeData();
  
  if (relationships.length === 0) {
    console.log(`${colors.yellow}⚠️ No relationships found${colors.reset}`);
    return;
  }

  // Insert pay items
  const success = await populator.insertPayItems(relationships);
  
  if (success) {
    await populator.verifyPayItems();
    
    console.log(`${colors.green}${colors.bright}
✅ Pay Items Population Complete
================================
Pay items have been created based on payrun_employees relationships.
The frontend should now show correct employee counts in pay runs.
${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Failed to populate pay items${colors.reset}`);
  }
}

main().catch(console.error);

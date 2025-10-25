#!/usr/bin/env node

/**
 * 🔧 Populate PayGroup Employees
 * 
 * Populates the paygroup_employees table with existing employee data
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

class PayGroupEmployeesPopulator {
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

  async checkCurrentState() {
    console.log(`${colors.blue}🔍 Checking current state...${colors.reset}`);
    
    try {
      // Check employees with pay_group_id
      const { data: employees, error: empError } = await this.stagingClient
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          pay_group_id,
          pay_groups (
            name,
            type
          )
        `)
        .eq('status', 'active')
        .not('pay_group_id', 'is', null);

      if (empError) {
        console.log(`${colors.red}❌ Error checking employees: ${empError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${employees?.length || 0} employees with pay_group_id${colors.reset}`);
      
      if (employees && employees.length > 0) {
        console.log(`${colors.blue}📊 Employees with pay groups:${colors.reset}`);
        for (const emp of employees) {
          console.log(`  - ${emp.first_name} ${emp.last_name} -> ${emp.pay_groups?.name || 'Unknown'}`);
        }
      }

      // Check existing paygroup_employees
      const { data: existingAssignments, error: assignError } = await this.stagingClient
        .from('paygroup_employees')
        .select('id, employee_id, pay_group_id')
        .eq('active', true);

      if (assignError) {
        console.log(`${colors.red}❌ Error checking assignments: ${assignError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${existingAssignments?.length || 0} existing assignments${colors.reset}`);

      return { employees, existingAssignments };
    } catch (error) {
      console.log(`${colors.red}❌ Error checking current state: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async populatePayGroupEmployees(employees) {
    console.log(`${colors.blue}🔧 Populating paygroup_employees table...${colors.reset}`);
    
    try {
      let inserted = 0;
      let skipped = 0;

      for (const employee of employees || []) {
        if (!employee.pay_group_id) {
          skipped++;
          continue;
        }

        // Check if assignment already exists
        const { data: existing, error: checkError } = await this.stagingClient
          .from('paygroup_employees')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('pay_group_id', employee.pay_group_id)
          .maybeSingle();

        if (checkError) {
          console.log(`${colors.yellow}⚠️ Error checking existing assignment for ${employee.first_name}: ${checkError.message}${colors.reset}`);
          continue;
        }

        if (existing) {
          skipped++;
          continue;
        }

        // Create new assignment
        const { error: insertError } = await this.stagingClient
          .from('paygroup_employees')
          .insert({
            employee_id: employee.id,
            pay_group_id: employee.pay_group_id,
            active: true,
            assigned_at: new Date().toISOString(),
            notes: 'Migrated from existing employee.pay_group_id'
          });

        if (insertError) {
          console.log(`${colors.yellow}⚠️ Error inserting assignment for ${employee.first_name}: ${insertError.message}${colors.reset}`);
          continue;
        }

        inserted++;
        console.log(`${colors.green}✅ Created assignment: ${employee.first_name} ${employee.last_name} -> ${employee.pay_groups?.name || 'Unknown'}`)
      }

      console.log(`${colors.green}✅ Inserted ${inserted} new assignments, skipped ${skipped} existing${colors.reset}`);
      return inserted > 0;
    } catch (error) {
      console.log(`${colors.red}❌ Error populating assignments: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async verifyResults() {
    console.log(`${colors.blue}🔍 Verifying results...${colors.reset}`);
    
    try {
      // Get employee counts per pay group
      const { data: payGroups, error: pgError } = await this.stagingClient
        .from('pay_groups')
        .select(`
          id,
          name,
          type,
          paygroup_employees (
            id,
            active
          )
        `);

      if (pgError) {
        console.log(`${colors.red}❌ Error verifying results: ${pgError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Employee counts per pay group:${colors.reset}`);
      for (const payGroup of payGroups || []) {
        const activeCount = payGroup.paygroup_employees?.filter(pe => pe.active).length || 0;
        const status = activeCount > 0 ? '✅' : '⚠️';
        console.log(`${status} ${payGroup.name} (${payGroup.type}): ${activeCount} employees`);
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error verifying results: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 PayGroup Employees Populator
===============================
${colors.reset}`);

  const populator = new PayGroupEmployeesPopulator();
  
  if (!(await populator.initialize())) {
    process.exit(1);
  }

  // Check current state
  const currentState = await populator.checkCurrentState();
  if (!currentState) {
    console.log(`${colors.red}❌ Failed to check current state${colors.reset}`);
    process.exit(1);
  }

  const { employees, existingAssignments } = currentState;

  if (!employees || employees.length === 0) {
    console.log(`${colors.yellow}⚠️ No employees with pay_group_id found${colors.reset}`);
    process.exit(0);
  }

  // Populate paygroup_employees
  const success = await populator.populatePayGroupEmployees(employees);
  
  if (success) {
    await populator.verifyResults();
    
    console.log(`${colors.green}${colors.bright}
✅ PayGroup Employees Population Complete
========================================
The paygroup_employees table has been populated with existing employee data.
Pay groups should now show correct employee counts in the UI.
${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Failed to populate paygroup_employees${colors.reset}`);
  }
}

main().catch(console.error);

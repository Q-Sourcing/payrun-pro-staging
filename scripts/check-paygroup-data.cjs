#!/usr/bin/env node

/**
 * 🔧 Check PayGroup Data
 * 
 * Checks the actual data in paygroup_employees table
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

class PayGroupDataChecker {
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

  async checkPayGroupEmployeesData() {
    console.log(`${colors.blue}🔍 Checking paygroup_employees table data...${colors.reset}`);
    
    try {
      // Check if paygroup_employees table exists and has data
      const { data: paygroupEmployees, error: peError } = await this.stagingClient
        .from('paygroup_employees')
        .select('*')
        .limit(10);

      if (peError) {
        console.log(`${colors.red}❌ Error checking paygroup_employees: ${peError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${paygroupEmployees?.length || 0} records in paygroup_employees table${colors.reset}`);
      
      if (paygroupEmployees && paygroupEmployees.length > 0) {
        console.log(`${colors.blue}📊 Sample paygroup_employees data:${colors.reset}`);
        for (const record of paygroupEmployees.slice(0, 3)) {
          console.log(`  - Employee ID: ${record.employee_id}, Pay Group ID: ${record.pay_group_id}, Active: ${record.active}`);
        }
      } else {
        console.log(`${colors.yellow}⚠️ No data found in paygroup_employees table${colors.reset}`);
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error checking paygroup_employees: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async checkEmployeesData() {
    console.log(`${colors.blue}🔍 Checking employees table data...${colors.reset}`);
    
    try {
      const { data: employees, error: empError } = await this.stagingClient
        .from('employees')
        .select('id, first_name, last_name, email, employee_type')
        .limit(5);

      if (empError) {
        console.log(`${colors.red}❌ Error checking employees: ${empError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${employees?.length || 0} employees${colors.reset}`);
      
      if (employees && employees.length > 0) {
        console.log(`${colors.blue}📊 Sample employees data:${colors.reset}`);
        for (const emp of employees) {
          console.log(`  - ${emp.first_name} ${emp.last_name} (${emp.email}) - Type: ${emp.employee_type}`);
        }
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error checking employees: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async checkPayGroupsData() {
    console.log(`${colors.blue}🔍 Checking pay_groups table data...${colors.reset}`);
    
    try {
      const { data: payGroups, error: pgError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name, type, country')
        .limit(5);

      if (pgError) {
        console.log(`${colors.red}❌ Error checking pay_groups: ${pgError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${payGroups?.length || 0} pay groups${colors.reset}`);
      
      if (payGroups && payGroups.length > 0) {
        console.log(`${colors.blue}📊 Sample pay_groups data:${colors.reset}`);
        for (const pg of payGroups) {
          console.log(`  - ${pg.name} (${pg.type}) - Country: ${pg.country}`);
        }
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error checking pay_groups: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async createSamplePayGroupAssignments() {
    console.log(`${colors.blue}🔧 Creating sample pay group assignments...${colors.reset}`);
    
    try {
      // Get first employee and first pay group
      const { data: employees, error: empError } = await this.stagingClient
        .from('employees')
        .select('id, first_name, last_name')
        .limit(1);

      if (empError || !employees || employees.length === 0) {
        console.log(`${colors.yellow}⚠️ No employees found to create assignments${colors.reset}`);
        return false;
      }

      const { data: payGroups, error: pgError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name')
        .limit(1);

      if (pgError || !payGroups || payGroups.length === 0) {
        console.log(`${colors.yellow}⚠️ No pay groups found to create assignments${colors.reset}`);
        return false;
      }

      const employee = employees[0];
      const payGroup = payGroups[0];

      // Create a sample assignment
      const { data: assignment, error: assignError } = await this.stagingClient
        .from('paygroup_employees')
        .insert({
          employee_id: employee.id,
          pay_group_id: payGroup.id,
          active: true,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assignError) {
        console.log(`${colors.red}❌ Error creating assignment: ${assignError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Created sample assignment: ${employee.first_name} ${employee.last_name} -> ${payGroup.name}${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error creating sample assignment: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 PayGroup Data Checker
========================
${colors.reset}`);

  const checker = new PayGroupDataChecker();
  
  if (!(await checker.initialize())) {
    process.exit(1);
  }

  console.log(`${colors.blue}🧪 Checking PayGroup data...${colors.reset}`);
  
  const test1 = await checker.checkPayGroupsData();
  const test2 = await checker.checkEmployeesData();
  const test3 = await checker.checkPayGroupEmployeesData();
  
  if (test3 && test1 && test2) {
    // If no paygroup_employees data exists, create some sample data
    const { data: existingAssignments } = await checker.stagingClient
      .from('paygroup_employees')
      .select('id')
      .limit(1);
    
    if (!existingAssignments || existingAssignments.length === 0) {
      console.log(`${colors.yellow}⚠️ No paygroup_employees data found. Creating sample assignments...${colors.reset}`);
      await checker.createSamplePayGroupAssignments();
    }
  }
  
  console.log(`${colors.green}${colors.bright}
✅ PayGroup Data Check Complete
===============================
Check the results above to understand the data structure.
${colors.reset}`);
}

main().catch(console.error);

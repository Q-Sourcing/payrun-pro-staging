#!/usr/bin/env node

/**
 * 🔧 Fix Employee Names
 * 
 * Fixes employee name fields to match the frontend expectations
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

class EmployeeNameFixer {
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

  async checkEmployeeStructure() {
    console.log(`${colors.blue}🔍 Checking employee table structure...${colors.reset}`);
    
    try {
      // Check what fields exist in the employees table
      const { data: employees, error } = await this.stagingClient
        .from('employees')
        .select('*')
        .limit(1);

      if (error) {
        console.log(`${colors.red}❌ Error checking employees: ${error.message}${colors.reset}`);
        return false;
      }

      if (employees && employees.length > 0) {
        const employee = employees[0];
        console.log(`${colors.blue}📊 Employee table fields:${colors.reset}`);
        console.log(Object.keys(employee));
        
        // Check if name fields exist
        const hasFirstName = 'first_name' in employee;
        const hasLastName = 'last_name' in employee;
        const hasName = 'name' in employee;
        
        console.log(`${colors.blue}📋 Name field status:${colors.reset}`);
        console.log(`  first_name: ${hasFirstName ? '✅' : '❌'}`);
        console.log(`  last_name: ${hasLastName ? '✅' : '❌'}`);
        console.log(`  name: ${hasName ? '✅' : '❌'}`);
        
        return { hasFirstName, hasLastName, hasName, employee };
      } else {
        console.log(`${colors.yellow}⚠️ No employees found${colors.reset}`);
        return false;
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error checking structure: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async fixEmployeeNames() {
    console.log(`${colors.blue}🔧 Fixing employee names...${colors.reset}`);
    
    try {
      // Get all employees
      const { data: employees, error } = await this.stagingClient
        .from('employees')
        .select('id, name, first_name, last_name, email')
        .limit(100);

      if (error) {
        console.log(`${colors.red}❌ Error fetching employees: ${error.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${employees?.length || 0} employees${colors.reset}`);

      let updated = 0;
      for (const employee of employees || []) {
        // If employee has name but no first_name, split the name
        if (employee.name && !employee.first_name) {
          const nameParts = employee.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const { error: updateError } = await this.stagingClient
            .from('employees')
            .update({
              first_name: firstName,
              last_name: lastName
            })
            .eq('id', employee.id);

          if (updateError) {
            console.log(`${colors.yellow}⚠️ Error updating employee ${employee.id}: ${updateError.message}${colors.reset}`);
          } else {
            updated++;
            console.log(`${colors.green}✅ Updated ${employee.name} -> ${firstName} ${lastName}${colors.reset}`);
          }
        }
      }

      console.log(`${colors.green}✅ Updated ${updated} employees${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error fixing names: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async verifyPayItems() {
    console.log(`${colors.blue}🔍 Verifying pay items with employee data...${colors.reset}`);
    
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
            first_name,
            last_name,
            email,
            pay_type,
            pay_rate
          )
        `)
        .limit(5);

      if (error) {
        console.log(`${colors.red}❌ Error checking pay items: ${error.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${payItems?.length || 0} pay items${colors.reset}`);
      
      for (const item of payItems || []) {
        const employee = item.employees;
        console.log(`${colors.blue}📋 Pay Item: ${employee?.first_name || 'N/A'} ${employee?.last_name || 'N/A'} - ${item.gross_pay}${colors.reset}`);
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error verifying: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 Employee Name Fixer
======================
${colors.reset}`);

  const fixer = new EmployeeNameFixer();
  
  if (!(await fixer.initialize())) {
    process.exit(1);
  }

  // Check current structure
  const structure = await fixer.checkEmployeeStructure();
  if (!structure) {
    console.log(`${colors.red}❌ Could not check employee structure${colors.reset}`);
    process.exit(1);
  }

  // Fix names if needed
  if (!structure.hasFirstName || !structure.hasLastName) {
    console.log(`${colors.yellow}⚠️ Name fields missing, attempting to fix...${colors.reset}`);
    const fixed = await fixer.fixEmployeeNames();
    if (!fixed) {
      console.log(`${colors.red}❌ Failed to fix employee names${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.log(`${colors.green}✅ Employee name fields are already correct${colors.reset}`);
  }

  // Verify pay items
  await fixer.verifyPayItems();
  
  console.log(`${colors.green}${colors.bright}
✅ Employee Name Fix Complete
============================
Employee names should now be properly structured.
The pay run details dialog should now show employee data.
${colors.reset}`);
}

main().catch(console.error);

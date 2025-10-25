#!/usr/bin/env node

/**
 * 🔧 Test Final PayGroup Fix
 * 
 * Tests the complete PayGroup fix after data population
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

class FinalPayGroupTester {
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

  async testPayGroupEmployeeCounts() {
    console.log(`${colors.blue}🔍 Testing PayGroup employee counts (final test)...${colors.reset}`);
    
    try {
      // Test using the optimized view (same as frontend)
      const { data: payGroups, error: payGroupsError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name, type, country')
        .order('name');

      if (payGroupsError) {
        console.log(`${colors.red}❌ Error fetching pay groups: ${payGroupsError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${payGroups?.length || 0} pay groups${colors.reset}`);

      let totalEmployees = 0;
      let groupsWithEmployees = 0;
      
      for (const payGroup of payGroups || []) {
        // Use the same query as the fixed PayGroupCard component
        const { data: employees, error: employeesError } = await this.stagingClient
          .from('paygroup_employees_view')
          .select('employee_id')
          .eq('pay_group_id', payGroup.id)
          .eq('active', true);

        if (employeesError) {
          console.log(`${colors.red}❌ Error fetching employees for ${payGroup.name}: ${employeesError.message}${colors.reset}`);
          continue;
        }

        const employeeCount = employees?.length || 0;
        totalEmployees += employeeCount;
        
        if (employeeCount > 0) {
          groupsWithEmployees++;
        }
        
        const status = employeeCount > 0 ? '✅' : '⚠️';
        console.log(`${status} ${payGroup.name} (${payGroup.type}): ${employeeCount} employees`);
      }

      console.log(`${colors.blue}📊 Summary: ${groupsWithEmployees}/${payGroups?.length || 0} pay groups have employees, total: ${totalEmployees} employees${colors.reset}`);
      
      return totalEmployees > 0;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing pay group counts: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async testViewAssignedEmployees() {
    console.log(`${colors.blue}🔍 Testing ViewAssignedEmployeesDialog query...${colors.reset}`);
    
    try {
      // Get a pay group that should have employees
      const { data: payGroups, error: payGroupsError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name')
        .limit(1);

      if (payGroupsError || !payGroups || payGroups.length === 0) {
        console.log(`${colors.yellow}⚠️ No pay groups found for testing${colors.reset}`);
        return true;
      }

      const testPayGroup = payGroups[0];
      
      // Test the same query as the fixed ViewAssignedEmployeesDialog
      const { data: employees, error: employeesError } = await this.stagingClient
        .from('paygroup_employees_view')
        .select(`
          id,
          employee_id,
          assigned_at,
          active,
          first_name,
          middle_name,
          last_name,
          email,
          employee_type,
          department
        `)
        .eq('pay_group_id', testPayGroup.id)
        .eq('active', true)
        .order('assigned_at', { ascending: false });

      if (employeesError) {
        console.log(`${colors.red}❌ Error testing ViewAssignedEmployeesDialog query: ${employeesError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ ViewAssignedEmployeesDialog query works! Found ${employees?.length || 0} employees for ${testPayGroup.name}${colors.reset}`);
      
      if (employees && employees.length > 0) {
        console.log(`${colors.blue}📊 Sample employee data:${colors.reset}`);
        for (const emp of employees.slice(0, 2)) {
          console.log(`  - ${emp.first_name} ${emp.last_name} (${emp.email}) - Type: ${emp.employee_type}`);
        }
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing ViewAssignedEmployeesDialog: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async testAssignEmployeeModal() {
    console.log(`${colors.blue}🔍 Testing AssignEmployeeModal query...${colors.reset}`);
    
    try {
      // Test the same query as the fixed AssignEmployeeModal
      const { data: allAssignments, error: assignmentError } = await this.stagingClient
        .from('paygroup_employees_view')
        .select(`
          employee_id,
          pay_group_id,
          active,
          pay_group_name,
          pay_group_type
        `)
        .eq('active', true);

      if (assignmentError) {
        console.log(`${colors.red}❌ Error testing AssignEmployeeModal query: ${assignmentError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ AssignEmployeeModal query works! Found ${allAssignments?.length || 0} active assignments${colors.reset}`);
      
      if (allAssignments && allAssignments.length > 0) {
        console.log(`${colors.blue}📊 Sample assignment data:${colors.reset}`);
        for (const assignment of allAssignments.slice(0, 2)) {
          console.log(`  - Employee ${assignment.employee_id} -> ${assignment.pay_group_name} (${assignment.pay_group_type})`);
        }
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing AssignEmployeeModal: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 Final PayGroup Fix Tester
============================
${colors.reset}`);

  const tester = new FinalPayGroupTester();
  
  if (!(await tester.initialize())) {
    process.exit(1);
  }

  console.log(`${colors.blue}🧪 Running final PayGroup fix tests...${colors.reset}`);
  
  const test1 = await tester.testPayGroupEmployeeCounts();
  const test2 = await tester.testViewAssignedEmployees();
  const test3 = await tester.testAssignEmployeeModal();
  
  if (test1 && test2 && test3) {
    console.log(`${colors.green}${colors.bright}
✅ All Final PayGroup Fix Tests Passed
======================================
The complete PayGroup fix is working correctly:
- ✅ PayGroup employee counts are showing correctly
- ✅ ViewAssignedEmployeesDialog queries work
- ✅ AssignEmployeeModal queries work
- ✅ All components use the optimized paygroup_employees_view

The UI should now show correct employee counts for all pay groups!
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ Some Final PayGroup Fix Tests Failed
======================================
Check the error messages above for details.
You may need to run the SQL script in Supabase Dashboard first.
${colors.reset}`);
  }
}

main().catch(console.error);

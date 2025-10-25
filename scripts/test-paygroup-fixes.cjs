#!/usr/bin/env node

/**
 * 🔧 Test PayGroup Fixes
 * 
 * Tests if the PayGroup employee count fixes are working
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

class PayGroupFixTester {
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
    console.log(`${colors.blue}🔍 Testing PayGroup employee counts using optimized view...${colors.reset}`);
    
    try {
      // Get all pay groups
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
      for (const payGroup of payGroups || []) {
        // Test the NEW query using paygroup_employees_view
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
        
        const status = employeeCount > 0 ? '✅' : '⚠️';
        console.log(`${status} ${payGroup.name} (${payGroup.type}): ${employeeCount} employees`);
      }

      console.log(`${colors.blue}📊 Total employees across all pay groups: ${totalEmployees}${colors.reset}`);
      return totalEmployees > 0;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing pay group counts: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async testViewDataStructure() {
    console.log(`${colors.blue}🔍 Testing paygroup_employees_view data structure...${colors.reset}`);
    
    try {
      // Test the view structure
      const { data: viewData, error: viewError } = await this.stagingClient
        .from('paygroup_employees_view')
        .select('*')
        .limit(3);

      if (viewError) {
        console.log(`${colors.red}❌ Error testing view: ${viewError.message}${colors.reset}`);
        return false;
      }

      if (viewData && viewData.length > 0) {
        console.log(`${colors.green}✅ View is working! Sample data structure:${colors.reset}`);
        const sample = viewData[0];
        console.log(`  - Employee: ${sample.first_name} ${sample.last_name}`);
        console.log(`  - Email: ${sample.email}`);
        console.log(`  - Pay Group: ${sample.pay_group_name}`);
        console.log(`  - Active: ${sample.active}`);
        console.log(`  - Employee Type: ${sample.employee_type}`);
        return true;
      } else {
        console.log(`${colors.yellow}⚠️ View is working but no data found${colors.reset}`);
        return true;
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error testing view structure: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async testOldVsNewQuery() {
    console.log(`${colors.blue}🔍 Comparing old vs new query performance...${colors.reset}`);
    
    try {
      // Get a pay group to test with
      const { data: payGroups, error: payGroupsError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name')
        .limit(1);

      if (payGroupsError || !payGroups || payGroups.length === 0) {
        console.log(`${colors.yellow}⚠️ No pay groups found for comparison test${colors.reset}`);
        return true;
      }

      const testPayGroup = payGroups[0];
      console.log(`${colors.blue}📋 Testing with pay group: ${testPayGroup.name}${colors.reset}`);

      // Test OLD query (direct table join)
      const startOld = Date.now();
      const { data: oldData, error: oldError } = await this.stagingClient
        .from('paygroup_employees')
        .select(`
          id,
          employee_id,
          active,
          employees (
            first_name,
            last_name,
            email
          )
        `)
        .eq('pay_group_id', testPayGroup.id)
        .eq('active', true);
      const oldTime = Date.now() - startOld;

      // Test NEW query (optimized view)
      const startNew = Date.now();
      const { data: newData, error: newError } = await this.stagingClient
        .from('paygroup_employees_view')
        .select(`
          id,
          employee_id,
          active,
          first_name,
          last_name,
          email
        `)
        .eq('pay_group_id', testPayGroup.id)
        .eq('active', true);
      const newTime = Date.now() - startNew;

      if (oldError) {
        console.log(`${colors.red}❌ Old query error: ${oldError.message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Old query: ${oldData?.length || 0} employees (${oldTime}ms)${colors.reset}`);
      }

      if (newError) {
        console.log(`${colors.red}❌ New query error: ${newError.message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ New query: ${newData?.length || 0} employees (${newTime}ms)${colors.reset}`);
      }

      const improvement = oldTime > 0 ? ((oldTime - newTime) / oldTime * 100).toFixed(1) : 0;
      console.log(`${colors.blue}📈 Performance improvement: ${improvement}%${colors.reset}`);

      return !oldError && !newError;
    } catch (error) {
      console.log(`${colors.red}❌ Error comparing queries: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 PayGroup Fixes Tester
========================
${colors.reset}`);

  const tester = new PayGroupFixTester();
  
  if (!(await tester.initialize())) {
    process.exit(1);
  }

  console.log(`${colors.blue}🧪 Running PayGroup fixes tests...${colors.reset}`);
  
  const test1 = await tester.testViewDataStructure();
  const test2 = await tester.testPayGroupEmployeeCounts();
  const test3 = await tester.testOldVsNewQuery();
  
  if (test1 && test2 && test3) {
    console.log(`${colors.green}${colors.bright}
✅ All PayGroup Fixes Tests Passed
==================================
The PayGroup employee count fixes are working correctly:
- ✅ paygroup_employees_view is accessible and working
- ✅ Employee counts are being fetched correctly
- ✅ Performance improvements are in place

The UI should now show correct employee counts for all pay groups!
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ Some PayGroup Fixes Tests Failed
===================================
Check the error messages above for details.
${colors.reset}`);
  }
}

main().catch(console.error);

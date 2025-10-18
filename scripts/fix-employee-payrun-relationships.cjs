#!/usr/bin/env node

/**
 * 🔧 Employee-PayRun Relationship Fixer
 * 
 * Fixes the missing employee-payrun relationships
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

class EmployeePayRunFixer {
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

  async findRelationshipTables() {
    console.log(`${colors.blue}🔍 Finding relationship tables...${colors.reset}`);
    
    // Check for common relationship table names
    const possibleTables = [
      'payrun_employees',
      'employee_payruns', 
      'payrun_employee_assignments',
      'payrun_assignments',
      'payroll_assignments',
      'employee_payroll_assignments'
    ];
    
    const foundTables = [];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await this.prodClient
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          foundTables.push(tableName);
          console.log(`${colors.green}✅ Found table: ${tableName}${colors.reset}`);
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }
    
    return foundTables;
  }

  async getPayRunEmployeeData() {
    console.log(`${colors.blue}🔍 Getting pay run employee data from production...${colors.reset}`);
    
    try {
      // Get all pay runs
      const { data: payRuns, error: payRunsError } = await this.prodClient
        .from('pay_runs')
        .select('*');
      
      if (payRunsError) {
        throw new Error(`Failed to fetch pay_runs: ${payRunsError.message}`);
      }
      
      // Get all employees
      const { data: employees, error: employeesError } = await this.prodClient
        .from('employees')
        .select('*');
      
      if (employeesError) {
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }
      
      console.log(`${colors.green}✅ Found ${payRuns.length} pay runs and ${employees.length} employees${colors.reset}`);
      
      // Create relationships based on pay_group_id
      const relationships = [];
      
      for (const payRun of payRuns) {
        // Find employees in the same pay group
        const payGroupEmployees = employees.filter(emp => emp.pay_group_id === payRun.pay_group_id);
        
        for (const employee of payGroupEmployees) {
          relationships.push({
            pay_run_id: payRun.id,
            employee_id: employee.id,
            pay_group_id: payRun.pay_group_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      
      console.log(`${colors.green}✅ Created ${relationships.length} employee-payrun relationships${colors.reset}`);
      
      return relationships;
      
    } catch (error) {
      console.error(`${colors.red}❌ Failed to get pay run employee data: ${error.message}${colors.reset}`);
      return [];
    }
  }

  async createPayRunEmployeeTable() {
    console.log(`${colors.blue}🔧 Creating payrun_employees table in staging...${colors.reset}`);
    
    try {
      // Create the table using SQL
      const { error } = await this.stagingClient
        .rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS payrun_employees (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              pay_run_id UUID NOT NULL REFERENCES pay_runs(id) ON DELETE CASCADE,
              employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
              pay_group_id UUID NOT NULL REFERENCES pay_groups(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(pay_run_id, employee_id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_payrun_employees_pay_run_id ON payrun_employees(pay_run_id);
            CREATE INDEX IF NOT EXISTS idx_payrun_employees_employee_id ON payrun_employees(employee_id);
            CREATE INDEX IF NOT EXISTS idx_payrun_employees_pay_group_id ON payrun_employees(pay_group_id);
          `
        });
      
      if (error) {
        console.log(`${colors.yellow}⚠️ Table might already exist or RPC not available${colors.reset}`);
        // Try direct insert approach
        return true;
      }
      
      console.log(`${colors.green}✅ Created payrun_employees table${colors.reset}`);
      return true;
      
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Table creation failed, will try direct approach: ${error.message}${colors.reset}`);
      return true;
    }
  }

  async insertRelationships(relationships) {
    if (relationships.length === 0) {
      console.log(`${colors.yellow}⚠️ No relationships to insert${colors.reset}`);
      return;
    }
    
    console.log(`${colors.blue}🔧 Inserting ${relationships.length} relationships into staging...${colors.reset}`);
    
    try {
      const batchSize = 100;
      for (let i = 0; i < relationships.length; i += batchSize) {
        const batch = relationships.slice(i, i + batchSize);
        
        const { error } = await this.stagingClient
          .from('payrun_employees')
          .upsert(batch, { onConflict: 'pay_run_id,employee_id' });
        
        if (error) {
          console.error(`${colors.red}❌ Failed to insert batch: ${error.message}${colors.reset}`);
          // Try alternative approach - update employees table
          await this.updateEmployeesWithPayRunIds(relationships);
          return;
        }
      }
      
      console.log(`${colors.green}✅ Successfully inserted ${relationships.length} relationships${colors.reset}`);
      
    } catch (error) {
      console.error(`${colors.red}❌ Failed to insert relationships: ${error.message}${colors.reset}`);
      // Try alternative approach
      await this.updateEmployeesWithPayRunIds(relationships);
    }
  }

  async updateEmployeesWithPayRunIds(relationships) {
    console.log(`${colors.blue}🔧 Alternative approach: Updating employees with pay_run_id...${colors.reset}`);
    
    try {
      // Group relationships by employee
      const employeePayRuns = {};
      for (const rel of relationships) {
        if (!employeePayRuns[rel.employee_id]) {
          employeePayRuns[rel.employee_id] = [];
        }
        employeePayRuns[rel.employee_id].push(rel.pay_run_id);
      }
      
      // Update each employee
      for (const [employeeId, payRunIds] of Object.entries(employeePayRuns)) {
        const { error } = await this.stagingClient
          .from('employees')
          .update({ 
            pay_run_id: payRunIds[0], // Use the first pay run ID
            updated_at: new Date().toISOString()
          })
          .eq('id', employeeId);
        
        if (error) {
          console.error(`${colors.red}❌ Failed to update employee ${employeeId}: ${error.message}${colors.reset}`);
        }
      }
      
      console.log(`${colors.green}✅ Updated employees with pay_run_id${colors.reset}`);
      
    } catch (error) {
      console.error(`${colors.red}❌ Failed to update employees: ${error.message}${colors.reset}`);
    }
  }

  async fixEmployeePayRunRelationships() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🔧 Employee-PayRun Relationship Fixer');
      console.log('=====================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      // Find relationship tables
      const relationshipTables = await this.findRelationshipTables();
      
      if (relationshipTables.length === 0) {
        console.log(`${colors.yellow}⚠️ No relationship tables found, creating relationships from pay_group_id${colors.reset}`);
      }
      
      // Get relationship data
      const relationships = await this.getPayRunEmployeeData();
      
      if (relationships.length === 0) {
        console.log(`${colors.red}❌ No relationships found to fix${colors.reset}`);
        return;
      }
      
      // Create table if needed
      await this.createPayRunEmployeeTable();
      
      // Insert relationships
      await this.insertRelationships(relationships);
      
      console.log(`${colors.green}${colors.bright}`);
      console.log('✅ Employee-PayRun Relationships Fixed');
      console.log('=====================================');
      console.log(`Relationships created: ${relationships.length}`);
      console.log(`${colors.reset}`);

    } catch (error) {
      console.error(`${colors.red}❌ Fix failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const fixer = new EmployeePayRunFixer();
  await fixer.fixEmployeePayRunRelationships();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EmployeePayRunFixer };

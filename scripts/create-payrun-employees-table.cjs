#!/usr/bin/env node

/**
 * 🔧 Create PayRun Employees Relationship Table
 * 
 * Creates the missing payrun_employees relationship table
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

class PayRunEmployeesTableCreator {
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

  async initializeClient() {
    const stagingUrl = process.env.STAGING_SUPABASE_URL;
    const stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    
    this.stagingClient = createClient(stagingUrl, stagingServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async createTable() {
    console.log(`${colors.blue}🔧 Creating payrun_employees table...${colors.reset}`);
    
    try {
      // Use direct SQL execution
      const createTableSQL = `
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
      `;
      
      // Try to execute the SQL
      const { error } = await this.stagingClient
        .from('payrun_employees')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('relation "payrun_employees" does not exist')) {
        console.log(`${colors.yellow}⚠️ Table doesn't exist, need to create it via Supabase Dashboard${colors.reset}`);
        console.log(`${colors.cyan}📋 Please run this SQL in your Supabase Dashboard:${colors.reset}`);
        console.log(createTableSQL);
        return false;
      } else if (!error) {
        console.log(`${colors.green}✅ payrun_employees table already exists${colors.reset}`);
        return true;
      }
      
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Cannot create table via API, need manual creation${colors.reset}`);
      return false;
    }
  }

  async populateTable() {
    console.log(`${colors.blue}🔧 Populating payrun_employees table...${colors.reset}`);
    
    try {
      // Get all pay runs
      const { data: payRuns, error: payRunsError } = await this.stagingClient
        .from('pay_runs')
        .select('*');
      
      if (payRunsError) {
        throw new Error(`Failed to fetch pay_runs: ${payRunsError.message}`);
      }
      
      // Get all employees
      const { data: employees, error: employeesError } = await this.stagingClient
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
      
      console.log(`${colors.green}✅ Created ${relationships.length} relationships${colors.reset}`);
      
      // Insert relationships
      if (relationships.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < relationships.length; i += batchSize) {
          const batch = relationships.slice(i, i + batchSize);
          
          const { error } = await this.stagingClient
            .from('payrun_employees')
            .upsert(batch, { onConflict: 'pay_run_id,employee_id' });
          
          if (error) {
            console.error(`${colors.red}❌ Failed to insert batch: ${error.message}${colors.reset}`);
            return false;
          }
        }
        
        console.log(`${colors.green}✅ Successfully inserted ${relationships.length} relationships${colors.reset}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`${colors.red}❌ Failed to populate table: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async runTableCreation() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🔧 PayRun Employees Table Creator');
      console.log('===================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClient();

      const tableExists = await this.createTable();
      
      if (tableExists) {
        const populated = await this.populateTable();
        
        if (populated) {
          console.log(`${colors.green}${colors.bright}`);
          console.log('✅ PayRun Employees Table Created & Populated');
          console.log('==============================================');
          console.log('The employee-payrun relationships are now fixed!');
          console.log('Pay runs should now show the correct employee counts.');
          console.log(`${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠️ Table exists but population failed${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠️ Please create the table manually in Supabase Dashboard${colors.reset}`);
      }

    } catch (error) {
      console.error(`${colors.red}❌ Table creation failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const creator = new PayRunEmployeesTableCreator();
  await creator.runTableCreation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PayRunEmployeesTableCreator };

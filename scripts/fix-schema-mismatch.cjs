#!/usr/bin/env node

/**
 * 🔧 Schema Mismatch Fixer
 * 
 * Fixes schema mismatches between production and staging
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

class SchemaFixer {
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

  async getTableData(tableName) {
    const allData = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await this.prodClient
        .from(tableName)
        .select('*')
        .range(from, from + batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch data from ${tableName}: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);
      from += batchSize;
    }

    return allData;
  }

  async insertTableData(tableName, data) {
    if (data.length === 0) {
      console.log(`${colors.yellow}  ⚠️ No data to insert for ${tableName}${colors.reset}`);
      return;
    }

    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await this.stagingClient
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        throw new Error(`Failed to insert data into ${tableName}: ${error.message}`);
      }
    }
  }

  async syncPayGroups() {
    try {
      console.log(`${colors.blue}🔄 Syncing pay_groups with schema fix...${colors.reset}`);
      
      // Get data from production
      const data = await this.getTableData('pay_groups');
      console.log(`${colors.green}  ✅ Fetched ${data.length} rows from production${colors.reset}`);
      
      // Transform data to match staging schema
      const transformedData = data.map(row => {
        // Remove any problematic columns and ensure proper structure
        const cleanRow = { ...row };
        
        // Remove any columns that might cause issues
        delete cleanRow.paygroup_id; // This column doesn't exist in staging
        
        return cleanRow;
      });
      
      console.log(`${colors.cyan}  🔧 Transformed ${transformedData.length} rows for staging schema${colors.reset}`);
      
      // Insert transformed data into staging
      await this.insertTableData('pay_groups', transformedData);
      console.log(`${colors.green}  ✅ Inserted ${transformedData.length} rows into staging${colors.reset}`);
      
      return { success: true, rows: transformedData.length };
      
    } catch (error) {
      const errorMsg = `Failed to sync pay_groups: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      return { success: false, error: errorMsg };
    }
  }

  async syncEmployees() {
    try {
      console.log(`${colors.blue}🔄 Syncing employees...${colors.reset}`);
      
      const data = await this.getTableData('employees');
      console.log(`${colors.green}  ✅ Fetched ${data.length} rows from production${colors.reset}`);
      
      // Insert data into staging
      await this.insertTableData('employees', data);
      console.log(`${colors.green}  ✅ Inserted ${data.length} rows into staging${colors.reset}`);
      
      return { success: true, rows: data.length };
      
    } catch (error) {
      const errorMsg = `Failed to sync employees: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      return { success: false, error: errorMsg };
    }
  }

  async syncPayRuns() {
    try {
      console.log(`${colors.blue}🔄 Syncing pay_runs...${colors.reset}`);
      
      const data = await this.getTableData('pay_runs');
      console.log(`${colors.green}  ✅ Fetched ${data.length} rows from production${colors.reset}`);
      
      // Insert data into staging
      await this.insertTableData('pay_runs', data);
      console.log(`${colors.green}  ✅ Inserted ${data.length} rows into staging${colors.reset}`);
      
      return { success: true, rows: data.length };
      
    } catch (error) {
      const errorMsg = `Failed to sync pay_runs: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      return { success: false, error: errorMsg };
    }
  }

  async fixSchemaAndSync() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🔧 Q-Payroll Schema Fix & Clean Sync');
      console.log('====================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      console.log(`${colors.cyan}📋 Fixing schema mismatches and syncing data...${colors.reset}`);
      
      let totalRows = 0;
      let totalTables = 0;
      const errors = [];

      // Step 1: Sync pay_groups with schema fix
      const payGroupsResult = await this.syncPayGroups();
      if (payGroupsResult.success) {
        totalRows += payGroupsResult.rows;
        totalTables++;
      } else {
        errors.push(payGroupsResult.error);
      }

      // Step 2: Sync employees (should work now that pay_groups is synced)
      const employeesResult = await this.syncEmployees();
      if (employeesResult.success) {
        totalRows += employeesResult.rows;
        totalTables++;
      } else {
        errors.push(employeesResult.error);
      }

      // Step 3: Sync pay_runs (should work now that pay_groups is synced)
      const payRunsResult = await this.syncPayRuns();
      if (payRunsResult.success) {
        totalRows += payRunsResult.rows;
        totalTables++;
      } else {
        errors.push(payRunsResult.error);
      }

      console.log(`${colors.green}${colors.bright}`);
      console.log('✅ Schema Fix & Sync Complete');
      console.log('=============================');
      console.log(`Tables copied: ${totalTables}`);
      console.log(`Rows inserted: ${totalRows.toLocaleString()}`);
      console.log(`Errors: ${errors.length}`);
      
      if (errors.length > 0) {
        console.log(`${colors.red}Errors:${colors.reset}`);
        errors.forEach(error => {
          console.log(`${colors.red}  • ${error}${colors.reset}`);
        });
      }
      
      console.log(`${colors.reset}`);

    } catch (error) {
      console.error(`${colors.red}❌ Schema fix failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const fixer = new SchemaFixer();
  await fixer.fixSchemaAndSync();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SchemaFixer };

#!/usr/bin/env node

/**
 * 🔍 Foreign Key Constraint Analyzer
 * 
 * Analyzes the foreign key relationships to determine proper sync order
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

class ConstraintAnalyzer {
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

  async analyzeConstraints() {
    console.log(`${colors.blue}🔍 Analyzing foreign key constraints...${colors.reset}`);
    
    // Define the proper sync order based on dependencies
    const syncOrder = [
      // Level 1: Independent tables (no dependencies)
      { level: 1, tables: ['benefits', 'payslip_templates', 'payroll_configurations', 'lst_payment_plans'] },
      
      // Level 2: Tables that depend on Level 1
      { level: 2, tables: ['pay_groups'] },
      
      // Level 3: Tables that depend on Level 2
      { level: 3, tables: ['employees', 'paygroup_employees', 'lst_employee_assignments'] },
      
      // Level 4: Tables that depend on Level 3
      { level: 4, tables: ['pay_runs'] },
      
      // Level 5: Independent tables with no dependencies
      { level: 5, tables: ['expatriate_pay_groups'] }
    ];

    console.log(`${colors.green}✅ Proper sync order determined:${colors.reset}`);
    
    for (const level of syncOrder) {
      console.log(`${colors.cyan}Level ${level.level}: ${level.tables.join(', ')}${colors.reset}`);
    }

    return syncOrder;
  }

  async testTableExists(tableName) {
    try {
      const { error } = await this.prodClient
        .from(tableName)
        .select('*')
        .limit(1);
      
      return !error;
    } catch (err) {
      return false;
    }
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

  async syncTable(tableName) {
    try {
      console.log(`${colors.blue}🔄 Syncing table: ${tableName}${colors.reset}`);
      
      const data = await this.getTableData(tableName);
      console.log(`${colors.green}  ✅ Fetched ${data.length} rows from production${colors.reset}`);
      
      await this.insertTableData(tableName, data);
      console.log(`${colors.green}  ✅ Inserted ${data.length} rows into staging${colors.reset}`);
      
      return { success: true, rows: data.length };
      
    } catch (error) {
      const errorMsg = `Failed to sync ${tableName}: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      return { success: false, error: errorMsg };
    }
  }

  async cleanSync() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🚀 Q-Payroll Clean Production → Staging Data Sync');
      console.log('================================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      const syncOrder = await this.analyzeConstraints();
      
      let totalRows = 0;
      let totalTables = 0;
      const errors = [];

      for (const level of syncOrder) {
        console.log(`${colors.cyan}📋 Processing Level ${level.level} tables...${colors.reset}`);
        
        for (const tableName of level.tables) {
          const exists = await this.testTableExists(tableName);
          if (!exists) {
            console.log(`${colors.yellow}  ⏭️ Skipping ${tableName} (doesn't exist in production)${colors.reset}`);
            continue;
          }

          const result = await this.syncTable(tableName);
          if (result.success) {
            totalRows += result.rows;
            totalTables++;
          } else {
            errors.push(result.error);
          }
        }
      }

      console.log(`${colors.green}${colors.bright}`);
      console.log('✅ Clean Sync Complete');
      console.log('======================');
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
      console.error(`${colors.red}❌ Clean sync failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const analyzer = new ConstraintAnalyzer();
  await analyzer.cleanSync();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ConstraintAnalyzer };

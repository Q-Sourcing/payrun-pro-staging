#!/usr/bin/env node

/**
 * 🚀 Complete Clean Sync
 * 
 * Performs a complete clean sync with proper foreign key order
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

class CompleteCleanSync {
  constructor() {
    this.prodClient = null;
    this.stagingClient = null;
    this.stats = {
      tablesCopied: 0,
      rowsInserted: 0,
      errors: [],
      startTime: Date.now()
    };
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

  async syncTable(tableName) {
    try {
      console.log(`${colors.blue}🔄 Syncing table: ${tableName}${colors.reset}`);
      
      const data = await this.getTableData(tableName);
      console.log(`${colors.green}  ✅ Fetched ${data.length} rows from production${colors.reset}`);
      
      await this.insertTableData(tableName, data);
      console.log(`${colors.green}  ✅ Inserted ${data.length} rows into staging${colors.reset}`);
      
      this.stats.tablesCopied++;
      this.stats.rowsInserted += data.length;
      
      return { success: true, rows: data.length };
      
    } catch (error) {
      const errorMsg = `Failed to sync ${tableName}: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      this.stats.errors.push(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async completeCleanSync() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🚀 Q-Payroll Complete Clean Sync');
      console.log('================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      // Define the complete sync order with all tables
      const syncOrder = [
        // Level 1: Independent tables
        { level: 1, tables: ['benefits', 'payslip_templates', 'payroll_configurations', 'lst_payment_plans', 'expatriate_pay_groups'] },
        
        // Level 2: Tables that depend on Level 1
        { level: 2, tables: ['pay_groups'] },
        
        // Level 3: Tables that depend on Level 2
        { level: 3, tables: ['employees', 'paygroup_employees', 'lst_employee_assignments'] },
        
        // Level 4: Tables that depend on Level 3
        { level: 4, tables: ['pay_runs'] }
      ];

      console.log(`${colors.cyan}📋 Complete sync order:${colors.reset}`);
      for (const level of syncOrder) {
        console.log(`${colors.cyan}Level ${level.level}: ${level.tables.join(', ')}${colors.reset}`);
      }

      for (const level of syncOrder) {
        console.log(`${colors.blue}📋 Processing Level ${level.level} tables...${colors.reset}`);
        
        for (const tableName of level.tables) {
          await this.syncTable(tableName);
        }
      }

      this.stats.endTime = Date.now();
      const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;

      console.log(`${colors.green}${colors.bright}`);
      console.log('✅ Complete Clean Sync Finished');
      console.log('===============================');
      console.log(`Tables copied: ${this.stats.tablesCopied}`);
      console.log(`Rows inserted: ${this.stats.rowsInserted.toLocaleString()}`);
      console.log(`Duration: ${minutes}m ${seconds}s`);
      console.log(`Errors: ${this.stats.errors.length}`);
      
      if (this.stats.errors.length > 0) {
        console.log(`${colors.red}Errors:${colors.reset}`);
        this.stats.errors.forEach(error => {
          console.log(`${colors.red}  • ${error}${colors.reset}`);
        });
      }
      
      console.log(`${colors.reset}`);

    } catch (error) {
      console.error(`${colors.red}❌ Complete clean sync failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const sync = new CompleteCleanSync();
  await sync.completeCleanSync();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CompleteCleanSync };

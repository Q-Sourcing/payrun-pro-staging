#!/usr/bin/env node

/**
 * 🚀 Q-Payroll Simple Production → Staging Data Sync
 * 
 * Direct table-by-table sync with known table names
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// ANSI Colors
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

// Known tables to sync
const TABLES_TO_SYNC = [
  'users',
  'employees', 
  'pay_groups',
  'pay_runs',
  'benefits',
  'payslip_templates',
  'expatriate_pay_groups',
  'payroll_configurations',
  'paygroup_employees',
  'lst_payment_plans',
  'lst_employee_assignments',
  'employee_numbering_settings',
  'employee_numbering_history',
  'integration_tokens',
  'sync_configurations',
  'sync_logs',
  'integration_health',
  'alert_rules',
  'alert_logs',
  'notification_channels',
  'audit_logs',
  'attendance_records'
];

class SimpleDataSync {
  constructor() {
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
          console.log(`${colors.cyan}📁 Loaded environment from ${envFile}${colors.reset}`);
        } catch (error) {
          console.warn(`${colors.yellow}⚠️ Warning: Could not read ${envFile}${colors.reset}`);
        }
      }
    }
  }

  async initializeClients() {
    console.log(`${colors.blue}🔧 Initializing Supabase clients...${colors.reset}`);
    
    const prodUrl = process.env.PROD_SUPABASE_URL;
    const prodServiceKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!prodUrl || !prodServiceKey) {
      throw new Error('Missing production Supabase credentials');
    }

    this.prodClient = createClient(prodUrl, prodServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const stagingUrl = process.env.STAGING_SUPABASE_URL;
    const stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!stagingUrl || !stagingServiceKey) {
      throw new Error('Missing staging Supabase credentials');
    }

    this.stagingClient = createClient(stagingUrl, stagingServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log(`${colors.green}✅ Supabase clients initialized${colors.reset}`);
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

      if (allData.length % 5000 === 0) {
        console.log(`${colors.cyan}  📊 Fetched ${allData.length} rows from ${tableName}...${colors.reset}`);
      }
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

      if (data.length > 1000 && i % 5000 === 0) {
        console.log(`${colors.cyan}  📤 Inserted ${Math.min(i + batchSize, data.length)}/${data.length} rows into ${tableName}...${colors.reset}`);
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
      
    } catch (error) {
      const errorMsg = `Failed to sync ${tableName}: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      this.stats.errors.push(errorMsg);
    }
  }

  async sync() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🚀 Q-Payroll Production → Staging Data Sync');
      console.log('==========================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      console.log(`${colors.green}✅ Starting sync...${colors.reset}`);
      console.log(`${colors.blue}📋 Tables to sync: ${TABLES_TO_SYNC.length}${colors.reset}`);

      for (const table of TABLES_TO_SYNC) {
        await this.syncTable(table);
      }

      this.stats.endTime = Date.now();
      const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;

      console.log(`${colors.green}${colors.bright}`);
      console.log('✅ Sync Complete');
      console.log('================');
      console.log(`Tables copied: ${this.stats.tablesCopied}`);
      console.log(`Rows inserted: ${this.stats.rowsInserted.toLocaleString()}`);
      console.log(`Duration: ${minutes}m ${seconds}s`);
      console.log(`Environment: staging`);
      
      if (this.stats.errors.length > 0) {
        console.log(`${colors.red}Errors: ${this.stats.errors.length}${colors.reset}`);
        this.stats.errors.forEach(error => {
          console.log(`${colors.red}  • ${error}${colors.reset}`);
        });
      }
      
      console.log(`${colors.reset}`);

    } catch (error) {
      console.error(`${colors.red}❌ Sync failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const sync = new SimpleDataSync();
  await sync.sync();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SimpleDataSync };

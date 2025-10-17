#!/usr/bin/env ts-node

/**
 * 🚀 Q-Payroll Production → Staging Data Sync Script
 * 
 * Safely copies all tables and data from production Supabase database
 * to staging Supabase database using Service Role Keys.
 * 
 * Usage: npm run clone:staging
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

// ANSI Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

interface SyncStats {
  tablesCopied: number;
  rowsInserted: number;
  skippedTables: string[];
  errors: string[];
  startTime: number;
  endTime?: number;
}

class SupabaseDataSync {
  private prodClient: any;
  private stagingClient: any;
  private stats: SyncStats;

  constructor() {
    this.stats = {
      tablesCopied: 0,
      rowsInserted: 0,
      skippedTables: [],
      errors: [],
      startTime: Date.now()
    };
  }

  /**
   * Load environment variables from .env files
   */
  private loadEnvironmentVariables(): void {
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

  /**
   * Initialize Supabase clients
   */
  private async initializeClients(): Promise<void> {
    console.log(`${colors.blue}🔧 Initializing Supabase clients...${colors.reset}`);
    
    // Production client
    const prodUrl = process.env.PROD_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const prodServiceKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!prodUrl || !prodServiceKey) {
      throw new Error('Missing production Supabase credentials. Check PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_ROLE_KEY');
    }

    this.prodClient = createClient(prodUrl, prodServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Staging client
    const stagingUrl = process.env.STAGING_SUPABASE_URL;
    const stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!stagingUrl || !stagingServiceKey) {
      throw new Error('Missing staging Supabase credentials. Check STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY');
    }

    this.stagingClient = createClient(stagingUrl, stagingServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`${colors.green}✅ Supabase clients initialized${colors.reset}`);
  }

  /**
   * Get all tables from production database
   */
  private async getProductionTables(): Promise<string[]> {
    console.log(`${colors.blue}📋 Fetching production tables...${colors.reset}`);
    
    const { data, error } = await this.prodClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'spatial_ref_sys');

    if (error) {
      throw new Error(`Failed to fetch production tables: ${error.message}`);
    }

    const tables = data.map((row: any) => row.table_name);
    console.log(`${colors.green}✅ Found ${tables.length} tables in production${colors.reset}`);
    return tables;
  }

  /**
   * Get table data with pagination
   */
  private async getTableData(tableName: string): Promise<any[]> {
    const allData: any[] = [];
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

      // Log progress for large tables
      if (allData.length % 5000 === 0) {
        console.log(`${colors.cyan}  📊 Fetched ${allData.length} rows from ${tableName}...${colors.reset}`);
      }
    }

    return allData;
  }

  /**
   * Insert data into staging table
   */
  private async insertTableData(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) {
      console.log(`${colors.yellow}  ⚠️ No data to insert for ${tableName}${colors.reset}`);
      return;
    }

    // Batch insert for large datasets
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await this.stagingClient
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        throw new Error(`Failed to insert data into ${tableName}: ${error.message}`);
      }

      // Log progress for large batches
      if (data.length > 1000 && i % 5000 === 0) {
        console.log(`${colors.cyan}  📤 Inserted ${Math.min(i + batchSize, data.length)}/${data.length} rows into ${tableName}...${colors.reset}`);
      }
    }
  }

  /**
   * Sync a single table
   */
  private async syncTable(tableName: string): Promise<void> {
    try {
      console.log(`${colors.blue}🔄 Syncing table: ${tableName}${colors.reset}`);
      
      // Get data from production
      const data = await this.getTableData(tableName);
      console.log(`${colors.green}  ✅ Fetched ${data.length} rows from production${colors.reset}`);
      
      // Insert data into staging
      await this.insertTableData(tableName, data);
      console.log(`${colors.green}  ✅ Inserted ${data.length} rows into staging${colors.reset}`);
      
      this.stats.tablesCopied++;
      this.stats.rowsInserted += data.length;
      
    } catch (error: any) {
      const errorMsg = `Failed to sync ${tableName}: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      this.stats.errors.push(errorMsg);
    }
  }

  /**
   * Safety confirmation prompt
   */
  private async confirmSync(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log(`${colors.red}${colors.bright}`);
      console.log('⚠️  WARNING: This will overwrite data in STAGING with PRODUCTION.');
      console.log('⚠️  All existing staging data will be replaced with production data.');
      console.log(`${colors.reset}`);
      console.log(`${colors.yellow}Type "confirm" to proceed:${colors.reset}`);
      
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'confirm');
      });
    });
  }

  /**
   * Main sync process
   */
  public async sync(): Promise<void> {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🚀 Q-Payroll Production → Staging Data Sync');
      console.log('==========================================');
      console.log(`${colors.reset}`);

      // Load environment variables
      this.loadEnvironmentVariables();

      // Initialize clients
      await this.initializeClients();

      // Safety confirmation
      const confirmed = await this.confirmSync();
      if (!confirmed) {
        console.log(`${colors.red}❌ Sync cancelled by user${colors.reset}`);
        process.exit(0);
      }

      console.log(`${colors.green}✅ Confirmation received. Starting sync...${colors.reset}`);

      // Get production tables
      const tables = await this.getProductionTables();

      // Skip system tables
      const skipTables = ['auth.users', 'storage.objects', 'spatial_ref_sys'];
      const filteredTables = tables.filter(table => 
        !skipTables.includes(table) && 
        !table.startsWith('pg_') &&
        !table.startsWith('_')
      );

      console.log(`${colors.blue}📋 Tables to sync: ${filteredTables.length}${colors.reset}`);
      console.log(`${colors.yellow}⏭️ Skipped tables: ${skipTables.join(', ')}${colors.reset}`);

      // Sync each table
      for (const table of filteredTables) {
        await this.syncTable(table);
      }

      // Final stats
      this.stats.endTime = Date.now();
      const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;

      console.log(`${colors.green}${colors.bright}`);
      console.log('✅ Sync Complete');
      console.log('================');
      console.log(`Tables copied: ${this.stats.tablesCopied}`);
      console.log(`Rows inserted: ${this.stats.rowsInserted.toLocaleString()}`);
      console.log(`Skipped: ${this.stats.skippedTables.join(', ') || 'None'}`);
      console.log(`Duration: ${minutes}m ${seconds}s`);
      console.log(`Environment: staging`);
      
      if (this.stats.errors.length > 0) {
        console.log(`${colors.red}Errors: ${this.stats.errors.length}${colors.reset}`);
        this.stats.errors.forEach(error => {
          console.log(`${colors.red}  • ${error}${colors.reset}`);
        });
      }
      
      console.log(`${colors.reset}`);

    } catch (error: any) {
      console.error(`${colors.red}❌ Sync failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const sync = new SupabaseDataSync();
  await sync.sync();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { SupabaseDataSync };

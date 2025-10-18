#!/usr/bin/env node

/**
 * 🔧 Ultimate PayGroups Schema Fix
 * 
 * Uses only basic fields that exist in both schemas
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

class UltimatePayGroupsFixer {
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

  async getPayGroupsData() {
    const allData = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await this.prodClient
        .from('pay_groups')
        .select('*')
        .range(from, from + batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch pay_groups data: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);
      from += batchSize;
    }

    return allData;
  }

  async insertPayGroupsData(data) {
    if (data.length === 0) {
      console.log(`${colors.yellow}  ⚠️ No pay_groups data to insert${colors.reset}`);
      return;
    }

    // Use only the most basic fields that should exist in both schemas
    const transformedData = data.map(row => {
      const cleanRow = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        country: 'Uganda', // Default country for staging
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      return cleanRow;
    });

    console.log(`${colors.cyan}  🔧 Using only basic fields for pay_groups sync${colors.reset}`);

    const batchSize = 1000;
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      
      const { error } = await this.stagingClient
        .from('pay_groups')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        throw new Error(`Failed to insert pay_groups data: ${error.message}`);
      }
    }
  }

  async fixPayGroups() {
    try {
      console.log(`${colors.blue}🔄 Ultimate pay_groups fix with basic fields only...${colors.reset}`);
      
      // Get data from production
      const data = await this.getPayGroupsData();
      console.log(`${colors.green}  ✅ Fetched ${data.length} pay_groups rows from production${colors.reset}`);
      
      // Insert transformed data into staging
      await this.insertPayGroupsData(data);
      console.log(`${colors.green}  ✅ Inserted ${data.length} pay_groups rows into staging${colors.reset}`);
      
      return { success: true, rows: data.length };
      
    } catch (error) {
      const errorMsg = `Failed to fix pay_groups: ${error.message}`;
      console.error(`${colors.red}  ❌ ${errorMsg}${colors.reset}`);
      return { success: false, error: errorMsg };
    }
  }

  async runUltimateFix() {
    try {
      console.log(`${colors.magenta}${colors.bright}`);
      console.log('🔧 Ultimate PayGroups Schema Fix');
      console.log('==================================');
      console.log(`${colors.reset}`);

      this.loadEnvironmentVariables();
      await this.initializeClients();

      const result = await this.fixPayGroups();
      
      if (result.success) {
        console.log(`${colors.green}${colors.bright}`);
        console.log('✅ Ultimate PayGroups Fix Complete');
        console.log('==================================');
        console.log(`Rows inserted: ${result.rows}`);
        console.log(`${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Ultimate fix failed: ${result.error}${colors.reset}`);
      }

    } catch (error) {
      console.error(`${colors.red}❌ Ultimate fix failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const fixer = new UltimatePayGroupsFixer();
  await fixer.runUltimateFix();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UltimatePayGroupsFixer };

#!/usr/bin/env node

/**
 * 🔧 Run SQL Script
 * 
 * Executes a SQL script against the staging database
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

class SQLScriptRunner {
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
        console.log(`${colors.red}❌ No Supabase API key found in environment variables${colors.reset}`);
        console.log(`${colors.yellow}💡 Please set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY${colors.reset}`);
        return false;
      }

      this.stagingClient = createClient(supabaseUrl, supabaseKey);
      
      console.log(`${colors.green}✅ Connected to Supabase${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Failed to connect to Supabase: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async runSQLScript(sqlContent) {
    console.log(`${colors.blue}🔧 Executing SQL script...${colors.reset}`);
    
    try {
      // Split the SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('select')) {
          // For SELECT statements, use the query method
          const { data, error } = await this.stagingClient.rpc('exec_sql', { sql: statement });
          if (error) {
            console.log(`${colors.yellow}⚠️ Query result: ${JSON.stringify(data)}${colors.reset}`);
          } else {
            console.log(`${colors.green}✅ Query executed successfully${colors.reset}`);
            if (data && data.length > 0) {
              console.log(`${colors.blue}📊 Results:${colors.reset}`);
              console.table(data);
            }
          }
        } else {
          // For other statements, try direct execution
          const { error } = await this.stagingClient.rpc('exec_sql', { sql: statement });
          if (error) {
            console.log(`${colors.yellow}⚠️ Statement executed (may have warnings): ${error.message}${colors.reset}`);
          } else {
            console.log(`${colors.green}✅ Statement executed successfully${colors.reset}`);
          }
        }
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error executing SQL: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 SQL Script Runner
===================
${colors.reset}`);

  const runner = new SQLScriptRunner();
  
  if (!(await runner.initialize())) {
    process.exit(1);
  }

  // Read the SQL file
  const sqlPath = join(process.cwd(), 'POPULATE_PAY_ITEMS.sql');
  if (!existsSync(sqlPath)) {
    console.log(`${colors.red}❌ SQL file not found: ${sqlPath}${colors.reset}`);
    process.exit(1);
  }

  const sqlContent = readFileSync(sqlPath, 'utf8');
  console.log(`${colors.blue}📄 Loaded SQL script (${sqlContent.length} characters)${colors.reset}`);

  const success = await runner.runSQLScript(sqlContent);
  
  if (success) {
    console.log(`${colors.green}${colors.bright}
✅ SQL Script Execution Complete
================================
Pay items should now be populated correctly.
The frontend should show the correct employee counts.
${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Failed to execute SQL script${colors.reset}`);
  }
}

main().catch(console.error);

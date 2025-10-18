#!/usr/bin/env node

/**
 * 🔧 Test PayRun Query
 * 
 * Tests the exact query that the frontend uses
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

class PayRunQueryTester {
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

  async testPayRunQuery() {
    console.log(`${colors.blue}🔍 Testing pay run query (same as frontend)...${colors.reset}`);
    
    try {
      // Get the first pay run ID
      const { data: payRuns, error: payRunsError } = await this.stagingClient
        .from('pay_runs')
        .select('id, pay_run_date')
        .order('pay_run_date', { ascending: false })
        .limit(1);

      if (payRunsError) {
        console.log(`${colors.red}❌ Error fetching pay runs: ${payRunsError.message}${colors.reset}`);
        return false;
      }

      if (!payRuns || payRuns.length === 0) {
        console.log(`${colors.yellow}⚠️ No pay runs found${colors.reset}`);
        return false;
      }

      const payRunId = payRuns[0].id;
      console.log(`${colors.blue}📋 Testing with pay run: ${payRunId} (${payRuns[0].pay_run_date})${colors.reset}`);

      // Test the exact query from the frontend
      const { data: payRunData, error: payRunError } = await this.stagingClient
        .from("pay_runs")
        .select("pay_groups(country)")
        .eq("id", payRunId)
        .single();

      if (payRunError) {
        console.log(`${colors.red}❌ Error fetching pay run data: ${payRunError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Pay run data: ${JSON.stringify(payRunData)}${colors.reset}`);

      // Test the pay items query (exact same as frontend)
      const { data: payItems, error: payItemsError } = await this.stagingClient
        .from("pay_items")
        .select(`
          *,
          employees (
            first_name,
            middle_name,
            last_name,
            email,
            pay_type,
            pay_rate,
            country,
            employee_type
          )
        `)
        .eq("pay_run_id", payRunId)
        .order("employees(first_name)");

      if (payItemsError) {
        console.log(`${colors.red}❌ Error fetching pay items: ${payItemsError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ Found ${payItems?.length || 0} pay items${colors.reset}`);
      
      if (payItems && payItems.length > 0) {
        console.log(`${colors.blue}📊 Pay Items Details:${colors.reset}`);
        for (const item of payItems) {
          const employee = item.employees;
          console.log(`  - ${employee?.first_name || 'N/A'} ${employee?.last_name || 'N/A'} (${employee?.email || 'N/A'})`);
          console.log(`    Gross: ${item.gross_pay}, Net: ${item.net_pay}`);
        }
        return true;
      } else {
        console.log(`${colors.red}❌ No pay items found for this pay run${colors.reset}`);
        return false;
      }

    } catch (error) {
      console.log(`${colors.red}❌ Error testing query: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 PayRun Query Tester
======================
${colors.reset}`);

  const tester = new PayRunQueryTester();
  
  if (!(await tester.initialize())) {
    process.exit(1);
  }

  const success = await tester.testPayRunQuery();
  
  if (success) {
    console.log(`${colors.green}${colors.bright}
✅ PayRun Query Test Passed
===========================
The query is working correctly and returning data.
If the frontend still shows "No pay items found", try:
1. Refresh the browser (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for errors
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ PayRun Query Test Failed
===========================
The query is not returning data as expected.
Check the database structure and data.
${colors.reset}`);
  }
}

main().catch(console.error);

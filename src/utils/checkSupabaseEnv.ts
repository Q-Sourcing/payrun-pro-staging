/**
 * 🧠 Supabase Environment Diagnostic Utility
 * 
 * This utility checks your Supabase connection and verifies you're connected to the correct environment.
 * It distinguishes between staging and production environments and provides clear feedback.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

// Known project references for environment detection
const KNOWN_PROJECT_REFS = {
  PRODUCTION: 'kctwfgbjmhnfqtxhagib',
  STAGING: 'sbphmrjoappwlervnbtm'
} as const;

/**
 * Extracts the project reference from a Supabase URL
 * Format: https://[project-ref].supabase.co
 * Example: https://sbphmrjoappwlervnbtm.supabase.co → sbphmrjoappwlervnbtm
 */
function extractProjectRef(url: string): string | null {
  try {
    // Split by dots and take the first segment after https://
    const segments = url.split('.');
    if (segments.length >= 2 && segments[0].includes('//')) {
      return segments[0].split('//')[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Determines the environment based on project reference
 */
function determineEnvironment(projectRef: string): 'staging' | 'production' | 'unknown' {
  if (projectRef === KNOWN_PROJECT_REFS.STAGING) {
    return 'staging';
  } else if (projectRef === KNOWN_PROJECT_REFS.PRODUCTION) {
    return 'production';
  }
  return 'unknown';
}

/**
 * Performs a test query to verify Supabase connection
 */
async function testSupabaseConnection(supabase: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple test query - just get one employee ID to verify connection
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Main diagnostic function
 */
export async function checkSupabaseEnvironment(): Promise<void> {
  console.log('🔍 Checking Supabase connection…');

  // Step 1: Check environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Connection failed: Missing environment variables');
    console.error('Missing:', {
      url: !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
      key: !supabaseKey ? 'VITE_SUPABASE_ANON_KEY' : null
    });
    console.error('💡 Suggestions:');
    console.error('  • Check your Lovable → Integrations → Supabase link');
    console.error('  • Ensure .env.staging is loaded or Supabase is correctly connected');
    console.error('  • Verify environment variables are set in Lovable dashboard');
    return;
  }

  // Step 2: Extract and validate project reference
  const projectRef = extractProjectRef(supabaseUrl);
  if (!projectRef) {
    console.error('❌ Connection failed: Invalid Supabase URL format');
    console.error('URL:', supabaseUrl);
    console.error('💡 Expected format: https://[project-ref].supabase.co');
    return;
  }

  // Step 3: Initialize Supabase client
  let supabase;
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  } catch (error) {
    console.error('❌ Connection failed: Failed to create Supabase client');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    return;
  }

  // Step 4: Test connection with a query
  const connectionTest = await testSupabaseConnection(supabase);
  if (!connectionTest.success) {
    console.error('❌ Connection failed: Query test failed');
    console.error('Error:', connectionTest.error);
    console.error('💡 Suggestions:');
    console.error('  • Check if API key is valid and has correct permissions');
    console.error('  • Verify Supabase project is active and accessible');
    console.error('  • Ensure database tables exist and are accessible');
    return;
  }

  // Step 5: Determine environment and provide feedback
  const environment = determineEnvironment(projectRef);
  
  console.log(`Project ref: ${projectRef}`);
  console.log(`Environment: ${environment}`);
  console.log(`Full URL: ${supabaseUrl}`);

  switch (environment) {
    case 'staging':
      console.log('✅ Connected to Supabase (STAGING)');
      console.log('Project ref:', projectRef);
      console.log('Query test succeeded. Environment is safe to use.');
      console.log('🎉 You are correctly connected to the staging environment!');
      break;

    case 'production':
      console.warn('⚠️ Warning: Connected to PRODUCTION');
      console.warn(`Project ref: ${projectRef}`);
      console.warn('You are using the live payroll database.');
      console.warn('💡 To switch to staging:');
      console.warn('  • Reconnect Lovable → Integrations → Supabase → Payroll-Staging');
      console.warn('  • Or update environment variables to point to staging');
      break;

    case 'unknown':
      console.warn('⚠️ Warning: Connected to unknown environment');
      console.warn(`Project ref: ${projectRef}`);
      console.warn('This project reference is not recognized as staging or production.');
      console.warn('💡 Verify you are connected to the correct Supabase project.');
      break;
  }

  // Step 6: Additional environment info
  console.log('\n📋 Environment Details:');
  console.log(`  • NODE_ENV: ${import.meta.env.MODE || 'not set'}`);
  console.log(`  • Supabase URL: ${supabaseUrl}`);
  console.log(`  • API Key: ${supabaseKey.substring(0, 20)}...`);
  console.log(`  • Environment: ${environment}`);
}

/**
 * Auto-run diagnostic when imported in development
 */
if (process.env.NODE_ENV === 'development') {
  // Run diagnostic automatically in development
  checkSupabaseEnvironment().catch(console.error);
}

// Export for manual use
export default checkSupabaseEnvironment;

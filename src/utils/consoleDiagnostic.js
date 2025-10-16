/**
 * 🧠 Browser Console Diagnostic Script
 * 
 * Copy and paste this entire script into your browser console to check Supabase connection.
 * This script works independently of React and can be run directly in the console.
 */

(function() {
  console.log('🔍 Running Supabase Environment Diagnostic...');
  
  // Known project references
  const KNOWN_PROJECT_REFS = {
    PRODUCTION: 'kctwfgbjmhnfqtxhagib',
    STAGING: 'sbphmrjoappwlervnbtm'
  };

  // Extract project ref from URL
  function extractProjectRef(url) {
    try {
      const segments = url.split('.');
      if (segments.length >= 2 && segments[0].includes('//')) {
        return segments[0].split('//')[1];
      }
      return null;
    } catch {
      return null;
    }
  }

  // Determine environment
  function determineEnvironment(projectRef) {
    if (projectRef === KNOWN_PROJECT_REFS.STAGING) {
      return 'staging';
    } else if (projectRef === KNOWN_PROJECT_REFS.PRODUCTION) {
      return 'production';
    }
    return 'unknown';
  }

  // Test Supabase connection
  async function testSupabaseConnection() {
    try {
      // Get environment variables from window or process
      const supabaseUrl = window.location.hostname.includes('localhost') 
        ? 'https://sbphmrjoappwlervnbtm.supabase.co' // Default staging for localhost
        : (window.__NEXT_DATA__?.props?.pageProps?.supabaseUrl || 
           window.process?.env?.VITE_SUPABASE_URL ||
           'https://sbphmrjoappwlervnbtm.supabase.co');

      const supabaseKey = window.__NEXT_DATA__?.props?.pageProps?.supabaseKey ||
                         window.process?.env?.VITE_SUPABASE_ANON_KEY ||
                         'YOUR_STAGING_ANON_KEY_HERE';

      if (!supabaseUrl || supabaseKey === 'YOUR_STAGING_ANON_KEY_HERE') {
        console.error('❌ Connection failed: Missing or invalid environment variables');
        console.error('💡 Check your Lovable → Integrations → Supabase connection');
        return;
      }

      // Extract project ref
      const projectRef = extractProjectRef(supabaseUrl);
      if (!projectRef) {
        console.error('❌ Connection failed: Invalid Supabase URL format');
        console.error('URL:', supabaseUrl);
        return;
      }

      // Determine environment
      const environment = determineEnvironment(projectRef);

      // Try to use existing Supabase client if available
      let supabaseClient;
      if (window.supabase) {
        supabaseClient = window.supabase;
        console.log('📡 Using existing Supabase client from window.supabase');
      } else {
        // Try to import and create client
        try {
          const { createClient } = await import('@supabase/supabase-js');
          supabaseClient = createClient(supabaseUrl, supabaseKey);
          console.log('📡 Created new Supabase client');
        } catch (error) {
          console.warn('⚠️ Could not import @supabase/supabase-js, trying fetch test instead');
          
          // Fallback: test with direct fetch
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/employees?select=id&limit=1`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (response.ok) {
              console.log('✅ Connection test successful via fetch');
            } else {
              console.error('❌ Connection test failed:', response.status, response.statusText);
              return;
            }
          } catch (fetchError) {
            console.error('❌ Connection test failed:', fetchError.message);
            return;
          }
        }
      }

      // Test with Supabase client if available
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('employees')
            .select('id')
            .limit(1);

          if (error) {
            console.error('❌ Connection failed: Query test failed');
            console.error('Error:', error.message);
            return;
          }

          console.log('✅ Query test succeeded');
        } catch (error) {
          console.error('❌ Connection failed:', error.message);
          return;
        }
      }

      // Display results
      console.log(`Project ref: ${projectRef}`);
      console.log(`Environment: ${environment}`);
      console.log(`Full URL: ${supabaseUrl}`);

      switch (environment) {
        case 'staging':
          console.log('✅ Connected to Supabase (STAGING)');
          console.log('🎉 You are correctly connected to the staging environment!');
          console.log('Environment is safe to use.');
          break;

        case 'production':
          console.warn('⚠️ Warning: Connected to PRODUCTION');
          console.warn('You are using the live payroll database.');
          console.warn('💡 To switch to staging:');
          console.warn('  • Reconnect Lovable → Integrations → Supabase → Payroll-Staging');
          console.warn('  • Or update environment variables to point to staging');
          break;

        case 'unknown':
          console.warn('⚠️ Warning: Connected to unknown environment');
          console.warn('This project reference is not recognized as staging or production.');
          console.warn('💡 Verify you are connected to the correct Supabase project.');
          break;
      }

      // Additional info
      console.log('\n📋 Environment Details:');
      console.log(`  • Project ref: ${projectRef}`);
      console.log(`  • Environment: ${environment}`);
      console.log(`  • Supabase URL: ${supabaseUrl}`);
      console.log(`  • API Key: ${supabaseKey.substring(0, 20)}...`);
      console.log(`  • Hostname: ${window.location.hostname}`);

    } catch (error) {
      console.error('❌ Diagnostic failed:', error.message);
      console.error('💡 Try running this script again or check your browser console for more details');
    }
  }

  // Run the diagnostic
  testSupabaseConnection();
})();

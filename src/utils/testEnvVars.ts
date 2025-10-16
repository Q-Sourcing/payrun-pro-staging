/**
 * 🧪 Environment Variables Test
 * 
 * Simple utility to test if Vite environment variables are accessible
 */

export function testEnvironmentVariables() {
  console.log('🧪 Testing Vite Environment Variables...');
  
  // Test Vite environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const mode = import.meta.env.MODE;
  
  console.log('📋 Environment Variables:');
  console.log(`  • MODE: ${mode || 'not set'}`);
  console.log(`  • VITE_SUPABASE_URL: ${supabaseUrl || 'not set'}`);
  console.log(`  • VITE_SUPABASE_ANON_KEY: ${supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'not set'}`);
  
  // Test if we can access the URL
  if (supabaseUrl) {
    console.log('✅ VITE_SUPABASE_URL is accessible');
    console.log(`   URL: ${supabaseUrl}`);
    
    // Extract project ref
    try {
      const segments = supabaseUrl.split('.');
      if (segments.length >= 2 && segments[0].includes('//')) {
        const projectRef = segments[0].split('//')[1];
        console.log(`   Project ref: ${projectRef}`);
        
        // Determine environment
        if (projectRef === 'sbphmrjoappwlervnbtm') {
          console.log('✅ Environment: STAGING');
        } else if (projectRef === 'kctwfgbjmhnfqtxhagib') {
          console.log('⚠️ Environment: PRODUCTION');
        } else {
          console.log('❓ Environment: UNKNOWN');
        }
      }
    } catch (error) {
      console.error('❌ Error parsing Supabase URL:', error);
    }
  } else {
    console.error('❌ VITE_SUPABASE_URL is not accessible');
    console.error('💡 Make sure your .env file contains VITE_SUPABASE_URL');
  }
  
  if (supabaseKey && supabaseKey !== 'YOUR_STAGING_ANON_KEY_HERE') {
    console.log('✅ VITE_SUPABASE_ANON_KEY is accessible');
  } else {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not accessible or still has placeholder value');
    console.error('💡 Make sure your .env file contains a real VITE_SUPABASE_ANON_KEY');
  }
  
  return {
    mode,
    supabaseUrl,
    supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : null
  };
}

// Auto-run in development
if (import.meta.env.DEV) {
  testEnvironmentVariables();
}

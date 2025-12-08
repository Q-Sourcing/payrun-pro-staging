const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');

// Load environment variables
function loadEnvVars() {
  const envVars = {};
  if (existsSync('.env')) {
    const content = readFileSync('.env', 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
  return envVars;
}

async function diagnoseLoginIssue() {
  const envVars = loadEnvVars();
  
  console.log('🔍 Diagnosing Login 401 Error...\n');
  
  if (!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_ANON_KEY) {
    console.log('❌ Error: Missing Supabase environment variables');
    return;
  }
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  console.log('📋 Environment Configuration:');
  console.log('   Supabase URL:', supabaseUrl);
  console.log('   Project:', supabaseUrl.includes('sbphmrjoappwlervnbtm') ? 'STAGING' : 'UNKNOWN');
  console.log('');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Check if secure-login Edge Function exists
    console.log('🧪 Test 1: Checking secure-login Edge Function...');
    try {
      const { data, error } = await supabase.functions.invoke('secure-login', {
        body: { email: 'test@test.com', password: 'test' },
      });
      
      if (error) {
        if (error.message.includes('Function not found') || error.message.includes('404')) {
          console.log('   ❌ Edge Function not deployed!');
          console.log('   💡 Solution: Deploy the secure-login function');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.log('   ✅ Edge Function exists but returned 401 (expected for test credentials)');
        } else {
          console.log('   ⚠️  Edge Function error:', error.message);
        }
      } else {
        console.log('   ✅ Edge Function is accessible');
      }
    } catch (err) {
      console.log('   ❌ Error calling Edge Function:', err.message);
      console.log('   💡 This might mean the function is not deployed');
    }
    
    console.log('');
    
    // Test 2: Try direct Supabase auth (bypassing Edge Function)
    console.log('🧪 Test 2: Testing direct Supabase authentication...');
    console.log('   Email: nalungukevin@gmail.com');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'nalungukevin@gmail.com',
        password: 'gWaZusuper1!',
      });
      
      if (authError) {
        console.log('   ❌ Direct auth failed:', authError.message);
        
        if (authError.message.includes('Invalid login credentials')) {
          console.log('   💡 Possible causes:');
          console.log('      - User does not exist in auth.users');
          console.log('      - Password is incorrect');
          console.log('      - Email is not confirmed');
        } else if (authError.message.includes('Email not confirmed')) {
          console.log('   💡 Email is not confirmed');
          console.log('   💡 Solution: Confirm email in Supabase Dashboard');
        }
      } else {
        console.log('   ✅ Direct authentication successful!');
        console.log('   ✅ User exists and credentials are correct');
        console.log('   💡 The issue is likely with the Edge Function configuration');
        
        // Sign out after test
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }
    
    console.log('');
    
    // Summary and recommendations
    console.log('📊 Summary & Recommendations:');
    console.log('');
    console.log('1. ✅ Check Edge Function Deployment:');
    console.log('   - Go to Supabase Dashboard > Edge Functions');
    console.log('   - Verify "secure-login" function is deployed');
    console.log('   - If not deployed, run: supabase functions deploy secure-login');
    console.log('');
    console.log('2. ✅ Check Edge Function Environment Variables:');
    console.log('   - Go to Supabase Dashboard > Edge Functions > secure-login > Settings');
    console.log('   - Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.log('   - Verify SUPABASE_URL is set');
    console.log('');
    console.log('3. ✅ Verify User Exists:');
    console.log('   - Go to Supabase Dashboard > Authentication > Users');
    console.log('   - Search for: nalungukevin@gmail.com');
    console.log('   - Verify user exists and email is confirmed');
    console.log('');
    console.log('4. ✅ If user doesn\'t exist, create it:');
    console.log('   - Run the SQL in create-super-admin-user.sql');
    console.log('   - Or create manually in Supabase Dashboard');
    console.log('');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

diagnoseLoginIssue().catch(console.error);


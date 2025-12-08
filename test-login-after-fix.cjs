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

async function testLogin() {
  const envVars = loadEnvVars();
  
  console.log('🧪 Testing secure-login Edge Function after configuration...\n');
  
  if (!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_ANON_KEY) {
    console.log('❌ Error: Missing Supabase environment variables');
    return;
  }
  
  try {
    const supabase = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.VITE_SUPABASE_ANON_KEY
    );
    
    console.log('📋 Testing login with:');
    console.log('   Email: nalungukevin@gmail.com');
    console.log('   Password: gWaZusuper1!\n');
    
    // Test the secure-login Edge Function
    const { data: result, error: invokeError } = await supabase.functions.invoke('secure-login', {
      body: {
        email: 'nalungukevin@gmail.com',
        password: 'gWaZusuper1!',
      },
    });
    
    if (invokeError) {
      console.log('❌ Edge Function Error:');
      console.log('   Message:', invokeError.message);
      console.log('   Name:', invokeError.name);
      
      if (invokeError.context) {
        console.log('   Context:', JSON.stringify(invokeError.context, null, 2));
      }
      
      if (invokeError.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.log('\n💡 The Edge Function is missing SUPABASE_SERVICE_ROLE_KEY');
        console.log('   The secrets are set, but the function might need to be redeployed');
      }
      
      return;
    }
    
    if (result && result.success) {
      console.log('✅ Login successful!');
      console.log('   User:', result.user?.email);
      console.log('   Session created:', !!result.session);
      console.log('\n🎉 The secure-login Edge Function is working correctly!');
    } else {
      console.log('❌ Login failed:');
      console.log('   Result:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testLogin().catch(console.error);


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

async function applyFix() {
  const envVars = loadEnvVars();
  
  console.log('🔧 Applying profiles table fix...\n');
  
  if (!envVars.SUPABASE_SERVICE_ROLE_KEY || !envVars.VITE_SUPABASE_URL) {
    console.log('❌ Error: Missing Supabase credentials');
    console.log('   Need: SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL');
    return;
  }
  
  try {
    // Use service role key to execute SQL
    const supabase = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Read the SQL file
    const sql = readFileSync('fix-profiles-table.sql', 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
    
    console.log(`📋 Executing ${statements.length} SQL statements...\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('DO $$')) {
        // Handle DO blocks separately
        console.log(`   [${i + 1}/${statements.length}] Executing DO block...`);
        try {
          const { error } = await supabase.rpc('exec_sql', { query: statement });
          if (error) {
            console.log(`   ⚠️  Warning: ${error.message}`);
          } else {
            console.log(`   ✅ Success`);
          }
        } catch (err) {
          console.log(`   ⚠️  Warning: ${err.message}`);
        }
      } else {
        console.log(`   [${i + 1}/${statements.length}] Executing: ${statement.substring(0, 50)}...`);
        try {
          // Use RPC to execute SQL (if exec_sql function exists)
          // Otherwise, we'll need to use direct SQL execution
          const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
          if (error) {
            // If exec_sql doesn't exist, we can't execute via client
            console.log(`   ⚠️  Cannot execute via client. Please run in Supabase Dashboard SQL Editor.`);
            break;
          } else {
            console.log(`   ✅ Success`);
          }
        } catch (err) {
          console.log(`   ⚠️  Cannot execute via client: ${err.message}`);
          console.log(`   💡 Please run the SQL in Supabase Dashboard SQL Editor`);
          break;
        }
      }
    }
    
    console.log('\n📋 Instructions:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/sbphmrjoappwlervnbtm/sql/new');
    console.log('   2. Copy and paste the contents of fix-profiles-table.sql');
    console.log('   3. Click "Run" to execute');
    console.log('   4. Then test login again\n');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\n💡 Please run fix-profiles-table.sql in Supabase Dashboard SQL Editor');
  }
}

applyFix().catch(console.error);


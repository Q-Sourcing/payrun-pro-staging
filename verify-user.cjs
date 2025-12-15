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

async function verifyUser() {
  const envVars = loadEnvVars();

  console.log('🔍 Verifying user: Nalungu Kevin (nalungukevin@gmail.com)\n');

  if (!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_ANON_KEY) {
    console.log('❌ Error: Missing Supabase environment variables');
    return;
  }

  try {
    const supabase = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.VITE_SUPABASE_ANON_KEY
    );

    // Check user in public.users table
    console.log('📋 Checking public.users table...');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, created_at')
      .eq('email', 'nalungukevin@gmail.com')
      .single();

    if (publicError) {
      console.log('❌ Error querying public.users:', publicError.message);
    } else if (publicUser) {
      console.log('✅ User found in public.users:');
      console.log('   ID:', publicUser.id);
      console.log('   Email:', publicUser.email);
      console.log('   Name:', `${publicUser.first_name} ${publicUser.last_name}`);
      console.log('   Role:', publicUser.role);
      console.log('   Is Active:', publicUser.is_active);
      console.log('   Created At:', publicUser.created_at);

      // Check if role is super_admin
      if (publicUser.role === 'super_admin') {
        console.log('   ✅ Role is super_admin');
      } else {
        console.log('   ⚠️  Role is:', publicUser.role, '(expected: super_admin)');
      }
    } else {
      console.log('❌ User not found in public.users table');
    }

    // Note: We cannot directly query auth.users table via Supabase client
    // as it requires service_role key. But we can check if the user can authenticate
    console.log('\n📋 Note: To verify auth.users table, you need to:');
    console.log('   1. Use Supabase Dashboard > Authentication > Users');
    console.log('   2. Or use service_role key to query auth.users directly');
    console.log('   3. Or attempt login with the credentials');

    // Summary
    console.log('\n📊 Summary:');
    if (publicUser) {
      console.log('   ✅ User exists in public.users');
      console.log('   ✅ Email:', publicUser.email);
      console.log('   ✅ Name:', `${publicUser.first_name} ${publicUser.last_name}`);
      console.log('   ✅ Role:', publicUser.role);
      console.log('   ✅ Active:', publicUser.is_active);

      if (publicUser.role === 'super_admin') {
        console.log('\n🎉 User has super_admin role!');
      } else {
        console.log('\n⚠️  User role is', publicUser.role, 'not super_admin');
      }
    } else {
      console.log('   ❌ User not found in database');
    }

    console.log('\n💡 To verify password, try logging in with:');
    console.log('   Email: nalungukevin@gmail.com');
    // Password removed for security. Use the password from your env or dashboard.
    console.log('   Password: [REMOVED - CHECK YOUR ENV VARIABLES]');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

verifyUser().catch(console.error);


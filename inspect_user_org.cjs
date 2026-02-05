const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectUserOrg() {
    console.log('🔍 Inspecting User Organization links...\n');

    // Get the user ID from the email (hardcoded for this user context)
    const email = 'nalungukevin@gmail.com';

    // Check legacy users
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, organization_id, role')
        .eq('email', email);

    console.log('--- Public.Users (Legacy) ---');
    if (usersError) console.error(usersError);
    else console.table(users);

    if (!users || users.length === 0) {
        console.log('User not found in public.users');
        return;
    }
    const userId = users[0].id;

    // Check user_profiles
    const { data: profiles, error: profError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId);

    console.log('\n--- Public.User_Profiles ---');
    if (profError) console.error(profError);
    else console.table(profiles);

    // Check metadata via auth admin (simulated by just looking at what we have, 
    // real auth metadata isn't easily queryable via SQL unless we use the rpc wrapper or admin api, 
    // ensuring we use service key above gives us admin rights).
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    const targetUser = authUsers?.find(u => u.email === email);

    console.log('\n--- Auth.Users Metadata ---');
    if (targetUser) {
        console.log('User Metadata:', targetUser.user_metadata);
        console.log('App Metadata:', targetUser.app_metadata);
    } else {
        console.log('User not found in auth admin list');
    }
}

inspectUserOrg();

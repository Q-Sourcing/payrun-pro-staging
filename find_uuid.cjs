const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log("Could not load .env file, relying on process.env");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const targetId = 'd2cb290a-4b55-4dd8-b405-541e6b8a6bfb';

async function find() {
    console.log(`Searching for ${targetId}...`);

    // 1. Check auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(targetId);
    if (authUser && authUser.user) {
        console.log(`\n✅ Found in AUTH.USERS`);
        console.log(`   Email: ${authUser.user.email}`);
        console.log(`   Created: ${authUser.user.created_at}`);
    } else {
        console.log(`\n❌ Not found in auth.users (${authError?.message || 'null'})`);
    }

    // 2. Check public.user_profiles
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', targetId).maybeSingle();
    if (profile) {
        console.log(`\n✅ Found in PUBLIC.USER_PROFILES`);
        console.log(`   First Name: ${profile.first_name}`);
        console.log(`   Org ID: ${profile.organization_id}`);
    } else {
        console.log(`\n❌ Not found in public.user_profiles`);
    }

    // 3. Check public.org_users (as ID)
    const { data: orgUserId } = await supabase.from('org_users').select('*').eq('id', targetId).maybeSingle();
    if (orgUserId) {
        console.log(`\n✅ Found in PUBLIC.ORG_USERS (as Primary Key ID)`);
    }

    // 4. Check public.org_users (as user_id)
    const { data: orgUserLinks } = await supabase.from('org_users').select('*').eq('user_id', targetId);
    if (orgUserLinks && orgUserLinks.length > 0) {
        console.log(`\n✅ Found in PUBLIC.ORG_USERS (linked as user_id in ${orgUserLinks.length} rows)`);
        orgUserLinks.forEach(link => {
            console.log(`   - Org: ${link.org_id}, Status: ${link.status}, ID: ${link.id}`);
        });
    } else {
        console.log(`\n❌ Not found in public.org_users (as user_id)`);
    }

    // 5. Check public.user_invites
    const { data: invite } = await supabase.from('user_invites').select('*').eq('id', targetId).maybeSingle();
    if (invite) {
        console.log(`\n✅ Found in PUBLIC.USER_INVITES (as ID)`);
        console.log(`   Email: ${invite.email}, Status: ${invite.status}`);
    } else {
        console.log(`\n❌ Not found in public.user_invites`);
    }
}

find();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectData() {
    console.log('--- Organizations ---');
    const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name');

    if (orgsError) console.error('Error fetching orgs:', orgsError);
    else console.table(orgs);

    console.log('\n--- User Profiles (Sample) ---');
    const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, organization_id')
        .limit(5);

    if (usersError) console.error('Error fetching users:', usersError);
    else console.table(users);

    console.log('\n--- RBAC Assignments (Sample) ---');
    const { data: assignments, error: assignmentsError } = await supabase
        .from('rbac_assignments')
        .select('user_id, role_code, scope_type, scope_id, org_id')
        .limit(10);

    if (assignmentsError) console.error('Error fetching assignments:', assignmentsError);
    else console.table(assignments);
}

inspectData();

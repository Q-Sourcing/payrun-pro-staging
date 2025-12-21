const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = 'nalungukevin@gmail.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAssignment() {
    try {
        const { data: user, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) throw userError;

        const targetUser = user.users.find(u => u.email === email);
        if (!targetUser) {
            console.log(`❌ User not found: ${email}`);
            return;
        }

        console.log(`👤 User found: ${targetUser.id}`);
        console.log(`🔑 App Metadata:`, JSON.stringify(targetUser.app_metadata, null, 2));

        const { data: assignments, error } = await supabase
            .from('rbac_assignments')
            .select('*')
            .eq('user_id', targetUser.id);

        if (error) throw error;

        console.log(`📋 Assignments in DB:`, JSON.stringify(assignments, null, 2));

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

verifyAssignment();

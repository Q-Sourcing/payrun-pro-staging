const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectPolicies() {
    console.log('🔍 Inspecting RLS Policies for approval_workflows...\n');

    const sql = `
        SELECT 
            tablename, 
            policyname, 
            cmd, 
            qual, 
            with_check 
        FROM pg_policies 
        WHERE tablename = 'approval_workflows'
        ORDER BY policyname
    `;

    const { data, error } = await supabase.rpc('exec_sql_query', { sql_query: sql });

    if (error) {
        console.error('❌ Error fetching policies:', error.message);
        return;
    }

    if (!data) {
        console.log('⏹️ No policies found or no data returned.');
        return;
    }

    const fs = require('fs');
    fs.writeFileSync('approval_workflows_policies.json', JSON.stringify(data, null, 2));
    console.log('✅ Policy data written to approval_workflows_policies.json');
}

inspectPolicies();

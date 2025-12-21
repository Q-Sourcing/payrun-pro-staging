const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectPayRuns() {
    console.log('--- Pay Runs Columns ---');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pay_runs' AND table_schema = 'public';"
    });

    // If exec_sql returns null, try direct query via select (though it might not work for info schema easily)
    // Actually, RPC result for SELECT is often null if not handled.

    // Let's try to just insert a pay run with guessed columns and see the error
    const { error: insertError } = await supabase
        .from('pay_runs')
        .insert({ status: 'draft' })
        .select();

    if (insertError) {
        console.log('Insert Error:', insertError.message);
    } else {
        console.log('Insert success');
    }
}

inspectPayRuns();

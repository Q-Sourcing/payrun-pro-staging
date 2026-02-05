
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyJoelGroup() {
    console.log('Verifying "joel group" in pay_group_master...');

    const { data: masterData, error: masterError } = await supabase
        .from('pay_group_master')
        .select('*')
        .eq('name', 'joel group');

    if (masterError) {
        console.error('Error fetching from pay_group_master:', masterError);
    } else {
        console.log('pay_group_master records:', masterData);
    }

    // Also check head_office_pay_groups_regular to see source data
    console.log('Verifying "joel group" in head_office_pay_groups_regular...');
    const { data: regularData, error: regularError } = await supabase
        .from('head_office_pay_groups_regular')
        .select('*')
        .eq('name', 'joel group');

    if (regularError) {
        console.error('Error fetching from head_office_pay_groups_regular:', regularError);
    } else {
        console.log('head_office_pay_groups_regular records:', regularData);
    }
}

verifyJoelGroup();

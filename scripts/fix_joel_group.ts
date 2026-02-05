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

async function fixJoelGroup() {
    console.log('🔧 Fixing "joel group" in pay_group_master...');

    // Update the pay_group_master record to have valid employee_type and pay_frequency
    const { data, error } = await supabase
        .from('pay_group_master')
        .update({
            employee_type: 'regular',
            pay_frequency: 'monthly', // Default assumption for regular head office groups
            category: 'head_office'
        })
        .eq('name', 'joel group')
        .select();

    if (error) {
        console.error('❌ Error updating pay_group_master:', error);
        process.exit(1);
    }

    console.log('✅ Successfully updated "joel group" record:');
    console.log(data);

    console.log('\n📝 Note: The group is still in the legacy "pay_groups" table.');
    console.log('   New groups created via the UI will use the correct "head_office_pay_groups_regular" table.');
    console.log('   This fix ensures "joel group" will appear in the Create Pay Run dialog.');
}

fixJoelGroup();

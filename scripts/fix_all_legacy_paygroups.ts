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

async function fixAllLegacyPayGroups() {
    console.log('🔧 Fixing all legacy pay groups with missing pay_frequency...\n');

    // Get all groups from legacy pay_groups table that are missing pay_frequency
    const { data: legacyGroups, error: fetchError } = await supabase
        .from('pay_group_master')
        .select('*')
        .eq('source_table', 'pay_groups')
        .is('pay_frequency', null)
        .eq('active', true);

    if (fetchError) {
        console.error('❌ Error fetching legacy groups:', fetchError);
        process.exit(1);
    }

    console.log(`Found ${legacyGroups?.length || 0} legacy groups to fix:\n`);

    if (!legacyGroups || legacyGroups.length === 0) {
        console.log('✅ No legacy groups need fixing!');
        return;
    }

    // Update each group with appropriate default pay_frequency
    for (const group of legacyGroups) {
        console.log(`Fixing: ${group.name}`);

        // Determine default pay_frequency based on employee_type
        let defaultFrequency = 'monthly'; // Default for most types

        if (group.employee_type === 'expatriate') {
            defaultFrequency = 'monthly'; // Expatriates typically monthly
        } else if (group.employee_type === 'ippms') {
            defaultFrequency = null; // IPPMS uses pay_type instead
        } else if (group.employee_type === 'regular' || group.employee_type === 'interns') {
            defaultFrequency = 'monthly';
        }

        const { error: updateError } = await supabase
            .from('pay_group_master')
            .update({
                pay_frequency: defaultFrequency
            })
            .eq('id', group.id);

        if (updateError) {
            console.error(`   ❌ Error updating ${group.name}:`, updateError);
        } else {
            console.log(`   ✅ Updated ${group.name} with pay_frequency: ${defaultFrequency || 'NULL (IPPMS)'}`);
        }
    }

    console.log('\n✅ All legacy pay groups have been updated!');
    console.log('📝 Note: These groups remain in the legacy "pay_groups" table.');
    console.log('   New groups will use the correct specialized tables.');
}

fixAllLegacyPayGroups();

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

async function checkAllPayGroups() {
    console.log('🔍 Checking all pay groups in pay_group_master...\n');

    const { data: allGroups, error } = await supabase
        .from('pay_group_master')
        .select('*')
        .eq('active', true)
        .order('name');

    if (error) {
        console.error('❌ Error fetching pay groups:', error);
        process.exit(1);
    }

    console.log(`Found ${allGroups?.length || 0} active pay groups:\n`);

    const issues: any[] = [];

    allGroups?.forEach((group, index) => {
        console.log(`${index + 1}. ${group.name}`);
        console.log(`   Category: ${group.category || '❌ NULL'}`);
        console.log(`   Employee Type: ${group.employee_type || '❌ NULL'}`);
        console.log(`   Pay Frequency: ${group.pay_frequency || '❌ NULL'}`);
        console.log(`   Type: ${group.type}`);
        console.log(`   Source: ${group.source_table}`);
        console.log('');

        // Check for missing metadata
        if (!group.employee_type || !group.category) {
            issues.push({
                id: group.id,
                name: group.name,
                missing: {
                    employee_type: !group.employee_type,
                    category: !group.category,
                    pay_frequency: !group.pay_frequency
                }
            });
        }
    });

    if (issues.length > 0) {
        console.log('\n⚠️  Found pay groups with missing metadata:');
        issues.forEach(issue => {
            console.log(`\n   ${issue.name} (${issue.id})`);
            console.log(`   Missing: ${Object.keys(issue.missing).filter(k => issue.missing[k]).join(', ')}`);
        });

        console.log('\n💡 These groups may not appear in filtered dialogs.');
    } else {
        console.log('✅ All pay groups have complete metadata!');
    }
}

checkAllPayGroups();

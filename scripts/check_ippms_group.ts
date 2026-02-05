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

async function checkLatestIppmsGroup() {
    console.log('🔍 Checking latest IPPMS pay group...\n');

    const { data: ippmsGroups, error } = await supabase
        .from('pay_group_master')
        .select('*')
        .eq('active', true)
        .eq('employee_type', 'ippms')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error fetching IPPMS groups:', error);
        process.exit(1);
    }

    console.log(`Found ${ippmsGroups?.length || 0} recent IPPMS groups:\n`);

    ippmsGroups?.forEach((group, index) => {
        console.log(`${index + 1}. ${group.name}`);
        console.log(`   ID: ${group.id}`);
        console.log(`   Category: ${group.category || '❌ NULL'}`);
        console.log(`   Employee Type: ${group.employee_type || '❌ NULL'}`);
        console.log(`   Pay Type: ${group.pay_type || '❌ NULL'}`);
        console.log(`   Pay Frequency: ${group.pay_frequency || 'NULL (expected for IPPMS)'}`);
        console.log(`   Type: ${group.type}`);
        console.log(`   Source Table: ${group.source_table}`);
        console.log(`   Created: ${group.created_at}`);
        console.log('');
    });

    // Check if the latest one has all required fields for filtering
    if (ippmsGroups && ippmsGroups.length > 0) {
        const latest = ippmsGroups[0];
        console.log('📋 Latest IPPMS Group Analysis:');
        console.log(`   Name: ${latest.name}`);

        const issues = [];
        if (!latest.category) issues.push('category is NULL');
        if (!latest.employee_type) issues.push('employee_type is NULL');
        if (latest.category !== 'projects') issues.push(`category is '${latest.category}' instead of 'projects'`);
        if (latest.employee_type !== 'ippms') issues.push(`employee_type is '${latest.employee_type}' instead of 'ippms'`);

        if (issues.length > 0) {
            console.log('\n⚠️  Issues found:');
            issues.forEach(issue => console.log(`   - ${issue}`));
            console.log('\n💡 This group may not appear in the IPPMS Projects nav section due to incorrect metadata.');
        } else {
            console.log('\n✅ Metadata looks correct for IPPMS filtering.');
            console.log('💡 Issue may be in the navigation/routing configuration.');
        }
    }
}

checkLatestIppmsGroup();

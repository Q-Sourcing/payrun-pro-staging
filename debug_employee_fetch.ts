
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEmployeeFetch() {
    const payGroupName = "JESA TEST 2025";
    console.log(`🔍 Searching for pay group: "${payGroupName}"...`);

    // 1. Find the pay group in pay_group_master (or pay_groups/expatriate_pay_groups)
    // We'll check pay_groups first as it's likely a project pay group
    const { data: payGroups, error: pgError } = await supabase
        .from('pay_groups')
        .select('*')
        .eq('name', payGroupName);

    if (pgError) {
        console.error('❌ Error fetching pay group:', pgError);
        return;
    }

    if (!payGroups || payGroups.length === 0) {
        console.error('❌ Pay group not found in pay_groups table');
        return;
    }

    const payGroup = payGroups[0];
    console.log('✅ Found Pay Group:', payGroup);
    console.log(`   ID: ${payGroup.id}`);
    console.log(`   Project ID: ${payGroup.project_id}`);
    console.log(`   Category: ${payGroup.category}`); // Should be 'projects'?
    // Note: pay_groups table might not have category/employee_type columns directly if they are on master?
    // Let's check pay_group_master for this source_id

    const { data: masterGroup, error: masterError } = await supabase
        .from('pay_group_master')
        .select('*')
        .eq('source_id', payGroup.id)
        .single();

    if (masterError) {
        console.error('❌ Error fetching pay_group_master:', masterError);
    } else {
        console.log('✅ Found Pay Group Master:', masterGroup);
        console.log(`   Master ID: ${masterGroup.id}`);
        console.log(`   Category: ${masterGroup.category}`);
        console.log(`   Employee Type: ${masterGroup.employee_type}`);
        console.log(`   Pay Frequency: ${masterGroup.pay_frequency}`);

        // 2. Fetch assignments from paygroup_employees
        console.log('\n🔍 Fetching assignments from paygroup_employees...');
        const { data: assignments, error: assignError } = await supabase
            .from('paygroup_employees')
            .select(`
        id,
        active,
        employee_id,
        employees (
          id, 
          first_name, 
          last_name, 
          pay_rate, 
          pay_type, 
          country, 
          employee_type, 
          status, 
          pay_group_id, 
          category, 
          pay_frequency
        )
      `)
            .eq('pay_group_master_id', masterGroup.id);

        if (assignError) {
            console.error('❌ Error fetching assignments:', assignError);
            return;
        }

        console.log(`✅ Found ${assignments?.length || 0} assignments.`);

        if (assignments && assignments.length > 0) {
            assignments.forEach((assign: any, index: number) => {
                const emp = assign.employees;
                console.log(`\n[${index + 1}] Employee: ${emp?.first_name} ${emp?.last_name}`);
                console.log(`    Assignment Active: ${assign.active}`);
                console.log(`    Employee Status: ${emp?.status}`);
                console.log(`    Category: ${emp?.category} (Expected: ${masterGroup.category})`);
                console.log(`    Employee Type: ${emp?.employee_type} (Expected: ${masterGroup.employee_type})`);
                console.log(`    Pay Type: ${emp?.pay_type}`);
                console.log(`    Pay Frequency: ${emp?.pay_frequency}`);

                // Check filtering logic
                const matchesCategory = !masterGroup.category || emp?.category === masterGroup.category;
                const matchesEmployeeType = !masterGroup.employee_type || emp?.employee_type === masterGroup.employee_type;
                const matchesPayType = emp?.pay_type === 'piece_rate'; // Assuming IPPMS Piece Rate

                console.log(`    -> Matches Category? ${matchesCategory}`);
                console.log(`    -> Matches Employee Type? ${matchesEmployeeType}`);
                console.log(`    -> Matches Pay Type (piece_rate)? ${matchesPayType}`);
            });
        } else {
            console.log('⚠️ No assignments found in paygroup_employees.');

            // Check legacy employees table
            console.log('\n🔍 Checking legacy employees table (fallback)...');
            const { data: legacyEmps, error: legacyError } = await supabase
                .from('employees')
                .select('*')
                .eq('pay_group_id', payGroup.id);

            if (legacyError) {
                console.error('❌ Error fetching legacy employees:', legacyError);
            } else {
                console.log(`✅ Found ${legacyEmps?.length || 0} employees in legacy table.`);
                legacyEmps?.forEach((emp: any) => {
                    console.log(`    Employee: ${emp.first_name} ${emp.last_name}, PayGroup ID: ${emp.pay_group_id}`);
                });
            }
        }
    }
}

debugEmployeeFetch();

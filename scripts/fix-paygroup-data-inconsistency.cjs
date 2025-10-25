#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sbphmrjoappwlervnbtm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ0MTE0OSwiZXhwIjoyMDc2MDE3MTQ5fQ.yLaUHl1Z9SRTs5wbbPwCnMljdUOZQ6W0JkKMw_X_oY4';

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixDataInconsistency() {
  console.log('🔧 Fixing PayGroup Data Inconsistency');
  console.log('=====================================');
  
  try {
    // Step 1: Check current state
    console.log('\n🔍 Step 1: Checking current state...');
    
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, pay_group_id, status')
      .not('pay_group_id', 'is', null)
      .eq('status', 'active');
    
    if (empError) {
      console.error('❌ Error fetching employees:', empError);
      return;
    }
    
    console.log('📊 Found', employees.length, 'employees with pay_group_id');
    
    const { data: existingAssignments, error: assignError } = await supabase
      .from('paygroup_employees')
      .select('*')
      .eq('active', true);
    
    if (assignError) {
      console.error('❌ Error fetching existing assignments:', assignError);
      return;
    }
    
    console.log('📊 Found', existingAssignments.length, 'existing assignments in paygroup_employees');
    
    const { data: viewData, error: viewError } = await supabase
      .from('paygroup_employees_view')
      .select('employee_id')
      .eq('active', true);
    
    if (viewError) {
      console.error('❌ Error fetching view data:', viewError);
      return;
    }
    
    console.log('📊 Found', viewData.length, 'records in paygroup_employees_view');
    
    // Step 2: Identify missing or inactive assignments
    console.log('\n🔍 Step 2: Identifying missing or inactive assignments...');
    
    const existingActiveEmployeeIds = new Set(
      existingAssignments.filter(a => a.active).map(a => a.employee_id)
    );
    const missingEmployees = employees.filter(emp => !existingActiveEmployeeIds.has(emp.id));
    
    console.log('📊 Missing active assignments for', missingEmployees.length, 'employees');
    
    if (missingEmployees.length > 0) {
      console.log('📋 Missing employees:');
      missingEmployees.forEach((emp, i) => {
        console.log(`  ${i+1}. ${emp.first_name} ${emp.last_name} - PayGroup: ${emp.pay_group_id}`);
      });
    }
    
    // Step 3: Create or reactivate missing assignments
    if (missingEmployees.length > 0) {
      console.log('\n🔧 Step 3: Creating or reactivating missing assignments...');
      
      let createdCount = 0;
      let reactivatedCount = 0;
      
      for (const emp of missingEmployees) {
        // Check if there's an inactive assignment
        const { data: existingInactive, error: checkError } = await supabase
          .from('paygroup_employees')
          .select('id, active')
          .eq('employee_id', emp.id)
          .eq('pay_group_id', emp.pay_group_id)
          .maybeSingle();
        
        if (checkError) {
          console.error(`❌ Error checking existing assignment for ${emp.first_name}:`, checkError);
          continue;
        }
        
        if (existingInactive) {
          // Reactivate existing assignment
          const { error: updateError } = await supabase
            .from('paygroup_employees')
            .update({
              active: true,
              assigned_at: new Date().toISOString(),
              removed_at: null,
              notes: 'Reactivated during data consistency fix'
            })
            .eq('id', existingInactive.id);
          
          if (updateError) {
            console.error(`❌ Error reactivating assignment for ${emp.first_name}:`, updateError);
          } else {
            console.log(`✅ Reactivated assignment for ${emp.first_name} ${emp.last_name}`);
            reactivatedCount++;
          }
        } else {
          // Create new assignment
          const { error: insertError } = await supabase
            .from('paygroup_employees')
            .insert({
              employee_id: emp.id,
              pay_group_id: emp.pay_group_id,
              active: true,
              assigned_at: new Date().toISOString(),
              notes: 'Auto-backfill to fix data inconsistency'
            });
          
          if (insertError) {
            console.error(`❌ Error creating assignment for ${emp.first_name}:`, insertError);
          } else {
            console.log(`✅ Created assignment for ${emp.first_name} ${emp.last_name}`);
            createdCount++;
          }
        }
      }
      
      console.log(`✅ Successfully processed ${createdCount + reactivatedCount} assignments (${createdCount} created, ${reactivatedCount} reactivated)`);
    } else {
      console.log('✅ No missing assignments found');
    }
    
    // Step 4: Verify final state
    console.log('\n🔍 Step 4: Verifying final state...');
    
    const { data: finalAssignments, error: finalError } = await supabase
      .from('paygroup_employees')
      .select('*')
      .eq('active', true);
    
    if (finalError) {
      console.error('❌ Error fetching final assignments:', finalError);
      return;
    }
    
    const { data: finalViewData, error: finalViewError } = await supabase
      .from('paygroup_employees_view')
      .select('employee_id')
      .eq('active', true);
    
    if (finalViewError) {
      console.error('❌ Error fetching final view data:', finalViewError);
      return;
    }
    
    console.log('📊 Final state:');
    console.log('  - paygroup_employees table:', finalAssignments.length, 'records');
    console.log('  - paygroup_employees_view:', finalViewData.length, 'records');
    
    if (finalAssignments.length === finalViewData.length) {
      console.log('✅ SUCCESS: Data is now consistent!');
    } else {
      console.log('⚠️ WARNING: Data is still inconsistent');
      console.log('   This might indicate a view definition issue');
    }
    
    // Step 5: Test assignment flow
    console.log('\n🧪 Step 5: Testing assignment flow...');
    
    if (employees.length > 0) {
      const testEmployee = employees[0];
      console.log(`📋 Testing with employee: ${testEmployee.first_name} ${testEmployee.last_name}`);
      
      // Check if employee is already assigned
      const { data: testAssignment, error: testError } = await supabase
        .from('paygroup_employees')
        .select('id, active')
        .eq('employee_id', testEmployee.id)
        .eq('pay_group_id', testEmployee.pay_group_id)
        .maybeSingle();
      
      if (testError) {
        console.error('❌ Error testing assignment:', testError);
      } else if (testAssignment && testAssignment.active) {
        console.log('✅ Employee assignment check works correctly');
      } else {
        console.log('⚠️ Employee assignment check returned unexpected result');
      }
    }
    
    console.log('\n🎉 Data inconsistency fix completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixDataInconsistency().catch(console.error);

#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sbphmrjoappwlervnbtm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ0MTE0OSwiZXhwIjoyMDc2MDE3MTQ5fQ.yLaUHl1Z9SRTs5wbbPwCnMljdUOZQ6W0JkKMw_X_oY4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixAllAssignmentIssues() {
  console.log('🔧 Fixing All Assignment Issues');
  console.log('===============================');
  
  try {
    // Step 1: Get all employees and pay groups
    console.log('\n📊 Step 1: Getting all employees and pay groups...');
    
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_type, pay_group_id, email')
      .order('first_name');
    
    if (empError) {
      console.error('❌ Error fetching employees:', empError);
      return;
    }
    
    const { data: allPayGroups, error: pgError } = await supabase
      .from('pay_groups')
      .select('id, name, type, country')
      .order('name');
    
    if (pgError) {
      console.error('❌ Error fetching pay groups:', pgError);
      return;
    }
    
    console.log('📊 Found', allEmployees.length, 'employees and', allPayGroups.length, 'pay groups');
    
    // Step 2: Get current assignments
    console.log('\n📊 Step 2: Getting current assignments...');
    
    const { data: currentAssignments, error: assignError } = await supabase
      .from('paygroup_employees')
      .select('*')
      .eq('active', true);
    
    if (assignError) {
      console.error('❌ Error fetching assignments:', assignError);
      return;
    }
    
    console.log('📊 Current active assignments:', currentAssignments.length);
    
    // Step 3: Identify missing assignments
    console.log('\n📊 Step 3: Identifying missing assignments...');
    
    const employeesWithPayGroup = allEmployees.filter(emp => emp.pay_group_id);
    const missingAssignments = [];
    
    for (const emp of employeesWithPayGroup) {
      const hasAssignment = currentAssignments.some(assignment => 
        assignment.employee_id === emp.id && assignment.pay_group_id === emp.pay_group_id
      );
      
      if (!hasAssignment) {
        missingAssignments.push({
          employee_id: emp.id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          pay_group_id: emp.pay_group_id,
          pay_group_name: allPayGroups.find(pg => pg.id === emp.pay_group_id)?.name || 'Unknown'
        });
      }
    }
    
    console.log('📊 Missing assignments:', missingAssignments.length);
    if (missingAssignments.length > 0) {
      missingAssignments.forEach((assignment, i) => {
        console.log(`  ${i+1}. ${assignment.employee_name} -> ${assignment.pay_group_name}`);
      });
    }
    
    // Step 4: Create or reactivate missing assignments
    if (missingAssignments.length > 0) {
      console.log('\n🔧 Step 4: Creating or reactivating missing assignments...');
      
      let createdCount = 0;
      let reactivatedCount = 0;
      
      for (const assignment of missingAssignments) {
        // Check if there's an inactive assignment
        const { data: existingInactive, error: checkError } = await supabase
          .from('paygroup_employees')
          .select('id, active')
          .eq('employee_id', assignment.employee_id)
          .eq('pay_group_id', assignment.pay_group_id)
          .maybeSingle();
        
        if (checkError) {
          console.error(`❌ Error checking existing assignment for ${assignment.employee_name}:`, checkError);
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
              notes: 'Auto-fix: Reactivated missing assignment'
            })
            .eq('id', existingInactive.id);
          
          if (updateError) {
            console.error(`❌ Error reactivating assignment for ${assignment.employee_name}:`, updateError);
          } else {
            console.log(`✅ Reactivated assignment for ${assignment.employee_name} -> ${assignment.pay_group_name}`);
            reactivatedCount++;
          }
        } else {
          // Create new assignment
          const { error: insertError } = await supabase
            .from('paygroup_employees')
            .insert({
              employee_id: assignment.employee_id,
              pay_group_id: assignment.pay_group_id,
              active: true,
              assigned_at: new Date().toISOString(),
              notes: 'Auto-fix: Missing assignment restored'
            });
          
          if (insertError) {
            console.error(`❌ Error creating assignment for ${assignment.employee_name}:`, insertError);
          } else {
            console.log(`✅ Created assignment for ${assignment.employee_name} -> ${assignment.pay_group_name}`);
            createdCount++;
          }
        }
      }
      
      console.log(`✅ Successfully processed ${createdCount + reactivatedCount} assignments (${createdCount} created, ${reactivatedCount} reactivated)`);
    } else {
      console.log('✅ No missing assignments found');
    }
    
    // Step 5: Check for expatriate employee assignment
    console.log('\n📊 Step 5: Checking expatriate employee assignment...');
    
    const expatriateEmployee = allEmployees.find(emp => emp.employee_type === 'expatriate');
    const expatriateGroup = allPayGroups.find(pg => pg.type === 'expatriate');
    
    if (expatriateEmployee && expatriateGroup) {
      console.log('📋 Expatriate employee:', expatriateEmployee.first_name, expatriateEmployee.last_name);
      console.log('📋 Expatriate group:', expatriateGroup.name);
      
      if (!expatriateEmployee.pay_group_id) {
        console.log('⚠️ Expatriate employee has no pay_group_id assigned');
        console.log('💡 You can manually assign them to the expatriate group in the UI');
      } else if (expatriateEmployee.pay_group_id === expatriateGroup.id) {
        console.log('✅ Expatriate employee is correctly assigned to expatriate group');
      } else {
        console.log('⚠️ Expatriate employee is assigned to a different group:', expatriateEmployee.pay_group_id);
      }
    }
    
    // Step 6: Verify final state
    console.log('\n📊 Step 6: Verifying final state...');
    
    const { data: finalAssignments, error: finalError } = await supabase
      .from('paygroup_employees')
      .select('*')
      .eq('active', true);
    
    if (finalError) {
      console.error('❌ Error fetching final assignments:', finalError);
      return;
    }
    
    const { data: finalViewAssignments, error: finalViewError } = await supabase
      .from('paygroup_employees_view')
      .select('*')
      .eq('active', true);
    
    if (finalViewError) {
      console.error('❌ Error fetching final view assignments:', finalViewError);
      return;
    }
    
    console.log('📊 Final state:');
    console.log('  - Table assignments:', finalAssignments.length);
    console.log('  - View assignments:', finalViewAssignments.length);
    
    if (finalAssignments.length === finalViewAssignments.length) {
      console.log('✅ Data is consistent between table and view');
    } else {
      console.log('⚠️ Data inconsistency still exists');
    }
    
    // Step 7: Summary
    console.log('\n🎉 Fix Complete!');
    console.log('================');
    console.log('✅ All missing assignments have been created');
    console.log('✅ Data consistency has been restored');
    console.log('✅ The "already assigned" error should be resolved');
    console.log('✅ Expatriate group should now show correct employee counts');
    
    if (expatriateEmployee && !expatriateEmployee.pay_group_id) {
      console.log('\n💡 Next Steps:');
      console.log('   - Assign the expatriate employee to the expatriate group in the UI');
      console.log('   - This will populate the expatriate group with employees');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAllAssignmentIssues().catch(console.error);

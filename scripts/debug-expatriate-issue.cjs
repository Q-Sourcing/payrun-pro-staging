#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sbphmrjoappwlervnbtm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ0MTE0OSwiZXhwIjoyMDc2MDE3MTQ5fQ.yLaUHl1Z9SRTs5wbbPwCnMljdUOZQ6W0JkKMw_X_oY4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugExpatriateIssue() {
  console.log('🔍 Debugging Expatriate Assignment Issue');
  console.log('========================================');
  
  try {
    // Step 1: Check all employees
    console.log('\n📊 Step 1: Checking all employees...');
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_type, pay_group_id, email')
      .order('first_name');
    
    if (empError) {
      console.error('❌ Error fetching employees:', empError);
      return;
    }
    
    console.log('📊 Total employees:', allEmployees.length);
    allEmployees.forEach((emp, i) => {
      console.log(`  ${i+1}. ${emp.first_name} ${emp.last_name} (${emp.email}) - Type: ${emp.employee_type}, PayGroup: ${emp.pay_group_id || 'null'}`);
    });
    
    // Step 2: Check all pay groups
    console.log('\n📊 Step 2: Checking all pay groups...');
    const { data: allPayGroups, error: pgError } = await supabase
      .from('pay_groups')
      .select('id, name, type, country')
      .order('name');
    
    if (pgError) {
      console.error('❌ Error fetching pay groups:', pgError);
      return;
    }
    
    console.log('📊 Total pay groups:', allPayGroups.length);
    allPayGroups.forEach((pg, i) => {
      console.log(`  ${i+1}. ${pg.name} (${pg.type}) - Country: ${pg.country}`);
    });
    
    // Step 3: Check all assignments in view
    console.log('\n📊 Step 3: Checking all assignments in view...');
    const { data: allViewAssignments, error: viewError } = await supabase
      .from('paygroup_employees_view')
      .select('*')
      .eq('active', true);
    
    if (viewError) {
      console.error('❌ View error:', viewError);
      return;
    }
    
    console.log('📊 Total active assignments in view:', allViewAssignments.length);
    if (allViewAssignments.length > 0) {
      allViewAssignments.forEach((assignment, i) => {
        console.log(`  ${i+1}. ${assignment.employee_name} -> ${assignment.pay_group_name} (${assignment.pay_group_type})`);
      });
    }
    
    // Step 4: Check all assignments in table
    console.log('\n📊 Step 4: Checking all assignments in table...');
    const { data: allTableAssignments, error: tableError } = await supabase
      .from('paygroup_employees')
      .select('*')
      .eq('active', true);
    
    if (tableError) {
      console.error('❌ Table error:', tableError);
      return;
    }
    
    console.log('📊 Total active assignments in table:', allTableAssignments.length);
    if (allTableAssignments.length > 0) {
      allTableAssignments.forEach((assignment, i) => {
        console.log(`  ${i+1}. Employee: ${assignment.employee_id}, PayGroup: ${assignment.pay_group_id}`);
      });
    }
    
    // Step 5: Check for expatriate-specific issues
    console.log('\n📊 Step 5: Checking expatriate-specific data...');
    
    const expatriateEmployees = allEmployees.filter(emp => emp.employee_type === 'expatriate');
    const expatriateGroups = allPayGroups.filter(pg => pg.type === 'expatriate');
    
    console.log('📊 Expatriate employees:', expatriateEmployees.length);
    expatriateEmployees.forEach((emp, i) => {
      console.log(`  ${i+1}. ${emp.first_name} ${emp.last_name} - PayGroup: ${emp.pay_group_id || 'null'}`);
    });
    
    console.log('📊 Expatriate pay groups:', expatriateGroups.length);
    expatriateGroups.forEach((pg, i) => {
      console.log(`  ${i+1}. ${pg.name} (${pg.id})`);
    });
    
    // Step 6: Check for data inconsistencies
    console.log('\n📊 Step 6: Checking for data inconsistencies...');
    
    if (allViewAssignments.length !== allTableAssignments.length) {
      console.log('⚠️ INCONSISTENCY: View and table have different counts');
      console.log('   View:', allViewAssignments.length);
      console.log('   Table:', allTableAssignments.length);
    } else {
      console.log('✅ View and table counts match');
    }
    
    // Step 7: Check if there are any employees that should be assigned but aren't
    console.log('\n📊 Step 7: Checking for missing assignments...');
    
    const employeesWithPayGroup = allEmployees.filter(emp => emp.pay_group_id);
    console.log('📊 Employees with pay_group_id:', employeesWithPayGroup.length);
    
    for (const emp of employeesWithPayGroup) {
      const hasAssignment = allViewAssignments.some(assignment => 
        assignment.employee_id === emp.id && assignment.pay_group_id === emp.pay_group_id
      );
      
      if (!hasAssignment) {
        console.log(`⚠️ Missing assignment: ${emp.first_name} ${emp.last_name} should be in pay group ${emp.pay_group_id}`);
      }
    }
    
    console.log('\n🎉 Debug complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugExpatriateIssue().catch(console.error);

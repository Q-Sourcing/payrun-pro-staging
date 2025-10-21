// Simple script to check database state
import { createClient } from '@supabase/supabase-js';

// Use the staging credentials
const supabaseUrl = 'https://sbphmrjoappwlervnbtm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4NzQsImV4cCI6MjA1MjU1MDg3NH0.8Q5YqJ8Q5YqJ8Q5YqJ8Q5YqJ8Q5YqJ8Q5YqJ8Q5YqJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('=== Checking PayGroup Employees Database ===\n');
  
  try {
    // Check all paygroup_employees records
    const { data: assignments, error } = await supabase
      .from('paygroup_employees')
      .select(`
        id,
        employee_id,
        pay_group_id,
        active,
        created_at,
        removed_at,
        employees (
          id,
          first_name,
          last_name,
          email,
          employee_type
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching assignments:', error);
      return;
    }
    
    console.log(`Found ${assignments.length} total assignments:\n`);
    
    if (assignments.length === 0) {
      console.log('No employee assignments found in the database.');
      return;
    }
    
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. Employee: ${assignment.employees?.first_name} ${assignment.employees?.last_name} (${assignment.employees?.email})`);
      console.log(`   Pay Group ID: ${assignment.pay_group_id}`);
      console.log(`   Active: ${assignment.active}`);
      console.log(`   Created: ${assignment.created_at}`);
      console.log(`   Removed: ${assignment.removed_at || 'N/A'}`);
      console.log(`   Employee Type: ${assignment.employees?.employee_type}`);
      console.log('---');
    });
    
    // Summary
    const activeAssignments = assignments.filter(a => a.active === true);
    const inactiveAssignments = assignments.filter(a => a.active === false);
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total assignments: ${assignments.length}`);
    console.log(`Active assignments: ${activeAssignments.length}`);
    console.log(`Inactive assignments: ${inactiveAssignments.length}`);
    
    // Group by pay group
    const byPayGroup = assignments.reduce((acc, assignment) => {
      const pgId = assignment.pay_group_id;
      if (!acc[pgId]) {
        acc[pgId] = { active: 0, inactive: 0, employees: [] };
      }
      if (assignment.active) {
        acc[pgId].active++;
      } else {
        acc[pgId].inactive++;
      }
      acc[pgId].employees.push({
        name: `${assignment.employees?.first_name} ${assignment.employees?.last_name}`,
        active: assignment.active
      });
      return acc;
    }, {});
    
    console.log(`\n=== BY PAY GROUP ===`);
    Object.entries(byPayGroup).forEach(([pgId, data]) => {
      console.log(`Pay Group ${pgId}:`);
      console.log(`  Active: ${data.active}, Inactive: ${data.inactive}`);
      data.employees.forEach(emp => {
        console.log(`  - ${emp.name} (${emp.active ? 'active' : 'inactive'})`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabase();
